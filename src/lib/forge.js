import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { castFor, franchiseOf } from "../actions/cast.js";
import { conceptsUpTo } from "../actions/graph.js";
import { focusConcept, standingOf, summarizeMastery } from "../actions/mastery.js";
import { probeLevel } from "../actions/placement.js";
import { withMoments } from "../actions/moments.js";
import { withoutEmDashes } from "../actions/json.js";
import { exercisePrompt, fixPrompt, isComplexityLevel, isInterviewLevel } from "../actions/prompts/exercise.js";
import { describeRun } from "../actions/report.js";
import { judgeMutant } from "../actions/mutants.js";
import { draftProblems } from "../actions/validate.js";
import { toSlug, uniqueSlug } from "../utils/slug.js";
import { exercisesDir, loadExample, withConceptTitles } from "./catalog.js";
import { askJson } from "./claude.js";
import { filesFor, loadProfile } from "./profiles.js";
import { runTests } from "./runner.js";

// only tests that report by name can say which of them catches a mistake
function namesTests(profile) {
  return profile.report !== "exit-code";
}

// every wrong solution must fail a test, and the tests that catch it are kept beside it
async function runMutants(run, draft) {
  const problems = [];
  for (const mutant of draft.mutants) {
    const verdict = judgeMutant(mutant, await run(mutant.code));
    if (verdict.problem) problems.push(verdict.problem);
    mutant.caughtBy = verdict.caughtBy;
  }
  return problems;
}

// a bug hunt's starter is the buggy solution: it must pass some tests and fail others, an empty one fails them all
function starterProblems(empty, bugHunt) {
  if (empty.ok) return ["The starter already passes the tests, it must fail them"];
  // the cause of a crash sits at the end of its output, so that is the part kept
  if (empty.crashed) return [`The starter must fail the tests without crashing the run:\n${empty.stderr.slice(-1500)}`];
  if (bugHunt && empty.passed === 0) return ["The bug hunt starter fails every test, it must be a complete solution with one bug that passes some of them"];
  return [];
}

async function runProblems(ctx, profile, files, draft, bugHunt) {
  const run = (solutionCode) => runTests({ config: ctx.config, profile, files, solutionCode, testCode: draft.test, onInstall: ctx.onInstall });
  const good = await run(draft.reference);
  if (!good.ok) return [describeRun("The reference must pass every test", good)];
  if (namesTests(profile) && good.tests.length < 3) return ["Write at least 3 tests"];
  const starter = starterProblems(await run(draft.starter), bugHunt);
  if (starter.length > 0) return starter;
  return namesTests(profile) ? runMutants(run, draft) : [];
}

async function problemsOf(ctx, profile, files, draft, needs) {
  const { format, ...concepts } = needs;
  const shape = draftProblems(draft, { preview: Boolean(files.previewFile), mutants: namesTests(profile), complexity: Boolean(format?.complexity), ...concepts });
  return shape.length > 0 ? shape : runProblems(ctx, profile, files, draft, Boolean(format?.bugHunt));
}

function unwrap(answer) {
  return Array.isArray(answer?.exercises) ? answer.exercises[0] : answer;
}

/**
 * Validates a draft by running its tests, and sends it back to Claude with the problems until it holds or retries run out.
 * @returns {Promise<object | null>} the draft that passed, null when it never did
 */
async function settle(ctx, profile, files, draft, needs) {
  let current = draft;
  for (let attempt = 0; attempt <= ctx.config.forgeRetries; attempt += 1) {
    const problems = await problemsOf(ctx, profile, files, current, needs);
    if (problems.length === 0) return current;
    if (attempt === ctx.config.forgeRetries) break;
    ctx.log(ctx.paint.dim(ctx.t.forgeFixing(ctx.coach, current.title ?? "?")));
    current = unwrap(await askJson(ctx.config.claude, fixPrompt({ draft: current, problems, files, profile })));
  }
  return null;
}

