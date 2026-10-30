import { slotTrack } from "./queue.js";

/**
 * Each round of a day with the exercise's title and concepts, in the order they were fought.
 * @param {{ rounds?: Record<string, { outcome: string, failures?: number, hints?: number }> } | undefined} day
 * @param {Record<string, { title: string, concepts?: string[] }>} byId
 * @returns {{ title: string, concepts: string[], outcome: string, failures: number, hints: number }[]}
 */
export function roundsOf(day, byId) {
  return Object.entries(day?.rounds ?? {})
    .filter(([id]) => byId[id])
    .map(([id, round]) => ({ title: byId[id].title, concepts: byId[id].concepts ?? [], outcome: round.outcome, failures: round.failures ?? 0, hints: round.hints ?? 0 }));
}

/**
 * The last day before today that had rounds, to remember how it went.
 * @param {Record<string, object>} days state.days
 * @param {string} today
 * @returns {string | null}
 */
export function lastSession(days, today) {
  const fought = Object.keys(days).filter((date) => date < today && Object.keys(days[date].rounds ?? {}).length > 0);
  return fought.sort().at(-1) ?? null;
}

/**
 * What today's queue holds, as words for a prompt: the exercises by title and the new ones by track.
 * @param {{ queue?: string[] | null, reviews?: string[] } | undefined} day
 * @param {Record<string, { title: string }>} byId
 * @param {Record<string, string>} trackTitles
 * @returns {string[]}
 */
export function plannedOf(day, byId, trackTitles) {
  return (day?.queue ?? []).map((entry) => {
    const track = slotTrack(entry);
    if (track) return `a new exercise of ${trackTitles[track] ?? track}`;
    const review = day.reviews?.includes(entry) ? " (review)" : "";
    return `${byId[entry]?.title ?? entry}${review}`;
  });
}

/**
 * One line per round for a prompt.
 * @param {{ title: string, outcome: string, failures: number, hints: number }} round
 * @returns {string}
 */
export function roundLine(round) {
  return `- "${round.title}": ${round.outcome}, ${round.failures} failed submits, ${round.hints} hints`;
}
