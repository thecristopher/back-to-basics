import assert from "node:assert/strict";
import { test } from "node:test";
import { briefPrompt, lessonPrompt } from "../src/actions/prompts/lesson.js";

const claire = { name: "Claire Redfield", voice: "Determined and warm." };
const brief = {
  title: "Playlist compartida",
  readme: "# Playlist compartida\n",
  lesson: "# Closures\nUna función recuerda dónde nació.\n",
  persona: claire,
  review: false,
  language: "es",
};

test("the lesson prompt keeps the reference away from the learner", () => {
  const prompt = lessonPrompt({ title: "Notas de amor", concepts: ["closures"], readme: "# Notas\n", reference: "export const note = () => 'Malenia';", language: "es" });
  assert.match(prompt, /^BTB_TASK: lesson/);
  assert.match(prompt, /Reference solution, never shown to the learner/);
  assert.match(prompt, /Never solve the exercise/);
});

test("the lesson prompt carries the theme when there is one", () => {
  const prompt = lessonPrompt({ title: "t", concepts: ["c"], readme: "r", reference: "x", language: "es", theme: "citas de Claire e Inde" });
  assert.match(prompt, /Examples are about: citas de Claire e Inde/);
});

test("the brief is written as the coach, from the lesson", () => {
  const prompt = briefPrompt(brief);
  assert.match(prompt, /^BTB_TASK: brief/);
  assert.match(prompt, /You are Claire Redfield/);
  assert.match(prompt, /Una función recuerda dónde nació/);
  assert.match(prompt, /Write it in Spanish/);
});

test("the brief of a review reminds instead of presenting", () => {
  assert.match(briefPrompt({ ...brief, review: true }), /spaced review of an exercise they already solved/);
});

test("neither prompt carries an em dash", () => {
  assert.doesNotMatch(briefPrompt(brief), /\u2014/);
  assert.doesNotMatch(lessonPrompt({ title: "t", concepts: ["c"], readme: "r", reference: "x", language: "en" }), /\u2014/);
});

test("Claire's feelings always show, in one fresh detail woven into the lesson", () => {
  assert.match(briefPrompt(brief), /Whatever your voice says you feel for them or about your rivals shows in one detail woven into the lesson/);
});

test("the brief never closes by sending them to write it", () => {
  const prompt = briefPrompt(brief);
  assert.doesNotMatch(prompt, /End by sending them to write it themselves/);
  assert.match(prompt, /do not close by sending them to write it/);
});

test("the brief warns about one mistake and leaves the guest scene to the statement", () => {
  const prompt = briefPrompt(brief);
  assert.match(prompt, /one typical mistake at most/);
  assert.match(prompt, /Do not retell it\./);
});

test("the brief carries how Claire opened and closed her last ones", () => {
  const earlier = [{ opening: "Inde, hoy toca algo bonito.", closing: "Ahora escribe tú la playlist." }];
  assert.match(briefPrompt({ ...brief, earlier }), /- opened: Inde, hoy toca algo bonito\. \| closed: Ahora escribe tú la playlist\./);
});

test("a first brief has no earlier ones to avoid", () => {
  assert.doesNotMatch(briefPrompt(brief), /Your last briefings/);
});

test("a lesson written later follows the same theory shape and closes on a question answered in words", () => {
  const prompt = lessonPrompt({ title: "Cartas de Claire", concepts: ["closures"], readme: "r", reference: "x", language: "es" });
  assert.match(prompt, /What it is: the definition in plain words/);
  assert.match(prompt, /never asks them to run, try, test, write, change, implement or look up anything/);
});
