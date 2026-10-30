import { readFile } from "node:fs/promises";
import { lessonQuestion } from "../actions/arena.js";
import { withoutEmDashes } from "../actions/json.js";
import { recallPrompt } from "../actions/prompts/recall.js";
import { buildReviewPrompt } from "../actions/prompts/review.js";
import { exerciseFiles } from "../lib/catalog.js";
import { ask } from "../lib/claude.js";
import { readTextIfExists, reviewPath, writeText } from "../lib/library.js";
import { solutionPath } from "../lib/workspace.js";
import { failure, profileOf, targetExercise, trackOf } from "./shared.js";

async function languageLabel(ctx, exercise) {
  const profile = await profileOf(ctx, trackOf(ctx, exercise.track));
  const typed = profile.variants?.ts?.solutionFile === exercise.files.solution;
  return typed ? profile.variants.ts.name : profile.name;
}

async function askReview(ctx, exercise, record) {
  const [readme, solution] = await Promise.all([
    readFile(exerciseFiles(exercise).readme, "utf8"),
    readFile(solutionPath(ctx.config, exercise), "utf8"),
  ]);
  const prompt = buildReviewPrompt({
    title: exercise.title,
    level: exercise.level,
    readme,
    solution,
    languageLabel: await languageLabel(ctx, exercise),
    record,
    language: ctx.config.language,
    persona: ctx.persona,
  });
  ctx.log(ctx.paint.dim(ctx.t.reviewing(ctx.coach, exercise.title)));
  return (await ask(ctx.config.claude, prompt)).trim();
}

/**
 * `btb review [id]`: Claude grades the solution, only after it passed.
 * The review is kept so the lessons can show it again, --again asks for a new one.
 */
export async function review(ctx, [query], flags) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const record = ctx.state.exercises[exercise.id];
  if (!record?.firstSolvedAt) return failure(ctx.t.reviewLocked);
  const file = reviewPath(ctx.config, exercise);
  const saved = flags.again ? null : await readTextIfExists(file);
  const answer = saved?.trim() ?? (await askReview(ctx, exercise, record));
  if (!saved) await writeText(file, answer);
  return { data: { id: exercise.id, review: answer, saved: Boolean(saved), file }, text: [answer] };
}

/**
 * `btb recall <id> --answer="..."`: the coach answers what you remembered of the question that closes
 * an exercise's lesson. A blank answer gets the answer back.
 */
export async function recall(ctx, [query], flags) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const lesson = await readTextIfExists(exerciseFiles(exercise).lesson);
  const question = lesson ? lessonQuestion(lesson) : null;
  if (!question) return failure(ctx.t.noRecallQuestion(exercise.id));
  const answer = typeof flags.answer === "string" ? flags.answer.trim() : "";
  const prompt = recallPrompt({ title: exercise.title, question, answer, lesson, language: ctx.config.language, persona: ctx.persona });
  ctx.log(ctx.paint.dim(ctx.t.recalling(ctx.coach, exercise.title)));
  const feedback = withoutEmDashes((await ask(ctx.config.claude, prompt)).trim());
  return { data: { id: exercise.id, title: exercise.title, question, answer, feedback }, text: [feedback] };
}
