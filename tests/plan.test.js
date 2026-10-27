import assert from "node:assert/strict";
import { test } from "node:test";
import { goalStatus, projectLevels } from "../src/actions/plan.js";

const levels = [
  { track: "node", level: 1, remaining: 0, done: true },
  { track: "node", level: 2, remaining: 4, done: false },
  { track: "node", level: 3, remaining: 4, done: false },
];
const pace = { perSession: 2, daysPerWeek: 7, today: "2026-10-27" };

test("levels are projected one after the other at the daily pace", () => {
  assert.deepEqual(
    projectLevels(levels, pace).map((level) => level.finishBy),
    [null, "2026-10-29", "2026-10-31"],
  );
});

test("sharing the day with another track halves the pace", () => {
  assert.equal(projectLevels(levels, { ...pace, perSession: 1 })[1].finishBy, "2026-10-31");
});

test("fewer practice days a week push the dates out", () => {
  assert.equal(projectLevels(levels, { ...pace, daysPerWeek: 3 })[1].finishBy, "2026-11-01");
});

test("Malenia's goal is on track when the level lands before its date", () => {
  const goal = { title: "Asincronía para la cita", track: "node", level: 3, by: "2026-11-14" };
  assert.equal(goalStatus(goal, projectLevels(levels, pace)).state, "onTrack");
});

test("a goal is behind when the projection lands after its date", () => {
  assert.equal(goalStatus({ title: "x", track: "node", level: 3, by: "2026-10-30" }, projectLevels(levels, pace)).state, "behind");
});

test("a goal on a finished level is done and one off the path is unknown", () => {
  const projection = projectLevels(levels, pace);
  assert.equal(goalStatus({ title: "x", track: "node", level: 1, by: "2026-01-01" }, projection).state, "done");
  assert.equal(goalStatus({ title: "x", track: "react", level: 1, by: "2026-01-01" }, projection).state, "unknown");
});
