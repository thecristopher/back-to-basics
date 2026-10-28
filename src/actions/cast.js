/**
 * Picks who appears in one exercise: every lead, plus a few supporting characters drawn at random
 * so the statements keep meeting new faces.
 * @param {{ leads?: string[], supporting?: string[] } | undefined} cast
 * @param {number} count supporting characters to bring in
 * @param {() => number} [random] returns [0, 1)
 * @returns {{ leads: string[], supporting: string[] } | null} null when there is no cast
 */
export function pickCast(cast, count, random = Math.random) {
  const leads = cast?.leads ?? [];
  const pool = [...(cast?.supporting ?? [])];
  if (leads.length === 0 && pool.length === 0) return null;
  const supporting = [];
  while (supporting.length < count && pool.length > 0) {
    supporting.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return { leads, supporting };
}

/**
 * The prompt line that casts an exercise.
 * @param {{ leads: string[], supporting: string[] } | null} cast
 * @returns {string | null}
 */
export function castLine(cast) {
  if (!cast) return null;
  const leads = cast.leads.length > 0 ? `Leads: ${cast.leads.join(", ")}. ` : "";
  const supporting = cast.supporting.length > 0
    ? `Bring in ${cast.supporting.join(", ")} by name in the readme and the test data, each with a small role that fits who they are.`
    : "";
  return `- Cast of each exercise: ${leads}${supporting}`.trim();
}
