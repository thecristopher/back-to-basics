const SLOT = "forge:";

/**
 * A queue entry waiting for Claude to forge a new exercise for a track.
 * @param {string} track
 * @returns {string}
 */
export function slotFor(track) {
  return `${SLOT}${track}`;
}

/**
 * The track of a slot entry, null when the entry is already an exercise id.
 * @param {string} entry
 * @returns {string | null}
 */
export function slotTrack(entry) {
  return entry.startsWith(SLOT) ? entry.slice(SLOT.length) : null;
}

function isDue(record, today) {
  return Boolean(record?.dueAt) && !record.mastered && record.dueAt <= today;
}

/**
 * Exercises waiting for review today, the most overdue first.
 * @param {{ id: string }[]} exercises
 * @param {Record<string, object>} records
 * @param {string} today
 * @param {number} limit
 * @returns {string[]} ids
 */
export function dueReviews(exercises, records, today, limit) {
  return exercises
    .filter((exercise) => isDue(records[exercise.id], today))
    .sort((a, b) => records[a.id].dueAt.localeCompare(records[b.id].dueAt))
    .slice(0, limit)
    .map((exercise) => exercise.id);
}

/**
 * Exercises already forged for a track level and never solved nor skipped.
 * @param {{ id: string, track: string, level: number, placement?: boolean }[]} exercises
 * @param {Record<string, object>} records
 * @param {string} track
 * @param {number} level
 * @param {string[]} [exclude] ids already queued
 * @returns {string[]} ids
 */
export function freshExercises(exercises, records, track, level, exclude = []) {
  return exercises
    .filter((exercise) => exercise.track === track && exercise.level === level && !exercise.placement)
    .filter((exercise) => !records[exercise.id]?.firstSolvedAt && !records[exercise.id]?.dueAt)
    .filter((exercise) => !exclude.includes(exercise.id))
    .map((exercise) => exercise.id);
}

/**
 * Spreads the day's new exercises over the tracks, taking turns.
 * @param {string[]} tracks in path order
 * @param {number} count
 * @returns {string[]} one track per new exercise
 */
export function allocateNew(tracks, count) {
  if (tracks.length === 0) return [];
  return Array.from({ length: count }, (_, index) => tracks[index % tracks.length]);
}

/**
 * First entry of the queue not done today.
 * @param {string[]} queue
 * @param {string[]} done
 * @returns {string | null}
 */
export function nextPending(queue, done) {
  return queue.find((entry) => !done.includes(entry)) ?? null;
}
