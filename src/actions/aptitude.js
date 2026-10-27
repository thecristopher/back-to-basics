const RECENT_KEPT = 12;

function emptyAptitude() {
  return { concepts: {}, recent: [] };
}

/**
 * Records how an exercise went into the track's aptitude: per concept tallies and the recent results.
 * @param {Record<string, object>} aptitudes all tracks, mutated in place
 * @param {{ track: string, title: string, level: number, concepts: string[] }} exercise
 * @param {{ outcome: "clean" | "struggled" | "skipped", failures: number, hints: number, seconds: number | null }} result
 */
export function noteResult(aptitudes, exercise, result) {
  const aptitude = (aptitudes[exercise.track] ??= emptyAptitude());
  for (const concept of exercise.concepts) {
    const tally = (aptitude.concepts[concept] ??= { clean: 0, struggled: 0, skipped: 0 });
    tally[result.outcome] += 1;
  }
  aptitude.recent.unshift({ title: exercise.title, level: exercise.level, ...result });
  aptitude.recent.length = Math.min(aptitude.recent.length, RECENT_KEPT);
}

function misses(tally) {
  return tally.struggled + tally.skipped;
}

/**
 * What a track's aptitude says: concepts the learner owns, concepts that cost them, and the latest results.
 * @param {{ concepts: Record<string, { clean: number, struggled: number, skipped: number }>, recent: object[] } | undefined} aptitude
 * @returns {{ strong: string[], weak: string[], recent: object[] }}
 */
export function summarizeAptitude(aptitude) {
  if (!aptitude) return { strong: [], weak: [], recent: [] };
  const entries = Object.entries(aptitude.concepts);
  const strong = entries
    .filter(([, tally]) => tally.clean >= 2 && tally.clean > misses(tally))
    .sort(([, a], [, b]) => b.clean - a.clean)
    .map(([concept]) => concept);
  const weak = entries
    .filter(([, tally]) => misses(tally) > 0 && misses(tally) >= tally.clean)
    .sort(([, a], [, b]) => misses(b) - misses(a))
    .map(([concept]) => concept);
  return { strong: strong.slice(0, 8), weak: weak.slice(0, 8), recent: aptitude.recent.slice(0, 8) };
}
