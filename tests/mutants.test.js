import assert from "node:assert/strict";
import { test } from "node:test";
import { judgeMutant, likelyMistakes, mutantShapeProblems, nudgeFor } from "../src/actions/mutants.js";
import { lastRun, partialFailures } from "../src/actions/runs.js";
import { draftProblems } from "../src/actions/validate.js";
import { MUTANT_RULES, exercisePrompt, formatLines, isComplexityLevel } from "../src/actions/prompts/exercise.js";
import { formatOf } from "../src/lib/forge.js";

const draft = {
  starter: "export function playlistMinutes(songs) {}\n",
  reference: "export function playlistMinutes(songs) { return songs.reduce((sum, song) => sum + song.minutes, 0); }\n",
  mutants: [
    { mistake: "olvida la playlist vacía de Claire", nudge: "¿Qué devuelve tu función si Claire no tiene canciones?", code: "export function playlistMinutes(songs) { return songs[0].minutes; }\n" },
    { mistake: "suma las canciones que Inde saltó", nudge: "¿Todas las canciones de Inde cuentan igual?", code: "export function playlistMinutes(songs) { return 1; }\n" },
  ],
};

test("two or three real wrong solutions make a good set of mutants", () => {
  assert.deepEqual(mutantShapeProblems(draft), []);
});

test("one mutant is not enough to trust the tests", () => {
  assert.match(mutantShapeProblems({ ...draft, mutants: [draft.mutants[0]] })[0], /must list 2 or 3/);
});

test("a mutant that is the reference or the empty starter is no mistake at all", () => {
  const lazy = { ...draft, mutants: [{ mistake: "nada", nudge: "n", code: draft.reference }, { mistake: "vacío", nudge: "v", code: draft.starter }] };
  assert.deepEqual(mutantShapeProblems(lazy), ['mutant 1 ("nada") is the reference itself', 'mutant 2 ("vacío") is the empty starter, write the solution a learner would really get wrong']);
});

test("mutants are only required when the tests report by name", () => {
  const example = { call: "playlistMinutes([])", result: "0" };
  const bare = { ...draft, title: "t", readme: "playlistMinutes([]) // 0", lesson: "l", test: "playlistMinutes([]), 0", example, hints: ["h"], concepts: ["c"], minutes: 5, mutants: undefined };
  assert.deepEqual(draftProblems(bare), []);
  assert.equal(draftProblems(bare, { mutants: true }).length, 1);
});

const caught = { ok: false, tests: [{ name: "suma la playlist de Malenia", ok: true }, { name: "devuelve 0 con una playlist vacía", ok: false }] };

test("a mutant caught by a test keeps the names of the tests that catch it", () => {
  assert.deepEqual(judgeMutant(draft.mutants[0], caught), { problem: null, caughtBy: ["devuelve 0 con una playlist vacía"] });
});

test("a mutant that passes every test sends the exercise back", () => {
  assert.match(judgeMutant(draft.mutants[0], { ok: true, tests: [] }).problem, /let a wrong solution pass \("olvida la playlist vacía de Claire"\)/);
});

test("a mutant that crashes the run proves nothing about the tests", () => {
  assert.match(judgeMutant(draft.mutants[1], { ok: false, crashed: true, tests: [] }).problem, /crashes the run/);
});

const stored = [
  { mistake: "olvida la playlist vacía de Claire", nudge: "¿Y si Claire no tiene canciones?", caughtBy: ["devuelve 0 con una playlist vacía"] },
  { mistake: "suma las canciones que Inde saltó", nudge: "¿Todas cuentan?", caughtBy: ["ignora las canciones saltadas", "suma la playlist de Malenia"] },
];

test("a run that failed every test a mutant fails names that mistake", () => {
  assert.deepEqual(likelyMistakes(stored, [["devuelve 0 con una playlist vacía"]]), ["olvida la playlist vacía de Claire"]);
});

test("a run that failed only part of what catches a mutant does not name it", () => {
  assert.deepEqual(likelyMistakes(stored, [["ignora las canciones saltadas"]]), []);
});

test("only runs that failed part of the tests count as showing a mistake", () => {
  const roundStart = Date.parse("2026-11-01T09:00:00.000Z");
  const runs = [
    { at: "2026-11-01T10:00:00.000Z", id: "node/claire-playlist", kind: "test", passed: 0, failing: ["a", "b"], error: null },
    { at: "2026-11-01T10:01:00.000Z", id: "node/claire-playlist", kind: "test", passed: 1, failing: ["b"], error: null },
    { at: "2026-11-01T10:02:00.000Z", id: "node/claire-playlist", kind: "submit", passed: 0, failing: [], error: "crash" },
  ];
  assert.deepEqual(partialFailures(runs, "node/claire-playlist", roundStart), [["b"]]);
});

