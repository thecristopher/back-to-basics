import assert from "node:assert/strict";
import { test } from "node:test";
import { lastSession, plannedOf, roundsOf } from "../src/actions/day.js";
import { debriefPrompt, greetPrompt } from "../src/actions/prompts/day.js";
import { createT } from "../src/lib/i18n.js";

const byId = {
  "node/herbs": { title: "Mezcla de hierbas", concepts: ["if"] },
  "node/case": { title: "El maletín de Leon", concepts: ["arrays"] },
};
const ada = { name: "Ada Wong", voice: "Cool and cryptic." };

test("the rounds of a day carry each exercise's title", () => {
  const day = { rounds: { "node/herbs": { outcome: "clean", failures: 0, hints: 0 }, "node/gone": { outcome: "clean" } } };
  assert.deepEqual(roundsOf(day, byId), [{ title: "Mezcla de hierbas", concepts: ["if"], outcome: "clean", failures: 0, hints: 0 }]);
});

test("the last session is the latest day before today with rounds", () => {
  const days = { "2026-10-27": { rounds: { a: {} } }, "2026-10-28": { rounds: {} }, "2026-10-30": { rounds: { b: {} } } };
  assert.equal(lastSession(days, "2026-10-30"), "2026-10-27");
  assert.equal(lastSession({}, "2026-10-30"), null);
});

test("today's plan names the exercises, the reviews and the new ones by track", () => {
  const day = { queue: ["node/case", "node/herbs", "forge:react"], reviews: ["node/herbs"] };
  assert.deepEqual(plannedOf(day, byId, { react: "React" }), ["El maletín de Leon", "Mezcla de hierbas (review)", "a new exercise of React"]);
});

test("Ada's greeting remembers the last session and names today's plan", () => {
  const prompt = greetPrompt({
    persona: ada,
    language: "es",
    last: { date: "2026-10-29", rounds: [{ title: "Mezcla de hierbas", outcome: "struggled", failures: 2, hints: 1 }] },
    planned: ["El maletín de Leon"],
    levels: ["Node.js level 2, Bucles"],
  });
  assert.match(prompt, /^BTB_TASK: greet/);
  assert.match(prompt, /You are Ada Wong/);
  assert.match(prompt, /- "Mezcla de hierbas": struggled, 2 failed submits, 1 hints/);
  assert.match(prompt, /- El maletín de Leon/);
  assert.match(prompt, /Write it in Spanish/);
});

test("a first session is greeted as one", () => {
  assert.match(greetPrompt({ persona: ada, language: "en", last: null, planned: [], levels: [] }), /This is their first session/);
});

test("Malenia's goodbye names the rounds and what cost them", () => {
  const prompt = debriefPrompt({ persona: { name: "Malenia", voice: "Calm." }, language: "en", rounds: [{ title: "Runas", outcome: "clean", failures: 0, hints: 0 }], xp: 30, goal: 40, toImprove: ["closures"] });
  assert.match(prompt, /^BTB_TASK: debrief/);
  assert.match(prompt, /- "Runas": clean/);
  assert.match(prompt, /XP: 30 of a goal of 40/);
  assert.match(prompt, /Concepts that cost them: closures/);
});

test("Claire's texts replace the CLI's, placeholders filled in order", () => {
  const t = createT("es", { texts: { es: { goNext: "Arrancamos: btb next", allDone: "¡Saliste! {xp}/{goal} XP." } } });
  assert.equal(t.goNext, "Arrancamos: btb next");
  assert.equal(t.allDone(30, 40), "¡Saliste! 30/40 XP.");
  assert.equal(t.afterPass, createT("es").afterPass);
});

test("texts in another language or for editor keys leave the CLI alone", () => {
  const t = createT("es", { texts: { en: { goNext: "Next" }, es: { working_next: "Te preparo el siguiente…" } } });
  assert.equal(t.goNext, createT("es").goNext);
  assert.equal(t.working_next, undefined);
});
