import { previewRules } from "./exercise.js";

/**
 * The prompt that asks Claude for the preview of a React exercise forged before previews existed.
 * @param {{ title: string, readme: string, reference: string, files: { solutionFile: string, previewFile: string } }} input
 * @returns {string}
 */
export function previewPrompt({ title, readme, reference, files }) {
  return [
    "BTB_TASK: preview",
    "back-to-basics is a daily drill where someone rebuilds their programming fundamentals by hand, with no AI while solving.",
    "Write the preview module of this exercise, so the learner sees the component they are building in the browser.",
    "Never use em dashes.",
    "",
    ...previewRules(files),
    "",
    `Exercise: ${title}`,
    "",
    "Statement:",
    readme.trim(),
    "",
    "Reference solution, only so you know the export name and the props:",
    reference.trim(),
    "",
    `Respond with the code of ${files.previewFile} only, no prose and no code fences.`,
  ].join("\n");
}
