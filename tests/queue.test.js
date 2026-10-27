import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateNew, dueReviews, freshExercises, nextPending, slotFor, slotTrack } from "../src/actions/queue.js";

const exercises = [
  { id: "node/love-note", track: "node", level: 1 },
  { id: "node/playlist", track: "node", level: 1 },
  { id: "node/probe", track: "node", level: 0, placement: true },
  { id: "react/anniversary", track: "react", level: 2 },
];

test("reviews come oldest first and skip mastered ones", () => {
  const records = {
    "node/love-note": { firstSolvedAt: "2026-10-01", dueAt: "2026-10-26" },
    "node/playlist": { firstSolvedAt: "2026-10-01", dueAt: "2026-10-20" },
    "react/anniversary": { firstSolvedAt: "2026-10-01", dueAt: null, mastered: true },
  };
  assert.deepEqual(dueReviews(exercises, records, "2026-10-27", 5), ["node/playlist", "node/love-note"]);
});

test("reviews due in the future wait", () => {
  const records = { "node/love-note": { firstSolvedAt: "2026-10-01", dueAt: "2026-10-28" } };
  assert.deepEqual(dueReviews(exercises, records, "2026-10-27", 5), []);
});

test("fresh exercises are the unsolved ones of that track level, never placement probes", () => {
  const records = { "node/love-note": { firstSolvedAt: "2026-10-01" } };
  assert.deepEqual(freshExercises(exercises, records, "node", 1), ["node/playlist"]);
  assert.deepEqual(freshExercises(exercises, {}, "node", 0), []);
});

test("an exercise already queued is not fresh again", () => {
  assert.deepEqual(freshExercises(exercises, {}, "node", 1, ["node/love-note"]), ["node/playlist"]);
});

test("Claire and Malenia's tracks take turns for the new exercises", () => {
  assert.deepEqual(allocateNew(["node", "react"], 3), ["node", "react", "node"]);
  assert.deepEqual(allocateNew([], 2), []);
});

test("a slot names the track it forges for", () => {
  assert.equal(slotTrack(slotFor("react")), "react");
  assert.equal(slotTrack("react/anniversary"), null);
});

test("the next pending entry skips what is done today", () => {
  assert.equal(nextPending(["node/love-note", "forge:node"], ["node/love-note"]), "forge:node");
  assert.equal(nextPending(["node/love-note"], ["node/love-note"]), null);
});
