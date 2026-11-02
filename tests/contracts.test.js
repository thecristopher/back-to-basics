import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { contractProblems } from "../src/actions/contract.js";
import { playSampleDay } from "../scripts/contract-samples.mjs";

const CONTRACTS = new URL("../contracts", import.meta.url).pathname;
const NAMES = ["open", "submit-failed", "hint", "submit-passed", "today", "status"];

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

const schemas = Object.fromEntries(await Promise.all(NAMES.map(async (name) => [name, await readJson(join(CONTRACTS, `${name}.schema.json`))])));

test("a value with the wrong type, a missing key or a stray enum breaks the contract", () => {
  const schema = { type: "object", required: ["id", "standing"], properties: { id: { type: "string" }, standing: { enum: ["owned", "weak"] }, xp: { type: "integer" } } };
  assert.deepEqual(contractProblems(schema, { id: "node/claire-letters", standing: "owned", extra: true }), []);
  assert.deepEqual(contractProblems(schema, { standing: "lost", xp: 1.5 }), [
    "$.id is missing",
    "$.standing must be one of owned, weak, got \"lost\"",
    "$.xp must be integer, got number",
  ]);
});

test("a list checks each item and says which one broke", () => {
  const schema = { type: "array", items: { type: ["string", "null"] } };
  assert.deepEqual(contractProblems(schema, ["Malenia", null, 3]), ["$[2] must be string or null, got integer"]);
});

for (const name of NAMES) {
  test(`the committed ${name} sample keeps its contract, the editors' specs read it`, async () => {
    assert.deepEqual(contractProblems(schemas[name], await readJson(join(CONTRACTS, "samples", `${name}.json`))), []);
  });
}

test("a real day of btb answers every editor call within its contract", async () => {
  const day = await playSampleDay();
  for (const name of NAMES) assert.deepEqual(contractProblems(schemas[name], day[name]), [], name);
});
