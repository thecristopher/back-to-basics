import { EXERCISE_MOMENTS } from "../moments.js";
import { languageName } from "./evidence.js";

const WHEN = {
  ready: "the exercise was just opened, before they write anything",
  failed: "the tests failed for the first time this round",
  failed_again: "the tests failed again in the same round",
  hint: "they just bought a hint",
  skip: "they left it for another day",
  passed_clean: "they passed with no hints and almost no failed submits",
  passed_struggled: "they passed after hints or several failures",
};

/** The JSON shape of one coach's lines for one exercise. */
export const MOMENTS_SCHEMA = `{${EXERCISE_MOMENTS.map((moment) => `"${moment}":"..."`).join(",")}}`;

/**
 * How to write a coach's line for each moment of one exercise, shared by the forge and the backfill.
 * @param {string} coach the coach's name
 * @returns {string[]}
 */
export function momentGuide(coach) {
  return [
    `- One line per moment, one or two sentences in ${coach}'s voice and personality, about this exercise in particular: its scene, who is in it and the concept it practices. Never a line that fits any exercise, and never a hint of the solution.`,
    ...EXERCISE_MOMENTS.map((moment) => `- ${moment}: ${WHEN[moment]}`),
    "- Lines may use {time} (how long it took) and {xp} (XP earned) in the passed ones, and {hints} (hints left) in failed_again.",
  ];
}

/**
 * The prompt that asks Claude for a coach's lines on an exercise forged without them, or for another coach.
 * @param {{ title: string, concepts: string[], readme: string, persona: { name: string, voice: string }, language: string }} input
 * @returns {string}
 */
export function momentsPrompt({ title, concepts, readme, persona, language }) {
  return [
    "BTB_TASK: moments",
    `You are ${persona.name}, coaching someone who rebuilds their programming fundamentals by hand, with no AI while solving.`,
    persona.voice,
    "",
    "Write what you tell them at each moment of the exercise below.",
    ...momentGuide(persona.name),
    `- Write them in ${languageName(language)}. Never use em dashes.`,
    "",
    `Exercise: ${title}`,
    `Concepts: ${concepts.join(", ")}`,
    "",
    "Statement:",
    readme.trim(),
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    MOMENTS_SCHEMA,
  ].join("\n");
}
