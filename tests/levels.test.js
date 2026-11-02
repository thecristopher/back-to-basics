import assert from "node:assert/strict";
import { test } from "node:test";
import { currentLevel, doneLevels, levelProgress } from "../src/actions/levels.js";

const path = {
  startLevel: 1,
  levels: [
    { level: 1, title: "Cartas para Inde", summary: "", concepts: ["loops", "accumulator"] },
    { level: 2, title: "La playlist de Claire", summary: "", concepts: ["closures"] },
  ],
};

const owned = { cleanDays: ["2026-10-27", "2026-10-28"], last: "clean" };
const once = { cleanDays: ["2026-10-28"], last: "clean" };

test("a level is done once every one of its concepts is owned", () => {
  const [first, second] = levelProgress({ path }, { loops: owned, accumulator: owned });
  assert.equal(first.clean, 2);
  assert.equal(first.target, 2);
  assert.equal(first.done, true);
  assert.equal(second.done, false);
});

test("a concept solved clean on a single day does not pass the level yet", () => {
  const [first] = levelProgress({ path }, { loops: owned, accumulator: once });
  assert.equal(first.clean, 1);
  assert.equal(first.done, false);
  assert.equal(first.remaining, 1);
});

test("an untouched level still needs two clean days per concept", () => {
  const [, second] = levelProgress({ path }, {});
  assert.equal(second.remaining, 2);
});

test("levels below Malenia's start count as done", () => {
  const progress = levelProgress({ path: { ...path, startLevel: 2 } }, {});
  assert.equal(progress[0].placedOut, true);
  assert.equal(progress[0].remaining, 0);
  assert.equal(currentLevel(progress), 2);
  assert.equal(doneLevels(progress), 1);
});

test("a track with no path has no levels and no current level", () => {
  assert.deepEqual(levelProgress({ path: null }, {}), []);
  assert.equal(currentLevel([]), null);
});
