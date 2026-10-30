import { castLines } from "../cast.js";
import { aptitudeLines, languageName } from "./evidence.js";
import { MOMENTS_SCHEMA, momentGuide } from "./moments.js";

const DRAFT =
  '"slug":"kebab-case-name","title":"...","difficulty":1,"minutes":10,' +
  '"concepts":["..."],"hints":["..."],"readme":"markdown statement with examples","lesson":"markdown lesson on the concept","starter":"code","reference":"code","test":"code"';

// a coach with a voice also writes what she says at each moment of this exercise
function schemaFor(cast) {
  return `{"exercises":[{${DRAFT}${cast?.coach ? `,"moments":${MOMENTS_SCHEMA}` : ""}}]}`;
}

function momentLines(cast) {
  if (!cast?.coach) return [];
  return [`- "moments" is what ${cast.coach} tells the learner while they fight this exercise. ${cast.voice ?? ""}`.trimEnd(), ...momentGuide(cast.coach)];
}

/**
 * True for the last 2 levels of a drawn path, the ones that must feel like a real onsite interview.
 * @param {{ path?: { levels: object[] } | null }} track
 * @param {{ level: number } | undefined} level
 * @returns {boolean}
 */
export function isInterviewLevel(track, level) {
  const total = track.path?.levels?.length ?? 0;
  return Boolean(level) && total > 0 && level.level > total - 2;
}

function interviewLines(track, level) {
  if (!isInterviewLevel(track, level)) return [];
  return [
    "This is an interview level: write each exercise like a real onsite problem at Amazon, Zillow or Capital One.",
    "Several parts that build on each other, realistic product data (orders, listings, transactions, events), edge cases a senior would catch, and a complexity limit the tests enforce with big inputs.",
    "Set minutes between 30 and 60.",
  ];
}

// from the very basics, the placement only measures the fundamentals and the first level stays tiny
function placementRange(count, fromBasics) {
  if (fromBasics) return `from 1 (return a value, add two numbers, compare two values) to ${count} (a for loop over an array with an if inside)`;
  return `from 1 (first weeks of programming) to ${count} (an Amazon, Zillow or Capital One onsite problem)`;
}

// someone very rusty needs the first steps small and guided, these override the general rules below
const WARM_UP = [
  "This learner is very rusty and rebuilding from zero, these rules win over the general ones:",
  "- One idea per exercise, the reference solution is 3 to 8 lines, 5 to 10 minutes.",
  "- 3 or 4 tests, plain inputs, no tricky edge cases.",
  "- The readme names the operator or built in they will need, with a one line example of it on other data.",
  "- The starter has the signature and a comment listing the steps in plain words, never the code.",
];

function basicsLines(level, fromBasics) {
  if (!fromBasics || level.level > 2) return [];
  return [...WARM_UP, "- 3 hints, the last one almost the answer."];
}

function placementLines({ track, count, difficulty, size, avoid, fromBasics }) {
  const ladder = `${track.ladder?.join("; ") || track.focus}`;
  if (!difficulty) {
    return [
      "BTB_PURPOSE: placement",
      `Write ${count} placement probes of rising difficulty, ${placementRange(count, fromBasics)}.`,
      `Spread them across this ladder: ${ladder}.`,
      'Each probe takes at most 15 minutes. Set "difficulty" on each, 1 to the count, in that order.',
    ];
  }
  return [
    "BTB_PURPOSE: placement",
    `Write 1 placement probe at difficulty ${difficulty} on a scale ${placementRange(size, fromBasics)}.`,
    `The scale follows this ladder: ${ladder}.`,
    "Every easier probe so far was solved cleanly, so this one asks a little more than the last. At most 15 minutes.",
    `Set "difficulty" to ${difficulty}.`,
    avoid.length > 0 ? `Do not repeat these, already written: ${avoid.join("; ")}.` : null,
    ...(fromBasics ? WARM_UP : []),
  ];
}

function purposeLines({ purpose, track, level, count, avoid, fromBasics, difficulty, size }) {
  if (purpose === "placement") return placementLines({ track, count, difficulty, size, avoid, fromBasics });
  return [
    "BTB_PURPOSE: practice",
    `Write ${count} exercises for level ${level.level} of their path: "${level.title}". ${level.summary}`,
    `Concepts of this level: ${level.concepts.join(", ")}.`,
    "Lean into their weak concepts when they belong to this level, and stretch a little past their strong ones.",
    ...basicsLines(level, fromBasics),
    ...interviewLines(track, level),
    avoid.length > 0 ? `Do not repeat these, already written: ${avoid.join("; ")}.` : null,
  ];
}

/**
 * The prompt that asks Claude to forge exercises fitted to the learner.
 * @param {{ purpose: "practice" | "placement", track: object, profile: object, files: object, level?: object, count: number, summary: object, avoid?: string[], language: string, theme?: string, example: object, fromBasics?: boolean, difficulty?: number, size?: number, cast?: { leads: string[], supporting: string[] } | null }} input
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
    "- Small and focused, solvable in the minutes you set (5 to 30, 30 to 60 on the last 2 levels of the path).",
    "- 4 to 6 tests, one behavior each, names that read like a sentence.",
    "- Deterministic: no network, no real waiting (fake the clock), no randomness, no files outside the folder.",
    "- When the point is to build something by hand, the tests disable the built in that would make it trivial, and the readme says so.",
    "- The starter has the signature and a doc comment with an empty body, so every test fails without crashing the run.",
    "- The reference is a clean, idiomatic solution that passes every test.",
    "- 2 or 3 hints, from a nudge to almost the answer, never the full code.",
    "- The lesson teaches the concept behind the exercise so the learner can come back to it later: what it is, a small example on a different problem, the typical mistakes and one question to think about. It never solves the exercise.",
    theme ? `- Test data and examples: ${theme}` : null,
    ...castLines(input.cast ?? null),
    ...momentLines(input.cast),
    "",
    "One exercise at the quality bar, as JSON. Keep its spirit in any language:",
    JSON.stringify(example),
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    schemaFor(input.cast),
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
