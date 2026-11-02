import { languageName } from "./evidence.js";
import { HINT_RULES, STATEMENT_RULES } from "./exercise.js";

/**
 * The prompt that rewrites the statement and the hints of an exercise forged before they had to explain
 * the problem, keeping every behavior the tests check exactly as it is.
 * @param {{ title: string, readme: string, hints: string[], reference: string, test: string, language: string, theme?: string }} input
 * @returns {string}
 */
export function statementPrompt({ title, readme, hints, reference, test, language, theme }) {
  return [
    "BTB_TASK: statement",
    "back-to-basics is a daily drill where someone rebuilds their programming fundamentals by hand, with no AI while solving.",
    "The statement and hints of this exercise are too terse. Rewrite them so they explain the problem.",
    `Write them in ${languageName(language)}. Code identifiers in English. Never use em dashes.`,
    "Keep the story, the characters, the names of the function or component and every behavior exactly as the tests check them. Never add a requirement the tests do not check.",
    "",
    ...STATEMENT_RULES,
    ...HINT_RULES,
    theme ? `- Examples are about: ${theme}` : null,
    "",
    `Exercise: ${title}`,
    "",
    "Current statement:",
    readme.trim(),
    "",
    "Current hints:",
    ...hints.map((hint, index) => `${index + 1}. ${hint}`),
    "",
    "Reference solution, never shown to the learner:",
    reference.trim(),
    "",
    "Tests:",
    test.trim(),
    "",
    'Respond with JSON only, no prose and no code fences: {"readme":"markdown","hints":["...","...","..."]}',
  ]
    .filter((line) => line !== null)
    .join("\n");
}
