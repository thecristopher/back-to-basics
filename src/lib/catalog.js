import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { listDirs, readJsonIfExists } from "./files.js";

/**
 * Folder holding the exercises forged for a track.
 * @param {object} config
 * @param {string} trackId
 * @returns {string}
 */
export function exercisesDir(config, trackId) {
  return join(config.dataDir, "exercises", trackId);
}

async function loadExercise(dir, trackId, slug) {
  const folder = join(dir, slug);
  const meta = await readJsonIfExists(join(folder, "exercise.json"));
  if (!meta) return null;
  return { hints: [], concepts: [], placement: false, ...meta, id: `${trackId}/${slug}`, slug, track: trackId, folder };
}

async function loadTrackExercises(config, trackId) {
  const dir = exercisesDir(config, trackId);
  const slugs = await listDirs(dir);
  const exercises = await Promise.all(slugs.map((slug) => loadExercise(dir, trackId, slug)));
  return exercises.filter(Boolean);
}

/**
 * Loads every exercise forged for the active tracks, in path order: track, then level, then forge order.
 * @param {object} config
 * @param {{ id: string }[]} tracks
 * @returns {Promise<{ tracks: object[], exercises: object[], byId: Record<string, object> }>}
 */
export async function loadCatalog(config, tracks) {
  const perTrack = await Promise.all(tracks.map((track) => loadTrackExercises(config, track.id)));
  const exercises = perTrack.flatMap((list) => list.sort((a, b) => a.level - b.level || a.seq - b.seq));
  const byId = Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise]));
  return { tracks, exercises, byId };
}

/**
 * Finds an exercise by its full id (node/sum-evens) or just its folder name.
 * @param {{ exercises: object[], byId: Record<string, object> }} catalog
 * @param {string} query
 * @returns {object | undefined}
 */
export function findExercise(catalog, query) {
  return catalog.byId[query] ?? catalog.exercises.find((exercise) => exercise.slug === query);
}

/**
 * Paths of an exercise's stored files. Starter and reference keep the solution's extension.
 * @param {{ folder: string, files: { solution: string, test: string } }} exercise
 * @returns {{ readme: string, lesson: string, starter: string, reference: string, test: string }}
 */
export function exerciseFiles(exercise) {
  const ext = extname(exercise.files.solution);
  return {
    readme: join(exercise.folder, "README.md"),
    lesson: join(exercise.folder, "lesson.md"),
    starter: join(exercise.folder, `starter${ext}`),
    reference: join(exercise.folder, `reference${ext}`),
    test: join(exercise.folder, exercise.files.test),
  };
}

// from the very basics Claude sees the warm up example, the gentlest quality bar there is
async function pickExampleSlug(dir, slugs, fromBasics) {
  if (!fromBasics) return slugs[0];
  for (const slug of slugs) {
    if ((await readJsonIfExists(join(dir, slug, "exercise.json")))?.warmUp) return slug;
  }
  return slugs[0];
}

/**
 * Reads one of the bundled examples as the JSON shape Claude is asked to answer with.
 * @param {object} config
 * @param {string} profileId falls back to the JavaScript examples when the language has none
 * @param {string} [preferred] the example a track asks for, used when the language has it
 * @returns {Promise<object>}
 */
export async function loadExample(config, profileId, preferred) {
  const own = await listDirs(join(config.examplesDir, profileId));
  const dir = own.length > 0 ? join(config.examplesDir, profileId) : join(config.examplesDir, "javascript");
  const slugs = own.length > 0 ? own : await listDirs(dir);
  const slug = slugs.includes(preferred) ? preferred : await pickExampleSlug(dir, slugs, config.fromBasics);
  const exercise = await loadExercise(dir, profileId, slug);
  const files = exerciseFiles(exercise);
  const read = (file) => readFile(file, "utf8");
  return {
    slug,
    title: exercise.title,
    minutes: exercise.minutes,
    concepts: exercise.concepts,
    hints: exercise.hints,
    readme: await read(files.readme),
    lesson: await read(files.lesson),
    starter: await read(files.starter),
    reference: await read(files.reference),
    test: await read(files.test),
  };
}
