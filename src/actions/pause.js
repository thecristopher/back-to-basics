/**
 * Pauses the lesson on an exercise: its clock stops until it is resumed.
 * @param {{ paused?: { id: string, at: number } | null }} state mutated in place
 * @param {string} id
 * @param {number} now ms
 * @returns {boolean} false when the lesson was already paused
 */
export function pauseLesson(state, id, now) {
  if (state.paused) return false;
  state.paused = { id, at: now };
  return true;
}

/**
 * Resumes a paused lesson: the time it stood still is kept apart so it never counts as work.
 * A redo keeps its clock in its start, so the start moves forward instead.
 * @param {{ paused?: { id: string, at: number } | null, exercises: Record<string, { pausedMs?: number }>, redoStarts?: Record<string, number> }} state mutated in place
 * @param {number} now ms
 * @returns {{ id: string, ms: number } | null} what was resumed and for how long it stood still, null when nothing was paused
 */
export function resumeLesson(state, now) {
  const paused = state.paused;
  if (!paused) return null;
  const ms = Math.max(0, now - paused.at);
  const record = state.exercises[paused.id];
  if (record) record.pausedMs = (record.pausedMs ?? 0) + ms;
  if (state.redoStarts?.[paused.id]) state.redoStarts[paused.id] += ms;
  state.paused = null;
  return { id: paused.id, ms };
}

/**
 * Seconds of a round on the clock, the time it stood paused left out.
 * @param {number | null | undefined} startedAt ms
 * @param {number | null | undefined} pausedMs
 * @param {number} now ms
 * @returns {number | null} null when the round never started
 */
export function roundSeconds(startedAt, pausedMs, now) {
  if (!startedAt) return null;
  return Math.max(0, Math.round((now - startedAt - (pausedMs ?? 0)) / 1000));
}
