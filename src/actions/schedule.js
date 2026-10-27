import { addDays } from "../utils/dates.js";

/** Days until the next review on each rung of the ladder. Past the last rung it is mastered. */
export const INTERVALS = [1, 3, 7, 21];

/**
 * Decides how a solved round went.
 * @param {{ failures: number, hints: number }} round
 * @param {number} maxFailures failed submits that still count as clean, so a typo is not a defeat
 * @returns {"clean" | "struggled"}
 */
export function roundOutcome(round, maxFailures) {
  if (round.hints > 0) return "struggled";
  return round.failures <= maxFailures ? "clean" : "struggled";
}

/**
 * Moves an exercise along the review ladder. Clean climbs a rung, anything else starts over tomorrow.
 * @param {number | undefined} step current rung, undefined when it was never solved
 * @param {"clean" | "struggled" | "skipped"} outcome
 * @param {string} today YYYY-MM-DD
 * @returns {{ step: number, dueAt: string | null, mastered: boolean }}
 */
export function nextReview(step, outcome, today) {
  const next = outcome === "clean" ? (step ?? 0) + 1 : 0;
  if (next >= INTERVALS.length) return { step: next, dueAt: null, mastered: true };
  return { step: next, dueAt: addDays(today, INTERVALS[next]), mastered: false };
}
