import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chooseLine, coachName, fillLine, linesFor, MOMENTS, momentOf, personaProblems, pickLine } from "../src/actions/persona.js";
import { personaPrompt } from "../src/actions/prompts/persona.js";
import { buildReviewPrompt } from "../src/actions/prompts/review.js";

function personaWith(lines) {
  return { name: "Claire Redfield", voice: "Determined and warm.", lines };
}

function everyMoment(line) {
  return Object.fromEntries(MOMENTS.map((moment) => [moment, [`${line} ${moment}`]]));
}

const claire = personaWith({ es: everyMoment("Claire a Inde:"), en: everyMoment("Claire to Inde:") });

test("a persona with a line for every moment holds", () => {
  assert.deepEqual(personaProblems(claire), []);
});

test("Claire's world names her franchise and who may show up", () => {
  const world = { franchise: "Resident Evil", supporting: ["Leon", "Jill"], places: ["TerraSave"] };
  assert.deepEqual(personaProblems({ ...claire, world }), []);
});

test("a world without its franchise or with a bad supporting list is refused", () => {
  assert.deepEqual(personaProblems({ ...claire, world: { supporting: "Leon" } }), [
    '"world.franchise" must be a non empty string',
    '"world.supporting" must list names',
  ]);
});

test("the bundled personas each carry their own world", async () => {
  for (const name of ["claire", "malenia", "ada"]) {
    const persona = JSON.parse(await readFile(new URL(`../personas/${name}.json`, import.meta.url), "utf8"));
    assert.deepEqual(personaProblems(persona), []);
    assert.ok(persona.world.supporting.length >= 10);
    for (const name of [persona.name, ...persona.world.supporting]) assert.ok(persona.world.lore[name]?.length > 0, `${name} has a story`);
  }
});

test("lore maps each character to their own scenes", () => {
  const world = { franchise: "Resident Evil", supporting: ["Leon"], lore: { "Claire Redfield": ["her motorcycle"], Leon: ["the attache case"] } };
  assert.deepEqual(personaProblems({ ...claire, world }), []);
});

test("a lore that is a plain list is refused", () => {
  const world = { franchise: "Elden Ring", lore: ["runes"] };
  assert.deepEqual(personaProblems({ ...claire, world }), ['"world.lore" must map characters to their scenes']);
});

test("lore for someone outside the world, or with no scenes, is refused", () => {
  const world = { franchise: "Resident Evil", supporting: ["Leon"], lore: { Radahn: ["the festival"], Leon: [] } };
  assert.deepEqual(personaProblems({ ...claire, world }), ['"world.lore" names Radahn, who is not in the world', '"world.lore.Leon" must list scenes']);
});

test("the CLI calls the coach by her first name, and Claude when there is none", () => {
  assert.equal(coachName({ name: "Claire Redfield" }), "Claire");
  assert.equal(coachName({ name: "Malenia" }), "Malenia");
  assert.equal(coachName(null), "Claude");
});

test("Ada comes bundled, voicing the CLI and the editor in both languages", async () => {
  const ada = JSON.parse(await readFile(new URL("../personas/ada.json", import.meta.url), "utf8"));
  assert.deepEqual(personaProblems(ada), []);
  assert.ok(ada.world.supporting.includes("Claire Redfield"));
  assert.ok(ada.texts.es.goNext.includes("btb next"));
  assert.ok(ada.texts.en.stage_start.includes("<CR>"));
});

test("a text the tool does not have, or a placeholder it does not fill, is refused", () => {
  const texts = { es: { escape: "Por la ventana", skipped: "Vuelve el {date} a las {hour}" } };
  assert.deepEqual(personaProblems({ ...claire, texts }), [
    '"texts.es.escape" is not a text a persona can voice',
    '"texts.es.skipped" uses unknown placeholders: hour',
  ]);
});

test("a persona missing a moment names the one missing", () => {
  const { debrief, ...rest } = everyMoment("Malenia:");
  assert.deepEqual(personaProblems(personaWith({ es: rest })), ['"lines.es.debrief" must list at least one line']);
});

test("a persona without a voice or any lines is refused", () => {
  const problems = personaProblems({ name: "Wesker" });
  assert.ok(problems.includes('"voice" must be a non empty string'));
  assert.ok(problems.includes('"lines" must have at least one language'));
});

test("a persona carrying an em dash is refused", () => {
  const lines = everyMoment("Ada:");
  lines.greet = ["Leon \u2014 again"];
  assert.ok(personaProblems(personaWith({ en: lines })).includes("no em dashes anywhere"));
});

test("lines come in the learner's language", () => {
  assert.deepEqual(linesFor(claire, "greet", "es"), ["Claire a Inde: greet"]);
});

test("a language the persona lacks falls back to English", () => {
  assert.deepEqual(linesFor(claire, "skip", "pt"), ["Claire to Inde: skip"]);
});

