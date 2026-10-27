import { readFile } from "node:fs/promises";
import { buildReviewPrompt } from "../actions/prompts/review.js";
import { exerciseFiles } from "../lib/catalog.js";
import { ask } from "../lib/claude.js";
import { solutionPath } from "../lib/workspace.js";
import { failure, profileOf, targetExercise, trackOf } from "./shared.js";

async function languageLabel(ctx, exercise) {
  const profile = await profileOf(ctx, trackOf(ctx, exercise.track));
  const typed = profile.variants?.ts?.solutionFile === exercise.files.solution;
  return typed ? profile.variants.ts.name : profile.name;
}

/**
 * `btb review [id]`: Claude grades the solution, only after it passed.
 */
export async function review(ctx, [query]) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const record = ctx.state.exercises[exercise.id];
  if (!record?.firstSolvedAt) return failure(ctx.t.reviewLocked);
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
  });
  ctx.log(ctx.paint.dim(ctx.t.reviewing(exercise.title)));
  const answer = (await ask(ctx.config.claude, prompt)).trim();
  return { data: { id: exercise.id, review: answer }, text: [answer] };
}
