import assert from "node:assert/strict";
import { test } from "node:test";
import { castLine, pickCast } from "../src/actions/cast.js";
import { exercisePrompt } from "../src/actions/prompts/exercise.js";

const cast = { leads: ["Claire Redfield", "Malenia", "Inde Navarrete"], supporting: ["Leon", "Jill", "Ada", "Melina", "Ranni"] };

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
  assert.equal(castLine(null), null);
});

test("the cast line names the leads and asks for the supporting ones by name", () => {
  const line = castLine({ leads: ["Claire Redfield"], supporting: ["Leon", "Melina"] });
  assert.match(line, /Leads: Claire Redfield/);
  assert.match(line, /Bring in Leon, Melina by name in the readme and the test data/);
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
