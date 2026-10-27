import assert from "node:assert/strict";
import { test } from "node:test";
import { fizzBuzz } from "./solution.js";

test("genera los primeros cinco", () => {
  assert.deepEqual(fizzBuzz(5), ["1", "2", "Fizz", "4", "Buzz"]);
});

test("el 15 es FizzBuzz", () => {
  assert.equal(fizzBuzz(15)[14], "FizzBuzz");
});

test("regresa un arreglo vacío con 0", () => {
  assert.deepEqual(fizzBuzz(0), []);
});

test("tiene exactamente n elementos", () => {
  assert.equal(fizzBuzz(100).length, 100);
});

test("los números normales son strings", () => {
  assert.equal(fizzBuzz(7)[6], "7");
});
