import assert from "node:assert/strict";
import { test } from "node:test";
import { applyRecap, daySummary, isRecap } from "../src/actions/recap.js";

const byId = {
  "node/love-notes": { concepts: ["closures"] },
  "node/anniversary-dates": { concepts: ["dates", "sorting"] },
  "node/shared-playlist": { concepts: ["sorting", "reduce"] },
};

test("a review Claire already solved only needs a recap", () => {
  assert.equal(isRecap({ firstSolvedAt: "2026-10-27", dueAt: "2026-10-28" }), true);
});

test("a review Malenia skipped and never solved still has to be fought", () => {
  assert.equal(isRecap({ skips: 1, dueAt: "2026-10-28" }), false);
});

test("recapping Inde's love notes climbs a rung and marks the day", () => {
  const record = { firstSolvedAt: "2026-10-27", step: 0, dueAt: "2026-10-28", mastered: false };
  applyRecap(record, "2026-10-28");
  assert.deepEqual(record, { firstSolvedAt: "2026-10-27", step: 1, dueAt: "2026-10-31", mastered: false, recappedAt: "2026-10-28" });
});

test("a recap on the last rung masters the exercise", () => {
  const record = { firstSolvedAt: "2026-09-01", step: 3, dueAt: "2026-10-28" };
  applyRecap(record, "2026-10-28");
  assert.equal(record.mastered, true);
  assert.equal(record.dueAt, null);
});

test("the day summary counts what Claire solved, skipped and failed", () => {
  const day = {
    xp: 32,
    rounds: {
      "node/love-notes": { outcome: "clean", failures: 1, hints: 0 },
      "node/anniversary-dates": { outcome: "struggled", failures: 3, hints: 1 },
      "node/shared-playlist": { outcome: "skipped", failures: 2, hints: 0 },
    },
  };
  assert.deepEqual(daySummary(day, byId, 2), {
    solved: 2,
    clean: 1,
    struggled: 1,
    skipped: 1,
    failures: 6,
    hints: 1,
    xp: 32,
    recapped: 2,
    toImprove: ["dates", "sorting", "reduce"],
  });
});

test("a day of clean solves leaves nothing to improve", () => {
  const day = { xp: 20, rounds: { "node/love-notes": { outcome: "clean", failures: 0, hints: 0 } } };
  assert.deepEqual(daySummary(day, byId).toImprove, []);
});

test("a day logged before rounds existed still sums up", () => {
  assert.equal(daySummary({ xp: 10 }, byId).solved, 0);
});
