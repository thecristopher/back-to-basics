const FAILING_KEPT = 8;

function errorOf(result) {
  if (result.timedOut) return "timeout";
  if (result.crashed) return "crash";
  return null;
}

/**
 * One line of the run log: which exercise, what kind of run, and which tests failed.
 * @param {{ id: string, track: string }} exercise
 * @param {"test" | "submit" | "redo"} kind
 * @param {{ ok: boolean, passed: number, tests: { name: string, ok: boolean }[], timedOut?: boolean, crashed?: boolean }} result
 * @param {Date} [now]
 * @returns {{ at: string, id: string, track: string, kind: string, ok: boolean, passed: number, total: number, failing: string[], error: string | null }}
 */
export function runEntry(exercise, kind, result, now = new Date()) {
  return {
    at: now.toISOString(),
    id: exercise.id,
    track: exercise.track,
    kind,
    ok: result.ok,
    passed: result.passed,
    total: result.tests.length,
    failing: result.tests.filter((test) => !test.ok).map((test) => test.name).slice(0, FAILING_KEPT),
    error: errorOf(result),
  };
}

/**
 * The tests that failed during the current round of an exercise, each named once, in the order they first failed.
 * @param {object[]} runs the run log, oldest first
 * @param {string} id exercise id
 * @param {number | null} startedAt when the round started, in ms; null takes every run of the exercise
 * @returns {string[]}
 */
export function trippedThisRound(runs, id, startedAt) {
  const since = startedAt ?? 0;
  const names = runs
    .filter((run) => run.id === id && run.kind !== "redo" && Date.parse(run.at) >= since)
    .flatMap((run) => (run.error ? [run.error] : run.failing));
  return [...new Set(names)];
}

/**
 * How many runs the learner made on an exercise during the current round, practice runs included.
 * @param {object[]} runs
 * @param {string} id
 * @param {number | null} startedAt
 * @returns {number}
 */
export function runsThisRound(runs, id, startedAt) {
  const since = startedAt ?? 0;
  return runs.filter((run) => run.id === id && run.kind !== "redo" && Date.parse(run.at) >= since).length;
}
