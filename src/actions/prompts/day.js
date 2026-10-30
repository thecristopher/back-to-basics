import { roundLine } from "../day.js";
import { languageName } from "./evidence.js";

function coachLines(persona, language) {
  return [
    `You are ${persona.name}, coaching someone who rebuilds their programming fundamentals by hand, with no AI while solving.`,
    persona.voice,
    `Write it in ${languageName(language)}, in your own voice and personality, as plain prose with no headings. Never use em dashes.`,
  ];
}

/**
 * The prompt for the coach's greeting as the day's practice starts.
 * @param {{ persona: { name: string, voice: string }, language: string, last: { date: string, rounds: object[] } | null, planned: string[], levels: string[] }} input
 * @returns {string}
 */
export function greetPrompt({ persona, language, last, planned, levels }) {
  return [
    "BTB_TASK: greet",
    ...coachLines(persona, language),
    "",
    "Greet them as today's practice starts, 3 to 5 sentences: remember how the last session went by naming its exercises, then what is ahead today.",
    "Today is your day with them: you are the one who prepared everything.",
    "",
    last ? `Last session, ${last.date}:` : "This is their first session.",
    ...(last?.rounds ?? []).map(roundLine),
    "",
    planned.length > 0 ? "Today's plan:" : "Today's plan is not drawn yet.",
    ...planned.map((entry) => `- ${entry}`),
    levels.length > 0 ? `Where they stand: ${levels.join("; ")}.` : null,
    "",
    "Respond with the greeting only, no preamble.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * The prompt for the coach's goodbye once the day's practice is done.
 * @param {{ persona: { name: string, voice: string }, language: string, rounds: object[], xp: number, goal: number, toImprove: string[] }} input
 * @returns {string}
 */
export function debriefPrompt({ persona, language, rounds, xp, goal, toImprove }) {
  return [
    "BTB_TASK: debrief",
    ...coachLines(persona, language),
    "",
    "Close today's practice, 3 to 6 sentences: name the exercises, what went clean, what cost them and what to review next, then say goodbye for today.",
    "Be honest: a hard day is not called easy, a clean one gets real pride.",
    "",
    "Today's rounds:",
    ...(rounds.length > 0 ? rounds.map(roundLine) : ["- none, they only reviewed"]),
    `XP: ${xp} of a goal of ${goal}.`,
    toImprove.length > 0 ? `Concepts that cost them: ${toImprove.join(", ")}.` : "Nothing cost them today.",
    "",
    "Respond with the goodbye only, no preamble.",
  ].join("\n");
}