test("a likely mistake reaches the next exercise prompt", () => {
  const recent = [{ title: "La playlist de Claire", level: 2, outcome: "struggled", failures: 2, hints: 0, mistakes: ["olvida la playlist vacía de Claire"] }];
  const prompt = exercisePrompt({
    purpose: "practice",
    track: { title: "Node", focus: "f" },
    profile: { name: "JavaScript", testGuide: "g", report: "node-test" },
    files: { solutionFile: "solution.js", testFile: "solution.test.js", importHint: "i" },
    level: { level: 2, title: "Bucles", summary: "s", concepts: [] },
    count: 1,
    summary: { strong: [], weak: [], learning: [], recent },
    language: "es",
    example: { title: "Suma" },
  });
  assert.match(prompt, /likely mistakes: olvida la playlist vacía de Claire/);
  assert.ok(prompt.includes(MUTANT_RULES[0]));
  assert.match(prompt, /"mutants":\[\{"mistake"/);
  assert.match(prompt, /"nudge"/);
});

test("a review asks for a fresh exercise on a concept of a passed level, solvable from memory", () => {
  const track = { title: "Node", focus: "f", graph: { closures: { title: "Closures", use: "Recordar la playlist de Claire." } }, path: { levels: [] } };
  const prompt = exercisePrompt({
    purpose: "review",
    track,
    focus: { id: "closures", standing: "review" },
    allowed: ["closures"],
    profile: { name: "JavaScript", testGuide: "g", report: "node-test" },
    files: { solutionFile: "solution.js", testFile: "solution.test.js", importHint: "i" },
    level: { level: 3, title: "Funciones con oficio", summary: "s", concepts: ["closures"] },
    count: 1,
    summary: { strong: ["closures"], weak: [], learning: [], recent: [] },
    avoid: ["Contador de Inde"],
    language: "es",
    example: { title: "Suma" },
  });
  assert.match(prompt, /^BTB_PURPOSE: review$/m);
  assert.match(prompt, /^Write 1 exercise that reviews a concept from level 3/m);
  assert.match(prompt, /spaced review to prove it is still theirs/);
  assert.match(prompt, /Never the same problem as these, already written: Contador de Inde\./);
});

test("a mutant without a nudge cannot point the learner at their mistake", () => {
  const silent = { ...draft, mutants: draft.mutants.map((mutant) => ({ ...mutant, nudge: "" })) };
  assert.match(mutantShapeProblems(silent)[0], /"nudge" must point someone/);
});

const partialRun = { passed: 3, failing: ["devuelve 0 con una playlist vacía"], error: null };

test("a run that fails like a known mistake gets the nudge aimed at it", () => {
  assert.deepEqual(nudgeFor(stored, partialRun), { mistake: "olvida la playlist vacía de Claire", nudge: "¿Y si Claire no tiene canciones?" });
});

test("a mistake already nudged this round is not nudged twice", () => {
  assert.equal(nudgeFor(stored, partialRun, ["olvida la playlist vacía de Claire"]), null);
});

test("an empty body, a crash or no run at all says nothing about a mistake", () => {
  assert.equal(nudgeFor(stored, { passed: 0, failing: ["devuelve 0 con una playlist vacía"], error: null }), null);
  assert.equal(nudgeFor(stored, { passed: 2, failing: [], error: "crash" }), null);
  assert.equal(nudgeFor(stored, null), null);
});

test("the latest run of the round skips the redo runs and the ones before it started", () => {
  const roundStart = Date.parse("2026-11-01T09:00:00.000Z");
  const runs = [
    { at: "2026-11-01T08:00:00.000Z", id: "node/claire-playlist", kind: "test" },
    { at: "2026-11-01T10:00:00.000Z", id: "node/claire-playlist", kind: "submit" },
    { at: "2026-11-01T10:05:00.000Z", id: "node/claire-playlist", kind: "redo" },
    { at: "2026-11-01T10:06:00.000Z", id: "node/inde-letters", kind: "test" },
  ];
  assert.equal(lastRun(runs, "node/claire-playlist", roundStart).at, "2026-11-01T10:00:00.000Z");
  assert.equal(lastRun(runs, "node/malenia-runes", roundStart), null);
});

const fourteen = { id: "node", path: { levels: Array.from({ length: 14 }, (_, index) => ({ level: index + 1 })) } };
const huntCtx = (mistakes) => ({ state: { mastery: { node: { recent: [{ concepts: ["closures"], mistakes }] } } } });
const weakFocus = { id: "closures", standing: "weak" };
const named = { report: "node-test" };

test("a weak concept with a known mistake comes back as a bug hunt aimed at that mistake", () => {
  const format = formatOf(huntCtx(["comparte el contador de Inde entre llamadas"]), fourteen, { purpose: "practice", level: { level: 4 } }, weakFocus, named);
  assert.deepEqual(format, { bugHunt: "comparte el contador de Inde entre llamadas", complexity: false });
  assert.match(formatLines(format).join("\n"), /exactly one bug, this mistake: "comparte el contador de Inde entre llamadas"/);
});

test("no bug hunt without a known mistake, on level 1, on the interview levels or with tests that do not name themselves", () => {
  const level4 = { purpose: "practice", level: { level: 4 } };
  assert.equal(formatOf(huntCtx([]), fourteen, level4, weakFocus, named).bugHunt, null);
  assert.equal(formatOf(huntCtx(["x"]), fourteen, { purpose: "practice", level: { level: 1 } }, weakFocus, named).bugHunt, null);
  assert.equal(formatOf(huntCtx(["x"]), fourteen, { purpose: "practice", level: { level: 13 } }, weakFocus, named).bugHunt, null);
  assert.equal(formatOf(huntCtx(["x"]), fourteen, level4, weakFocus, { report: "exit-code" }).bugHunt, null);
  assert.equal(formatOf(huntCtx(["x"]), fourteen, level4, { id: "closures", standing: "learning" }, named).bugHunt, null);
});

test("only the last 4 levels of a long path ask for the Big O", () => {
  assert.deepEqual([10, 11, 14].map((level) => isComplexityLevel(fourteen, { level })), [false, true, true]);
  assert.equal(isComplexityLevel({ path: { levels: [{}, {}, {}, {}] } }, { level: 4 }), false);
});
