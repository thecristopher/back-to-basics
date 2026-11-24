import { languageName } from "./evidence.js";

function personaLines(persona) {
  if (!persona) return [];
  return [`Speak as ${persona.name}, the learner's coach: ${persona.voice}`, "Keep the verdict as honest as you would without the voice."];
}

/**
 * The prompt that has the coach answer what the learner remembered of an exercise solved on an earlier day.
 * @param {{ title: string, question: string, answer: string, lesson: string, language: string, persona?: { name: string, voice: string } | null, closing?: boolean }} input
 *   closing when they answer right after passing, instead of on a later day
 * @returns {string}
 */
export function recallPrompt({ title, question, answer, lesson, language, persona, closing }) {
  const when = closing
    ? "They just made the tests of the exercise below pass. To close the lesson they answered, in their own words, the question that ends it."
    : "They solved the exercise below on an earlier day. Before today's practice they answered, from memory, the question that closes its lesson.";
  return [
    "BTB_TASK: recall",
    "You coach someone rebuilding their programming fundamentals by hand, with no AI while solving.",
    when,
    "Give them feedback on that answer, judged against the lesson:",
    "- What they got right, what is missing or wrong, and the key idea in one line.",
    "- A wrong answer is called wrong, kindly. A right one is not padded.",
    "- When the answer is blank they did not remember it: give the answer in two or three sentences and one thing to hold on to.",
    "- 2 to 5 sentences of plain prose, no headings, no code that solves the exercise.",
    "- Never send them to run, try or write code to check it: whatever is missing is explained right here, in words.",
    `- Write it in ${languageName(language)}. Never use em dashes.`,
    ...personaLines(persona),
    "",
    `Exercise: ${title}`,
    `Question: ${question}`,
    `Their answer: ${answer.trim() || "(blank)"}`,
    "",
    "Lesson:",
    lesson.trim(),
    "",
    "Respond with the feedback only, no preamble.",
  ].join("\n");
}
