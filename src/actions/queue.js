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
 * Ones forged for another franchise wait until that franchise is back, untagged ones fit any.
 * @param {{ id: string, track: string, level: number, placement?: boolean, franchise?: string }[]} exercises
 * @param {Record<string, object>} records
 * @param {string} track
 * @param {number} level
 * @param {string[]} [exclude] ids already queued
 * @param {string | null} [franchise] today's franchise, null to take any
 * @returns {string[]} ids
 */
export function freshExercises(exercises, records, track, level, exclude = [], franchise = null) {
  return exercises
    .filter((exercise) => exercise.track === track && exercise.level === level && !exercise.placement)
    .filter((exercise) => !records[exercise.id]?.firstSolvedAt && !records[exercise.id]?.dueAt)
    .filter((exercise) => !exclude.includes(exercise.id))
    .filter((exercise) => !franchise || !exercise.franchise || exercise.franchise === franchise)
    .map((exercise) => exercise.id);
}

/**
 * Spreads the day's new exercises over the tracks, taking turns within the day and across days,
 * so one new exercise a day still reaches every track.
 * @param {string[]} tracks in path order
 * @param {number} count
 * @param {number} [turn] how many days were queued before this one
 * @returns {string[]} one track per new exercise
 */
export function allocateNew(tracks, count, turn = 0) {
  if (tracks.length === 0) return [];
  return Array.from({ length: count }, (_, index) => tracks[(turn * count + index) % tracks.length]);
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

/**
 * True when the exercise left open is still a fight in progress: never solved nor skipped,
 * or queued today and not done yet. next keeps handing it back until it is solved or skipped.
 * @param {string | null} id the current exercise
 * @param {object | undefined} record its progress
 * @param {{ queue: string[] | null, done: string[] }} day
 * @returns {boolean}
 */
export function isUnfinished(id, record, day) {
  if (!id || !record || day.done.includes(id)) return false;
  const neverEnded = !record.firstSolvedAt && !record.skips;
  return neverEnded || Boolean(day.queue?.includes(id));
}

/**
 * The track of the first pending slot whose track has no path yet, so its placement goes first.
 * @param {string[]} queue
 * @param {string[]} done
 * @param {(trackId: string) => boolean} hasPath
 * @returns {string | null}
 */
export function undrawnSlotTrack(queue, done, hasPath) {
  const entry = nextPending(queue, done);
  const trackId = entry ? slotTrack(entry) : null;
  return trackId && !hasPath(trackId) ? trackId : null;
}
