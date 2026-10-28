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
