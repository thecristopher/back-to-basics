import { conceptTitle } from "../graph.js";

const LANGUAGES = { es: "Spanish", en: "English" };

/**
 * The name of the language the learner reads, for prompts.
 * @param {string} code e.g. "es"
 * @returns {string}
 */
export function languageName(code) {
  return LANGUAGES[code] ?? "English";
}

function titles(track, ids) {
  return ids.map((id) => conceptTitle(track, id)).join(", ");
}

function trippedPart(result) {
  if (!result.tripped?.length) return "";
  return `; tripped on: ${result.tripped.slice(0, 4).map((name) => `"${name}"`).join(", ")}`;
}

function mistakesPart(result) {
  if (!result.mistakes?.length) return "";
  return `; likely mistakes: ${result.mistakes.join(", ")}`;
}

function recentLine(result) {
  const extras = [
    result.failures ? `${result.failures} failed submits` : "",
    result.hints ? `${result.hints} hints` : "",
    result.runs ? `${result.runs} test runs` : "",
  ].filter(Boolean);
  const active = result.activeSeconds ? ` (${result.activeSeconds}s of real work, ${result.edits ?? 0} edits)` : "";
  const time = result.seconds ? `, ${result.seconds}s${active}` : active ? `,${active}` : "";
  const format = result.format ? ` [${result.format}]` : "";
  return `- "${result.title}"${format} (level ${result.level}): ${result.outcome}${extras.length ? `, ${extras.join(", ")}` : ""}${time}${trippedPart(result)}${mistakesPart(result)}`;
}

/**
 * What the learner has shown on a track, as prompt lines with the concepts by title.
 * @param {{ strong: string[], weak: string[], learning?: string[], recent: object[] }} summary concept ids, see summarizeMastery
 * @param {object} [track] its graph turns the ids into titles
 * @returns {string[]}
 */
export function masteryLines(summary, track) {
  if (summary.recent.length === 0) return ["Nothing yet, this is their first contact with this track."];
  return [
    `Owned concepts: ${titles(track, summary.strong) || "none confirmed yet"}`,
    `Weak concepts, they missed them last time: ${titles(track, summary.weak) || "none detected"}`,
    `Concepts still being learned: ${titles(track, summary.learning ?? []) || "none"}`,
    "Recent results, newest first (the tripped tests are the ones they failed before passing, the likely mistakes are known wrong solutions their runs matched):",
    ...summary.recent.map(recentLine),
  ];
}

/**
 * One line per other track, so a path can lean on what the learner already shows elsewhere.
 * @param {{ track: object, summary: { strong: string[], weak: string[] } }[]} others
 * @returns {string[]}
 */
export function otherTrackLines(others) {
  const known = others.filter(({ summary }) => summary.strong.length + summary.weak.length > 0);
  if (known.length === 0) return [];
  return [
    "On their other tracks:",
    ...known.map(({ track, summary }) => `- ${track.title}: owns ${titles(track, summary.strong) || "nothing yet"}; weak in ${titles(track, summary.weak) || "nothing yet"}`),
  ];
}
