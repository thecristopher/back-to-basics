import assert from "node:assert/strict";
import { test } from "node:test";
import { countChars } from "./solution.js";

test("cuenta cada letra de Leon una vez", () => {
  assert.deepEqual(countChars("Leon"), { l: 1, e: 1, o: 1, n: 1 });
});

test("junta mayúsculas y minúsculas", () => {
  assert.deepEqual(countChars("Ada ada"), { a: 4, d: 2 });
});

test("ignora los espacios", () => {
  assert.deepEqual(countChars("  a  b "), { a: 1, b: 1 });
});

test("regresa un objeto vacío con texto vacío", () => {
  assert.deepEqual(countChars(""), {});
});

test("cuenta signos y números también", () => {
  assert.deepEqual(countChars("te amo, 3!"), { t: 1, e: 1, a: 1, m: 1, o: 1, ",": 1, 3: 1, "!": 1 });
});
