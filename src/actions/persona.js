import { placeholdersOf } from "../i18n/voiced.js";
import { duration } from "../utils/text.js";

/** The moments a persona has lines for, in the order a day goes through them. */
export const MOMENTS = [
  "greet",
  "ready",
  "failed",
  "failed_again",
  "passed_clean",
  "passed_struggled",
  "hint",
  "skip",
  "level_up",
  "debrief",
];

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isText(value) {
  return typeof value === "string" && value.trim() !== "";
}

/** The placeholders a line may carry, filled from the round that just happened. */
export const PLACEHOLDERS = ["title", "xp", "time", "level", "hints"];

function unknownPlaceholders(line) {
  return [...line.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).filter((name) => !PLACEHOLDERS.includes(name));
}

function lineProblems(language, lines) {
  const problems = [];
  for (const moment of MOMENTS) {
    const list = lines?.[moment];
    if (!Array.isArray(list) || list.length === 0 || !list.every(isText)) {
      problems.push(`"lines.${language}.${moment}" must list at least one line`);
      continue;
    }
    const unknown = [...new Set(list.flatMap(unknownPlaceholders))];
    if (unknown.length > 0) problems.push(`"lines.${language}.${moment}" uses unknown placeholders: ${unknown.join(", ")}`);
  }
  return problems;
}

function isTextList(list) {
  return Array.isArray(list) && list.length > 0 && list.every(isText);
}

// lore maps each character of the world, the persona included, to the scenes of their own story
function loreProblems(lore, known) {
  if (lore === undefined) return [];
  if (typeof lore !== "object" || lore === null || Array.isArray(lore)) return ['"world.lore" must map characters to their scenes'];
  return Object.entries(lore).flatMap(([name, scenes]) => {
    if (!known.includes(name)) return [`"world.lore" names ${name}, who is not in the world`];
    return isTextList(scenes) ? [] : [`"world.lore.${name}" must list scenes`];
  });
}

// a world is optional, when present it names the franchise, who and what may appear in it and the
// scenes of each character's story an exercise can be set in
function worldProblems(world, name) {
  if (world === undefined) return [];
  const problems = [];
  if (!isText(world?.franchise)) problems.push('"world.franchise" must be a non empty string');
  for (const key of ["supporting", "places"]) {
    const list = world?.[key];
    if (list !== undefined && !(Array.isArray(list) && list.every(isText))) problems.push(`"world.${key}" must list names`);
  }
  const supporting = Array.isArray(world?.supporting) ? world.supporting : [];
  problems.push(...loreProblems(world?.lore, [name, ...supporting]));
  return problems;
}

function textProblems(language, key, text) {
  const allowed = placeholdersOf(key);
  if (!allowed) return [`"texts.${language}.${key}" is not a text a persona can voice`];
  if (!isText(text)) return [`"texts.${language}.${key}" must be a non empty string`];
  const unknown = [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).filter((name) => !allowed.includes(name));
  return unknown.length > 0 ? [`"texts.${language}.${key}" uses unknown placeholders: ${unknown.join(", ")}`] : [];
}

// texts are optional, the CLI and the editor say them in the persona's voice instead of their own
function textsProblems(texts) {
  if (texts === undefined) return [];
  return Object.entries(texts ?? {}).flatMap(([language, byKey]) => Object.entries(byKey ?? {}).flatMap(([key, text]) => textProblems(language, key, text)));
}

/**
 * True when the name can be a persona file name.
 * @param {string} name
 * @returns {boolean}
 */
export function isPersonaName(name) {
  return NAME.test(String(name ?? ""));
}

/**
 * Lists what is wrong with a persona before it is used.
 * @param {object} persona
 * @returns {string[]} empty when the shape is fine
 */
export function personaProblems(persona) {
  const problems = ["name", "voice"].filter((key) => !isText(persona?.[key])).map((key) => `"${key}" must be a non empty string`);
  if (persona?.portrait !== undefined && !isText(persona.portrait)) problems.push('"portrait" must be a file name when present');
  if (persona?.partner !== undefined && typeof persona.partner !== "boolean") problems.push('"partner" must be true or false when present');
  problems.push(...worldProblems(persona?.world, persona?.name));
  problems.push(...textsProblems(persona?.texts));
  const languages = Object.keys(persona?.lines ?? {});
  if (languages.length === 0) problems.push('"lines" must have at least one language');
  for (const language of languages) problems.push(...lineProblems(language, persona.lines[language]));
  if (JSON.stringify(persona ?? {}).includes("\u2014")) problems.push("no em dashes anywhere");
  return problems;
}

