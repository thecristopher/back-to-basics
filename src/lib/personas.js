import { join } from "node:path";
import { exerciseLine, speech } from "../actions/moments.js";
import { chooseLine, isPersonaName, linesFor, momentOf, personaProblems } from "../actions/persona.js";
import { personaPrompt } from "../actions/prompts/persona.js";
import { borrowedWorld, summonedPersona } from "../actions/summon.js";
import { askJson } from "./claude.js";
import { listJsonNames, readJsonIfExists, writeJson } from "./files.js";
import { onlyOnce } from "./lock.js";

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

async function bundledPersonas(config) {
  const names = await listJsonNames(config.personasDir);
  return Promise.all(names.map((name) => loadPersona(config, name)));
}

async function draftSummon(config, { id, character, franchise }, log) {
  const bundled = await bundledPersonas(config);
  const partners = bundled.filter((persona) => persona?.partner);
  const home = partners.find((persona) => persona.world?.franchise === franchise) ?? null;
  log(character);
  const summon = { character, franchise, partners: partners.map((persona) => persona.name) };
  const draft = await askJson(config.claude, personaPrompt({ description: `${character} from ${franchise}`, language: config.language, summon }));
  const persona = summonedPersona(draft, { character, franchise }, borrowedWorld(home, character, franchise, draft.lore));
  const problems = personaProblems(persona);
  if (problems.length > 0) throw new Error(`${character} could not be summoned: ${problems.join("; ")}`);
  await savePersona(config, id, persona);
  return loadPersona(config, id);
}

/**
 * The coach of the day when she is a character with no persona yet: Claude drafts her once, true to
 * her franchise and without romance, and she is kept beside the created personas.
 * @param {object} config
 * @param {{ id: string, character: string, franchise: string }} who
 * @param {(character: string) => void} log told when Claude starts drafting
 * @returns {Promise<object | null>}
 */
export async function summonPersona(config, who, log) {
  const lock = join(config.dataDir, "personas", `${who.id}.lock`);
  const ready = () => loadPersona(config, who.id);
  return onlyOnce(lock, () => draftSummon(config, who, log), ready, config.claude.timeoutMs);
}

/**
 * Has the persona react to a command's answer: data.persona carries the line, and the terminal prints it.
 * Each moment of an exercise is said with the line this coach wrote for it, when there is one.
 * The last line per moment is kept in state so the same one never comes twice in a row.
 * @param {object} ctx needs persona, state, config, json, paint, catalog
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
  const own = exerciseLine(ctx.catalog.byId[report.data.id], ctx.persona.id, moment, report.data);
  const line = speech(moment, own, chosen?.line ?? null);
  if (!line) return report;
  if (chosen) ctx.state.persona[key] = chosen.index;
  const persona = { id: ctx.persona.id, name: ctx.persona.name, portrait: ctx.persona.portrait ?? null, moment, line };
  // editors get the line in data and show it their own way, the terminal gets it under the report
  const text = ctx.json ? report.text : [...report.text, "", `${ctx.paint.bold(persona.name)}: ${persona.line}`];
  return { ...report, data: { ...report.data, persona }, text };
}
