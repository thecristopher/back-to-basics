import { nextReview } from "./schedule.js";

/**
 * An empty round: no failed submits, no hints, no nudges at a known mistake.
 * @returns {{ failures: number, hints: number, nudges: string[] }}
 */
export function freshRound() {
  return { failures: 0, hints: 0, nudges: [] };
}

// a single report never counts more than this, a clock left running all night is not work
const MAX_ACTIVE_SECONDS = 4 * 60 * 60;

function countOf(value, max) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? Math.min(number, max) : 0;
}

/**
 * Adds the work an editor measured since its last report to the round: active seconds in the
 * solution buffer and how many edits it took.
 * @param {{ round: { active?: number, edits?: number } }} record mutated in place
 * @param {{ active?: string | boolean, edits?: string | boolean }} flags --active and --edits
 */
export function noteActivity(record, flags) {
  const seconds = countOf(flags.active, MAX_ACTIVE_SECONDS);
  const edits = countOf(flags.edits, Number.MAX_SAFE_INTEGER);
  if (seconds === 0 && edits === 0) return;
  record.round.active = (record.round.active ?? 0) + seconds;
  record.round.edits = (record.round.edits ?? 0) + edits;
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
 * Marks an exercise solved and closes the round. A solved exercise never comes back as is,
 * its concepts are reviewed with fresh exercises instead, see dueConcepts.
 * @param {object} record mutated in place
 * @param {{ outcome: "clean" | "struggled", seconds: number | null, today: string }} pass
 */
export function applyPass(record, { outcome, seconds, today }) {
  record.dueAt = null;
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
