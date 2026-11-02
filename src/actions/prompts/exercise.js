import { castLines } from "../cast.js";
import { conceptTitle } from "../graph.js";
import { languageName, masteryLines } from "./evidence.js";
import { MOMENTS_SCHEMA, momentGuide } from "./moments.js";

const DRAFT =
  '"slug":"kebab-case-name","title":"...","difficulty":1,"minutes":10,' +
  '"concepts":["..."],"hints":["..."],"example":{"call":"the call of the worked example","result":"its result"},"readme":"markdown statement that explains the problem","lesson":"markdown lesson on the concept","starter":"code","reference":"code","test":"code"';

/**
 * How the readme explains the problem: a patient walk through, never a cryptic spec.
 * Shared with the prompt that rewrites the statements of exercises already forged.
 */
export const STATEMENT_RULES = [
  "- The readme explains the problem the way a patient teacher would, sitting next to the learner and laying the groundwork before they write a line. Full sentences, never cryptic, never shorthand. These sections, in this order, with headings in the prose language:",
  "  1. The story: 2 to 4 sentences that set the scene and say why this piece of code matters in it.",
  "  2. What you will build: the signature, then in plain words what it receives, what each parameter or field means with its type, and what it gives back.",
  "  3. How it behaves: one bullet per behavior the tests check, each with a short reason or a concrete value. Name the edge cases in words (an empty list, a missing prop).",
  "  4. An example, step by step: a code block with a call and its result, then 2 to 4 lines walking through why the result is that one.",
  "  5. What you will use: the concept or built in behind it, explained in plain words with a tiny example on other data. Never the solution.",
  "- Define each term the first time it appears. Write real values, never placeholders like NAME or N on their own.",
];

/** The worked example must be one the tests assert, so the reference passing them proves it true. */
export const EXAMPLE_RULE =
  '- The call and the result of the readme\'s worked example appear word for word in one of the tests, and "example" names both. btb checks it and throws the exercise back when they are missing.';

/**
 * What makes a hint clear: it stands on its own and names exactly what to do next.
 * Shared with the prompt that rewrites the hints of exercises already forged.
 */
export const HINT_RULES = [
  "- 3 hints, read one at a time by someone stuck, so each one makes sense on its own:",
  "  1. Where to start: the first step to take and why, in plain words, no code.",
  "  2. The tool: the built in, hook or pattern that does it and where it goes in their code, with a tiny snippet on other data in backticks.",
  "  3. The shape: the skeleton of the solution in backticks with the key part left for them, plus one line on the trap to avoid.",
  "- Each hint is 1 to 3 sentences, uses the exact names of the exercise (function, props, fields) and never stays vague like \"think about the state\". Never the full code.",
];

const MUTANTS_SCHEMA = ',"mutants":[{"mistake":"what is wrong, in plain words","code":"a wrong solution","nudge":"a hint for whoever made this mistake"}]';

/**
 * What makes the wrong solutions useful: real mistakes of this level that the tests must catch.
 * Only asked when the tests report by name, so btb can tell which test catches each one.
 */
export const MUTANT_RULES = [
  '- "mutants" are 2 or 3 wrong solutions a learner at this level would really write while learning this concept: forgetting the empty case, an off by one in the loop, mutating the input, comparing with the wrong operator. Each "mistake" says in the prose language what is wrong, in a few words.',
  "- Each mutant is complete code that runs without crashing and passes some tests, never the empty starter and never the reference. The tests must catch every one of them: btb runs them and throws the exercise back when a mutant passes.",
  '- Each "nudge" is the hint btb shows when the learner\'s tests fail exactly like that mutant: 1 or 2 sentences in the prose language that point at the case or the line of thought they missed, ideally as a question, using the exercise\'s names. It never gives the fix or the code.',
];

/**
 * A bug hunt: the starter carries the very mistake the learner made last time, and they find and fix it.
 * @param {string} mistake the likely mistake, in the learner's language
 * @returns {string[]}
 */
export function bugHuntRules(mistake) {
  return [
    "Format: bug hunt. This learner made a known mistake on this concept last time, so this exercise hands it back to them to find and fix:",
    `- The starter is not empty, and the starter rule below does not apply: it is a complete solution with exactly one bug, this mistake: "${mistake}". It runs without crashing and passes some tests but not all.`,
    "- The readme says it is a bug hunt, shows the symptom with a call, the wrong result it gives today and the right one, and never says where the bug is. The reference is the fixed version.",
    "- The hints lead to the bug one step at a time: what to observe, where to look, what the line should do instead.",
  ];
}

