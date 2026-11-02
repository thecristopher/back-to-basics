import { daysToOwn, standingOf, wasOwned } from "./mastery.js";

/**
 * Summarizes each level of a track's path. A level is done once every one of its concepts was owned,
 * or when the placement put the learner past it. A later miss sends a concept to review but keeps the
 * level passed. clean counts the concepts owned now and target all of them.
 * @param {{ path: { startLevel: number, levels: { level: number, title: string, concepts: string[] }[] } | null }} track
 * @param {Record<string, object> | undefined} concepts the track's mastery by concept id
 * @returns {Array<object & { clean: number, target: number, remaining: number, placedOut: boolean, done: boolean }>}
 *   remaining is how many clean solves the level still needs at least
 */
export function levelProgress(track, concepts = {}) {
  if (!track.path) return [];
  return track.path.levels.map((info) => {
    const placedOut = info.level < track.path.startLevel;
    const owned = info.concepts.filter((id) => standingOf(concepts[id]) === "owned").length;
    const done = placedOut || info.concepts.every((id) => wasOwned(concepts[id]));
    const remaining = done ? 0 : info.concepts.reduce((sum, id) => sum + daysToOwn(concepts[id]), 0);
    return { ...info, clean: owned, target: info.concepts.length, remaining, placedOut, done };
  });
}

/**
 * The first level not done yet.
 * @param {{ level: number, done: boolean }[]} progress
 * @returns {number | null} null when the whole path is done or not drawn
 */
export function currentLevel(progress) {
  return progress.find((level) => !level.done)?.level ?? null;
}

/**
 * How many levels from the start are done, the ones a redraw must keep.
 * @param {{ done: boolean }[]} progress
 * @returns {number}
 */
export function doneLevels(progress) {
  const index = progress.findIndex((level) => !level.done);
  return index === -1 ? progress.length : index;
}
