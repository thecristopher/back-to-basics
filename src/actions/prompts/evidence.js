const LANGUAGES = { es: "Spanish", en: "English" };

/**
 * The name of the language the learner reads, for prompts.
 * @param {string} code e.g. "es"
 * @returns {string}
 */
export function languageName(code) {
  return LANGUAGES[code] ?? "English";
}

function recentLine(result) {
  const extras = [result.failures ? `${result.failures} failed submits` : "", result.hints ? `${result.hints} hints` : ""].filter(Boolean);
  const time = result.seconds ? `, ${result.seconds}s` : "";
  return `- "${result.title}" (level ${result.level}): ${result.outcome}${extras.length ? `, ${extras.join(", ")}` : ""}${time}`;
}

/**
 * What the learner has shown on a track, as prompt lines.
 * @param {{ strong: string[], weak: string[], recent: object[] }} summary
 * @returns {string[]}
 */
export function aptitudeLines(summary) {
  if (summary.recent.length === 0) return ["Nothing yet, this is their first contact with this track."];
  return [
    `Strong concepts: ${summary.strong.join(", ") || "none confirmed yet"}`,
    `Weak concepts: ${summary.weak.join(", ") || "none detected"}`,
    "Recent results, newest first:",
    ...summary.recent.map(recentLine),
  ];
}

/**
 * One line per other track, so a path can lean on what the learner already shows elsewhere.
 * @param {{ title: string, summary: { strong: string[], weak: string[] } }[]} others
 * @returns {string[]}
 */
export function otherTrackLines(others) {
  const known = others.filter(({ summary }) => summary.strong.length + summary.weak.length > 0);
  if (known.length === 0) return [];
  return [
    "On their other tracks:",
    ...known.map(({ title, summary }) => `- ${title}: strong in ${summary.strong.join(", ") || "nothing yet"}; weak in ${summary.weak.join(", ") || "nothing yet"}`),
  ];
}
