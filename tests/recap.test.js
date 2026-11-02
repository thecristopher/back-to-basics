import assert from "node:assert/strict";
import { test } from "node:test";
import { daySummary } from "../src/actions/recap.js";

const byId = {
  "node/love-notes": { concepts: ["closures"] },
  "node/anniversary-dates": { concepts: ["dates", "sorting"] },
  "node/shared-playlist": { concepts: ["sorting", "reduce"] },
};

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
