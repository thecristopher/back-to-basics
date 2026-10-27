import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReviewPrompt } from "../src/actions/prompts/review.js";

const input = {
  title: "Suma de pares",
  level: 1,
  readme: "# Suma de pares\n",
  solution: "export const sumEvens = () => 0;\n",
  languageLabel: "JavaScript (Node.js)",
  record: { lastOutcome: "clean", attempts: 2, bestSeconds: 95 },
  language: "es",
};

test("the prompt asks for the review in Spanish with the solution inside", () => {
  const prompt = buildReviewPrompt(input);
  assert.match(prompt, /Write the whole review in Spanish/);
  assert.match(prompt, /export const sumEvens/);
  assert.match(prompt, /Best time: 95 seconds/);
});

test("the prompt names the language of the exercise", () => {
  assert.match(buildReviewPrompt({ ...input, languageLabel: "React" }), /level 1, React/);
});

test("the prompt never carries an em dash", () => {
  assert.doesNotMatch(buildReviewPrompt(input), /\u2014/);
});
