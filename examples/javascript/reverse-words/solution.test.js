import assert from "node:assert/strict";
import { test } from "node:test";
import { reverseWords } from "./solution.js";

test("invierte una nota para Inde", () => {
  assert.equal(reverseWords("te espero en el puente"), "puente el en espero te");
});

test("colapsa espacios repetidos y quita los de las orillas", () => {
  assert.equal(reverseWords("  hola   Inde  "), "Inde hola");
});

test("regresa vacío con una frase vacía", () => {
  assert.equal(reverseWords(""), "");
});

test("deja igual una sola palabra", () => {
  assert.equal(reverseWords("Malenia"), "Malenia");
});
