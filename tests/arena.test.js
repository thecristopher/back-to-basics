import assert from "node:assert/strict";
import { test } from "node:test";
import { conceptStanding, ghostVerdict, isOnsite, lessonQuestion, redoStart } from "../src/actions/arena.js";
import { parseBtbJson, parseNodeTest, parseVitest, solutionLine } from "../src/actions/report.js";

const path = { path: { levels: [1, 2, 3, 4, 5, 6].map((level) => ({ level })) } };

test("the last 2 levels of Claire's path are onsite fights", () => {
  assert.equal(isOnsite(path, { level: 5 }), true);
  assert.equal(isOnsite(path, { level: 6 }), true);
  assert.equal(isOnsite(path, { level: 4 }), false);
});

test("a placement probe is never an onsite fight, even at Malenia's level", () => {
  assert.equal(isOnsite(path, { level: 6, placement: true }), false);
  assert.equal(isOnsite(undefined, { level: 6 }), false);
});

test("the redo clock keeps running until Inde starts over", () => {
  const starts = {};
  assert.equal(redoStart(starts, "node/love-notes", 1000, false), 1000);
  assert.equal(redoStart(starts, "node/love-notes", 5000, false), 1000);
  assert.equal(redoStart(starts, "node/love-notes", 9000, true), 9000);
});

test("Claire beats her ghost, falls behind it or ties it", () => {
  assert.equal(ghostVerdict(300, 420), "ahead");
  assert.equal(ghostVerdict(500, 420), "behind");
  assert.equal(ghostVerdict(420, 420), "tied");
});

test("there is no ghost to race when a time is missing", () => {
  assert.equal(ghostVerdict(null, 420), null);
  assert.equal(ghostVerdict(300, null), null);
});

test("the lesson's closing question comes out of its last section", () => {
  const lesson = "# Closures\nUna función recuerda.\n\n## Errores típicos\n- Olvidar el return.\n\n## Para pensar\n¿Qué recuerda la carta que Malenia guardó?\n";
  assert.equal(lessonQuestion(lesson), "¿Qué recuerda la carta que Malenia guardó?");
});

test("a lesson that asks nothing at the end has no question", () => {
  assert.equal(lessonQuestion("# Fechas\n\n## Errores típicos\n- Contar desde 0."), null);
  assert.equal(lessonQuestion("# Sin secciones"), null);
  assert.equal(lessonQuestion(null), null);
});

test("a stack frame inside the solution gives the line to point at", () => {
  const stack = "TypeError: x is not a function\n    at anniversary (file:///tmp/run-1/solution.js:12:5)\n    at TestContext (file:///tmp/run-1/solution.test.js:4:3)";
  assert.equal(solutionLine(stack), 12);
});

test("the test file never passes for the solution", () => {
  assert.equal(solutionLine("at file:///tmp/run-1/solution.test.js:4:3"), null);
  assert.equal(solutionLine('File "/tmp/run-1/test_solution.py", line 3\n  test_solution.py:3: AssertionError'), null);
  assert.equal(solutionLine("solution.py:8: in playlist"), 8);
});

test("every reporter carries the line only when it knows it", () => {
  const node = parseNodeTest('{"btb":1,"name":"date","ok":false,"message":"boom","line":7}\n{"btb":1,"name":"kiss","ok":true,"message":null}');
  assert.deepEqual(node.tests, [
    { name: "date", ok: false, message: "boom", line: 7 },
    { name: "kiss", ok: true, message: null },
  ]);
  const vitest = parseVitest(JSON.stringify({ testResults: [{ assertionResults: [{ title: "like", status: "failed", failureMessages: ["Error\n at Like (/tmp/solution.jsx:9:2)"] }] }] }));
  assert.equal(vitest.tests[0].line, 9);
  const pytest = parseBtbJson(JSON.stringify({ tests: [{ name: "playlist", ok: false, message: "no", line: 3 }] }));
  assert.equal(pytest.tests[0].line, 3);
});

test("Claire's concepts stand owned, weak or still being learned, the costly ones first", () => {
  const aptitudes = {
    node: {
      concepts: {
        closures: { clean: 3, struggled: 0, skipped: 0 },
        recursion: { clean: 0, struggled: 1, skipped: 1 },
        reduce: { clean: 1, struggled: 0, skipped: 0 },
      },
    },
  };
  assert.deepEqual(
    conceptStanding(aptitudes).map(({ concept, standing }) => [concept, standing]),
    [
      ["recursion", "weak"],
      ["reduce", "learning"],
      ["closures", "owned"],
    ],
  );
});

test("Inde has no concepts before her first fight", () => {
  assert.deepEqual(conceptStanding(undefined), []);
});
