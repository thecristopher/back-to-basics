import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateNew, dueReviews, freshExercises, isUnfinished, nextPending, slotFor, slotTrack, undrawnSlotTrack } from "../src/actions/queue.js";

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

test("a fresh exercise forged for another franchise waits for it to come back", () => {
  const tagged = [
    { id: "node/claire-date", track: "node", level: 1, franchise: "resident-evil" },
    { id: "node/malenia-runes", track: "node", level: 1, franchise: "elden-ring" },
    { id: "node/old-note", track: "node", level: 1 },
  ];
  assert.deepEqual(freshExercises(tagged, {}, "node", 1, [], "elden-ring"), ["node/malenia-runes", "node/old-note"]);
  assert.deepEqual(freshExercises(tagged, {}, "node", 1, [], null), ["node/claire-date", "node/malenia-runes", "node/old-note"]);
});

test("Claire and Malenia's tracks take turns for the new exercises", () => {
  assert.deepEqual(allocateNew(["node", "react"], 3), ["node", "react", "node"]);
  assert.deepEqual(allocateNew([], 2), []);
});

test("one new exercise a day takes turns across days", () => {
  assert.deepEqual(allocateNew(["node", "react"], 1, 0), ["node"]);
  assert.deepEqual(allocateNew(["node", "react"], 1, 1), ["react"]);
  assert.deepEqual(allocateNew(["node", "react"], 1, 2), ["node"]);
});

test("a slot names the track it forges for", () => {
  assert.equal(slotTrack(slotFor("react")), "react");
  assert.equal(slotTrack("react/anniversary"), null);
});

test("the next pending entry skips what is done today", () => {
  assert.equal(nextPending(["node/love-note", "forge:node"], ["node/love-note"]), "forge:node");
  assert.equal(nextPending(["node/love-note"], ["node/love-note"]), null);
});

test("an exercise never solved nor skipped stays unfinished until it is", () => {
  const day = { queue: [], done: [] };
  assert.equal(isUnfinished("node/love-note", { attempts: 2, skips: 0 }, day), true);
  assert.equal(isUnfinished("node/love-note", { attempts: 2, skips: 1 }, day), false);
});

test("a review queued today is unfinished until it is done", () => {
  const solved = { firstSolvedAt: "2026-10-20", skips: 0 };
  assert.equal(isUnfinished("node/playlist", solved, { queue: ["node/playlist"], done: [] }), true);
  assert.equal(isUnfinished("node/playlist", solved, { queue: ["node/playlist"], done: ["node/playlist"] }), false);
});

test("a solved exercise opened again by hand does not hold the day", () => {
  assert.equal(isUnfinished("node/playlist", { firstSolvedAt: "2026-10-20", skips: 0 }, { queue: [], done: [] }), false);
});

test("nothing open means nothing unfinished", () => {
  assert.equal(isUnfinished(null, undefined, { queue: [], done: [] }), false);
});

test("the first pending slot of a track with no path asks for its placement", () => {
  const queue = ["node/love-note", slotFor("react")];
  assert.equal(undrawnSlotTrack(queue, ["node/love-note"], () => false), "react");
  assert.equal(undrawnSlotTrack(queue, ["node/love-note"], () => true), null);
  assert.equal(undrawnSlotTrack(queue, [], () => false), null);
});
