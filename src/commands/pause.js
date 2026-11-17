import { pauseLesson, resumeLesson } from "../actions/pause.js";
import { duration } from "../utils/text.js";
import { failure, targetExercise } from "./shared.js";

function titleOf(ctx, id) {
  return ctx.catalog.byId[id]?.title ?? id;
}

/**
 * `btb pause [id]`: pauses the lesson, its clock stands still until btb resume.
 */
export async function pause(ctx, [query]) {
  if (ctx.state.paused) return failure(ctx.t.alreadyPaused(titleOf(ctx, ctx.state.paused.id)));
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  pauseLesson(ctx.state, exercise.id, Date.now());
  return {
    data: { id: exercise.id, title: exercise.title, paused: true, pausedAt: ctx.state.paused.at },
    text: [ctx.t.paused(exercise.title)],
  };
}

/**
 * `btb resume`: carries on with the paused lesson, the time it stood still never counts.
 */
export async function resume(ctx) {
  const resumed = resumeLesson(ctx.state, Date.now());
  if (!resumed) return failure(ctx.t.notPaused);
  const title = titleOf(ctx, resumed.id);
  const pausedMs = ctx.state.exercises[resumed.id]?.pausedMs ?? 0;
  return {
    data: { id: resumed.id, title, paused: false, pausedMs },
    text: [ctx.t.resumed(title, duration(Math.round(resumed.ms / 1000)))],
  };
}

/**
 * The failure a command gets while the lesson is paused, null when it may run.
 * @param {object} ctx
 * @returns {{ code: number, data: object, text: string[] } | null}
 */
export function blockedByPause(ctx) {
  const paused = ctx.state.paused;
  return paused ? failure(ctx.t.pausedFirst(titleOf(ctx, paused.id))) : null;
}
