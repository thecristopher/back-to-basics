import assert from "node:assert/strict";
import { test } from "node:test";
import { pauseLesson, resumeLesson, roundSeconds } from "../src/actions/pause.js";

const letter = "node/claire-love-letter";

test("Claire pauses the love letter and the lesson remembers since when", () => {
  const state = { exercises: {} };
  assert.equal(pauseLesson(state, letter, 1000), true);
  assert.deepEqual(state.paused, { id: letter, at: 1000 });
});

test("a second pause leaves the first one as it was", () => {
  const state = { exercises: {}, paused: { id: letter, at: 1000 } };
  assert.equal(pauseLesson(state, "node/malenia-playlist", 5000), false);
  assert.deepEqual(state.paused, { id: letter, at: 1000 });
});

test("resuming keeps the paused time apart from the round", () => {
  const state = { exercises: { [letter]: { pausedMs: 2000 } }, paused: { id: letter, at: 1000 } };
  assert.deepEqual(resumeLesson(state, 61000), { id: letter, ms: 60000 });
  assert.equal(state.exercises[letter].pausedMs, 62000);
  assert.equal(state.paused, null);
});

test("a redo paused for Inde's anniversary dinner starts that much later", () => {
  const state = { exercises: {}, redoStarts: { [letter]: 500 }, paused: { id: letter, at: 1000 } };
  resumeLesson(state, 4000);
  assert.equal(state.redoStarts[letter], 3500);
});

test("resuming with nothing paused does nothing", () => {
  assert.equal(resumeLesson({ exercises: {} }, 1000), null);
});

test("the round's seconds leave the paused time out", () => {
  assert.equal(roundSeconds(1000, 60000, 121000), 60);
});

test("a round that never started has no seconds", () => {
  assert.equal(roundSeconds(null, 0, 1000), null);
});
