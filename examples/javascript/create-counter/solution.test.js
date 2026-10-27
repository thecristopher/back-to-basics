import assert from "node:assert/strict";
import { test } from "node:test";
import { createCounter } from "./solution.js";

test("empieza en 0 sin argumento", () => {
  assert.equal(createCounter().value(), 0);
});

test("Claire e Inde llegan a su aniversario 365", () => {
  const daysTogether = createCounter(364);
  assert.equal(daysTogether.increment(), 365);
  assert.equal(daysTogether.value(), 365);
});

test("decrement regresa el valor nuevo", () => {
  const counter = createCounter(2);
  assert.equal(counter.decrement(), 1);
  assert.equal(counter.decrement(), 0);
});

test("reset vuelve al valor inicial", () => {
  const counter = createCounter(10);
  counter.increment();
  counter.increment();
  assert.equal(counter.reset(), 10);
  assert.equal(counter.value(), 10);
});

test("dos contadores no comparten la cuenta", () => {
  const malenia = createCounter();
  const claire = createCounter();
  malenia.increment();
  malenia.increment();
  claire.increment();
  assert.equal(malenia.value(), 2);
  assert.equal(claire.value(), 1);
});
