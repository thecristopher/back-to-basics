import assert from "node:assert/strict";
import { test } from "node:test";
import { sleep } from "./solution.js";

// setImmediate is not faked, so it lets pending promise callbacks run
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("regresa una promesa", () => {
  assert.ok(sleep(0) instanceof Promise);
});

test("no se resuelve antes de tiempo", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let done = false;
  sleep(1000).then(() => {
    done = true;
  });
  t.mock.timers.tick(999);
  await settle();
  assert.equal(done, false);
});

test("se resuelve justo al cumplirse los ms", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let done = false;
  sleep(1000).then(() => {
    done = true;
  });
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(done, true);
});
