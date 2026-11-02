/** Wrong solutions an exercise must bring, so its tests prove they catch real mistakes. */
export const MUTANTS_MIN = 2;
const MUTANTS_MAX = 3;

function sameCode(a, b) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function oneMutantProblems(mutant, index, draft) {
  const where = `mutant ${index + 1}`;
  if (typeof mutant?.mistake !== "string" || mutant.mistake.trim() === "") return [`${where}: "mistake" must say in words what is wrong`];
  if (typeof mutant.code !== "string" || mutant.code.trim() === "") return [`${where}: "code" must be the wrong solution`];
  if (typeof mutant.nudge !== "string" || mutant.nudge.trim() === "") return [`${where}: "nudge" must point someone who made this mistake at it without giving the fix`];
  if (sameCode(mutant.code, draft.reference)) return [`${where} ("${mutant.mistake}") is the reference itself`];
  if (sameCode(mutant.code, draft.starter)) return [`${where} ("${mutant.mistake}") is the empty starter, write the solution a learner would really get wrong`];
  return [];
}

/**
 * Lists what is wrong with the shape of a draft's mutants, before running anything.
 * @param {{ mutants?: { mistake: string, code: string }[], reference: string, starter: string }} draft
 * @returns {string[]}
 */
export function mutantShapeProblems(draft) {
  const mutants = draft?.mutants;
  if (!Array.isArray(mutants) || mutants.length < MUTANTS_MIN || mutants.length > MUTANTS_MAX) {
    return [`"mutants" must list ${MUTANTS_MIN} or ${MUTANTS_MAX} wrong solutions a learner would really write`];
  }
  return mutants.flatMap((mutant, index) => oneMutantProblems(mutant, index, draft));
}

/**
 * Judges one mutant's run: it must fail at least one test without crashing the whole run.
 * @param {{ mistake: string }} mutant
 * @param {{ ok: boolean, crashed?: boolean, tests: { name: string, ok: boolean }[] }} result
 * @returns {{ problem: string | null, caughtBy: string[] }} caughtBy names the tests that catch it
 */
export function judgeMutant(mutant, result) {
  if (result.ok) return { problem: `The tests let a wrong solution pass ("${mutant.mistake}"). Add a test that catches it.`, caughtBy: [] };
  if (result.crashed) return { problem: `The wrong solution "${mutant.mistake}" crashes the run instead of failing a test. Make it a mistake that runs.`, caughtBy: [] };
  return { problem: null, caughtBy: result.tests.filter((test) => !test.ok).map((test) => test.name) };
}

/**
 * The mistakes a learner most likely made: a mistake counts when some run of the round failed every test that
 * catches it. Only runs that failed part of the tests count, an empty body that fails them all says nothing.
 * @param {{ mistake: string, caughtBy: string[] }[]} mutants
 * @param {string[][]} partialFailures failing test names of each run that failed some tests but not all
 * @returns {string[]}
 */
export function likelyMistakes(mutants, partialFailures) {
  return mutants.filter((mutant) => partialFailures.some((failing) => matches(mutant, failing))).map((mutant) => mutant.mistake);
}

// a run looks like a mistake when it failed every test that catches it
function matches(mutant, failing) {
  return mutant.caughtBy.length > 0 && mutant.caughtBy.every((name) => failing.includes(name));
}

/**
 * The known mistake a run looks like, so the next hint can aim straight at it. Only a run that failed part
 * of the tests says anything, and a mistake already pointed at this round is not pointed at twice.
 * @param {{ mistake: string, caughtBy: string[], nudge?: string }[]} mutants
 * @param {{ passed: number, failing: string[], error?: string | null } | null} run the latest run of the round
 * @param {string[]} [seen] mistakes already nudged this round
 * @returns {{ mistake: string, nudge: string } | null}
 */
export function nudgeFor(mutants, run, seen = []) {
  if (!run || run.error || run.passed === 0 || run.failing.length === 0) return null;
  const found = mutants.find((mutant) => mutant.nudge && !seen.includes(mutant.mistake) && matches(mutant, run.failing));
  return found ? { mistake: found.mistake, nudge: found.nudge } : null;
}
