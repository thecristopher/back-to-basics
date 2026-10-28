import assert from "node:assert/strict";
import { test } from "node:test";
import { noteResult, summarizeAptitude } from "../src/actions/aptitude.js";
import { expandCommand } from "../src/actions/command.js";
import { extractJson, withoutEmDashes } from "../src/actions/json.js";
import { normalizePath } from "../src/actions/path.js";
import { applyPass, freshRecord } from "../src/actions/record.js";
import { toSlug, uniqueSlug } from "../src/utils/slug.js";

test("JSON is pulled out of fences and stray words", () => {
  assert.deepEqual(extractJson('Aquí va:\n```json\n{"a": 1}\n```'), { a: 1 });
  assert.throws(() => extractJson("nada"), /no JSON object/);
  assert.throws(() => extractJson("{nope}"), /not valid JSON/);
});

test("em dashes in prose become commas", () => {
  assert.equal(withoutEmDashes("Claire \u2014 Inde"), "Claire, Inde");
});

test("placeholders in a command are filled and unknown ones stay", () => {
  assert.deepEqual(expandCommand(["{node}", "--x={report}", "{other}"], { node: "/bin/node", report: "/r.json" }), ["/bin/node", "--x=/r.json", "{other}"]);
});

test("slugs drop accents and symbols, and repeat with a suffix", () => {
  assert.equal(toSlug("Botón de Me Gusta!"), "boton-de-me-gusta");
  assert.equal(toSlug("¿?"), "exercise");
  assert.equal(uniqueSlug("love-note", new Set(["love-note", "love-note-2"])), "love-note-3");
});

test("aptitude tallies concepts and keeps the latest results first", () => {
  const aptitudes = {};
  const exercise = { track: "node", title: "Closure", level: 2, concepts: ["closures", "this"] };
  noteResult(aptitudes, exercise, { outcome: "clean", failures: 0, hints: 0, seconds: 60 });
  noteResult(aptitudes, exercise, { outcome: "clean", failures: 0, hints: 0, seconds: 50 });
  noteResult(aptitudes, { ...exercise, title: "Retry", concepts: ["async"] }, { outcome: "skipped", failures: 2, hints: 1, seconds: null });
  const summary = summarizeAptitude(aptitudes.node);
  assert.deepEqual(summary.strong, ["closures", "this"]);
  assert.deepEqual(summary.weak, ["async"]);
  assert.equal(summary.recent[0].title, "Retry");
});

test("an empty aptitude says nothing", () => {
  assert.deepEqual(summarizeAptitude(undefined), { strong: [], weak: [], recent: [] });
});

test("a clean pass marks the exercise as ever clean, a struggled one does not", () => {
  const clean = freshRecord();
  applyPass(clean, { outcome: "clean", seconds: 30, today: "2026-10-27" });
  const struggled = freshRecord();
  applyPass(struggled, { outcome: "struggled", seconds: 30, today: "2026-10-27" });
  assert.equal(clean.everClean, true);
  assert.equal(struggled.everClean, undefined);
});

const draft = {
  rationale: "Inde va \u2014 sin prisa",
  startLevel: 9,
  levels: [1, 2, 3].map((n) => ({ title: `Nuevo ${n}`, summary: "s", concepts: ["c"], target: 20 })),
};

test("a drawn path is numbered from 1, clamped and cleaned", () => {
  const path = normalizePath(draft, null, 0);
  assert.deepEqual(
    path.levels.map((level) => [level.level, level.target]),
    [
      [1, 10],
      [2, 10],
      [3, 10],
    ],
  );
  assert.equal(path.startLevel, 3);
  assert.equal(path.rationale, "Inde va, sin prisa");
});

test("from the very basics a new path starts at level 1 even when Claude says otherwise", () => {
  assert.equal(normalizePath(draft, null, 0, { fromBasics: true }).startLevel, 1);
});

test("a redraw keeps the levels already done and the original start", () => {
  const previous = { startLevel: 1, levels: [{ level: 1, title: "Hecho", summary: "s", concepts: ["c"], target: 3 }] };
  const path = normalizePath(draft, previous, 1);
  assert.deepEqual(
    path.levels.map((level) => level.title),
    ["Hecho", "Nuevo 2", "Nuevo 3"],
  );
  assert.equal(path.startLevel, 1);
});