/**
 * The lines of a moment in the learner's language, English or the first language when it is missing.
 * @param {object} persona a valid persona
 * @param {string} moment
 * @param {string} language
 * @returns {string[]}
 */
export function linesFor(persona, moment, language) {
  const lines = persona.lines[language] ?? persona.lines.en ?? Object.values(persona.lines)[0];
  return lines[moment] ?? [];
}

/**
 * Picks a line index at random, never the one said last time when there is another.
 * @param {number} count lines available
 * @param {number | undefined} last index said last time
 * @param {() => number} [random] returns [0, 1)
 * @returns {number}
 */
export function pickLine(count, last, random = Math.random) {
  if (count <= 1) return 0;
  const others = Array.from({ length: count }, (_, index) => index).filter((index) => index !== last);
  return others[Math.floor(random() * others.length)];
}

const FILLERS = {
  title: (data) => data.title,
  xp: (data) => (data.xp > 0 ? String(data.xp) : null),
  time: (data) => (Number.isFinite(data.seconds) && data.seconds > 0 ? duration(data.seconds) : null),
  level: (data) => (data.levelUp ? String(data.levelUp) : null),
  // a line that offers a hint only fits while there is one left to give
  hints: (data) => (data.hintsLeft > 0 ? String(data.hintsLeft) : null),
};

/**
 * Fills a line's placeholders ({title}, {xp}, {time}, {level}, {hints}) from the round that just happened.
 * @param {string} line
 * @param {object} data the report data
 * @returns {string | null} null when the round does not carry what the line asks for
 */
export function fillLine(line, data) {
  let missing = false;
  const filled = line.replace(/\{(\w+)\}/g, (match, name) => {
    const value = FILLERS[name]?.(data);
    if (value === null || value === undefined) missing = true;
    return value ?? match;
  });
  return missing ? null : filled;
}

/**
 * Picks one of the lines that can be said about this round, never the last one said when there is another.
 * @param {string[]} lines
 * @param {object} data the report data
 * @param {number | undefined} last index said last time
 * @param {() => number} [random]
 * @returns {{ index: number, line: string } | null} null when no line fits
 */
export function chooseLine(lines, data, last, random = Math.random) {
  const usable = lines.map((line, index) => ({ index, line: fillLine(line, data) })).filter((option) => option.line !== null);
  if (usable.length === 0) return null;
  const lastPosition = usable.findIndex((option) => option.index === last);
  return usable[pickLine(usable.length, lastPosition === -1 ? undefined : lastPosition, random)];
}

function submitMoment(data) {
  if (data.repeat) return null;
  if (data.redo && data.ok) return "passed_clean";
  if (!data.ok) return data.attempt > 1 ? "failed_again" : "failed";
  if (data.levelUp) return "level_up";
  if (data.day) return "debrief";
  return data.outcome === "clean" ? "passed_clean" : "passed_struggled";
}

/**
 * The name the CLI gives whoever forges, draws and reviews: the coach's first name, Claude when there is none.
 * @param {{ name: string } | null} persona
 * @returns {string}
 */
export function coachName(persona) {
  return persona?.name.trim().split(/\s+/)[0] || "Claude";
}

const OPENS = new Set(["next", "start", "placement", "redo"]);

/**
 * The moment a command's answer is, so the persona can react to it.
 * @param {string} command
 * @param {object} data the report data
 * @returns {string | null} null when the persona stays quiet
 */
export function momentOf(command, data) {
  if (!data || data.error) return null;
  if (command === "submit") return submitMoment(data);
  if (command === "today") return "greet";
  if (command === "hint") return "hint";
  if (command === "skip") return "skip";
  if (OPENS.has(command) && data.done) return "debrief";
  if (OPENS.has(command) && data.id) return "ready";
  return null;
}
