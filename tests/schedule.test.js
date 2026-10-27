import assert from "node:assert/strict";
import { test } from "node:test";
import { INTERVALS, nextReview, roundOutcome } from "../src/actions/schedule.js";

test("a round with one typo still counts as clean", () => {
  assert.equal(roundOutcome({ failures: 1, hints: 0 }, 1), "clean");
});

test("a round that needed a hint counts as struggled", () => {
  assert.equal(roundOutcome({ failures: 0, hints: 1 }, 1), "struggled");
});

test("a round with too many failed submits counts as struggled", () => {
  assert.equal(roundOutcome({ failures: 2, hints: 0 }, 1), "struggled");
});

test("Claire solving a new exercise cleanly reviews it in three days", () => {
  assert.deepEqual(nextReview(undefined, "clean", "2026-10-27"), { step: 1, dueAt: "2026-10-30", mastered: false });
});

test("Malenia struggling sends the exercise back to tomorrow", () => {
  assert.deepEqual(nextReview(2, "struggled", "2026-10-27"), { step: 0, dueAt: "2026-10-28", mastered: false });
});

test("a skip comes back tomorrow", () => {
  assert.equal(nextReview(undefined, "skipped", "2026-12-31").dueAt, "2027-01-01");
});

test("a clean review on the last rung masters the exercise", () => {
  assert.deepEqual(nextReview(INTERVALS.length - 1, "clean", "2026-10-27"), {
    step: INTERVALS.length,
    dueAt: null,
    mastered: true,
  });
});
