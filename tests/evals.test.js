import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRates, gradeExercise } from "../src/actions/evals.js";
import { runEvals } from "../scripts/eval-prompts.mjs";

const FAKE_CLAUDE = new URL("./fixtures/fake-claude.js", import.meta.url).pathname;

const exercise = {
  meta: { minutes: 10, hints: ["a", "b", "c"], example: { call: "nota()", result: "1" }, concepts: ["closures"], format: "build" },
  readme: "## La historia\n## Qué construyes\n## Cómo se comporta\n## Ejemplo\n```js\nnota() // 1\n```\n## Qué usas\n",
  test: "assert.equal(nota(), 1)",
  reference: "export function nota() {\n  return 1;\n}\n",
  mutants: [
    { mistake: "a", nudge: "¿a?", caughtBy: ["t"] },
    { mistake: "b", nudge: "¿b?", caughtBy: ["t"] },
  ],
};

test("an exercise that holds every check passes the eval of Claire's scenario", () => {
  const grade = gradeExercise(exercise, { expect: { concept: "closures", maxReferenceLines: 3 } }, 0);
  assert.equal(grade.ok, true, JSON.stringify(grade.checks));
});

test("a fix round, a missing hint or the wrong format each fail their own check", () => {
  const grade = gradeExercise({ ...exercise, meta: { ...exercise.meta, hints: ["a"] } }, { expect: { format: "debug" } }, 1);
  const failed = Object.entries(grade.checks).filter(([, held]) => !held).map(([name]) => name);
  assert.deepEqual(failed, ["valid on the first try", "3 hints", "format is debug"]);
});

test("nothing forged is a failed scenario", () => {
  assert.deepEqual(gradeExercise(null, {}, 2), { ok: false, checks: { forged: false } });
});

test("the rates add up each check across Malenia's scenarios", () => {
  assert.deepEqual(checkRates([{ checks: { forged: true } }, { checks: { forged: false } }]), { forged: { passed: 1, total: 2 } });
});

test("the eval plays scenarios end to end and counts the fix rounds, here with the fake Claude", async () => {
  const scenarios = [
    { name: "bug-hunt", track: "node", level: 5, weak: { concept: "array-reduce", mistake: "olvida el valor inicial" }, expect: { concept: "array-reduce", format: "debug" } },
    { name: "spaced-review", track: "node", level: 8, review: "closures", expect: { concept: "closures", review: true } },
  ];
  const report = await runEvals(scenarios, { claude: [process.execPath, FAKE_CLAUDE] });
  assert.equal(report.total, 2);
  for (const result of report.results) {
    assert.equal(result.checks.forged, true, result.name);
    assert.equal(result.fixRounds, 0);
    assert.deepEqual(result.fixes, []);
    assert.equal(result.checks[`teaches ${scenarios.find((s) => s.name === result.name).expect.concept}`], true, result.name);
  }
  assert.equal(report.results[0].checks["format is debug"], true);
  assert.equal(report.results[1].checks["is a review"], true);
});

test("a draft sent back to Claude leaves the problems that sent it back in the report", async () => {
  const scenarios = [{ name: "broken-reference", track: "node", level: 2, expect: {} }];
  const report = await runEvals(scenarios, { claude: [process.execPath, FAKE_CLAUDE], env: { FAKE_CLAUDE_BROKEN: "1" } });
  const [result] = report.results;
  assert.equal(result.fixRounds, 1);
  assert.match(result.fixes[0][0], /The reference must pass every test/);
});
