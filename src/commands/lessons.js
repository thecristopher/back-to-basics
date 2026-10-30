import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { briefPrompt } from "../actions/prompts/lesson.js";
import { redoStart } from "../actions/arena.js";
import { exerciseState } from "../actions/record.js";
import { exerciseFiles } from "../lib/catalog.js";
import { ask } from "../lib/claude.js";
import { briefPath, readTextIfExists, reviewPath, writeText } from "../lib/library.js";
import { prepareRedo, redoPath, solutionPath } from "../lib/workspace.js";
import { GLYPHS, listHeading } from "./progress.js";
import { failure, targetExercise, trackOf } from "./shared.js";

function existing(file) {
  return existsSync(file) ? file : null;
}

function isUnlocked(record) {
  return Boolean(record?.firstSolvedAt || record?.skips);
}

/**
 * `btb lesson [id]`: the lesson behind an exercise, to read before or come back to after.
 */
export async function lesson(ctx, [query]) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const file = exerciseFiles(exercise).lesson;
  const markdown = await readTextIfExists(file);
  if (!markdown) return failure(ctx.t.noLesson(exercise.id));
  return { data: { id: exercise.id, title: exercise.title, lesson: file, markdown }, text: [markdown.trimEnd()] };
}

function libraryEntry(ctx, exercise) {
  const record = ctx.state.exercises[exercise.id];
  return {
    id: exercise.id,
    title: exercise.title,
    track: exercise.track,
    level: exercise.level,
    placement: exercise.placement,
    concepts: exercise.concepts,
    state: exerciseState(record, ctx.today),
    solvedAt: record?.firstSolvedAt ?? null,
    lesson: existing(exerciseFiles(exercise).lesson),
    review: existing(reviewPath(ctx.config, exercise)),
    solution: existing(solutionPath(ctx.config, exercise)),
    redo: existing(redoPath(ctx.config, exercise)),
    unlocked: isUnlocked(record),
  };
}

function entryLine({ t, paint }, entry) {
  const extras = [entry.lesson ? t.hasLesson : null, entry.review ? t.hasReview : null].filter(Boolean).join("  ");
  return `  ${GLYPHS[entry.state]} ${entry.title.padEnd(32)} ${paint.dim(entry.concepts.join(", "))}  ${paint.cyan(extras)}`;
}

/**
 * `btb lessons [track]`: every lesson of what was forged, with your solution and Claude's review when they exist.
 */
export async function lessons(ctx, [query]) {
  if (query && !trackOf(ctx, query)) return failure(ctx.t.unknownTrack(query));
  const entries = ctx.catalog.exercises.filter((exercise) => !query || exercise.track === query).map((exercise) => libraryEntry(ctx, exercise));
  if (entries.length === 0) return { data: { lessons: [] }, text: [ctx.t.nothingForged] };
  const lines = [ctx.paint.dim(ctx.t.legend)];
  let heading = "";
  for (const entry of entries) {
    const next = listHeading(ctx, entry);
    if (next !== heading) lines.push("", ctx.paint.bold(next));
    heading = next;
    lines.push(entryLine(ctx, entry));
  }
  lines.push("", ctx.paint.dim(ctx.t.lessonsHowTo));
  return { data: { lessons: entries }, text: lines };
}

async function writeBrief(ctx, exercise, lessonText, file) {
  const prompt = briefPrompt({
    title: exercise.title,
    readme: await readFile(exerciseFiles(exercise).readme, "utf8"),
    lesson: lessonText,
    persona: ctx.persona,
    review: Boolean(ctx.state.exercises[exercise.id]?.firstSolvedAt),
    language: ctx.config.language,
  });
  ctx.log(ctx.paint.dim(ctx.t.briefing(ctx.persona.name, exercise.title)));
  const text = (await ask(ctx.config.claude, prompt)).trim();
  await writeText(file, text);
  return text;
}

/**
 * `btb brief [id]`: the coach presents the lesson in their own voice, kept so the next time is instant.
 * With no coach it is the lesson itself. --again asks for a new one.
 */
export async function brief(ctx, [query], flags) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const lessonText = await readTextIfExists(exerciseFiles(exercise).lesson);
  if (!lessonText) return failure(ctx.t.noLesson(exercise.id));
  if (!ctx.persona) return { data: { id: exercise.id, brief: lessonText, cached: true }, text: [lessonText.trimEnd()] };
  const file = briefPath(ctx.config, ctx.persona.id, exercise);
  const saved = flags.again ? null : await readTextIfExists(file);
  const text = saved ?? (await writeBrief(ctx, exercise, lessonText, file));
  const { id, name, portrait = null } = ctx.persona;
  const data = { id: exercise.id, brief: text, cached: Boolean(saved), file, persona: { id, name, portrait } };
  return { data, text: [text.trimEnd()] };
}

/**
 * `btb redo <id>`: solves an exercise again from the starter, without touching your solution or the schedule.
 * --fresh throws away the redo in progress.
 */
export async function redo(ctx, [query], flags) {
  if (!query) return failure(ctx.t.redoNeedsId);
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  if (!isUnlocked(ctx.state.exercises[exercise.id])) return failure(ctx.t.redoLocked);
  const { solution, readme } = await prepareRedo(ctx.config, exercise, Boolean(flags.fresh));
  ctx.state.redoStarts ??= {};
  const startedAt = redoStart(ctx.state.redoStarts, exercise.id, Date.now(), Boolean(flags.fresh));
  const ghostSeconds = ctx.state.exercises[exercise.id]?.bestSeconds ?? null;
  const data = { id: exercise.id, track: exercise.track, title: exercise.title, level: exercise.level, minutes: exercise.minutes, concepts: exercise.concepts, path: solution, readme, redo: true, startedAt, ghostSeconds };
  return { data, text: [ctx.paint.bold(ctx.t.redoHeader(exercise.title)), `${ctx.t.yourFile}: ${ctx.paint.cyan(solution)}`, ctx.paint.dim(ctx.t.redoHowTo(exercise.id))] };
}
