import { nextReview } from "./schedule.js";

/**
 * An empty round: no failed submits, no hints.
 * @returns {{ failures: number, hints: number }}
 */
export function freshRound() {
  return { failures: 0, hints: 0 };
}

/**
 * A progress record for an exercise never touched.
 * @returns {object}
 */
export function freshRecord() {
  return { attempts: 0, passes: 0, skips: 0, round: freshRound(), startedAt: null };
}

function fastest(best, seconds) {
  if (seconds === null) return best ?? null;
  return best ? Math.min(best, seconds) : seconds;
}

/**
 * Marks an exercise solved: schedules its next review and closes the round.
 * @param {object} record mutated in place
 * @param {{ outcome: "clean" | "struggled", seconds: number | null, today: string }} pass
 */
export function applyPass(record, { outcome, seconds, today }) {
  const step = record.firstSolvedAt ? record.step : undefined;
  Object.assign(record, nextReview(step, outcome, today));
  record.passes += 1;
  record.firstSolvedAt ??= today;
  record.lastSolvedAt = today;
  record.lastOutcome = outcome;
  if (outcome === "clean") record.everClean = true;
  record.bestSeconds = fastest(record.bestSeconds, seconds);
  record.round = freshRound();
  record.startedAt = null;
}

/**
 * Leaves an exercise for tomorrow and unlocks its reference solution.
 * @param {object} record mutated in place
 * @param {string} today
 */
export function applySkip(record, today) {
  Object.assign(record, nextReview(undefined, "skipped", today));
  record.skips += 1;
  record.round = freshRound();
  record.startedAt = null;
}

/**
 * Where an exercise stands, for listings.
 * @param {object | undefined} record
 * @param {string} today
 * @returns {"mastered" | "due" | "solved" | "started" | "new"}
 */
export function exerciseState(record, today) {
  if (!record) return "new";
  if (record.mastered) return "mastered";
  if (record.dueAt && record.dueAt <= today) return "due";
  if (record.firstSolvedAt) return "solved";
  return record.attempts > 0 || record.skips > 0 ? "started" : "new";
}

/**
 * Adds XP to the totals and marks the exercise solved today.
 * @param {{ xp: number }} state mutated in place
 * @param {{ xp: number, solved: string[], done: string[] }} day mutated in place
 * @param {string} id
 * @param {number} xp
 */
export function awardXp(state, day, id, xp) {
  state.xp += xp;
  day.xp += xp;
  if (!day.solved.includes(id)) day.solved.push(id);
  if (!day.done.includes(id)) day.done.push(id);
}
