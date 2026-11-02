import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { conceptsUpTo, conceptTitle, graphProblems, localizeGraph } from "../src/actions/graph.js";
import { probeLevel, startFromPlacement } from "../src/actions/placement.js";

const BUNDLED = ["node", "python", "react", "llm"];

function seedOf(id) {
  return JSON.parse(readFileSync(new URL(`../tracks/${id}.json`, import.meta.url), "utf8"));
}

for (const id of BUNDLED) {
  test(`the ${id} graph is well formed, every concept with titles and a use`, () => {
    assert.deepEqual(graphProblems(seedOf(id)), []);
  });

  test(`the ${id} path ends at two interview levels`, () => {
    const titles = seedOf(id).levels.slice(-2).map((level) => level.title.en);
    assert.ok(titles.every((title) => /Onsite|Machine coding/.test(title)), titles.join(", "));
  });
}

const seed = {
  levels: [
    { title: { es: "Cartas", en: "Letters" }, summary: { es: "Para Inde", en: "For Inde" }, concepts: [{ id: "loops", es: "Bucles", en: "Loops", use: "Leer cada carta de Claire." }] },
    { title: { es: "Playlist", en: "Playlist" }, summary: { es: "s", en: "s" }, concepts: [{ id: "closures", es: "Closures", en: "Closures", use: "Recordar la canción de Malenia." }] },
  ],
};

test("a graph reads in the learner's language with its concepts by id", () => {
  const graph = localizeGraph(seed, "es");
  assert.deepEqual(graph.levels[0], { level: 1, title: "Cartas", summary: "Para Inde", concepts: ["loops"] });
  assert.deepEqual(graph.concepts.closures, { title: "Closures", use: "Recordar la canción de Malenia.", level: 2 });
  assert.equal(localizeGraph(seed, "en").levels[0].title, "Letters");
});

test("an exercise may use every concept up to its level and none after", () => {
  const { levels } = localizeGraph(seed, "es");
  assert.deepEqual(conceptsUpTo({ levels }, 1), ["loops"]);
  assert.deepEqual(conceptsUpTo({ levels }, 2), ["loops", "closures"]);
});

test("a concept the graph does not know shows by its id", () => {
  assert.equal(conceptTitle({ graph: { loops: { title: "Bucles" } } }, "loops"), "Bucles");
  assert.equal(conceptTitle({ graph: {} }, "rennala-spells"), "rennala-spells");
});

test("a duplicated or untitled concept breaks the graph", () => {
  const level = { title: { es: "a", en: "a" }, concepts: [{ id: "loops", es: "B", en: "L", use: "u" }, { id: "loops", es: "B", en: "L", use: "u" }, { id: "Bad Id", es: "x" }] };
  const problems = graphProblems({ levels: [level, level, level, level] });
  assert.ok(problems.includes('concept id "loops" appears twice'));
  assert.ok(problems.includes('concept id "Bad Id" must be kebab case'));
  assert.ok(problems.includes('concept "Bad Id" needs a title in es and en'));
});

test("placement probes spread from level 1 to the last level before the onsite ones", () => {
  assert.equal(probeLevel(1, 3, 14), 1);
  assert.equal(probeLevel(3, 3, 14), 12);
  assert.equal(probeLevel(1, 1, 14), 1);
});

test("a stumble on the first probe starts Inde at level 1", () => {
  assert.equal(startFromPlacement([{ difficulty: 1, outcome: "skipped" }], 3, 14), 1);
});

test("Inde starts right after the hardest level a clean probe proved, never inside the one that tripped her", () => {
  const evidence = [
    { difficulty: 1, outcome: "clean" },
    { difficulty: 2, outcome: "struggled" },
  ];
  assert.equal(startFromPlacement(evidence, 3, 14), 2);
});

test("a clean placement never skips the onsite levels", () => {
  const evidence = [1, 2, 3].map((difficulty) => ({ difficulty, outcome: "clean" }));
  assert.equal(startFromPlacement(evidence, 3, 14), 12);
});

test("rebuilding from the basics always starts at level 1", () => {
  const evidence = [1, 2, 3].map((difficulty) => ({ difficulty, outcome: "clean" }));
  assert.equal(startFromPlacement(evidence, 3, 14, { fromBasics: true }), 1);
});
