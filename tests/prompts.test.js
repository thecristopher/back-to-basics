import assert from "node:assert/strict";
import { test } from "node:test";
import { exercisePrompt, fixPrompt, isInterviewLevel } from "../src/actions/prompts/exercise.js";
import { pathPrompt } from "../src/actions/prompts/path.js";
import { profilePrompt } from "../src/actions/prompts/profile.js";

const track = { title: "Node.js", focus: "From the ground up.", ladder: ["basics", "async"], goal: "backend senior" };
const profile = { name: "JavaScript (Node.js)", testGuide: "Use node:test." };
const files = { solutionFile: "solution.js", testFile: "solution.test.js", importHint: 'import { x } from "./solution.js";' };
const summary = { strong: ["bucles"], weak: ["closures"], recent: [{ title: "Suma", level: 1, outcome: "clean", failures: 0, hints: 0, seconds: 42 }] };
const level = { level: 2, title: "Closures", summary: "Funciones que recuerdan.", concepts: ["closures", "this"] };
const base = { track, profile, files, level, count: 2, summary, language: "es", theme: "Claire, Malenia e Inde", example: { title: "Suma" } };

test("a practice prompt targets the level and the learner's weak concepts", () => {
  const prompt = exercisePrompt({ ...base, purpose: "practice", avoid: ["Contador"] });
  assert.match(prompt, /^BTB_TASK: exercises/);
  assert.match(prompt, /Write 2 exercises for level 2 of their path: "Closures"/);
  assert.match(prompt, /Weak concepts: closures/);
  assert.match(prompt, /Do not repeat these, already written: Contador/);
  assert.match(prompt, /Test data and examples: Claire, Malenia e Inde/);
  assert.match(prompt, /in Spanish/);
});

test("a placement prompt spreads probes across the ladder", () => {
  const prompt = exercisePrompt({ ...base, purpose: "placement", count: 5, summary: { strong: [], weak: [], recent: [] } });
  assert.match(prompt, /Write 5 placement probes/);
  assert.match(prompt, /basics; async/);
  assert.match(prompt, /first contact/);
});

test("the last 2 levels of a drawn path are interview levels", () => {
  const drawn = { ...track, path: { levels: [1, 2, 3, 4, 5, 6].map((number) => ({ level: number })) } };
  assert.equal(isInterviewLevel(drawn, { level: 4 }), false);
  assert.equal(isInterviewLevel(drawn, { level: 5 }), true);
  assert.equal(isInterviewLevel(drawn, { level: 6 }), true);
  assert.equal(isInterviewLevel(track, { level: 6 }), false);
});

test("an interview level asks for an Amazon, Zillow or Capital One onsite problem", () => {
  const drawn = { ...track, path: { levels: [{ level: 1 }, { level: 2 }, { level: 3 }] } };
  const prompt = exercisePrompt({ ...base, track: drawn, level: { ...level, level: 3 }, purpose: "practice" });
  assert.match(prompt, /real onsite problem at Amazon, Zillow or Capital One/);
  assert.match(prompt, /Set minutes between 30 and 60/);
});

test("an early level stays small and focused", () => {
  const prompt = exercisePrompt({ ...base, purpose: "practice" });
  assert.doesNotMatch(prompt, /onsite problem/);
});

test("a fix prompt carries the problems and the draft on its own line", () => {
  const prompt = fixPrompt({ draft: { slug: "suma" }, problems: ["The reference must pass"], files, profile });
  const lines = prompt.split("\n");
  assert.equal(lines[lines.indexOf("The exercise:") + 1], '{"slug":"suma"}');
  assert.match(prompt, /- The reference must pass/);
});

test("a path prompt on a redraw asks to keep the levels done", () => {
  const prompt = pathPrompt({ track, profileName: profile.name, summary, others: [], placement: [], kept: [{ level: 1, title: "Base", concepts: ["bucles"] }], language: "es" });
  assert.match(prompt, /^BTB_TASK: path/);
  assert.match(prompt, /Levels 1 to 1 are done/);
  assert.match(prompt, /No placement test was taken/);
});

test("from the very basics the placement stays on fundamentals", () => {
  const prompt = exercisePrompt({ ...base, purpose: "placement", count: 5, fromBasics: true, summary: { strong: [], weak: [], recent: [] } });
  assert.match(prompt, /return a value, add two numbers, compare two values/);
  assert.doesNotMatch(prompt, /interview level/);
});

test("from the very basics a single probe is a guided warm up", () => {
  const prompt = exercisePrompt({ ...base, purpose: "placement", count: 1, difficulty: 1, size: 3, fromBasics: true, avoid: [] });
  assert.match(prompt, /a comment listing the steps in plain words/);
  assert.match(prompt, /3 or 4 tests/);
});

test("the warm up covers the first two levels and stops at the third", () => {
  const first = { ...level, level: 1 };
  assert.match(exercisePrompt({ ...base, level: first, purpose: "practice", fromBasics: true }), /One idea per exercise/);
  assert.match(exercisePrompt({ ...base, purpose: "practice", fromBasics: true }), /One idea per exercise/);
  const third = { ...level, level: 3 };
  assert.doesNotMatch(exercisePrompt({ ...base, level: third, purpose: "practice", fromBasics: true }), /One idea per exercise/);
});

test("from the very basics the path starts at level 1 whatever the placement says", () => {
  const prompt = pathPrompt({ track, profileName: profile.name, summary, others: [], placement: [], kept: [], language: "es", fromBasics: true });
  assert.match(prompt, /Set startLevel to 1 whatever the placement says/);
  assert.doesNotMatch(prompt, /count as already passed/);
});

test("every path prompt ends the path at an Amazon, Zillow or Capital One onsite", () => {
  const prompt = pathPrompt({ track, profileName: profile.name, summary, others: [], placement: [], kept: [], language: "es" });
  assert.match(prompt, /real onsite loop at Amazon, Zillow or Capital One/);
  assert.match(prompt, /the last 2 levels are interview levels/);
});

test("a profile prompt names the language, the platform and the last problems", () => {
  const prompt = profilePrompt({ language: "Rust", platform: "linux x64", problems: ["cargo not found"] });
  assert.match(prompt, /for Rust on linux x64/);
  assert.match(prompt, /- cargo not found/);
});

test("no prompt carries an em dash", () => {
  const prompts = [exercisePrompt({ ...base, purpose: "practice" }), pathPrompt({ track, profileName: "x", summary, others: [], placement: [], kept: [], language: "es" }), profilePrompt({ language: "Go", platform: "darwin" })];
  for (const prompt of prompts) assert.doesNotMatch(prompt, /\u2014/);
});
