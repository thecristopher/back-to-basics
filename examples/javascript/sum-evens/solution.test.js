import assert from "node:assert/strict";
import { test } from "node:test";
import { sumEvens } from "./solution.js";

test("suma los pares de una lista mezclada", () => {
  assert.equal(sumEvens([1, 2, 3, 4]), 6);
});

test("regresa 0 cuando no hay pares", () => {
  assert.equal(sumEvens([7, 9, 11]), 0);
});

test("regresa 0 con un arreglo vacío", () => {
  assert.equal(sumEvens([]), 0);
});

test("cuenta los pares negativos", () => {
  assert.equal(sumEvens([-4, -3, 2]), -2);
});

test("no modifica el arreglo que recibe", () => {
  const numbers = [2, 4, 6];
  sumEvens(numbers);
  assert.deepEqual(numbers, [2, 4, 6]);
});
