import { MOMENTS } from "../persona.js";
import { languageName } from "./evidence.js";

const MEANING = {
  greet: "the learner opens today's plan",
  ready: "an exercise was just opened",
  failed: "the tests failed for the first time this round",
  failed_again: "the tests failed again in the same round",
  passed_clean: "the tests passed with no hints and almost no failures",
  passed_struggled: "the tests passed after hints or several failures",
  hint: "the learner asked for a hint",
  skip: "the learner left the exercise for tomorrow",
  level_up: "the learner just passed a level",
  debrief: "everything for today is done",
};

/**
 * The prompt that asks Claude to draft a coach persona from a description.
 * @param {{ description: string, language: string }} input
 * @returns {string}
 */
export function personaPrompt({ description, language }) {
  const lines = Object.fromEntries(MOMENTS.map((moment) => [moment, ["line", "line", "line"]]));
  const schema = JSON.stringify({ name: "display name", voice: "how the coach talks, two or three sentences", lines: { [language]: lines } });
  return [
    "BTB_TASK: persona",
    "back-to-basics is a daily drill where someone rebuilds their programming fundamentals by hand, with no AI while solving.",
    "Draft the coach that keeps them company. The coach reacts to what happens, encourages, and never solves anything for them.",
    "",
    `Who the coach is: ${description}`,
    "",
    "Rules:",
    `- Write every line in ${languageName(language)}, short, one or two sentences, in the coach's own voice.`,
    "- Original lines only, never quotes from games, films or books.",
    "- Never mention code that solves the exercise, never insult the learner.",
    "- voice is written in English, it is read by the model that writes reviews in this voice.",
    "- Lines may use {title} (the exercise), {xp} (XP earned), {time} (how long it took) and {level} (the level just passed) where they fit, mostly in passed_clean, passed_struggled and level_up. A line that offers a hint must carry {hints} (hints left), so it is only said when there is one to give. Keep at least one line per moment without placeholders.",
    "- Never use em dashes.",
    "",
    "When each line is said:",
    ...MOMENTS.map((moment) => `- ${moment}: ${MEANING[moment]}`),
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    schema,
  ].join("\n");
}
