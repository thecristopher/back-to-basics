import assert from "node:assert/strict";
import { test } from "node:test";
import { retry } from "./solution.js";

function failsTimes(times, value) {
  let calls = 0;
  const fn = async () => {
    calls += 1;
    if (calls <= times) throw new Error(`fallo ${calls}`);
    return value;
  };
  return { fn, calls: () => calls };
}

test("resuelve cuando el tercer intento funciona", async () => {
  const letter = failsTimes(2, "carta para Claire");
  assert.equal(await retry(letter.fn, 3), "carta para Claire");
  assert.equal(letter.calls(), 3);
});

test("no vuelve a llamar después de funcionar", async () => {
  const letter = failsTimes(0, "ok");
  await retry(letter.fn, 5);
  assert.equal(letter.calls(), 1);
});

test("se rechaza con el último error", async () => {
  const letter = failsTimes(10, "nunca");
  await assert.rejects(retry(letter.fn, 2), { message: "fallo 2" });
  assert.equal(letter.calls(), 2);
});

test("cuenta como fallo un error lanzado sin promesa", async () => {
  let calls = 0;
  const flaky = () => {
    calls += 1;
    if (calls === 1) throw new Error("Wesker cortó la luz");
    return "de vuelta";
  };
  assert.equal(await retry(flaky, 2), "de vuelta");
});

test("regresa una promesa", () => {
  const result = retry(async () => 1, 1);
  assert.ok(result instanceof Promise);
  return result;
});
