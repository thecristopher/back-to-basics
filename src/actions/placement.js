/**
 * Reads the placement answers of a track. It stops at the first probe that was not clean,
 * since harder ones would say nothing new.
 * @param {string[]} queue probe ids, easiest first
 * @param {Record<string, "clean" | "struggled" | "skipped">} results
 * @param {Record<string, { difficulty: number }>} byId
 * @returns {{ next: string | null, remaining: number, finished: boolean, stumbledAt: number | null }}
 */
export function placementStatus(queue, results, byId) {
  const probes = queue.filter((id) => byId[id]);
  const stumble = probes.find((id) => results[id] && results[id] !== "clean");
  if (stumble) return { next: null, remaining: 0, finished: true, stumbledAt: byId[stumble].difficulty };
  const pending = probes.filter((id) => !results[id]);
  return { next: pending[0] ?? null, remaining: pending.length, finished: pending.length === 0, stumbledAt: null };
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
