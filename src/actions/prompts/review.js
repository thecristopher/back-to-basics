import { languageName } from "./evidence.js";

/**
 * Builds the prompt the reviewer gets once an exercise is solved.
 * @param {{ title: string, level: number, readme: string, solution: string, languageLabel: string, record: { lastOutcome?: string, attempts: number, bestSeconds?: number | null }, language: string }} input
 * @returns {string}
 */
export function buildReviewPrompt({ title, level, readme, solution, languageLabel, record, language }) {
  return [
    "BTB_TASK: review",
    "You coach someone rebuilding their programming fundamentals by hand, with no AI while solving.",
    "They already solved this exercise and its tests pass. Review the solution honestly and kindly.",
    "Do not rewrite the whole solution. Show short snippets only where they teach something.",
    `Write the whole review in ${languageName(language)}. Never use em dashes.`,
    "",
    "Use exactly these markdown sections, translated if the language is not Spanish:",
    "## Calificación",
    "<correctness, readability and idiomatic code, each scored 1 to 10 with a one line reason>",
    "## Lo que hiciste bien",
    "<concrete strengths of this solution>",
    "## Qué cambiaría alguien senior",
    "<concrete changes: edge cases, naming, complexity, built ins worth knowing>",
    "## Concepto para repasar",
    "<one concept to study next and why>",
    "",
    "Respond with the markdown only, no preamble.",
    "",
    `Exercise: ${title} (level ${level}, ${languageLabel})`,
    `Outcome: ${record.lastOutcome ?? "unknown"}, ${record.attempts} submits in total`,
    record.bestSeconds ? `Best time: ${record.bestSeconds} seconds` : "Best time: unknown",
    "",
    "Statement:",
    readme.trim(),
    "",
    "Solution:",
    solution.trim(),
  ].join("\n");
}
