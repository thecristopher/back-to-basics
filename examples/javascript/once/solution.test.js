import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "./solution.js";

test("llama a la función una sola vez", () => {
  let calls = 0;
  const wrapped = once(() => {
    calls += 1;
  });
  wrapped();
  wrapped();
  wrapped();
  assert.equal(calls, 1);
});

test("siempre regresa el primer resultado", () => {
  const confess = once((name) => `te quiero, ${name}`);
  assert.equal(confess("Inde"), "te quiero, Inde");
  assert.equal(confess("Wesker"), "te quiero, Inde");
});

test("pasa todos los argumentos", () => {
  const add = once((a, b, c) => a + b + c);
  assert.equal(add(1, 2, 3), 6);
});

test("respeta el this de quien la llama", () => {
  const malenia = {
    name: "Malenia",
    greet: once(function () {
      return this.name;
    }),
  };
  assert.equal(malenia.greet(), "Malenia");
});

test("recuerda un resultado undefined sin volver a llamar", () => {
  let calls = 0;
  const wrapped = once(() => {
    calls += 1;
    return undefined;
  });
  wrapped();
  wrapped();
  assert.equal(calls, 1);
});
