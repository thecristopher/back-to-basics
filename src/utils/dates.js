/**
 * Formats a date as YYYY-MM-DD in local time, the key every practice day is stored under.
 * @param {Date} [date]
 * @returns {string}
 */
export function toDay(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Moves a YYYY-MM-DD day forward or back by whole days.
 * @param {string} day
 * @param {number} amount negative goes back
 * @returns {string}
 */
export function addDays(day, amount) {
  const [year, month, date] = day.split("-").map(Number);
  // noon keeps daylight saving jumps from landing on the wrong day
  return toDay(new Date(year, month - 1, date + amount, 12));
}
