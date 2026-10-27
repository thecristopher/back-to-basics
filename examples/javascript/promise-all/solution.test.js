import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { promiseAll } from "./solution.js";

const BANNED = ["all", "allSettled", "any", "race"];
const real = Object.fromEntries(BANNED.map((name) => [name, Promise[name]]));
before(() => {
  for (const name of BANNED) {
    Promise[name] = () => {
      throw new Error(`Sin Promise.${name}, con tus propias manos`);
    };
  }
});
after(() => {
  Object.assign(Promise, real);
});

const later = (value, ms) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

test("respeta el orden aunque terminen desordenadas", async () => {
  const playlist = await promiseAll([later("Claire", 30), later("Inde", 5), later("Malenia", 15)]);
  assert.deepEqual(playlist, ["Claire", "Inde", "Malenia"]);
});

test("acepta valores normales mezclados", async () => {
  assert.deepEqual(await promiseAll([1, Promise.resolve(2), 3]), [1, 2, 3]);
});

test("se resuelve con [] sin valores", async () => {
  assert.deepEqual(await promiseAll([]), []);
});

test("se rechaza con el primer error", async () => {
  const failing = Promise.reject(new Error("Wesker interceptó la carta"));
  await assert.rejects(promiseAll([later("ok", 10), failing]), { message: "Wesker interceptó la carta" });
});
