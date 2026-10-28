import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { loadExample } from "../src/lib/catalog.js";

const examplesDir = join(new URL("..", import.meta.url).pathname, "examples");

test("from the very basics Claude is shown the warm up example", async () => {
  const example = await loadExample({ examplesDir, fromBasics: true }, "javascript");
  assert.equal(example.slug, "sum-evens");
  assert.match(example.starter, /1\. Empieza con un total en 0/);
});

test("otherwise Claude is shown the first example, as before", async () => {
  assert.equal((await loadExample({ examplesDir }, "javascript")).slug, "count-chars");
});
