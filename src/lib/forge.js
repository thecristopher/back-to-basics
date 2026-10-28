import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { summarizeAptitude } from "../actions/aptitude.js";
import { pickCast } from "../actions/cast.js";
import { withoutEmDashes } from "../actions/json.js";
import { exercisePrompt, fixPrompt } from "../actions/prompts/exercise.js";
import { describeRun } from "../actions/report.js";
import { draftProblems } from "../actions/validate.js";
import { toSlug, uniqueSlug } from "../utils/slug.js";
import { exercisesDir, loadExample } from "./catalog.js";
import { askJson } from "./claude.js";
import { filesFor, loadProfile } from "./profiles.js";
import { runTests } from "./runner.js";

async function runProblems(ctx, profile, files, draft) {
  const run = (solutionCode) => runTests({ config: ctx.config, profile, files, solutionCode, testCode: draft.test, onInstall: ctx.onInstall });
  const good = await run(draft.reference);
  if (!good.ok) return [describeRun("The reference must pass every test", good)];
  if (profile.report !== "exit-code" && good.tests.length < 3) return ["Write at least 3 tests"];
  const empty = await run(draft.starter);
  if (empty.ok) return ["The starter already passes the tests, it must fail them"];
  if (empty.crashed) return [`The starter must fail the tests without crashing the run:\n${empty.stderr.slice(0, 1500)}`];
  return [];
}

async function problemsOf(ctx, profile, files, draft) {
  const shape = draftProblems(draft);
  return shape.length > 0 ? shape : runProblems(ctx, profile, files, draft);
}

function unwrap(answer) {
  return Array.isArray(answer?.exercises) ? answer.exercises[0] : answer;
}

/**
 * Validates a draft by running its tests, and sends it back to Claude with the problems until it holds or retries run out.
 * @returns {Promise<object | null>} the draft that passed, null when it never did
 */
async function settle(ctx, profile, files, draft) {
  let current = draft;
  for (let attempt = 0; attempt <= ctx.config.forgeRetries; attempt += 1) {
    const problems = await problemsOf(ctx, profile, files, current);
    if (problems.length === 0) return current;
    if (attempt === ctx.config.forgeRetries) break;
    ctx.log(ctx.paint.dim(ctx.t.forgeFixing(current.title ?? "?")));
    current = unwrap(await askJson(ctx.config.claude, fixPrompt({ draft: current, problems, files, profile })));
  }
  return null;
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
    placement: meta.placement,
    language: meta.language,
    files: meta.files,
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
  const exercise = { hints: [], concepts: [], ...stored, id: `${track.id}/${slug}`, slug, track: track.id, folder };
  ctx.catalog.exercises.push(exercise);
  ctx.catalog.byId[exercise.id] = exercise;
  return exercise;
}

/**
 * Asks Claude for exercises fitted to the learner and keeps only the ones whose tests prove them right.
 * @param {object} ctx
 * @param {{ track: object, purpose: "practice" | "placement", level?: object, count: number, difficulty?: number, size?: number }} request
 *   a placement probe forged alone carries its difficulty and the size of the whole test
 * @returns {Promise<object[]>} the saved exercises, possibly fewer than asked for
 */
export async function forgeExercises(ctx, { track, purpose, level, count, difficulty, size }) {
  const profile = await loadProfile(ctx.config, track.language);
  const files = filesFor(profile, ctx.config.flavor);
  const avoid = ctx.catalog.exercises.filter((exercise) => exercise.track === track.id).map((exercise) => exercise.title);
  const prompt = exercisePrompt({
    purpose,
    track,
    profile,
    files,
    level,
    count,
    difficulty,
    size,
    summary: summarizeAptitude(ctx.state.aptitude[track.id]),
    avoid,
    language: ctx.config.language,
    theme: ctx.config.theme,
    fromBasics: ctx.config.fromBasics,
    cast: pickCast(ctx.config.cast, 3),
    example: await loadExample(ctx.config, profile.id),
  });
  ctx.log(ctx.paint.dim(ctx.t.forging(count, track.title)));
  const answer = await askJson(ctx.config.claude, prompt);
  const drafts = (answer.exercises ?? []).slice(0, count);
  const meta = { level: level?.level ?? 0, placement: purpose === "placement", language: profile.id, files: { solution: files.solutionFile, test: files.testFile } };
  const saved = [];
  for (const [index, draft] of drafts.entries()) {
    const settled = await settle(ctx, profile, files, draft);
    if (settled && meta.placement) settled.difficulty = (difficulty ?? 1) + index;
    if (settled) saved.push(await saveExercise(ctx, track, settled, meta));
  }
  return saved;
}
