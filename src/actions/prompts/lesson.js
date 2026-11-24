import { languageName } from "./evidence.js";
import { LESSON_RULES } from "./exercise.js";

/**
 * The prompt that asks Claude for the lesson of an exercise forged before lessons existed.
 * @param {{ title: string, concepts: string[], readme: string, reference: string, language: string, theme?: string }} input
 * @returns {string}
 */
export function lessonPrompt({ title, concepts, readme, reference, language, theme }) {
  return [
    "BTB_TASK: lesson",
    "back-to-basics is a daily drill where someone rebuilds their programming fundamentals by hand, with no AI while solving.",
    "Write the lesson that goes with this exercise, the page the learner comes back to when they want to review the concept.",
    `Write it in ${languageName(language)}, as markdown. Code identifiers in English. Never use em dashes.`,
    "",
    ...LESSON_RULES,
    "Never solve the exercise or show code that would pass its tests. The reference is only there so you know what the concept is.",
    theme ? `Examples are about: ${theme}` : null,
    "",
    `Exercise: ${title}`,
    `Concepts: ${concepts.join(", ")}`,
    "",
    "Statement:",
    readme.trim(),
    "",
    "Reference solution, never shown to the learner:",
    reference.trim(),
    "",
    "Respond with the markdown only, no preamble and no code fences around the whole answer.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function earlierLines(earlier) {
  if (earlier.length === 0) return [];
  return [
    "",
    "Your last briefings opened and closed like this. Open and close differently and do not reuse their catchphrases, pet names or flirts:",
    ...earlier.map(({ opening, closing }) => `- opened: ${opening} | closed: ${closing}`),
  ];
}

/**
 * The prompt that has the coach present an exercise's lesson in their own voice before the learner starts.
 * @param {{ title: string, readme: string, lesson: string, persona: { name: string, voice: string }, review: boolean, language: string, earlier?: { opening: string, closing: string }[] }} input
 *   earlier holds the edges of the coach's last briefings, so this one sounds different
 * @returns {string}
 */
export function briefPrompt({ title, readme, lesson, persona, review, language, earlier = [] }) {
  return [
    "BTB_TASK: brief",
    `You are ${persona.name}, coaching someone who rebuilds their programming fundamentals by hand, with no AI while solving.`,
    persona.voice,
    "",
    "They are about to start the exercise below. Brief them in your own voice before they begin:",
    review ? "- This is a spaced review of an exercise they already solved: remind them what it was about and what to watch for." : "- Present the concept they are about to practice, using the lesson as your source.",
    "- 6 to 12 short lines of prose, at most one tiny code snippet that is not the solution.",
    "- Warn about one typical mistake at most, the one that matters most here, never the lesson's whole list.",
    "- The statement already tells the scene and anyone who drops into it. Do not retell it.",
    "- The editor opens right after you, so do not close by sending them to write it. Close on something about this exercise.",
    "- Whatever your voice says you feel for them or about your rivals shows in one detail woven into the lesson, never as a closing formula and never the same move as your last briefings.",
    "- Never give the solution, the algorithm step by step or anything the hints would give away.",
    `- Write it in ${languageName(language)}. Never use em dashes.`,
    ...earlierLines(earlier),
    "",
    `Exercise: ${title}`,
    "",
    "Statement:",
    readme.trim(),
    "",
    "Lesson:",
    lesson.trim(),
    "",
    "Respond with the briefing only, as markdown, no preamble.",
  ].join("\n");
}
