import assert from "node:assert/strict";
import { test } from "node:test";
import { draftProblems, pathProblems, profileProblems } from "../src/actions/validate.js";

const draft = { title: "Nota", readme: "# Nota", starter: "x", reference: "y", test: "z", hints: ["h"], concepts: ["c"], minutes: 10 };

test("a complete draft has no problems", () => {
  assert.deepEqual(draftProblems(draft), []);
});

test("a draft missing pieces lists each one", () => {
  assert.deepEqual(draftProblems({ ...draft, test: "", hints: [], minutes: 0 }), [
    '"test" must be a non empty string',
    '"hints" must list at least one hint',
    '"minutes" must be a positive number',
  ]);
});

const level = { title: "t", summary: "s", concepts: ["c"], target: 3 };

test("a path needs at least three valid levels and a start among them", () => {
  assert.deepEqual(pathProblems({ startLevel: 1, levels: [level, level, level] }), []);
  assert.deepEqual(pathProblems({ startLevel: 4, levels: [level, level, { ...level, target: 0 }] }), [
    'level 3: "target" must be a positive integer',
    '"startLevel" must point at one of the levels',
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
