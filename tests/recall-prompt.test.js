import assert from "node:assert/strict";
import { test } from "node:test";
import { momentsPrompt } from "../src/actions/prompts/moments.js";
import { recallPrompt } from "../src/actions/prompts/recall.js";

const malenia = { name: "Malenia", voice: "Calm and relentless." };
const lesson = "# Closures\nUna función recuerda dónde nació.\n\n## Para pensar\n¿Qué recuerda la carta de Malenia?";

test("the recall prompt carries the question, Inde's answer and the lesson to judge it against", () => {
  const prompt = recallPrompt({ title: "Cartas de amor", question: "¿Qué recuerda la carta?", answer: "Su scope", lesson, language: "es" });
  assert.match(prompt, /^BTB_TASK: recall/);
  assert.match(prompt, /Question: ¿Qué recuerda la carta\?/);
  assert.match(prompt, /Their answer: Su scope/);
  assert.match(prompt, /Write it in Spanish/);
  assert.ok(prompt.includes(lesson));
});

test("a blank answer is sent as blank so the coach gives the answer back", () => {
  const prompt = recallPrompt({ title: "Cartas", question: "¿Qué?", answer: "  ", lesson, language: "es" });
  assert.match(prompt, /Their answer: \(blank\)/);
});

test("with Malenia the feedback comes in her voice and stays honest", () => {
  const prompt = recallPrompt({ title: "Cartas", question: "¿Qué?", answer: "", lesson, language: "en", persona: malenia });
  assert.match(prompt, /Speak as Malenia, the learner's coach: Calm and relentless\./);
  assert.match(prompt, /as honest as you would without the voice/);
});

test("the moments prompt asks Claire for her line at each moment of this exercise only", () => {
  const prompt = momentsPrompt({ title: "Mezcla de hierbas", concepts: ["if"], readme: "Mezcla verde y roja.", persona: { name: "Claire Redfield", voice: "Warm." }, language: "es" });
  assert.match(prompt, /^BTB_TASK: moments/);
  assert.match(prompt, /- failed_again: the tests failed again in the same round/);
  assert.match(prompt, /You are Claire Redfield/);
  assert.match(prompt, /Never a line that fits any exercise/);
  assert.match(prompt, /"passed_struggled":"\.\.\."\}/);
});
