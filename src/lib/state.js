import { freshRecord } from "../actions/record.js";
import { readJsonIfExists, writeJson } from "./files.js";

function emptyState() {
  return { version: 2, current: null, xp: 0, exercises: {}, days: {}, placement: null, aptitude: {} };
}

/**
 * Reads the progress file, an empty state when it does not exist yet.
 * @param {string} file
 * @returns {Promise<object>}
 */
export async function loadState(file) {
  return { ...emptyState(), ...(await readJsonIfExists(file)) };
}

/**
 * Writes the progress file.
 * @param {string} file
 * @param {object} state
 */
export async function saveState(file, state) {
  await writeJson(file, state);
}

/**
 * The progress record of an exercise, created on first touch.
 * @param {object} state
 * @param {string} id
 * @returns {object}
 */
export function recordOf(state, id) {
  state.exercises[id] ??= freshRecord();
  return state.exercises[id];
}

/**
 * The log of a practice day, created on first touch.
 * @param {object} state
 * @param {string} today
 * @returns {{ xp: number, solved: string[], done: string[], queue: string[] | null, reviews: string[] }}
 */
export function dayOf(state, today) {
  state.days[today] ??= { xp: 0, solved: [], done: [], queue: null, reviews: [] };
  return state.days[today];
}
