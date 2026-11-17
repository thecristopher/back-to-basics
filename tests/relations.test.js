import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { castFor, castLines, pickGuest } from "../src/actions/cast.js";
import { relationFor, withRelation } from "../src/actions/relations.js";
import { loadPersona } from "../src/lib/personas.js";

const PERSONAS = new URL("../personas", import.meta.url).pathname;
const relations = {
  claire: { voice: "Claire has a crush on Inde." },
  "inde-*": { voice: "Inde gets jealous, in role.", guests: { "Ada Wong": "Ada flirts with Inde over a red dress." } },
  "inde-malenia": { voice: "Only for Malenia's role." },
};

test("Claire's relation is found by her exact id", () => {
  assert.deepEqual(relationFor(relations, "claire"), relations.claire);
});

test("every role Inde plays shares the relation that ends in a star", () => {
  assert.equal(relationFor(relations, "inde-psylocke"), relations["inde-*"]);
});

test("an exact id wins over the star", () => {
  assert.equal(relationFor(relations, "inde-malenia"), relations["inde-malenia"]);
});

test("a coach nobody wrote a relation for stays as she is", () => {
  assert.equal(relationFor(relations, "malenia"), null);
  assert.equal(relationFor(null, "claire"), null);
});

test("the relation adds to Claire's voice and never replaces it", () => {
  const claire = { name: "Claire Redfield", voice: "Claire rides her bike." };
  assert.equal(withRelation(claire, relations.claire).voice, "Claire rides her bike. Claire has a crush on Inde.");
});

test("guests with an empty name or no note are left out", () => {
  const coach = withRelation({ voice: "v" }, { guests: { "Ada Wong": "flirts", " ": "nobody", Leon: 3 } });
  assert.deepEqual(coach.guests, { "Ada Wong": "flirts" });
});

test("a guest drops in on half the exercises and stays out of the other half", () => {
  const guests = { "Ada Wong": "flirts" };
  assert.deepEqual(pickGuest(guests, () => 0.1), { name: "Ada Wong", note: "flirts" });
  assert.equal(pickGuest(guests, () => 0.9), null);
  assert.equal(pickGuest(undefined, () => 0.1), null);
});

test("Ada's visit to Inde's exercise is the one face from outside her world", () => {
  const inde = { name: "Psylocke", voice: "v", summoned: { bond: "his wife" }, guests: { "Ada Wong": "Ada flirts with you." }, world: { franchise: "Elizabeth", supporting: [] } };
  const lines = castLines(castFor(inde, null, () => 0.1)).join("\n");
  assert.match(lines, /Ada Wong drops into this exercise as a guest, the one character allowed from outside Elizabeth.*Ada flirts with you\./);
  assert.match(lines, /Psylocke notices and reacts in their own voice/);
  assert.match(lines, /never from another franchise, besides Ada Wong\./);
});

let dataDir;

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "btb-relations-"));
  await mkdir(dataDir, { recursive: true });
});

after(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

test("Claire loads with the crush the learner's relations.json gives her", async () => {
  await writeFile(join(dataDir, "relations.json"), JSON.stringify(relations));
  const claire = await loadPersona({ personasDir: PERSONAS, dataDir }, "claire");
  assert.ok(claire.voice.endsWith("Claire has a crush on Inde."));
  assert.equal(claire.id, "claire");
});
