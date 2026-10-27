/**
 * Summarizes each level of a track's path. A level is done once enough of its exercises
 * were solved clean at least once, or when the placement put the learner past it.
 * @param {{ id: string, path: { startLevel: number, levels: { level: number, title: string, target: number }[] } | null }} track
 * @param {{ id: string, track: string, level: number, placement?: boolean }[]} exercises
 * @param {Record<string, { firstSolvedAt?: string, everClean?: boolean, mastered?: boolean }>} records
 * @returns {Array<object & { clean: number, solved: number, mastered: number, placedOut: boolean, done: boolean }>}
 */
export function levelProgress(track, exercises, records) {
  if (!track.path) return [];
  return track.path.levels.map((info) => {
    const inLevel = exercises.filter((exercise) => exercise.track === track.id && exercise.level === info.level && !exercise.placement);
    const count = (key) => inLevel.filter((exercise) => records[exercise.id]?.[key]).length;
    const clean = count("everClean");
    const placedOut = info.level < track.path.startLevel;
    return { ...info, clean, solved: count("firstSolvedAt"), mastered: count("mastered"), placedOut, done: placedOut || clean >= info.target };
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
