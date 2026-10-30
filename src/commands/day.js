import { lastSession, plannedOf, roundsOf } from "../actions/day.js";
import { withoutEmDashes } from "../actions/json.js";
import { lacksMoments } from "../actions/moments.js";
import { debriefPrompt, greetPrompt } from "../actions/prompts/day.js";
import { daySummary } from "../actions/recap.js";
import { ask } from "../lib/claude.js";
import { dayVoicePath, readTextIfExists, writeMissingMoments, writeText } from "../lib/library.js";
import { levelNow, openTracks, recappedToday, trackOf } from "./shared.js";

function speaker(persona) {
  return { id: persona.id, name: persona.name, portrait: persona.portrait ?? null };
}

// a line of the day is written once per coach and kept, --again asks for a new one
async function dayLine(ctx, { kind, flags, prompt, log }) {
  if (!ctx.persona) return { data: { line: null }, text: [] };
  const file = dayVoicePath(ctx.config, ctx.persona.id, ctx.today, kind);
  const saved = flags.again ? null : await readTextIfExists(file);
  if (saved) return { data: { line: saved.trim(), cached: true, persona: speaker(ctx.persona) }, text: [saved.trim()] };
  ctx.log(ctx.paint.dim(log));
  const line = withoutEmDashes((await ask(ctx.config.claude, prompt())).trim());
  await writeText(file, line);
  return { data: { line, cached: false, persona: speaker(ctx.persona) }, text: [line] };
}

function trackTitles(ctx) {
  return Object.fromEntries(ctx.catalog.tracks.map((track) => [track.id, track.title]));
}

function standing(ctx) {
  return openTracks(ctx)
    .map((id) => trackOf(ctx, id))
    .filter((track) => track.path)
    .map((track) => ({ track, level: levelNow(ctx, track) }))
    .filter(({ level }) => level)
    .map(({ track, level }) => `${track.title} level ${level.level}, ${level.title}`);
}

function greetInput(ctx) {
  const date = lastSession(ctx.state.days, ctx.today);
  const last = date ? { date, rounds: roundsOf(ctx.state.days[date], ctx.catalog.byId) } : null;
  // read only: the queue is built by btb today, never here
  const planned = plannedOf(ctx.state.days[ctx.today], ctx.catalog.byId, trackTitles(ctx));
  return { persona: ctx.persona, language: ctx.config.language, last, planned, levels: standing(ctx) };
}

/**
 * `btb greet`: the coach of the day greets you with how the last session went and what comes today.
 * Written once per day and coach, --again asks for a new one.
 */
export async function greet(ctx, args, flags) {
  return dayLine(ctx, { kind: "greet", flags, prompt: () => greetPrompt(greetInput(ctx)), log: ctx.t.preparingGreet(ctx.coach) });
}

function debriefInput(ctx, day) {
  const summary = daySummary(day, ctx.catalog.byId, recappedToday(ctx, day).length);
  return { persona: ctx.persona, language: ctx.config.language, rounds: roundsOf(day, ctx.catalog.byId), xp: day.xp, goal: ctx.config.dailyGoalXp, toImprove: summary.toImprove };
}

/**
 * `btb debrief`: the coach of the day says goodbye, naming today's exercises and how each one went.
 * A new round since the last goodbye writes a new one.
 */
export async function debrief(ctx, args, flags) {
  const day = ctx.state.days[ctx.today] ?? { xp: 0, rounds: {} };
  const kind = `debrief-${Object.keys(day.rounds ?? {}).length}`;
  return dayLine(ctx, { kind, flags, prompt: () => debriefPrompt(debriefInput(ctx, day)), log: ctx.t.preparingDebrief(ctx.coach) });
}

/**
 * `btb prepare`: gets the day ready for its coach ahead of time, her greeting and her lines for every
 * exercise already in today's queue, so nothing waits on Claude once the practice starts.
 */
export async function prepare(ctx, args, flags) {
  if (!ctx.persona) return { data: { greeting: null, moments: [] }, text: [] };
  const greeting = await greet(ctx, args, flags);
  const queued = (ctx.state.days[ctx.today]?.queue ?? []).map((id) => ctx.catalog.byId[id]).filter(Boolean);
  const voiced = [];
  for (const exercise of queued.filter((exercise) => lacksMoments(exercise, ctx.persona.id))) {
    if (await writeMissingMoments(ctx, exercise)) voiced.push(exercise.id);
  }
  return { data: { greeting: greeting.data.line, moments: voiced }, text: [greeting.data.line, ...voiced.map((id) => `  ${id}`)] };
}
