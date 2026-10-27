/**
 * Pulls the JSON object out of a model answer, tolerating code fences or a stray sentence around it.
 * @param {string} text
 * @returns {any}
 * @throws {Error} when there is no parseable object
 */
export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The answer has no JSON object");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    throw new Error(`The answer is not valid JSON: ${error.message}`);
  }
}

/**
 * Replaces em dashes in prose with commas.
 * @param {string} text
 * @returns {string}
 */
export function withoutEmDashes(text) {
  return String(text ?? "").replace(/\s*\u2014\s*/g, ", ");
}
