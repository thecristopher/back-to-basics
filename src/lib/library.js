import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { withoutEmDashes } from "../actions/json.js";
import { momentsPrompt } from "../actions/prompts/moments.js";
import { lessonPrompt } from "../actions/prompts/lesson.js";
import { statementPrompt } from "../actions/prompts/statement.js";
import { withMoments } from "../actions/moments.js";
import { exerciseFiles } from "./catalog.js";
import { ask, askJson } from "./claude.js";
import { readJsonIfExists, writeJson } from "./files.js";

/**
 * Where Claude's review of a solution is kept.
 * @param {object} config
 * @param {{ track: string, slug: string }} exercise
 * @returns {string}
 */
export function reviewPath(config, exercise) {
  return join(config.dataDir, "reviews", exercise.track, `${exercise.slug}.md`);
}

/**
 * Where a coach's briefing of an exercise is kept, one per coach.
 * @param {object} config
 * @param {string} personaId
 * @param {{ track: string, slug: string }} exercise
 * @returns {string}
 */
export function briefPath(config, personaId, exercise) {
  return join(config.dataDir, "briefs", personaId, exercise.track, `${exercise.slug}.md`);
}

/**
 * Where a coach's line of the day is kept, the greeting or the goodbye.
 * @param {object} config
 * @param {string} personaId
 * @param {string} date
 * @param {string} kind "greet", or "debrief-<rounds>" so a new round writes a new goodbye
 * @returns {string}
 */
export function dayVoicePath(config, personaId, date, kind) {
  return join(config.dataDir, "days", personaId, `${date}-${kind}.md`);
}

/**
 * Reads a text file, null when it does not exist.
 * @param {string} file
 * @returns {Promise<string | null>}
 */
export async function readTextIfExists(file) {
  return existsSync(file) ? readFile(file, "utf8") : null;
}

/**
 * Writes a text file, creating its folder.
 * @param {string} file
 * @param {string} text
 */
export async function writeText(file, text) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text.endsWith("\n") ? text : `${text}\n`);
}

/**
 * Has Claude write the lesson of an exercise forged before lessons existed.
 * @param {object} ctx
 * @param {object} exercise
 * @returns {Promise<string>} the lesson file
 */
export async function writeMissingLesson(ctx, exercise) {
  const files = exerciseFiles(exercise);
  const [readme, reference] = await Promise.all([readFile(files.readme, "utf8"), readFile(files.reference, "utf8")]);
  const prompt = lessonPrompt({
    title: exercise.title,
    concepts: exercise.concepts,
    readme,
    reference,
    language: ctx.config.language,
    theme: ctx.config.theme,
  });
  ctx.log(ctx.paint.dim(ctx.t.writingLesson(ctx.coach, exercise.title)));
  await writeText(files.lesson, withoutEmDashes((await ask(ctx.config.claude, prompt)).trim()));
  return files.lesson;
}

/**
 * Has Claude write what the coach of the day says at each moment of an exercise that has no lines from her yet.
 * @param {object} ctx needs a persona
 * @param {object} exercise updated in place, and in its exercise.json
 * @returns {Promise<boolean>} false when the lines Claude wrote did not hold
 */
export async function writeMissingMoments(ctx, exercise) {
  const prompt = momentsPrompt({
    title: exercise.title,
    concepts: exercise.concepts,
    readme: await readFile(exerciseFiles(exercise).readme, "utf8"),
    persona: ctx.persona,
    language: ctx.config.language,
  });
  ctx.log(ctx.paint.dim(ctx.t.writingMoments(ctx.coach, exercise.title)));
  const moments = withMoments(exercise.moments, ctx.persona.id, await askJson(ctx.config.claude, prompt));
  if (!moments?.[ctx.persona.id]) return false;
  const file = join(exercise.folder, "exercise.json");
  await writeJson(file, { ...(await readJsonIfExists(file)), moments });
  exercise.moments = moments;
  return true;
}

function isRewrite(answer) {
  return typeof answer?.readme === "string" && answer.readme.trim() !== "" && Array.isArray(answer.hints) && answer.hints.length > 0;
}

/**
 * Has Claude rewrite the statement and the hints of an exercise forged before they had to explain the
 * problem. Tests, starter and reference stay as they are.
 * @param {object} ctx
 * @param {object} exercise updated in place, and in its exercise.json and README.md
 * @returns {Promise<boolean>} false when Claude's answer did not hold
 */
export async function rewriteStatement(ctx, exercise) {
  const files = exerciseFiles(exercise);
  const [readme, reference, test] = await Promise.all([files.readme, files.reference, files.test].map((file) => readFile(file, "utf8")));
  const prompt = statementPrompt({ title: exercise.title, readme, hints: exercise.hints, reference, test, language: ctx.config.language, theme: ctx.config.theme });
  ctx.log(ctx.paint.dim(ctx.t.rewritingStatement(ctx.coach, exercise.title)));
  const answer = await askJson(ctx.config.claude, prompt);
  if (!isRewrite(answer)) return false;
  const hints = answer.hints.map((hint) => withoutEmDashes(String(hint)));
  await writeText(files.readme, withoutEmDashes(answer.readme.trim()));
  const meta = join(exercise.folder, "exercise.json");
  await writeJson(meta, { ...(await readJsonIfExists(meta)), hints, explained: true });
  Object.assign(exercise, { hints, explained: true });
  return true;
}
