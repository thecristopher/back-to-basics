import { languageName, masteryLines, otherTrackLines } from "./evidence.js";

const SCHEMA =
  '{"rationale":"2 or 3 sentences","startLevel":1,"levels":[{"level":1,"title":"...","summary":"1 or 2 sentences","concepts":[{"id":"kebab-case-id","title":"...","use":"one line on where this is used in real work"}]}]}';

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
    ...kept.map((level) => `- ${level.level}. ${level.title}: ${level.concepts.join(", ")} (keep these ids)`),
  ];
}

// a learner rebuilding from zero starts at level 1, the placement only says what to stress
function startLines(fromBasics) {
  if (!fromBasics) {
    return ["Set startLevel to the first level they still need; the levels before it count as already passed. Be honest, not flattering."];
  }
  return [
    "The learner is rebuilding from the very basics on purpose, after years of letting tools write the code for them.",
    "Levels 1 and 2 are a warm up of the smallest pieces of this track. In a language: level 1 is returning values, arithmetic, comparing and if and else; level 2 is for loops over arrays and strings.",
    "Climb in small steps from there: each level adds a handful of ideas, never a leap.",
    "Set startLevel to 1 whatever the placement says, and use the placement only to decide what to stress.",
  ];
}

/**
 * The prompt that asks Claude to draw, or redraw, the learner's path on a track.
 * @param {{ track: object, profileName: string, summary: object, others: object[], placement: object[], kept: object[], language: string, fromBasics?: boolean }} input
 * @returns {string}
 */
export function pathPrompt({ track, profileName, summary, others, placement, kept, language, fromBasics = false }) {
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
    ...masteryLines(summary, track),
    ...otherTrackLines(others),
    ...keptLines(kept),
    "",
    "Design 8 to 14 levels backwards from the goal: start from the bar of a real onsite loop at Amazon, Zillow or Capital One and ask what each concept before it must prepare.",
    "The order goes from the basics, through what a working programmer uses every day in this language, to the patterns and problems of an interview. Every concept earns its place by leading somewhere.",
    "Every path ends there: the last 2 levels are interview levels, with problems that combine several concepts over realistic product data, tricky edge cases and a complexity that matters.",
    "Each level: a title, a summary and 3 to 6 concrete concepts. A concept has a kebab case id unique in the path, a title, and a use line saying where it shows up in real work.",
    "A level is passed when every one of its concepts is solved clean on 2 different days, so keep each concept small enough to own.",
    ...startLines(fromBasics),
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    SCHEMA,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
