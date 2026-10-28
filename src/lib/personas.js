import { join } from "node:path";
import { chooseLine, isPersonaName, linesFor, momentOf, personaProblems } from "../actions/persona.js";
import { listJsonNames, readJsonIfExists, writeJson } from "./files.js";

function createdFile(config, name) {
  return join(config.dataDir, "personas", `${name}.json`);
}

/**
 * Loads a persona: one made with btb persona new first, then a bundled one.
 * @param {object} config
 * @param {string} name
 * @returns {Promise<object | null>} null when there is no persona by that name
 * @throws {Error} when the file exists but is not a valid persona
 */
export async function loadPersona(config, name) {
  if (!isPersonaName(name)) return null;
  const persona = (await readJsonIfExists(createdFile(config, name))) ?? (await readJsonIfExists(join(config.personasDir, `${name}.json`)));
  if (!persona) return null;
  const problems = personaProblems(persona);
  if (problems.length > 0) throw new Error(`Persona "${name}" is not valid: ${problems.join("; ")}`);
  return { ...persona, id: name };
}

/**
 * Names of every persona, bundled and created.
 * @param {object} config
 * @returns {Promise<string[]>}
 */
export async function listPersonas(config) {
  const names = [...(await listJsonNames(config.personasDir)), ...(await listJsonNames(join(config.dataDir, "personas")))];
  return [...new Set(names)].sort();
}

/**
 * Saves a persona Claude drafted, next to progress so it never lands in git.
 * @param {object} config
 * @param {string} name
 * @param {object} persona
 * @returns {Promise<string>} where it was written
 */
export async function savePersona(config, name, persona) {
  const file = createdFile(config, name);
  await writeJson(file, persona);
  return file;
}

/**
 * Has the persona react to a command's answer: data.persona carries the line, and the terminal prints it.
 * The last line per moment is kept in state so the same one never comes twice in a row.
 * @param {object} ctx needs persona, state, config, json, paint
 * @param {string} command
 * @param {{ data?: object, text: string[] }} report
 * @returns {{ data?: object, text: string[] }}
 */
export function speak(ctx, command, report) {
  const moment = momentOf(command, report.data);
  if (!ctx.persona || !moment) return report;
  const key = `${ctx.persona.id}:${moment}`;
  ctx.state.persona ??= {};
  const chosen = chooseLine(linesFor(ctx.persona, moment, ctx.config.language), report.data, ctx.state.persona[key]);
  if (!chosen) return report;
  ctx.state.persona[key] = chosen.index;
  const persona = { id: ctx.persona.id, name: ctx.persona.name, portrait: ctx.persona.portrait ?? null, moment, line: chosen.line };
  // editors get the line in data and show it their own way, the terminal gets it under the report
  const text = ctx.json ? report.text : [...report.text, "", `${ctx.paint.bold(persona.name)}: ${persona.line}`];
  return { ...report, data: { ...report.data, persona }, text };
}