/** On the levels that prepare the onsite, every solution says its time complexity, as an interviewer asks. */
export const COMPLEXITY_RULES = [
  "Complexity: the solution also declares its time complexity in a constant named COMPLEXITY holding a Big O string like \"O(n log n)\" (exported in JavaScript and TypeScript, a module level name in Python).",
  "- The starter sets COMPLEXITY to an empty string, the reference to the right value, and one test checks the exact string. The readme asks for it in its own bullet and says in one line why interviewers always ask.",
];

/**
 * The format lines of an exercise: a bug hunt, a declared complexity, both or none.
 * @param {{ bugHunt?: string | null, complexity?: boolean } | undefined} format
 * @returns {string[]}
 */
export function formatLines(format) {
  return [...(format?.bugHunt ? bugHuntRules(format.bugHunt) : []), ...(format?.complexity ? COMPLEXITY_RULES : [])];
}

// a coach with a voice also writes what she says at each moment, a profile with a preview asks for one,
// and tests that report by name bring the wrong solutions they catch
function schemaFor(cast, preview, mutants) {
  const moments = cast?.coach ? `,"moments":${MOMENTS_SCHEMA}` : "";
  return `{"exercises":[{${DRAFT}${preview ? ',"preview":"code"' : ""}${mutants ? MUTANTS_SCHEMA : ""}${moments}}]}`;
}

function momentLines(cast) {
  if (!cast?.coach) return [];
  return [`- "moments" is what ${cast.coach} tells the learner while they fight this exercise. ${cast.voice ?? ""}`.trimEnd(), ...momentGuide(cast.coach)];
}

/**
 * What the preview module must do so the learner sees their component in the browser.
 * Shared with the prompt that writes the preview of exercises forged before previews existed.
 * @param {{ solutionFile: string, previewFile: string }} files
 * @returns {string[]}
 */
export function previewRules(files) {
  return [
    `- "preview" is ${files.previewFile}, a page that shows the learner's component in the browser while they build it. It is never graded.`,
    `- It imports the component from "./${files.solutionFile}" and default exports a function Preview that renders it 1 to 3 times with the data of the readme's example, each case under an <h2> that says in a few words what that case shows.`,
    "- Interactive where the component is (clicks, typing), plain data inline, only react, no styles, no tests, no fetch.",
  ];
}