test("the line said last time is never picked again", () => {
  for (const roll of [0, 0.4, 0.99]) assert.notEqual(pickLine(3, 1, () => roll), 1);
});

test("a single line is always the one picked", () => {
  assert.equal(pickLine(1, 0), 0);
});

test("a first failed submit is failed, the next ones failed_again", () => {
  assert.equal(momentOf("submit", { ok: false, attempt: 1 }), "failed");
  assert.equal(momentOf("submit", { ok: false, attempt: 3 }), "failed_again");
});

test("a pass is clean, struggled or a level up", () => {
  assert.equal(momentOf("submit", { ok: true, outcome: "clean" }), "passed_clean");
  assert.equal(momentOf("submit", { ok: true, outcome: "struggled" }), "passed_struggled");
  assert.equal(momentOf("submit", { ok: true, outcome: "clean", levelUp: 2 }), "level_up");
});

test("the pass that ends the day is a debrief, unless it also levels up", () => {
  assert.equal(momentOf("submit", { ok: true, outcome: "clean", day: { solved: 2 } }), "debrief");
  assert.equal(momentOf("submit", { ok: true, outcome: "clean", levelUp: 2, day: { solved: 2 } }), "level_up");
});

test("Claire only offers a hint while Inde still has one left", () => {
  assert.equal(fillLine("Pistas que quedan: {hints}.", { hintsLeft: 2 }), "Pistas que quedan: 2.");
  assert.equal(fillLine("Pistas que quedan: {hints}.", { hintsLeft: 0 }), null);
});

test("solving again the same day keeps the persona quiet", () => {
  assert.equal(momentOf("submit", { ok: true, repeat: true }), null);
});

test("opening an exercise is ready and finishing the day is debrief", () => {
  assert.equal(momentOf("next", { id: "node/love-notes" }), "ready");
  assert.equal(momentOf("next", { done: true }), "debrief");
});

test("errors and reports with no moment keep the persona quiet", () => {
  assert.equal(momentOf("submit", { error: "nope" }), null);
  assert.equal(momentOf("status", {}), null);
});

test("every bundled persona holds", async () => {
  for (const name of ["claire", "malenia", "ada"]) {
    const persona = JSON.parse(await readFile(new URL(`../personas/${name}.json`, import.meta.url), "utf8"));
    assert.deepEqual(personaProblems(persona), [], name);
  }
});

test("the review prompt speaks in the persona's voice and keeps the scores honest", () => {
  const prompt = buildReviewPrompt({
    title: "Notas de amor",
    level: 1,
    readme: "# Notas de amor\n",
    solution: "export const loveNote = () => 'Claire para Inde';\n",
    languageLabel: "JavaScript (Node.js)",
    record: { lastOutcome: "clean", attempts: 1, bestSeconds: 60 },
    language: "es",
    persona: { name: "Claire Redfield", voice: "Determined and warm." },
  });
  assert.match(prompt, /Speak as Claire Redfield, the learner's coach: Determined and warm\./);
  assert.match(prompt, /as honest as you would without the voice/);
});

test("the persona prompt asks for every moment in the learner's language", () => {
  const prompt = personaPrompt({ description: "Malenia, calm and relentless", language: "es" });
  assert.match(prompt, /^BTB_TASK: persona/);
  assert.match(prompt, /Write every line in Spanish/);
  for (const moment of MOMENTS) assert.match(prompt, new RegExp(`- ${moment}: `));
  assert.doesNotMatch(prompt, /\u2014/);
});

test("a line names the exercise, the XP and the time of the round", () => {
  const round = { title: "Notas de amor", xp: 15, seconds: 95 };
  assert.equal(fillLine("{title} en {time}, +{xp} XP", round), "Notas de amor en 1m 35s, +15 XP");
});

test("a line asking for what the round lacks is left out", () => {
  assert.equal(fillLine("Nivel {level} superado", { title: "Playlist" }), null);
});

test("Claire only says the lines this round can fill", () => {
  const lines = ["Nivel {level}, Inde.", "Bien, Inde."];
  assert.deepEqual(chooseLine(lines, { title: "Cita" }, undefined), { index: 1, line: "Bien, Inde." });
});

test("Malenia never repeats her last line when another one fits", () => {
  const lines = ["{title} cayó.", "Limpio.", "Un golpe."];
  for (const roll of [0, 0.5, 0.99]) assert.notEqual(chooseLine(lines, { title: "Duelo" }, 0, () => roll).index, 0);
});

test("a persona with a placeholder btb does not know is refused", () => {
  const lines = everyMoment("Leon:");
  lines.passed_clean = ["{weapon} listo"];
  assert.ok(personaProblems(personaWith({ en: lines })).some((problem) => problem.includes("unknown placeholders: weapon")));
});

