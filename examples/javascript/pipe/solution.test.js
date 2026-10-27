import assert from "node:assert/strict";
import { test } from "node:test";
import { pipe } from "./solution.js";

const addOne = (n) => n + 1;
const double = (n) => n * 2;

test("aplica de izquierda a derecha", () => {
  assert.equal(pipe(addOne, double)(3), 8);
  assert.equal(pipe(double, addOne)(3), 7);
});

test("sin funciones regresa el mismo valor", () => {
  assert.equal(pipe()(5), 5);
});

test("arma la nota de Malenia para Inde", () => {
  const shout = pipe(
    (text) => text.trim(),
    (text) => text.toUpperCase(),
    (text) => `${text}!`,
  );
  assert.equal(shout("  te quiero inde "), "TE QUIERO INDE!");
});

test("se puede reutilizar la misma tubería", () => {
  const twiceThenOne = pipe(double, addOne);
  assert.equal(twiceThenOne(1), 3);
  assert.equal(twiceThenOne(10), 21);
});
