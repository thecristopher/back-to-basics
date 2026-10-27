import assert from "node:assert/strict";
import { test } from "node:test";
import { isPalindrome } from "./solution.js";

test("reconoce una frase con espacios", () => {
  assert.equal(isPalindrome("Anita lava la tina"), true);
});

test("ignora signos y mayúsculas", () => {
  assert.equal(isPalindrome("A man, a plan, a canal: Panama"), true);
});

test("rechaza Claire", () => {
  assert.equal(isPalindrome("Claire"), false);
});

test("un texto vacío es palíndromo", () => {
  assert.equal(isPalindrome(""), true);
});

test("cuenta los números", () => {
  assert.equal(isPalindrome("1 de 1"), false);
  assert.equal(isPalindrome("12 21"), true);
});
