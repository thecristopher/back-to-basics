import { isPersonaName, linesFor, personaProblems } from "../actions/persona.js";
import { personaPrompt } from "../actions/prompts/persona.js";
import { askJson } from "../lib/claude.js";
import { listPersonas, loadPersona, savePersona } from "../lib/personas.js";
import { failure } from "./shared.js";

async function showList(ctx) {
  const names = await listPersonas(ctx.config);
  const current = ctx.persona?.id ?? null;
  const lines = names.map((name) => `  ${name === current ? ctx.paint.green("→") : " "} ${name}`);
  return { data: { personas: names, current }, text: [ctx.paint.bold(ctx.t.personasHeader), ...lines, ctx.paint.dim(ctx.t.personaHowTo)] };
}

function renderPersona({ t, paint, config }, persona) {
  return [
    paint.bold(persona.name),
    paint.dim(persona.voice),
    "",
    `${t.personaSample}: ${linesFor(persona, "greet", config.language)[0]}`,
  ];
}

async function showOne(ctx, name) {
  const persona = name ? await loadPersona(ctx.config, name) : ctx.persona;
  if (!persona && name) return failure(ctx.t.unknownPersona(name));
  if (!persona) return showList(ctx);
  const { id, name: title, voice, portrait = null } = persona;
  return { data: { persona: { id, name: title, voice, portrait } }, text: renderPersona(ctx, persona) };
}

async function create(ctx, name, description) {
  if (!isPersonaName(name)) return failure(ctx.t.personaBadName);
  if (typeof description !== "string" || description.trim() === "") return failure(ctx.t.personaNeedsFrom);
  if ((await listPersonas(ctx.config)).includes(name)) return failure(ctx.t.personaExists(name));
  ctx.log(ctx.paint.dim(ctx.t.draftingPersona(name)));
  const draft = await askJson(ctx.config.claude, personaPrompt({ description, language: ctx.config.language }));
  const problems = personaProblems(draft);
  if (problems.length > 0) return failure(ctx.t.personaInvalid(problems));
  const file = await savePersona(ctx.config, name, draft);
  return { data: { persona: { id: name, name: draft.name }, file }, text: [...renderPersona(ctx, draft), "", ctx.t.personaSaved(file, name)] };
}

/**
 * `btb persona [name]`: the coach in use, or another one.
 * `btb persona list` lists them, `btb persona new <name> --from="..."` has Claude draft one.
 */
export async function persona(ctx, [action, name], flags) {
  if (action === "list") return showList(ctx);
  if (action === "new") return create(ctx, name, flags.from);
  return showOne(ctx, action);
}
