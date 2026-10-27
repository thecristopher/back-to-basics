import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPass, applySkip, awardXp, exerciseState, freshRecord } from "../src/actions/record.js";

test("a first pass schedules a review and closes the round", () => {
  const record = { ...freshRecord(), round: { failures: 1, hints: 0 }, startedAt: 1 };
  applyPass(record, { outcome: "clean", seconds: 90, today: "2026-10-27" });
  assert.equal(record.firstSolvedAt, "2026-10-27");
  assert.equal(record.dueAt, "2026-10-30");
  assert.equal(record.bestSeconds, 90);
  assert.deepEqual(record.round, { failures: 0, hints: 0 });
  assert.equal(record.startedAt, null);
});

test("a review pass keeps the fastest time", () => {
  const record = { ...freshRecord(), passes: 1, firstSolvedAt: "2026-10-01", step: 1, bestSeconds: 60 };
  applyPass(record, { outcome: "clean", seconds: 120, today: "2026-10-27" });
  assert.equal(record.bestSeconds, 60);
  assert.equal(record.step, 2);
});

test("a skip unlocks tomorrow and counts", () => {
  const record = freshRecord();
  applySkip(record, "2026-10-27");
  assert.equal(record.skips, 1);
  assert.equal(record.dueAt, "2026-10-28");
});

test("exercise state reads from most to least advanced", () => {
  assert.equal(exerciseState(undefined, "2026-10-27"), "new");
  assert.equal(exerciseState({ mastered: true }, "2026-10-27"), "mastered");
  assert.equal(exerciseState({ firstSolvedAt: "2026-10-01", dueAt: "2026-10-27" }, "2026-10-27"), "due");
  assert.equal(exerciseState({ firstSolvedAt: "2026-10-01", dueAt: "2026-11-01" }, "2026-10-27"), "solved");
  assert.equal(exerciseState({ attempts: 2, skips: 0 }, "2026-10-27"), "started");
});

test("Claire's XP lands in the total and in the day only once per exercise", () => {
  const state = { xp: 10 };
  const day = { xp: 0, solved: [], done: [] };
  awardXp(state, day, "f/love-note", 15);
  awardXp(state, day, "f/love-note", 5);
  assert.equal(state.xp, 30);
  assert.deepEqual(day.solved, ["f/love-note"]);
});
