import assert from "node:assert/strict";
import { test } from "node:test";
import { debounce } from "./solution.js";

function recorder() {
  const calls = [];
  return { fn: (...args) => calls.push(args), calls };
}

test("no llama antes de los ms", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const draft = recorder();
  debounce(draft.fn, 300)("te");
  t.mock.timers.tick(299);
  assert.equal(draft.calls.length, 0);
});

test("llama una vez con los argumentos de la última llamada", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const draft = recorder();
  const save = debounce(draft.fn, 300);
  save("te");
  t.mock.timers.tick(100);
  save("te quiero", "Inde");
  t.mock.timers.tick(300);
  assert.deepEqual(draft.calls, [["te quiero", "Inde"]]);
});

test("cada llamada reinicia el reloj", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const draft = recorder();
  const save = debounce(draft.fn, 300);
  save(1);
  t.mock.timers.tick(200);
  save(2);
  t.mock.timers.tick(200);
  assert.equal(draft.calls.length, 0);
  t.mock.timers.tick(100);
  assert.equal(draft.calls.length, 1);
});

test("cancel descarta la llamada pendiente", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const draft = recorder();
  const save = debounce(draft.fn, 300);
  save("Wesker");
  save.cancel();
  t.mock.timers.tick(1000);
  assert.equal(draft.calls.length, 0);
});

test("vuelve a funcionar después de llamar", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const draft = recorder();
  const save = debounce(draft.fn, 300);
  save("a");
  t.mock.timers.tick(300);
  save("b");
  t.mock.timers.tick(300);
  assert.deepEqual(draft.calls, [["a"], ["b"]]);
});
