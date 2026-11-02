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

/**
 * The level of an authored path a placement probe measures. Probes spread from level 1 to the last level
 * before the interview ones, so the placement never skips the onsite levels.
 * @param {number} difficulty 1 to size
 * @param {number} size probes in the test
 * @param {number} levelCount levels in the path
 * @returns {number}
 */
export function probeLevel(difficulty, size, levelCount) {
  const top = Math.max(1, levelCount - 2);
  if (size <= 1) return 1;
  return 1 + Math.round(((difficulty - 1) * (top - 1)) / (size - 1));
}

/**
 * Where an authored path starts after the placement: right after the hardest level a clean probe proved,
 * so a stumble never drops the learner into the level that tripped them, and never past the last level
 * before the interview ones. A stumble on the first probe, or no probes at all, starts at level 1.
 * @param {{ difficulty: number, outcome: string }[]} evidence probes, easiest first
 * @param {number} size
 * @param {number} levelCount
 * @param {{ fromBasics?: boolean }} [options] fromBasics always starts at level 1
 * @returns {number}
 */
export function startFromPlacement(evidence, size, levelCount, { fromBasics = false } = {}) {
  if (fromBasics) return 1;
  const stumble = evidence.findIndex((probe) => probe.outcome !== "clean");
  const proven = stumble === -1 ? evidence : evidence.slice(0, stumble);
  if (proven.length === 0) return 1;
  const hardest = Math.max(...proven.map((probe) => probe.difficulty));
  return Math.min(Math.max(1, levelCount - 2), probeLevel(hardest, size, levelCount) + 1);
}