function previewLines(files) {
  return files.previewFile ? previewRules(files) : [];
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

/**
 * True for the last 4 levels of a drawn path of 6 or more, the ones that prepare the onsite, where
 * every solution says its time complexity.
 * @param {{ path?: { levels: object[] } | null }} track
 * @param {{ level: number } | undefined} level
 * @returns {boolean}
 */
export function isComplexityLevel(track, level) {
  const total = track.path?.levels?.length ?? 0;
  return Boolean(level) && total >= 6 && level.level > total - 4;
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
  return WARM_UP;
}

// how big the next step on a concept is depends on how the last one went
const STEPS = {
  new: "This is their first exercise on this concept: the gentlest version of it, one idea, and a readme example very close to the task.",
  learning: "They solved this concept clean once: same idea in a new situation and a little more to do, so a second clean day proves it stuck.",
  weak: "They missed this concept last time: go a step smaller than before, aim straight at what tripped them in the recent results, and make the readme walk through more guided.",
  review:
    "They owned this concept a while ago and this is a spaced review to prove it is still theirs: a fresh situation they have never seen, the same idea a notch beyond the first time, solvable from memory. The readme's \"what you will use\" section is a one line reminder, not a lesson.",
};

function allowedLine(track, allowed) {
  return allowed.map((id) => `${id} (${conceptTitle(track, id)})`).join(", ");
}

/**
 * The lines that point an exercise at the concept it teaches and the ones it may lean on.
 * @param {{ track: object, focus?: { id: string, standing: string } | null, allowed?: string[] }} input
 * @returns {string[]}
 */
export function conceptLines({ track, focus, allowed }) {
  if (!allowed?.length) return [];
  const lines = [];
  if (focus) {
    const use = track.graph?.[focus.id]?.use;
    lines.push(`This exercise teaches one concept: "${conceptTitle(track, focus.id)}" (id ${focus.id}).${use ? ` Where it is used: ${use}` : ""}`);
    lines.push(STEPS[focus.standing] ?? STEPS.new);
    lines.push("Ground the story in a practical use of it, something a working programmer does with it today.");
  }
  lines.push(`It may lean on concepts the learner has already met, never on later ones: ${allowedLine(track, allowed)}.`);
  lines.push(`Set "concepts" to 1 to 3 ids from that list only${focus ? `, "${focus.id}" first` : ""}.`);
  return lines;
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

// a review brings back one concept of a level already passed, never the exercise they solved back then
function reviewLines({ track, level, count, avoid, focus, allowed, format }) {
  return [
    "BTB_PURPOSE: review",
    `Write ${count} exercise that reviews a concept from level ${level.level} of their path, a level they already passed: "${level.title}".`,
    ...conceptLines({ track, focus, allowed }),
    ...formatLines(format),
    avoid.length > 0 ? `Never the same problem as these, already written: ${avoid.join("; ")}.` : null,
  ];
}

function purposeLines(input) {
  const { purpose, track, level, count, avoid, fromBasics, difficulty, size, focus, allowed } = input;
  if (purpose === "placement") return [...placementLines({ track, count, difficulty, size, avoid, fromBasics }), ...conceptLines({ track, allowed })];
  if (purpose === "review") return reviewLines(input);
  return [
    "BTB_PURPOSE: practice",
    `Write ${count} exercises for level ${level.level} of their path: "${level.title}". ${level.summary}`,
    `Concepts of this level: ${level.concepts.map((id) => conceptTitle(track, id)).join(", ")}.`,
    ...conceptLines({ track, focus, allowed }),
    ...basicsLines(level, fromBasics),
    ...interviewLines(track, level),
    ...formatLines(input.format),
    avoid.length > 0 ? `Do not repeat these, already written: ${avoid.join("; ")}.` : null,
  ];
}

/**
 * The prompt that asks Claude to forge exercises fitted to the learner.
 * @param {{ format?: { bugHunt?: string | null, complexity?: boolean }, purpose: "practice" | "placement" | "review", track: object, profile: object, files: object, level?: object, count: number, summary: object, avoid?: string[], language: string, theme?: string, example: object, fromBasics?: boolean, difficulty?: number, size?: number, cast?: { leads: string[], supporting: string[] } | null, focus?: { id: string, standing: string } | null, allowed?: string[] }} input
 *   focus is the concept the exercise teaches and how the learner stands on it, allowed the concept ids it may use
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
    ...masteryLines(summary, track),
    "",
    "Rules:",
    "- Small and focused, solvable in the minutes you set (5 to 30, 30 to 60 on the last 2 levels of the path).",
    "- 4 to 6 tests, one behavior each, names that read like a sentence.",
    "- Deterministic: no network, no real waiting (fake the clock), no randomness, no files outside the folder.",
    "- When the point is to build something by hand, the tests disable the built in that would make it trivial, and the readme says so.",
    "- The starter has the signature and a doc comment with an empty body, so every test fails without crashing the run. It defines every name the tests import (functions, classes, constants), so importing it never breaks the run.",
    "- The reference is a clean, idiomatic solution that passes every test.",
    ...STATEMENT_RULES,
    EXAMPLE_RULE,
    ...HINT_RULES,
    "- The lesson teaches the concept behind the exercise so the learner can come back to it later: what it is, a small example on a different problem, the typical mistakes and one question to think about. It never solves the exercise.",
    theme ? `- Test data and examples: ${theme}` : null,
    ...castLines(input.cast ?? null),
    ...momentLines(input.cast),
    ...previewLines(files),
    ...(profile.report === "exit-code" ? [] : MUTANT_RULES),
    "",
    "One exercise at the quality bar, as JSON. Keep its spirit in any language:",
    JSON.stringify(example),
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    schemaFor(input.cast, Boolean(files.previewFile), profile.report !== "exit-code"),
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
    "An exercise you wrote for back-to-basics failed validation. Fix it so the reference passes every test, the starter fails them without crashing, and every mutant fails at least one test.",
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
