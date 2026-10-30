import assert from "node:assert/strict";
import { test } from "node:test";
import { castFor, castLines, franchiseOf, pickCast, pickFeatured } from "../src/actions/cast.js";
import { exercisePrompt } from "../src/actions/prompts/exercise.js";

const cast = { leads: ["Claire Redfield"], supporting: ["Leon", "Jill", "Ada", "Rebecca", "Carlos"] };
const claire = {
  name: "Claire Redfield",
  voice: "Warm and stubborn.",
  partner: true,
  world: {
    franchise: "Resident Evil",
    supporting: ["Leon", "Jill", "Chris", "Wesker"],
    places: ["Raccoon City", "TerraSave"],
    lore: {
      "Claire Redfield": ["her motorcycle into Raccoon City", "getting Sherry out"],
      Leon: ["the attache case", "the merchant", "the police station medallions", "rescuing Ashley"],
    },
  },
};
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

test("Leon coaches as an ally on his day, with no romance whatever the theme says", () => {
  const leon = { name: "Leon S. Kennedy", voice: "Dry and done with it.", world: { franchise: "Resident Evil", supporting: ["Claire Redfield"] } };
  const picked = castFor(leon, null, () => 0);
  assert.equal(picked.coach, "Leon S. Kennedy");
  assert.equal(picked.partner, undefined);
  const lines = castLines(picked).join("\n");
  assert.match(lines, /Leon S\. Kennedy coaches the learner today as an ally/);
  assert.match(lines, /There is no romance with Leon S\. Kennedy or anyone else in this exercise, whatever the theme says/);
  assert.doesNotMatch(lines, /partner/);
});

test("the franchise of a persona is the one its world names", () => {
  assert.equal(franchiseOf(malenia), "Elden Ring");
  assert.equal(franchiseOf({ name: "Wesker" }), null);
  assert.equal(franchiseOf(null), null);
});

function promptWith(cast) {
  return exercisePrompt({
    purpose: "practice",
    track: { title: "Node.js", focus: "Basics." },
    profile: { name: "JavaScript", testGuide: "node:test" },
    files: { solutionFile: "solution.js", testFile: "solution.test.js", importHint: "import" },
    level: { level: 1, title: "Base", summary: "s", concepts: ["if"] },
    count: 1,
    summary: { strong: [], weak: [], recent: [] },
    language: "es",
    example: {},
    cast,
  });
}

test("only someone in the cast with lore of their own can lead the exercise", () => {
  const lore = { Leon: ["the attache case"], Jill: [] };
  assert.equal(pickFeatured(["Claire Redfield", "Jill", "Leon"], lore, () => 0), "Leon");
  assert.equal(pickFeatured(["Jill", "Wesker"], lore), null);
});

test("when Leon leads, the scenes come from his story only, each one once", () => {
  // the first roll picks Leon among the supporting faces, the second picks him to lead
  const rolls = [0, 0, 0, 0.99];
  const picked = castFor(claire, cast, () => rolls.shift() ?? 0);
  assert.equal(picked.featured, "Leon");
  assert.equal(picked.scenes.length, 3);
  assert.ok(picked.scenes.every((scene) => claire.world.lore.Leon.includes(scene)));
  assert.equal(new Set(picked.scenes).size, 3);
});

test("Claire can lead her own exercises with her own scenes", () => {
  const picked = castFor(claire, cast, () => 0);
  assert.equal(picked.featured, "Claire Redfield");
  assert.deepEqual(picked.scenes, ["her motorcycle into Raccoon City", "getting Sherry out"]);
});

test("a world without lore brings no scenes and no scene line", () => {
  const picked = castFor(malenia, cast, () => 0);
  assert.equal(picked.featured, null);
  assert.deepEqual(picked.scenes, []);
  assert.doesNotMatch(castLines(picked).join("\n"), /brings the problem/);
});

test("the forge prompt makes the exercise Leon's story, told from his scene", () => {
  const prompt = promptWith({ leads: ["Claire Redfield"], supporting: ["Leon"], partner: "Claire Redfield", franchise: "Resident Evil", places: [], featured: "Leon", scenes: ["the attache case", "the merchant"] });
  assert.match(prompt, /Each exercise is Leon's story\. Set it inside one of these scenes from Leon's own story in Resident Evil, a different one per exercise: the attache case; the merchant\./);
  assert.match(prompt, /Leon brings the problem/);
  assert.match(prompt, /Someone who played it should recognize it/);
});

test("with a coach the forge asks for her line at every moment of the exercise, in her voice", () => {
  const prompt = promptWith(castFor(claire, cast, () => 0));
  assert.match(prompt, /"moments" is what Claire Redfield tells the learner while they fight this exercise\. Warm and stubborn\./);
  assert.match(prompt, /"moments":\{"ready":"\.\.\.","failed":"\.\.\.","failed_again":"\.\.\.","hint":"\.\.\.","skip":"\.\.\.","passed_clean":"\.\.\.","passed_struggled":"\.\.\."\}/);
});

test("without a coach the forge asks for no moments", () => {
  assert.doesNotMatch(promptWith({ leads: ["Malenia"], supporting: ["Blaidd"] }), /"moments"/);
});
