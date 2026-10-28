import { nextReview } from "./schedule.js";

/**
 * True when a due review only needs a recap: it was solved before, so sending the same solution
 * again proves nothing. One that was skipped and never solved still has to be fought.
 * @param {object | undefined} record
 * @returns {boolean}
 */
export function isRecap(record) {
  return Boolean(record?.firstSolvedAt);
}

/**
 * Marks a review as recapped today and climbs it one rung, so it comes back later as a recap again.
 * @param {object} record mutated in place
 * @param {string} today
 */
export function applyRecap(record, today) {
  Object.assign(record, nextReview(record.step, "clean", today));
  record.recappedAt = today;
}

/**
 * How the day went: what was solved, how clean, what was skipped and the concepts worth another look.
 * @param {{ xp: number, rounds?: Record<string, { outcome: string, failures: number, hints: number }> }} day
 * @param {Record<string, { concepts?: string[] }>} byId the catalog's exercises by id
 * @param {number} recapped reviews recapped today
 * @returns {{ solved: number, clean: number, struggled: number, skipped: number, failures: number, hints: number, xp: number, recapped: number, toImprove: string[] }}
 */
export function daySummary(day, byId, recapped = 0) {
  const rounds = Object.entries(day.rounds ?? {});
  const count = (outcome) => rounds.filter(([, round]) => round.outcome === outcome).length;
  const sum = (key) => rounds.reduce((total, [, round]) => total + (round[key] ?? 0), 0);
  const costly = rounds.filter(([, round]) => round.outcome !== "clean").flatMap(([id]) => byId[id]?.concepts ?? []);
  return {
    solved: count("clean") + count("struggled"),
    clean: count("clean"),
    struggled: count("struggled"),
    skipped: count("skipped"),
    failures: sum("failures"),
    hints: sum("hints"),
    xp: day.xp,
    recapped,
    toImprove: [...new Set(costly)],
  };
}
