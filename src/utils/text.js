const CODES = {
  bold: [1, 22],
  dim: [2, 22],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  cyan: [36, 39],
};

/**
 * Builds the color helpers, plain passthroughs when color is off.
 * @param {boolean} enabled
 * @returns {Record<keyof CODES, (text: string) => string>}
 */
export function createPaint(enabled) {
  const paint = {};
  for (const [name, [open, close]] of Object.entries(CODES)) {
    paint[name] = (text) => (enabled ? `\u001b[${open}m${text}\u001b[${close}m` : String(text));
  }
  return paint;
}

/**
 * Draws a progress bar like ███░░ for done out of total.
 * @param {number} done
 * @param {number} total
 * @param {number} [width]
 * @returns {string}
 */
export function bar(done, total, width = 10) {
  const filled = total === 0 ? 0 : Math.round((done / total) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/**
 * Formats seconds as 2m 05s.
 * @param {number} seconds
 * @returns {string}
 */
export function duration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return minutes > 0 ? `${minutes}m ${rest}s` : `${seconds}s`;
}

/**
 * Keeps the first lines of a text and indents them.
 * @param {string} text
 * @param {number} limit
 * @param {number} [spaces]
 * @returns {string[]}
 */
export function excerpt(text, limit, spaces = 4) {
  const lines = String(text ?? "")
    .trimEnd()
    .split("\n");
  const kept = lines.slice(0, limit);
  if (lines.length > limit) kept.push("...");
  return kept.map((line) => " ".repeat(spaces) + line);
}
