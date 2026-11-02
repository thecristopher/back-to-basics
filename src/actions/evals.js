import { exampleProblems } from "./validate.js";

function headings(markdown) {
  return (markdown.match(/^#{2,3} /gm) ?? []).length;
}

function codeLines(code) {
  return code.split("\n").filter((line) => line.trim() && !/^\s*(\/\/|#|\*|\/\*\*|""")/.test(line)).length;
}

function minutesFit(meta, interview) {
  return interview ? meta.minutes >= 30 && meta.minutes <= 60 : meta.minutes >= 5 && meta.minutes <= 30;
}

// what every exercise must show, whatever the scenario
function baseChecks(exercise, interview) {
  const { meta, readme, test, mutants } = exercise;
  return {
    "explains in 5 sections": headings(readme) >= 5,
    "3 hints": meta.hints.length === 3,
    "minutes fit the level": minutesFit(meta, interview),
    "example asserted by a test": exampleProblems({ example: meta.example, readme, test }).length === 0,
    "mutants caught": !mutants || (mutants.length >= 2 && mutants.every((mutant) => mutant.caughtBy.length > 0 && mutant.nudge)),
  };
}

// what the scenario's learner needs on top
function expectedChecks(exercise, expect = {}) {
  const { meta, reference } = exercise;
  const checks = {};
  if (expect.format) checks[`format is ${expect.format}`] = meta.format === expect.format;
  if (expect.complexity) checks["declares its Big O"] = meta.declaresComplexity === true && reference.includes("COMPLEXITY");
  if (expect.review) checks["is a review"] = meta.review === true;
  if (expect.maxReferenceLines) checks[`reference within ${expect.maxReferenceLines} lines`] = codeLines(reference) <= expect.maxReferenceLines;
  if (expect.maxMinutes) checks[`at most ${expect.maxMinutes} minutes`] = meta.minutes <= expect.maxMinutes;
  if (expect.concept) checks[`teaches ${expect.concept}`] = meta.concepts[0] === expect.concept;
  return checks;
}

/**
 * Grades one forged exercise against what every exercise must show and what its scenario expects.
 * @param {{ meta: object, readme: string, test: string, reference: string, mutants: object[] | null } | null} exercise null when nothing survived the forge
 * @param {{ expect?: object, interview?: boolean }} scenario
 * @param {number} fixRounds how many times the draft went back to Claude
 * @returns {{ ok: boolean, checks: Record<string, boolean> }}
 */
export function gradeExercise(exercise, scenario, fixRounds) {
  if (!exercise) return { ok: false, checks: { forged: false } };
  const checks = { forged: true, "valid on the first try": fixRounds === 0, ...baseChecks(exercise, scenario.interview), ...expectedChecks(exercise, scenario.expect) };
  return { ok: Object.values(checks).every(Boolean), checks };
}

/**
 * The share of each check that held across a run, so a prompt change shows what it improved or broke.
 * @param {{ checks: Record<string, boolean> }[]} results
 * @returns {Record<string, { passed: number, total: number }>}
 */
export function checkRates(results) {
  const rates = {};
  for (const { checks } of results) {
    for (const [name, held] of Object.entries(checks)) {
      rates[name] ??= { passed: 0, total: 0 };
      rates[name].total += 1;
      if (held) rates[name].passed += 1;
    }
  }
  return rates;
}
