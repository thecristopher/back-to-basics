import assert from "node:assert/strict";
import { test } from "node:test";
import { hintLines, shownHints } from "../src/actions/hints.js";

const paint = { yellow: (text) => `[y]${text}`, bold: (text) => `[b]${text}`, dim: (text) => `[d]${text}` };
const shown = ["Empieza por la carta de Claire.", "Guarda las notas de Inde en un arreglo.", "Malenia te espera con el return."];
const base = { header: "Pista", earlierLabel: "Las que ya viste:", paint };

test("the first hint shows alone and bright", () => {
  assert.deepEqual(hintLines({ ...base, shown: shown.slice(0, 1), fresh: true }), ["[y]Pista", "", "[b]  1. Empieza por la carta de Claire."]);
});

test("a new hint goes first and the ones Inde already saw stay dimmed below", () => {
  assert.deepEqual(hintLines({ ...base, shown, fresh: true }), [
    "[y]Pista",
    "",
    "[b]  3. Malenia te espera con el return.",
    "",
    "[d]  Las que ya viste:",
    "[d]  1. Empieza por la carta de Claire.",
    "[d]  2. Guarda las notas de Inde en un arreglo.",
  ]);
});

test("with every hint already bought they all read the same, in order", () => {
  assert.deepEqual(hintLines({ ...base, shown: shown.slice(0, 2), fresh: false }), [
    "[y]Pista",
    "",
    "  1. Empieza por la carta de Claire.",
    "",
    "  2. Guarda las notas de Inde en un arreglo.",
  ]);
});

test("the hints Inde bought show the ones written for her code, the planned ones where none was", () => {
  const exercise = { hints: ["Empieza por la carta de Claire.", "Recorre las notas.", "Regresa el total."] };
  const round = { hints: 2, written: ["Tu función no regresa la carta de Claire."] };
  assert.deepEqual(shownHints(exercise, round), ["Tu función no regresa la carta de Claire.", "Recorre las notas."]);
});

test("a nudge at a known mistake does not count as a general hint shown", () => {
  const exercise = { hints: ["Empieza por la carta de Claire.", "Recorre las notas."] };
  assert.deepEqual(shownHints(exercise, { hints: 2, nudges: ["olvida la carta vacía"] }), ["Empieza por la carta de Claire."]);
});