function storedMutant(mutant) {
  return { mistake: withoutEmDashes(mutant.mistake), nudge: withoutEmDashes(mutant.nudge), caughtBy: mutant.caughtBy ?? [], code: mutant.code };
}

async function saveExercise(ctx, track, draft, meta) {
  const taken = new Set(ctx.catalog.exercises.filter((exercise) => exercise.track === track.id).map((exercise) => exercise.slug));
  const slug = uniqueSlug(toSlug(draft.slug ?? draft.title), taken);
  const folder = join(exercisesDir(ctx.config, track.id), slug);
  const ext = extname(meta.files.solution);
  const stored = {
    title: withoutEmDashes(draft.title),
    level: meta.level,
    difficulty: draft.difficulty ?? null,
    minutes: Math.round(draft.minutes),
    concepts: draft.concepts.map(String),
    hints: draft.hints.map(withoutEmDashes),
    example: draft.example,
    format: meta.format?.bugHunt ? "debug" : "build",
    ...(meta.format?.complexity ? { declaresComplexity: true } : {}),
    placement: meta.placement,
    ...(meta.review ? { review: true } : {}),
    language: meta.language,
    files: meta.files,
    franchise: meta.franchise,
    moments: withMoments(undefined, meta.persona, draft.moments),
    // written with the rules that explain the statement and the hints, so a rewrite can skip it
    explained: true,
    // a timestamp keeps forge order without touching progress, so forging can run beside practice
    seq: Date.now(),
    forgedAt: ctx.today,
  };
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, "exercise.json"), `${JSON.stringify(stored, null, 2)}\n`);
  await writeFile(join(folder, "README.md"), withoutEmDashes(draft.readme));
  await writeFile(join(folder, "lesson.md"), withoutEmDashes(draft.lesson));
  await writeFile(join(folder, `starter${ext}`), draft.starter);
  await writeFile(join(folder, `reference${ext}`), draft.reference);
  await writeFile(join(folder, meta.files.test), draft.test);
  if (meta.files.preview) await writeFile(join(folder, meta.files.preview), draft.preview);
  if (draft.mutants) await writeFile(join(folder, "mutants.json"), `${JSON.stringify(draft.mutants.map(storedMutant), null, 2)}\n`);
  const exercise = withConceptTitles({ hints: [], ...stored, id: `${track.id}/${slug}`, slug, track: track.id, folder }, track);
  ctx.catalog.exercises.push(exercise);
  ctx.catalog.byId[exercise.id] = exercise;
  return exercise;
}

// the level a request measures: the practice level, or for a placement probe the level its difficulty points at
function measuredLevel(track, { level, difficulty, size }) {
  if (level) return level.level;
  if (!track.path && !track.levels) return null;
  const count = (track.path ?? track).levels.length;
  return probeLevel(difficulty ?? size ?? count, size ?? count, count);
}

/**
 * What an exercise is aimed at: the concept it teaches with the learner's standing on it, and the ids it may use.
 * A track with no graph yet (a learned language before its path) leaves both open.
 * @param {object} ctx
 * @param {object} track
 * @param {{ purpose: string, level?: object, concept?: string, difficulty?: number, size?: number }} request
 *   a review names the concept it brings back
 * @returns {{ focus: { id: string, standing: string } | null, allowed: string[] | undefined }}
 */
export function aimOf(ctx, track, request) {
  const levels = track.path ?? (track.levels ? { levels: track.levels } : null);
  const upTo = levels ? measuredLevel(track, request) : null;
  if (!upTo) return { focus: null, allowed: undefined };
  const concepts = ctx.state.mastery[track.id]?.concepts ?? {};
  return { focus: focusOf(request, concepts), allowed: conceptsUpTo(levels, upTo) };
}

// a review aims at the concept that is due, an owned one asks for retrieval, a weak one for a smaller step
function focusOf(request, concepts) {
  if (request.purpose === "review") {
    const standing = standingOf(concepts[request.concept]);
    return { id: request.concept, standing: standing === "owned" ? "review" : standing };
  }
  const focusId = request.purpose === "practice" ? focusConcept(request.level, concepts) : null;
  return focusId ? { id: focusId, standing: standingOf(concepts[focusId]) } : null;
}

