import { conceptTitle } from "./graph.js";
import { standingOf } from "./mastery.js";
import { isInterviewLevel } from "./prompts/exercise.js";

/**
 * True when the exercise belongs to one of the last 2 levels of its drawn path, the onsite ones.
 * Placement probes never count, they come before any path.
 * @param {{ path?: { levels: object[] } | null } | undefined} track
 * @param {{ level: number, placement?: boolean }} exercise
 * @returns {boolean}
 */
export function isOnsite(track, exercise) {
  if (!track || exercise.placement) return false;
  return isInterviewLevel(track, { level: exercise.level });
}

/**
 * When the redo's clock started: kept while the redo goes on, restarted when it begins fresh.
 * @param {Record<string, number>} starts started redos by exercise id, mutated in place
 * @param {string} id
 * @param {number} now epoch milliseconds
 * @param {boolean} fresh the redo starts over from the starter
 * @returns {number}
 */
export function redoStart(starts, id, now, fresh) {
  if (fresh || !starts[id]) starts[id] = now;
  return starts[id];
}

/**
 * How a redo went against the first time you solved it.
 * @param {number | null} seconds the redo's time
 * @param {number | null | undefined} ghostSeconds the best time of the first solution
 * @returns {"ahead" | "behind" | "tied" | null} null when one of the two times is unknown
 */
export function ghostVerdict(seconds, ghostSeconds) {
  if (seconds == null || ghostSeconds == null) return null;
  if (seconds < ghostSeconds) return "ahead";
  if (seconds > ghostSeconds) return "behind";
  return "tied";
}

/**
 * The question a lesson leaves to think about: its last section, when that section asks something.
 * @param {string | null} markdown the lesson
 * @returns {string | null}
 */
export function lessonQuestion(markdown) {
  if (!markdown) return null;
  const sections = markdown.split(/^##\s+.*$/m);
  if (sections.length < 2) return null;
  const last = sections[sections.length - 1].trim();
  return last.includes("?") ? last : null;
}

const STANDING_ORDER = { weak: 0, learning: 1, owned: 2 };

function trackRows(trackId, entries, track) {
  return Object.entries(entries ?? {}).map(([id, entry]) => ({
    track: trackId,
    id,
    concept: conceptTitle(track, id),
    clean: entry.clean,
    struggled: entry.struggled,
    skipped: entry.skipped,
    standing: standingOf(entry),
  }));
}

/**
 * Every concept fought so far with where it stands, per track, the costly ones first.
 * @param {Record<string, { concepts: Record<string, object> }> | undefined} mastery
 * @param {{ id: string, graph?: object }[]} [tracks] their graphs give each concept its title
 * @returns {{ track: string, id: string, concept: string, clean: number, struggled: number, skipped: number, standing: "owned" | "weak" | "learning" }[]}
 */
export function conceptStanding(mastery, tracks = []) {
  const rows = Object.entries(mastery ?? {}).flatMap(([trackId, entry]) => trackRows(trackId, entry.concepts, tracks.find((track) => track.id === trackId)));
  return rows.sort(
    (a, b) => a.track.localeCompare(b.track) || STANDING_ORDER[a.standing] - STANDING_ORDER[b.standing] || a.concept.localeCompare(b.concept),
  );
}
