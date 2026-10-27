import assert from "node:assert/strict";
import { test } from "node:test";
import { currentLevel, doneLevels, levelProgress } from "../src/actions/levels.js";

const path = {
  startLevel: 1,
  levels: [
    { level: 1, title: "Primeros pasos", summary: "", concepts: ["bucles"], target: 2 },
    { level: 2, title: "Closures", summary: "", concepts: ["closures"], target: 1 },
  ],
};
const exercises = [
  { id: "node/a", track: "node", level: 1 },
  { id: "node/b", track: "node", level: 1 },
  { id: "node/c", track: "node", level: 2 },
  { id: "node/probe", track: "node", level: 1, placement: true },
];

test("a level is done once enough exercises were solved clean", () => {
  const records = { "node/a": { firstSolvedAt: "x", everClean: true }, "node/b": { firstSolvedAt: "x", everClean: true, mastered: true } };
  const [first, second] = levelProgress({ id: "node", path }, exercises, records);
  assert.equal(first.clean, 2);
  assert.equal(first.mastered, 1);
  assert.equal(first.done, true);
  assert.equal(second.done, false);
});

test("a struggled solve does not count toward the target", () => {
  const records = { "node/a": { firstSolvedAt: "x" }, "node/b": { firstSolvedAt: "x", everClean: true } };
  const [first] = levelProgress({ id: "node", path }, exercises, records);
  assert.equal(first.solved, 2);
  assert.equal(first.done, false);
});

test("placement probes never count toward a level", () => {
  const records = { "node/probe": { firstSolvedAt: "x", everClean: true } };
  assert.equal(levelProgress({ id: "node", path }, exercises, records)[0].clean, 0);
});

test("levels below Malenia's start count as done", () => {
  const progress = levelProgress({ id: "node", path: { ...path, startLevel: 2 } }, exercises, {});
  assert.equal(progress[0].placedOut, true);
  assert.equal(currentLevel(progress), 2);
  assert.equal(doneLevels(progress), 1);
});

test("a track with no path has no levels and no current level", () => {
  assert.deepEqual(levelProgress({ id: "node", path: null }, exercises, {}), []);
  assert.equal(currentLevel([]), null);
});
