import assert from "node:assert/strict";
import { test } from "node:test";
import { daysToOwn, focusConcept, noteResult, standingOf, summarizeMastery } from "../src/actions/mastery.js";

const loveNotes = { track: "node", title: "Cartas de Claire para Inde", level: 2, conceptIds: ["loops", "accumulator"] };
const clean = { outcome: "clean", failures: 0, hints: 0, seconds: 120 };
const struggled = { outcome: "struggled", failures: 3, hints: 1, seconds: 900, tripped: ["devuelve 0 con una lista vacía"] };

test("a clean solve marks every concept of the exercise as being learned", () => {
  const mastery = {};
  noteResult(mastery, loveNotes, clean, "2026-11-01");
  assert.equal(standingOf(mastery.node.concepts.loops), "learning");
  assert.equal(standingOf(mastery.node.concepts.accumulator), "learning");
});

test("two clean solves on the same day still do not own a concept", () => {
  const mastery = {};
  noteResult(mastery, loveNotes, clean, "2026-11-01");
  noteResult(mastery, loveNotes, clean, "2026-11-01");
  assert.equal(standingOf(mastery.node.concepts.loops), "learning");
});

test("clean solves on two different days own a concept", () => {
  const mastery = {};
  noteResult(mastery, loveNotes, clean, "2026-11-01");
  noteResult(mastery, loveNotes, clean, "2026-11-03");
  assert.equal(standingOf(mastery.node.concepts.loops), "owned");
  assert.equal(daysToOwn(mastery.node.concepts.loops), 0);
});

test("a miss after owning a concept sends it back to weak until one more clean day", () => {
  const mastery = {};
  noteResult(mastery, loveNotes, clean, "2026-11-01");
  noteResult(mastery, loveNotes, clean, "2026-11-03");
  noteResult(mastery, loveNotes, struggled, "2026-11-05");
  assert.equal(standingOf(mastery.node.concepts.loops), "weak");
  assert.equal(daysToOwn(mastery.node.concepts.loops), 1);
});

test("the recent results keep the tests that tripped Inde", () => {
  const mastery = {};
  noteResult(mastery, loveNotes, struggled, "2026-11-01");
  assert.deepEqual(mastery.node.recent[0].tripped, ["devuelve 0 con una lista vacía"]);
  assert.deepEqual(mastery.node.recent[0].concepts, ["loops", "accumulator"]);
});

test("the focus goes to a weak concept first, then a half learned one, then the next new one", () => {
  const level = { concepts: ["loops", "accumulator", "count-with-condition"] };
  const learning = { cleanDays: ["2026-11-01"], last: "clean" };
  const weak = { cleanDays: [], last: "struggled" };
  assert.equal(focusConcept(level, {}), "loops");
  assert.equal(focusConcept(level, { loops: learning }), "loops");
  assert.equal(focusConcept(level, { loops: learning, "count-with-condition": weak }), "count-with-condition");
});

test("a level with every concept owned has nothing left to focus on", () => {
  const owned = { cleanDays: ["2026-11-01", "2026-11-02"], last: "clean" };
  assert.equal(focusConcept({ concepts: ["loops"] }, { loops: owned }), null);
});

test("Malenia's summary splits owned, weak and learning concepts", () => {
  const mastery = {};
  noteResult(mastery, { ...loveNotes, conceptIds: ["closures"] }, clean, "2026-11-01");
  noteResult(mastery, { ...loveNotes, conceptIds: ["closures"] }, clean, "2026-11-02");
  noteResult(mastery, { ...loveNotes, conceptIds: ["recursion"] }, struggled, "2026-11-02");
  noteResult(mastery, { ...loveNotes, conceptIds: ["reduce"] }, clean, "2026-11-02");
  const summary = summarizeMastery(mastery.node);
  assert.deepEqual(summary.strong, ["closures"]);
  assert.deepEqual(summary.weak, ["recursion"]);
  assert.deepEqual(summary.learning, ["reduce"]);
});

test("a track never practiced summarizes as empty", () => {
  assert.deepEqual(summarizeMastery(undefined), { strong: [], weak: [], learning: [], recent: [] });
});
