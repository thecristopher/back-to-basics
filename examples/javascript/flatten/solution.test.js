import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { flatten } from "./solution.js";

const real = { flat: Array.prototype.flat, flatMap: Array.prototype.flatMap };
const banned = () => {
  throw new Error("Sin .flat() ni .flatMap(), con tus propias manos");
};
before(() => {
  Array.prototype.flat = banned;
  Array.prototype.flatMap = banned;
});
after(() => {
  Array.prototype.flat = real.flat;
  Array.prototype.flatMap = real.flatMap;
});

test("aplana varios niveles de números", () => {
  assert.deepEqual(flatten([1, [2, [3, [4]]]]), [1, 2, 3, 4]);
});

test("mantiene el orden de Inde, Malenia y Claire", () => {
  assert.deepEqual(flatten(["Inde", ["Malenia", ["Claire"]]]), ["Inde", "Malenia", "Claire"]);
});

test("arreglos vacíos anidados quedan en nada", () => {
  assert.deepEqual(flatten([[], [[]]]), []);
});

test("no modifica el arreglo original", () => {
  const nested = [1, [2, 3]];
  flatten(nested);
  assert.deepEqual(nested, [1, [2, 3]]);
});

test("regresa un arreglo nuevo aunque ya esté plano", () => {
  const plain = [1, 2];
  assert.notEqual(flatten(plain), plain);
});
