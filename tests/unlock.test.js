import assert from "node:assert/strict";
import { test } from "node:test";
import { waitingFor } from "../src/actions/unlock.js";

const llm = { id: "llm", title: "LLM apps on Bedrock", after: { track: "python", share: 0.5 }, path: null };
const levels = (count) => Array.from({ length: count }, (_, index) => ({ level: index + 1 }));
const python = { id: "python", title: "Python", path: { levels: levels(8) } };
const progress = (done, total = 8) => Array.from({ length: total }, (_, index) => ({ done: index < done }));

test("llm waits for Claire to draw her Python path first", () => {
  assert.deepEqual(waitingFor(llm, { ...python, path: null }, []), { track: "python", title: "Python", done: 0, needed: null });
});

test("llm stays closed until half of the Python path is done", () => {
  assert.deepEqual(waitingFor(llm, python, progress(3)), { track: "python", title: "Python", done: 3, needed: 4 });
});

test("llm opens the day Malenia passes half of Python", () => {
  assert.equal(waitingFor(llm, python, progress(4)), null);
});

test("an odd path rounds the half up", () => {
  const seven = { ...python, path: { levels: levels(7) } };
  assert.equal(waitingFor(llm, seven, progress(3, 7)).needed, 4);
});

test("llm with its own path never closes again after a longer Python redraw", () => {
  assert.equal(waitingFor({ ...llm, path: { levels: levels(8) } }, python, progress(1)), null);
});

test("a track without after, or waiting on an inactive track, is open", () => {
  assert.equal(waitingFor({ id: "node" }, python, progress(0)), null);
  assert.equal(waitingFor(llm, undefined, []), null);
});

test("without a share the whole path must be done", () => {
  const whole = { ...llm, after: { track: "python" } };
  assert.equal(waitingFor(whole, python, progress(7)).needed, 8);
});
