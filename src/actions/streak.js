import { addDays } from "../utils/dates.js";

/**
 * Counts consecutive days with at least one exercise solved. Today still pending does not break it.
 * @param {Record<string, { solved?: string[] }>} days
 * @param {string} today
 * @returns {number}
 */
export function streakDays(days, today) {
  const solvedOn = (day) => (days[day]?.solved?.length ?? 0) > 0;
  let cursor = solvedOn(today) ? today : addDays(today, -1);
  let count = 0;
  while (solvedOn(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}
