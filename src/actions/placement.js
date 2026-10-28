/**
 * Reads the placement answers of a track. It stops at the first probe that was not clean,
 * since harder ones would say nothing new. Probes are forged one at a time, so once every
 * forged one is answered and the test is not over, the next one still has to be forged.
 * @param {string[]} queue probe ids, easiest first
 * @param {Record<string, "clean" | "struggled" | "skipped">} results
 * @param {Record<string, { difficulty: number }>} byId
 * @param {number} [size] probes the test takes in total, the forged ones when unknown
 * @returns {{ next: string | null, remaining: number, finished: boolean, stumbledAt: number | null, forgeDifficulty: number | null }}
 */
export function placementStatus(queue, results, byId, size = queue.length) {
  const probes = queue.filter((id) => byId[id]);
  const stumble = probes.find((id) => results[id] && results[id] !== "clean");
  if (stumble) return { next: null, remaining: 0, finished: true, stumbledAt: byId[stumble].difficulty, forgeDifficulty: null };
  const pending = probes.filter((id) => !results[id]);
  const remaining = Math.max(pending.length, size - (probes.length - pending.length));
  const forgeDifficulty = pending.length === 0 && probes.length < size ? probes.length + 1 : null;
  return { next: pending[0] ?? null, remaining, finished: remaining === 0, stumbledAt: null, forgeDifficulty };
}

/**
 * The probes as evidence for the path: what each one asked and how it went.
 * @param {string[]} queue
 * @param {Record<string, string>} results
 * @param {Record<string, { title: string, difficulty: number, concepts: string[] }>} byId
 * @returns {{ title: string, difficulty: number, concepts: string[], outcome: string }[]}
 */
export function placementEvidence(queue, results, byId) {
  return queue
    .filter((id) => byId[id])
    .map((id) => ({
      title: byId[id].title,
      difficulty: byId[id].difficulty,
      concepts: byId[id].concepts,
      outcome: results[id] ?? "not reached",
    }));
}
