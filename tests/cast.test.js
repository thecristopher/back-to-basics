import assert from "node:assert/strict";
import { test } from "node:test";
import { castFor, castLines, franchiseOf, pickCast } from "../src/actions/cast.js";
import { exercisePrompt } from "../src/actions/prompts/exercise.js";

const cast = { leads: ["Claire Redfield"], supporting: ["Leon", "Jill", "Ada", "Rebecca", "Carlos"] };
const claire = { name: "Claire Redfield", world: { franchise: "Resident Evil", supporting: ["Leon", "Jill", "Chris", "Wesker"], places: ["Raccoon City", "TerraSave"] } };
const malenia = { name: "Malenia", world: { franchise: "Elden Ring", supporting: ["Melina", "Blaidd"] } };

test("every lead shows up, with a few supporting faces drawn at random", () => {
  const picked = pickCast(cast, 3, () => 0);
  assert.deepEqual(picked.leads, cast.leads);
  assert.deepEqual(picked.supporting, ["Leon", "Jill", "Ada"]);
});

test("the same supporting character never appears twice in one exercise", () => {
  const picked = pickCast(cast, 5, () => 0.99);
  assert.equal(new Set(picked.supporting).size, 5);
});

test("asking for more faces than the cast has brings the whole cast", () => {
  assert.equal(pickCast(cast, 10).supporting.length, cast.supporting.length);
});

test("no cast means no cast line", () => {
  assert.equal(pickCast(null, 3), null);
  assert.deepEqual(castLines(null), []);
});

test("the cast line names the leads and asks for the supporting ones by name", () => {
  const [line] = castLines({ leads: ["Claire Redfield"], supporting: ["Leon", "Jill"] });
  assert.match(line, /Leads: Claire Redfield/);
  assert.match(line, /Bring in Leon, Jill by name in the readme and the test data/);
});

test("the forge prompt carries the cast of the exercise", () => {
  const prompt = exercisePrompt({
    purpose: "practice",
    track: { title: "Node.js", focus: "Basics." },
    profile: { name: "JavaScript", testGuide: "node:test" },
    files: { solutionFile: "solution.js", testFile: "solution.test.js", importHint: "import" },
    level: { level: 1, title: "Base", summary: "s", concepts: ["if"] },
    count: 1,
    summary: { strong: [], weak: [], recent: [] },
    language: "es",
    example: {},
    cast: { leads: ["Malenia"], supporting: ["Blaidd"] },
  });
  assert.match(prompt, /Bring in Blaidd by name/);
});

test("Claire's world casts her as the lead and fills the rest from Resident Evil", () => {
  const picked = castFor(claire, cast, () => 0);
  assert.deepEqual(picked.leads, ["Claire Redfield"]);
  assert.deepEqual(picked.supporting, ["Leon", "Jill", "Chris"]);
  assert.equal(picked.franchise, "Resident Evil");
});

test("Malenia's world never borrows a face from the config's cast", () => {
  const picked = castFor(malenia, cast, () => 0);
  assert.deepEqual(picked.supporting, ["Melina", "Blaidd"]);
  assert.deepEqual(picked.places, []);
});

test("a persona without a world falls back to the config's cast", () => {
  assert.deepEqual(castFor({ name: "Wesker" }, cast, () => 0), { leads: ["Claire Redfield"], supporting: ["Leon", "Jill", "Ada"] });
});

test("the romance stays between Claire and you, inside her franchise only", () => {
  const lines = castLines(castFor(claire, null, () => 0)).join("\n");
  assert.match(lines, /Claire Redfield is the learner's partner/);
  assert.match(lines, /only between Claire Redfield and you/);
  assert.match(lines, /never in a romance/);
  assert.match(lines, /comes from Resident Evil only, never from another franchise\. Places and things to draw from: Raccoon City, TerraSave\./);
});

test("the franchise of a persona is the one its world names", () => {
  assert.equal(franchiseOf(malenia), "Elden Ring");
  assert.equal(franchiseOf({ name: "Wesker" }), null);
  assert.equal(franchiseOf(null), null);
});
