import assert from "node:assert/strict";
import { test } from "node:test";
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
  levels: [1, 2, 3].map((n) => ({ title: `Nuevo ${n}`, summary: "s", concepts: [{ id: `runas-${n}`, title: `Runas ${n}`, use: "Contar las runas de Melina." }] })),
};

test("a drawn path is numbered from 1, clamped, cleaned and keeps its concepts as ids", () => {
  const { path, graph } = normalizePath(draft, null, 0);
  assert.deepEqual(
    path.levels.map((level) => [level.level, level.concepts]),
    [
      [1, ["runas-1"]],
      [2, ["runas-2"]],
      [3, ["runas-3"]],
    ],
  );
  assert.equal(path.startLevel, 3);
  assert.equal(path.rationale, "Inde va, sin prisa");
  assert.deepEqual(graph["runas-2"], { title: "Runas 2", use: "Contar las runas de Melina.", level: 2 });
});

test("a concept given as plain text still gets an id", () => {
  const { path } = normalizePath({ ...draft, levels: [{ title: "t", summary: "s", concepts: ["Cartas de Claire"] }] }, null, 0);
  assert.deepEqual(path.levels[0].concepts, ["cartas-de-claire"]);
});

test("from the very basics a new path starts at level 1 even when Claude says otherwise", () => {
  assert.equal(normalizePath(draft, null, 0, { fromBasics: true }).path.startLevel, 1);
});

test("a redraw keeps the levels already done, their titles and the original start", () => {
  const previous = { startLevel: 1, levels: [{ level: 1, title: "Hecho", summary: "s", concepts: ["cartas"] }] };
  const { path, graph } = normalizePath(draft, previous, 1, { graph: { cartas: { title: "Cartas para Inde", use: "", level: 1 } } });
  assert.deepEqual(
    path.levels.map((level) => level.title),
    ["Hecho", "Nuevo 2", "Nuevo 3"],
  );
  assert.equal(path.startLevel, 1);
  assert.equal(graph.cartas.title, "Cartas para Inde");
});
