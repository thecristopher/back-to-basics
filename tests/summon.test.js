import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { personaPrompt } from "../src/actions/prompts/persona.js";
import { borrowedWorld, summonedPersona } from "../src/actions/summon.js";
import { onlyOnce } from "../src/lib/lock.js";

const claire = {
  name: "Claire Redfield",
  world: {
    franchise: "Resident Evil",
    supporting: ["Leon S. Kennedy", "Jill Valentine"],
    places: ["Raccoon City"],
    lore: { "Claire Redfield": ["her motorcycle"], "Leon S. Kennedy": ["the attache case"], "Jill Valentine": ["the item box"] },
  },
};

test("Leon borrows Claire's world: she joins the cast, he leaves it and keeps his own scenes", () => {
  const world = borrowedWorld(claire, "Leon S. Kennedy", "Resident Evil", ["ignored"]);
  assert.deepEqual(world.supporting, ["Claire Redfield", "Jill Valentine"]);
  assert.deepEqual(world.lore["Leon S. Kennedy"], ["the attache case"]);
  assert.deepEqual(world.lore["Claire Redfield"], ["her motorcycle"]);
  assert.deepEqual(world.places, ["Raccoon City"]);
});

test("Wesker, missing from the lore, brings the scenes Claude wrote for him", () => {
  const world = borrowedWorld(claire, "Albert Wesker", "Resident Evil", ["Project Uroboros"]);
  assert.deepEqual(world.lore["Albert Wesker"], ["Project Uroboros"]);
  assert.ok(world.supporting.includes("Leon S. Kennedy"));
});

test("a franchise with no partner still gives the coach a world of their own", () => {
  const world = borrowedWorld(null, "Mohg", "Elden Ring", ["the blood oath"]);
  assert.deepEqual(world, { franchise: "Elden Ring", supporting: [], places: [], lore: { Mohg: ["the blood oath"] } });
});

test("a summoned coach is named exactly like the character and is never a partner", () => {
  const persona = summonedPersona({ voice: "Smug.", lines: { es: {} } }, { character: "Albert Wesker", franchise: "Resident Evil" }, { franchise: "Resident Evil" });
  assert.equal(persona.name, "Albert Wesker");
  assert.equal(persona.partner, undefined);
  assert.deepEqual(persona.summoned, { franchise: "Resident Evil" });
});

test("summoning Radahn keeps him true to the games and the romance with the partners", () => {
  const prompt = personaPrompt({ description: "Radahn from Elden Ring", language: "es", summon: { character: "Radahn", franchise: "Elden Ring", partners: ["Malenia", "Claire Redfield"] } });
  assert.match(prompt, /The coach is Radahn from Elden Ring, true to who they are in the games/);
  assert.match(prompt, /Radahn is an ally who trains the learner, never a romance: that bond belongs to Malenia, Claire Redfield only/);
  assert.match(prompt, /"lore":\["scene","scene","scene"\]/);
});

test("drafting a coach by hand asks for no lore", () => {
  assert.doesNotMatch(personaPrompt({ description: "Rennala", language: "es" }), /"lore"/);
});

test("two runs at once draft only once, the second one waits for what the first leaves", async () => {
  const dir = await mkdtemp(join(tmpdir(), "btb-lock-"));
  const lock = join(dir, "leon.lock");
  const file = join(dir, "leon.json");
  let drafts = 0;
  const ready = async () => JSON.parse(await readFile(file, "utf8").catch(() => "null"));
  const work = async () => {
    drafts += 1;
    await new Promise((done) => setTimeout(done, 50));
    await writeFile(file, JSON.stringify({ name: "Leon" }));
    return { name: "Leon" };
  };
  const [first, second] = await Promise.all([onlyOnce(lock, work, ready, 10000), onlyOnce(lock, work, ready, 10000)]);
  assert.equal(drafts, 1);
  assert.deepEqual(first, second);
  await rm(dir, { recursive: true, force: true });
});

test("a lock abandoned by a dead run does not block the next one", async () => {
  const dir = await mkdtemp(join(tmpdir(), "btb-lock-"));
  const lock = join(dir, "ada.lock");
  await writeFile(lock, "12345");
  const answer = await onlyOnce(lock, async () => "drafted", async () => null, 0);
  assert.equal(answer, "drafted");
  await rm(dir, { recursive: true, force: true });
});
