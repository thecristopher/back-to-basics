import assert from "node:assert/strict";
import { test } from "node:test";
import { placementEvidence, placementStatus } from "../src/actions/placement.js";

const byId = {
  "node/a": { title: "Suma", difficulty: 1, concepts: ["bucles"] },
  "node/b": { title: "Closure", difficulty: 2, concepts: ["closures"] },
  "node/c": { title: "Retry", difficulty: 3, concepts: ["async"] },
};
const queue = ["node/a", "node/b", "node/c"];

test("Inde starts with the easiest probe", () => {
  assert.deepEqual(placementStatus(queue, {}, byId), { next: "node/a", remaining: 3, finished: false, stumbledAt: null });
});

test("the first probe that was not clean ends the test", () => {
  const status = placementStatus(queue, { "node/a": "clean", "node/b": "skipped" }, byId);
  assert.deepEqual(status, { next: null, remaining: 0, finished: true, stumbledAt: 2 });
});

test("Claire clearing every probe finishes without a stumble", () => {
  const results = { "node/a": "clean", "node/b": "clean", "node/c": "clean" };
  assert.deepEqual(placementStatus(queue, results, byId), { next: null, remaining: 0, finished: true, stumbledAt: null });
});

test("probes no longer on disk are ignored", () => {
  assert.equal(placementStatus(["node/gone", ...queue], {}, byId).next, "node/a");
});

test("the evidence tells the path what each probe asked and how it went", () => {
  assert.deepEqual(placementEvidence(queue, { "node/a": "clean" }, byId), [
    { title: "Suma", difficulty: 1, concepts: ["bucles"], outcome: "clean" },
    { title: "Closure", difficulty: 2, concepts: ["closures"], outcome: "not reached" },
    { title: "Retry", difficulty: 3, concepts: ["async"], outcome: "not reached" },
  ]);
});
