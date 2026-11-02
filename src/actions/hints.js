/**
 * The general hints of a round already shown, the nudges at a known mistake count apart.
 * @param {{ hints: number, nudges?: string[] }} round
 * @returns {number}
 */
export function generalHintsSeen(round) {
  return Math.max(0, round.hints - (round.nudges?.length ?? 0));
}

/**
 * A nudge at the mistake the learner's tests look like, as the terminal shows it.
 * @param {{ nudge: string, header: string, after: string, paint: Record<string, (text: string) => string> }} input
 * @returns {string[]}
 */
export function nudgeLines({ nudge, header, after, paint }) {
  return [paint.yellow(header), "", paint.bold(`  → ${nudge}`), "", paint.dim(after)];
}

/**
 * The hints of a round as the terminal shows them: the one just bought first and bright, the earlier
 * ones dimmed below so the new one is the thing to read.
 * @param {{ shown: string[], fresh: boolean, header: string, earlierLabel: string, paint: Record<string, (text: string) => string> }} input
 *   fresh is false when every hint was already bought, then they all read the same
 * @returns {string[]}
 */
export function hintLines({ shown, fresh, header, earlierLabel, paint }) {
  const numbered = (text, index) => `  ${index + 1}. ${text}`;
  if (!fresh) return [paint.yellow(header), "", ...shown.flatMap((text, index) => [numbered(text, index), ""])].slice(0, -1);
  const latest = shown.length - 1;
  const lines = [paint.yellow(header), "", paint.bold(numbered(shown[latest], latest))];
  if (latest === 0) return lines;
  return [...lines, "", paint.dim(`  ${earlierLabel}`), ...shown.slice(0, latest).map((text, index) => paint.dim(numbered(text, index)))];
}
