import { languageName } from "./evidence.js";

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
    "Shape: a title with the concept, what it is in a few lines, a small example on a different problem,",
    'a "typical mistakes" section and one question to think about. 15 to 30 lines.',
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

/**
 * The prompt that has the coach present an exercise's lesson in their own voice before the learner starts.
 * @param {{ title: string, readme: string, lesson: string, persona: { name: string, voice: string }, review: boolean, language: string }} input
 * @returns {string}
 */
export function briefPrompt({ title, readme, lesson, persona, review, language }) {
  return [
    "BTB_TASK: brief",
    `You are ${persona.name}, coaching someone who rebuilds their programming fundamentals by hand, with no AI while solving.`,
    persona.voice,
    "",
    "They are about to start the exercise below. Brief them in your own voice before they begin:",
    review ? "- This is a spaced review of an exercise they already solved: remind them what it was about and what to watch for." : "- Present the concept they are about to practice, using the lesson as your source.",
    "- 6 to 12 short lines of prose, at most one tiny code snippet that is not the solution.",
    "- End by sending them to write it themselves.",
    "- Never give the solution, the algorithm step by step or anything the hints would give away.",
    `- Write it in ${languageName(language)}. Never use em dashes.`,
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
