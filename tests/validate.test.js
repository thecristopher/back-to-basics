import assert from "node:assert/strict";
import { test } from "node:test";
import { complexityProblems, draftProblems, exampleProblems, pathProblems, profileProblems } from "../src/actions/validate.js";

const draft = {
  title: "Nota",
  readme: '# Nota\n\n```js\nnota("Claire"); // "Inde"\n```\n',
  lesson: "# Closures",
  starter: "x",
  reference: "y",
  test: 'assert.equal(nota( "Claire" ), "Inde");',
  example: { call: 'nota("Claire")', result: '"Inde"' },
  hints: ["h"],
  concepts: ["c"],
  minutes: 10,
};

test("a complete draft has no problems", () => {
  assert.deepEqual(draftProblems(draft), []);
});

test("a draft without a lesson is refused", () => {
  assert.deepEqual(draftProblems({ ...draft, lesson: "" }), ['"lesson" must be a non empty string']);
});

test("a draft missing pieces lists each one", () => {
  assert.deepEqual(draftProblems({ ...draft, lesson: "", hints: [], minutes: 0 }), [
    '"lesson" must be a non empty string',
    '"hints" must list at least one hint',
    '"minutes" must be a positive number',
  ]);
});

test("the worked example of Claire's note is asserted by a test, spaces aside", () => {
  assert.deepEqual(exampleProblems(draft), []);
});

test("an example the tests never check sends the exercise back", () => {
  const untested = { ...draft, test: 'assert.equal(nota("Malenia"), "Inde");' };
  assert.deepEqual(exampleProblems(untested), ['The worked example must be asserted by a test, word for word: the example\'s call `nota("Claire")` is not in the tests']);
});

test("an example whose result the readme never shows is not a worked example", () => {
  const problems = exampleProblems({ ...draft, readme: "# Nota" });
  assert.match(problems[0], /call `nota\("Claire"\)` is not in the readme; the example's result `"Inde"` is not in the readme/);
});

test("a draft with no example is asked for one", () => {
  assert.match(exampleProblems({ ...draft, example: undefined })[0], /"example" must name the "call"/);
});

test("a React draft without its preview is refused, a Node one does not need it", () => {
  assert.deepEqual(draftProblems(draft, { preview: true }), ['"preview" must be a non empty string']);
  assert.deepEqual(draftProblems({ ...draft, preview: "export default function Preview() {}" }, { preview: true }), []);
  assert.deepEqual(draftProblems(draft, { preview: false }), []);
});

const level = { title: "t", summary: "s", concepts: [{ id: "love-notes", title: "Cartas de Claire" }] };

test("a path needs at least three valid levels and a start among them", () => {
  assert.deepEqual(pathProblems({ startLevel: 1, levels: [level, level, level] }), []);
  assert.deepEqual(pathProblems({ startLevel: 4, levels: [level, level, { ...level, concepts: ["Cartas de Claire"] }] }), [
    'level 3: concept "Cartas de Claire" needs a kebab case "id"',
    '"startLevel" must point at one of the levels',
  ]);
});

test("an exercise aimed at a graph only names its ids, the one it teaches first", () => {
  const aimed = { allowed: ["closures", "recursion"], primary: "closures" };
  assert.deepEqual(draftProblems({ ...draft, concepts: ["closures", "recursion"] }, aimed), []);
  assert.deepEqual(draftProblems({ ...draft, concepts: ["recursion", "rennala-spells"] }, aimed), [
    '"concepts" must only use these ids: closures, recursion. Unknown: rennala-spells',
    '"concepts" must start with "closures", the concept this exercise teaches',
  ]);
});

test("a redrawn path must go past the levels already done", () => {
  assert.ok(pathProblems({ startLevel: 1, levels: [level, level, level] }, 3).some((problem) => problem.includes("go past")));
});

const profile = {
  id: "rust",
  name: "Rust",
  solutionFile: "lib.rs",
  testFile: "tests.rs",
  importHint: "use crate::*;",
  testGuide: "cargo test",
  install: "rustup",
  check: [["rustc", "--version"]],
  test: ["rustc", "--test", "{test}"],
  report: "exit-code",
  sample: { solution: "a", broken: "b", test: "c" },
};

test("a learned profile with everything in place has no problems", () => {
  assert.deepEqual(profileProblems(profile), []);
});

test("a learned profile cannot claim a built in report or reach outside its folder", () => {
  const problems = profileProblems({ ...profile, report: "vitest-json", testFile: "../evil.rs" });
  assert.deepEqual(problems, ['"testFile" must be a plain file name', '"report" must be one of: tap, exit-code']);
});

test("an onsite level exercise declares its Big O in the reference and checks it in a test", () => {
  assert.deepEqual(complexityProblems({ reference: 'export const COMPLEXITY = "O(n)";', test: "assert.equal(COMPLEXITY, \"O(n)\")" }), []);
  assert.deepEqual(complexityProblems({ reference: "x", test: "y" }), [
    "The reference must use COMPLEXITY: the solution declares its Big O and one test checks it",
    "The tests must use COMPLEXITY: the solution declares its Big O and one test checks it",
  ]);
  assert.equal(draftProblems(draft, { complexity: true }).length, 2);
});
