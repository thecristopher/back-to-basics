import { excerpt } from "../../utils/text.js";
import { languageName } from "./evidence.js";

const MESSAGE_LINES = 6;

function messageLines(text) {
  return text ? excerpt(text, MESSAGE_LINES) : [];
}

function runLines(run) {
  if (run.timedOut) return ["The tests timed out: something in their code never finishes."];
  if (run.crashed) return ["Their code crashed before the tests could run:", ...messageLines(run.stderr)];
  if (run.failures.length === 0) return [`All ${run.total} tests pass.`];
  return [`${run.passed} of ${run.total} tests pass. Failing:`, ...run.failures.flatMap((test) => [`- ${test.name}`, ...messageLines(test.message)])];
}

function earlierLines(earlier) {
  if (earlier.length === 0) return [];
  return ["", "Hints they already got this round, do not repeat them:", ...earlier.map((text) => `- ${text}`)];
}

/**
 * The prompt that has Claude read the learner's code as it is now and hint at what it still needs.
 * @param {{ title: string, readme: string, code: string, run: { passed: number, total: number, failures: { name: string, message?: string }[], timedOut?: boolean, crashed?: boolean, stderr?: string }, reference: string, planned: string, earlier: string[], step: number, total: number, language: string }} input
 *   planned is the hint written with the exercise for this step, the depth to aim for
 * @returns {string}
 */
export function hintPrompt({ title, readme, code, run, reference, planned, earlier, step, total, language }) {
  return [
    "BTB_TASK: hint",
    "back-to-basics is a daily drill where someone rebuilds their programming fundamentals by hand, with no AI while solving.",
    `They asked for hint ${step} of ${total} on the exercise below. Read their code and the test results and hint at the one thing it needs most right now.`,
    "- Talk about their code: what is missing, wrong or in the wrong place, and where (the function, the case, the line).",
    "- Not a recap of the lesson or the concept in general. Only what this code needs to move forward.",
    "- If their code is still the starter or close to it, hint at the first step to take.",
    "- If every test passes, tell them so and that they can submit.",
    `- Hint ${step} of ${total}: the first hints stay vague, the last ones get concrete. This planned hint shows the depth to aim for: ${planned}`,
    "- Never write the fix, a line that would pass a test or the algorithm step by step. Ask or point, do not solve.",
    `- One to three sentences in ${languageName(language)}. Code identifiers as they appear in the code. Never use em dashes.`,
    ...earlierLines(earlier),
    "",
    `Exercise: ${title}`,
    "",
    "Statement:",
    readme.trim(),
    "",
    "Their code right now:",
    code.trim() || "(empty)",
    "",
    "Test results right now:",
    ...runLines(run),
    "",
    "Reference solution, only so you know what is missing, never shown or quoted:",
    reference.trim(),
    "",
    "Respond with the hint only, no preamble.",
  ].join("\n");
}
