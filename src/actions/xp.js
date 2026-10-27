/** XP a revealed hint takes away from the round. */
export const HINT_COST = 3;

/**
 * XP earned for solving an exercise. Higher levels pay more, clean rounds get a bonus.
 * @param {{ level: number, outcome: "clean" | "struggled", hints: number }} round
 * @returns {number} never below 2, showing up always counts
 */
export function xpFor({ level, outcome, hints }) {
  const base = 5 + level * 5;
  const bonus = outcome === "clean" ? 5 : 0;
  return Math.max(2, base + bonus - hints * HINT_COST);
}
