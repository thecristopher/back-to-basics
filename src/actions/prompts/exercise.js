import { aptitudeLines, languageName } from "./evidence.js";

const SCHEMA =
  '{"exercises":[{"slug":"kebab-case-name","title":"...","difficulty":1,"minutes":10,' +
  '"concepts":["..."],"hints":["..."],"readme":"markdown statement with examples","starter":"code","reference":"code","test":"code"}]}';

function purposeLines({ purpose, track, level, count, avoid }) {
  if (purpose === "placement") {
    return [
      "BTB_PURPOSE: placement",
      `Write ${count} placement probes of rising difficulty, from 1 (first weeks of programming) to ${count} (big tech interview level).`,
      `Spread them across this ladder: ${track.ladder?.join("; ") || track.focus}.`,
      'Each probe takes at most 15 minutes. Set "difficulty" on each, 1 to the count, in that order.',
    ];
  }
  return [
    "BTB_PURPOSE: practice",
    `Write ${count} exercises for level ${level.level} of their path: "${level.title}". ${level.summary}`,
    `Concepts of this level: ${level.concepts.join(", ")}.`,
    "Lean into their weak concepts when they belong to this level, and stretch a little past their strong ones.",
    avoid.length > 0 ? `Do not repeat these, already written: ${avoid.join("; ")}.` : null,
  ];
}

/**
 * The prompt that asks Claude to forge exercises fitted to the learner.
 * @param {{ purpose: "practice" | "placement", track: object, profile: object, files: object, level?: object, count: number, summary: object, avoid?: string[], language: string, theme?: string, example: object }} input
 * @returns {string}
 */
export function exercisePrompt(input) {
  const { track, profile, files, summary, language, theme, example } = input;
  return [
    "BTB_TASK: exercises",
    "You design coding exercises for back-to-basics, a daily practice tool where a programmer rebuilds their skills by hand, with no AI while solving.",
    "Each exercise is graded only by the tests you write, so the tests must be correct, deterministic and fair.",
    `Write all prose (title, readme, hints, test names) in ${languageName(language)}. Code identifiers in English. Never use em dashes.`,
    "",
    `Track: ${track.title}. ${track.focus}`,
    track.goal ? `The learner's goal: ${track.goal}` : null,
    `Language: ${files.name ?? profile.name}. ${profile.testGuide}`,
    `The solution lives in ${files.solutionFile} and the tests in ${files.testFile}, in the same folder. Tests import it like: ${files.importHint}`,
    "",
    ...purposeLines({ ...input, avoid: input.avoid ?? [] }),
    "",
    "What the learner has shown so far:",
    ...aptitudeLines(summary),
    "",
    "Rules:",
    "- Small and focused, solvable in the minutes you set (5 to 30).",
    "- 4 to 6 tests, one behavior each, names that read like a sentence.",
    "- Deterministic: no network, no real waiting (fake the clock), no randomness, no files outside the folder.",
    "- When the point is to build something by hand, the tests disable the built in that would make it trivial, and the readme says so.",
    "- The starter has the signature and a doc comment with an empty body, so every test fails without crashing the run.",
    "- The reference is a clean, idiomatic solution that passes every test.",
    "- 2 or 3 hints, from a nudge to almost the answer, never the full code.",
    theme ? `- Test data and examples: ${theme}` : null,
    "",
    "One exercise at the quality bar, as JSON. Keep its spirit in any language:",
    JSON.stringify(example),
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    SCHEMA,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * The prompt that sends a failed exercise back to Claude with what went wrong.
 * @param {{ draft: object, problems: string[], files: object, profile: object }} input
 * @returns {string}
 */
export function fixPrompt({ draft, problems, files, profile }) {
  return [
    "BTB_TASK: fix",
    "An exercise you wrote for back-to-basics failed validation. Fix it so the reference passes every test and the starter fails them without crashing.",
    `Language: ${files.name ?? profile.name}. ${profile.testGuide}`,
    `Files: ${files.solutionFile} and ${files.testFile}. Tests import the solution like: ${files.importHint}`,
    "",
    "Problems found:",
    ...problems.map((problem) => `- ${problem}`),
    "",
    "The exercise:",
    JSON.stringify(draft),
    "",
    "Respond with the whole fixed exercise as one JSON object with the same keys, no prose and no code fences.",
  ].join("\n");
}
