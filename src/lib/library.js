import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { withoutEmDashes } from "../actions/json.js";
import { lessonPrompt } from "../actions/prompts/lesson.js";
import { exerciseFiles } from "./catalog.js";
import { ask } from "./claude.js";

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
  ctx.log(ctx.paint.dim(ctx.t.writingLesson(exercise.title)));
  await writeText(files.lesson, withoutEmDashes((await ask(ctx.config.claude, prompt)).trim()));
  return files.lesson;
}
