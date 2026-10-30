import { withoutEmDashes } from "./json.js";
import { fillLine } from "./persona.js";

/** The moments a coach gets a line of her own for in each exercise, written with it. */
export const EXERCISE_MOMENTS = ["ready", "failed", "failed_again", "hint", "skip", "passed_clean", "passed_struggled"];

// a level up or the end of the day keep their own line after the one about the exercise just passed
const AFTER_A_PASS = new Set(["level_up", "debrief"]);

function isText(value) {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * The lines a coach wrote for one exercise, cleaned, or null when a moment is missing.
 * @param {Record<string, string> | undefined} drafted
 * @returns {Record<string, string> | null}
 */
export function cleanMoments(drafted) {
  if (!EXERCISE_MOMENTS.every((moment) => isText(drafted?.[moment]))) return null;
  return Object.fromEntries(EXERCISE_MOMENTS.map((moment) => [moment, withoutEmDashes(drafted[moment].trim())]));
}

/**
 * Adds a coach's lines to an exercise's moments, keyed by coach so each one keeps her own.
 * @param {Record<string, object> | undefined} moments what the exercise already has
 * @param {string | null} personaId
 * @param {Record<string, string> | undefined} drafted the lines Claude wrote
 * @returns {Record<string, object> | undefined} undefined when there is nothing to keep
 */
export function withMoments(moments, personaId, drafted) {
  const lines = cleanMoments(drafted);
  if (!personaId || !lines) return moments;
  return { ...moments, [personaId]: lines };
}

/**
 * True when the exercise still needs this coach's lines.
 * @param {{ moments?: Record<string, object> } | undefined} exercise
 * @param {string} personaId
 * @returns {boolean}
 */
export function lacksMoments(exercise, personaId) {
  return !exercise?.moments?.[personaId];
}

// the exercise's own moment behind what the persona reacts to, a pass that levels up included
function ownMoment(moment, data) {
  if (!AFTER_A_PASS.has(moment)) return EXERCISE_MOMENTS.includes(moment) ? moment : null;
  if (!data?.ok || data.repeat) return null;
  return data.redo || data.outcome === "clean" ? "passed_clean" : "passed_struggled";
}

/**
 * What the coach says about this exercise at this moment, from the lines written with it.
 * @param {{ moments?: Record<string, Record<string, string>> } | undefined} exercise
 * @param {string} personaId
 * @param {string} moment what the persona reacts to
 * @param {object} data the report data
 * @returns {string | null} null when the exercise has no line for it or the round cannot fill it
 */
export function exerciseLine(exercise, personaId, moment, data) {
  const line = exercise?.moments?.[personaId]?.[ownMoment(moment, data)];
  return line ? fillLine(line, data) : null;
}

/**
 * Joins the exercise's line with the moment's line: the exercise speaks alone, and a level up or
 * the end of the day add theirs after it.
 * @param {string} moment
 * @param {string | null} own the exercise's line
 * @param {string | null} line the moment's line, null when none fit
 * @returns {string | null}
 */
export function speech(moment, own, line) {
  if (!own) return line;
  return AFTER_A_PASS.has(moment) && line ? `${own} ${line}` : own;
}
