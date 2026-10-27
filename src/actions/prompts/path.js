import { aptitudeLines, languageName, otherTrackLines } from "./evidence.js";

const SCHEMA =
  '{"rationale":"2 or 3 sentences","startLevel":1,"levels":[{"level":1,"title":"...","summary":"1 or 2 sentences","concepts":["..."],"target":4}]}';

function placementLines(placement) {
  if (placement.length === 0) return ["No placement test was taken."];
  return [
    "Placement probes, easiest first:",
    ...placement.map((probe) => `- difficulty ${probe.difficulty}, "${probe.title}" (${probe.concepts.join(", ")}): ${probe.outcome}`),
  ];
}

function keptLines(kept) {
  if (kept.length === 0) return [];
  return [
    "",
    `This is a redraw. Levels 1 to ${kept.length} are done: return them unchanged as the first levels and redraw only what comes after.`,
    ...kept.map((level) => `- ${level.level}. ${level.title}: ${level.concepts.join(", ")}`),
  ];
}

/**
 * The prompt that asks Claude to draw, or redraw, the learner's path on a track.
 * @param {{ track: object, profileName: string, summary: object, others: object[], placement: object[], kept: object[], language: string }} input
 * @returns {string}
 */
export function pathPrompt({ track, profileName, summary, others, placement, kept, language }) {
  return [
    "BTB_TASK: path",
    "You are the architect of a learning path in back-to-basics, a daily practice tool where a programmer rebuilds their skills by hand.",
    "Exercises are generated level by level from this path, and each level is passed by solving exercises cleanly.",
    `Write titles, summaries and the rationale in ${languageName(language)}. Never use em dashes.`,
    "",
    `Track: ${track.title} (${profileName}). ${track.focus}`,
    track.goal ? `The learner's goal: ${track.goal}` : null,
    track.ladder?.length ? `Suggested stages, adapt them freely: ${track.ladder.join("; ")}` : null,
    "",
    "Evidence about the learner:",
    ...placementLines(placement),
    ...aptitudeLines(summary),
    ...otherTrackLines(others),
    ...keptLines(kept),
    "",
    "Design 6 to 10 levels that go from where this learner truly is to the goal, or to big tech interview level when there is no goal.",
    "Each level: a title, a summary, 3 to 6 concrete concepts, and a target from 3 to 8 clean solves to pass it.",
    "Set startLevel to the first level they still need; the levels before it count as already passed. Be honest, not flattering.",
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    SCHEMA,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
