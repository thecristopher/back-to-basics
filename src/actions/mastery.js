/** Clean solves on distinct days a concept needs before it counts as owned. */
export const OWN_DAYS = 2;

const RECENT_KEPT = 12;
const DAYS_KEPT = 6;

function emptyTrack() {
  return { concepts: {}, recent: [] };
}

function emptyConcept() {
  return { clean: 0, struggled: 0, skipped: 0, cleanDays: [], last: null, lastAt: null };
}

function noteConcept(entry, outcome, today) {
  entry[outcome] += 1;
  entry.last = outcome;
  entry.lastAt = today;
  if (outcome === "clean" && !entry.cleanDays.includes(today)) {
    entry.cleanDays = [...entry.cleanDays, today].slice(-DAYS_KEPT);
  }
}

/**
 * Records how an exercise went into the track's mastery: every concept it practiced, and the recent results.
 * @param {Record<string, object>} mastery all tracks, mutated in place
 * @param {{ track: string, title: string, level: number, conceptIds: string[] }} exercise
 * @param {{ outcome: "clean" | "struggled" | "skipped", failures: number, hints: number, seconds: number | null, tripped?: string[] }} result
 * @param {string} today YYYY-MM-DD
 */
export function noteResult(mastery, exercise, result, today) {
  const track = (mastery[exercise.track] ??= emptyTrack());
  for (const id of exercise.conceptIds ?? []) {
    noteConcept((track.concepts[id] ??= emptyConcept()), result.outcome, today);
  }
  track.recent.unshift({ title: exercise.title, level: exercise.level, concepts: exercise.conceptIds ?? [], ...result });
  track.recent.length = Math.min(track.recent.length, RECENT_KEPT);
}

/**
 * Where a concept stands. Owned takes clean solves on different days, so one lucky afternoon is not enough,
 * and the last round has to be clean too: a miss after owning it sends it back to weak.
 * @param {{ cleanDays: string[], last: string | null } | undefined} entry
 * @returns {"new" | "learning" | "weak" | "owned"}
 */
export function standingOf(entry) {
  if (!entry?.last) return "new";
  if (entry.last !== "clean") return "weak";
  return entry.cleanDays.length >= OWN_DAYS ? "owned" : "learning";
}

/**
 * Clean days a concept still needs to be owned, 1 for a weak one that already had its days.
 * @param {object | undefined} entry
 * @returns {number}
 */
export function daysToOwn(entry) {
  const standing = standingOf(entry);
  if (standing === "owned") return 0;
  if (standing === "weak") return Math.max(1, OWN_DAYS - (entry.cleanDays?.length ?? 0));
  return OWN_DAYS - (entry?.cleanDays?.length ?? 0);
}

const FOCUS_ORDER = { weak: 0, learning: 1, new: 2 };

/**
 * The concept the next exercise of a level should teach: a weak one first, then one half learned,
 * then the next new one in path order. Small steps, one idea at a time, nothing left half done.
 * @param {{ concepts: string[] }} level
 * @param {Record<string, object>} concepts the track's mastery by concept id
 * @returns {string | null} null when every concept of the level is owned
 */
export function focusConcept(level, concepts) {
  const pending = level.concepts
    .map((id, index) => ({ id, index, standing: standingOf(concepts?.[id]) }))
    .filter((entry) => entry.standing !== "owned");
  if (pending.length === 0) return null;
  pending.sort((a, b) => FOCUS_ORDER[a.standing] - FOCUS_ORDER[b.standing] || a.index - b.index);
  return pending[0].id;
}

/**
 * What a track's mastery says, as concept ids: owned ones, weak ones and the latest results.
 * @param {{ concepts: Record<string, object>, recent: object[] } | undefined} track
 * @returns {{ strong: string[], weak: string[], learning: string[], recent: object[] }}
 */
export function summarizeMastery(track) {
  if (!track) return { strong: [], weak: [], learning: [], recent: [] };
  const entries = Object.entries(track.concepts);
  const withStanding = (standing) => entries.filter(([, entry]) => standingOf(entry) === standing).map(([id]) => id);
  return { strong: withStanding("owned"), weak: withStanding("weak"), learning: withStanding("learning"), recent: track.recent.slice(0, 8) };
}