// the mistake the learner's runs last matched on a concept, from the recent results
function lastMistakeOn(ctx, track, concept) {
  const recent = ctx.state.mastery[track.id]?.recent ?? [];
  return recent.find((result) => result.concepts?.includes(concept) && result.mistakes?.length)?.mistakes[0] ?? null;
}

/**
 * The format of the next exercise. A weak concept whose mistake btb knows comes back as a bug hunt with that
 * very mistake in the starter, from level 2 and before the interview levels, and the levels that prepare the
 * onsite ask every solution for its time complexity.
 * @param {object} ctx
 * @param {object} track
 * @param {{ purpose: string, level?: object }} request
 * @param {{ id: string, standing: string } | null} focus
 * @param {{ report?: string }} profile
 * @returns {{ bugHunt: string | null, complexity: boolean }}
 */
export function formatOf(ctx, track, { purpose, level }, focus, profile) {
  if (purpose === "placement" || !level) return { bugHunt: null, complexity: false };
  const canHunt = purpose === "practice" && focus?.standing === "weak" && level.level >= 2 && !isInterviewLevel(track, level) && namesTests(profile);
  return { bugHunt: canHunt ? lastMistakeOn(ctx, track, focus.id) : null, complexity: isComplexityLevel(track, level) };
}

/**
 * Asks Claude for exercises fitted to the learner and keeps only the ones whose tests prove them right.
 * @param {object} ctx
 * @param {{ track: object, purpose: "practice" | "placement" | "review", level?: object, concept?: string, count: number, difficulty?: number, size?: number }} request
 *   a placement probe forged alone carries its difficulty and the size of the whole test, a review the concept it brings back
 * @returns {Promise<object[]>} the saved exercises, possibly fewer than asked for
 */
export async function forgeExercises(ctx, { track, purpose, level, concept, count, difficulty, size }) {
  const profile = await loadProfile(ctx.config, track.language);
  const files = filesFor(profile, ctx.config.flavor);
  const franchise = franchiseOf(ctx.persona);
  const avoid = ctx.catalog.exercises.filter((exercise) => exercise.track === track.id).map((exercise) => exercise.title);
  const { focus, allowed } = aimOf(ctx, track, { purpose, level, concept, difficulty, size });
  const format = formatOf(ctx, track, { purpose, level }, focus, profile);
  // one bug hunt at a time, it is built from one mistake
  const asked = format.bugHunt ? 1 : count;
  const prompt = exercisePrompt({
    format,
    focus,
    allowed,
    purpose,
    track,
    profile,
    files,
    level,
    count: asked,
    difficulty,
    size,
    summary: summarizeMastery(ctx.state.mastery[track.id]),
    avoid,
    language: ctx.config.language,
    theme: ctx.config.theme,
    fromBasics: ctx.config.fromBasics,
    cast: castFor(ctx.persona, ctx.config.cast),
    example: await loadExample(ctx.config, profile.id, track.example),
  });
  ctx.log(ctx.paint.dim(ctx.t.forging(ctx.coach, asked, track.title)));
  const answer = await askJson(ctx.config.claude, prompt);
  const drafts = (answer.exercises ?? []).slice(0, asked);
  const meta = {
    level: level?.level ?? 0,
    placement: purpose === "placement",
    review: purpose === "review",
    format,
    language: profile.id,
    franchise,
    persona: ctx.persona?.id ?? null,
    files: { solution: files.solutionFile, test: files.testFile, ...(files.previewFile ? { preview: files.previewFile } : {}) },
  };
  const saved = [];
  for (const [index, draft] of drafts.entries()) {
    const settled = await settle(ctx, profile, files, draft, { allowed, primary: focus?.id ?? null, format });
    if (settled && meta.placement) settled.difficulty = (difficulty ?? 1) + index;
    if (settled) saved.push(await saveExercise(ctx, track, settled, meta));
  }
  return saved;
}
