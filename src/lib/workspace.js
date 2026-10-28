import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { exerciseFiles } from "./catalog.js";

/**
 * Where the user writes their solution for an exercise.
 * @param {{ workspaceDir: string }} config
 * @param {{ track: string, slug: string, files: { solution: string } }} exercise
 * @returns {string}
 */
export function solutionPath(config, exercise) {
  return join(config.workspaceDir, exercise.track, exercise.slug, exercise.files.solution);
}

/**
 * Copies the starter and the statement into the workspace. An existing solution is never overwritten.
 * @param {{ workspaceDir: string }} config
 * @param {object} exercise
 * @returns {Promise<{ solution: string, readme: string }>}
 */
export async function prepareWorkspace(config, exercise) {
  const files = exerciseFiles(exercise);
  const solution = solutionPath(config, exercise);
  const readme = join(dirname(solution), "README.md");
  await mkdir(dirname(solution), { recursive: true });
  if (!existsSync(solution)) await copyFile(files.starter, solution);
  await copyFile(files.readme, readme);
  return { solution, readme };
}

/**
 * Where a redo of an exercise lives, beside the original solution so that one is never touched.
 * @param {{ workspaceDir: string }} config
 * @param {{ track: string, slug: string, files: { solution: string } }} exercise
 * @returns {string}
 */
export function redoPath(config, exercise) {
  return join(config.workspaceDir, exercise.track, exercise.slug, "redo", exercise.files.solution);
}

/**
 * Starts a redo from the starter, or keeps the one in progress unless fresh is asked.
 * @param {{ workspaceDir: string }} config
 * @param {object} exercise
 * @param {boolean} fresh throw away the redo in progress
 * @returns {Promise<{ solution: string, readme: string }>}
 */
export async function prepareRedo(config, exercise, fresh) {
  const files = exerciseFiles(exercise);
  const solution = redoPath(config, exercise);
  const readme = join(dirname(solution), "README.md");
  await mkdir(dirname(solution), { recursive: true });
  if (fresh || !existsSync(solution)) await copyFile(files.starter, solution);
  await copyFile(files.readme, readme);
  return { solution, readme };
}
