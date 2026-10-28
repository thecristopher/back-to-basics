import { currentLevel, levelProgress } from "../actions/levels.js";
import { allocateNew, dueReviews, freshExercises, slotFor, slotTrack } from "../actions/queue.js";
import { franchiseOf } from "../actions/cast.js";
import { drawPath } from "../lib/architect.js";
import { existsSync } from "node:fs";
import { exerciseFiles, findExercise } from "../lib/catalog.js";
import { forgeExercises } from "../lib/forge.js";
import { loadProfile } from "../lib/profiles.js";
import { recordOf } from "../lib/state.js";
import { prepareWorkspace } from "../lib/workspace.js";

/**
 * A report that only carries an error.
 * @param {string} message
 * @returns {{ code: number, data: { error: string }, text: string[] }}
 */
export function failure(message) {
  return { code: 1, data: { error: message }, text: [message] };
}

/**
 * True while a placement test runs.
 * @param {object} state
 * @returns {boolean}
 */
export function isPlacementRunning(state) {
  return state.placement?.status === "running";
}

/**
 * True when the exercise is a placement probe still unanswered.
 * @param {object} state
 * @param {string} id
 * @returns {boolean}
 */
export function isPlacementQuestion(state, id) {
  return isPlacementRunning(state) && state.placement.queue.includes(id) && !state.placement.results[id];
}

/**
 * The active track with that id.
 * @param {object} ctx
 * @param {string} id
 * @returns {object | undefined}
 */
export function trackOf(ctx, id) {
  return ctx.catalog.tracks.find((track) => track.id === id);
}

/**
 * The language profile of a track, loaded once per run.
 * @param {object} ctx
 * @param {object} track
 * @returns {Promise<object>}
 */
export async function profileOf(ctx, track) {
  ctx.profiles[track.language] ??= await loadProfile(ctx.config, track.language);
  return ctx.profiles[track.language];
}

/**
 * The track's level now, from its path and what was solved.
 * @param {object} ctx
 * @param {object} track
 * @returns {object | null} the level entry, null when the path is done or not drawn
 */
export function levelNow(ctx, track) {
  const progress = levelProgress(track, ctx.catalog.exercises, ctx.state.exercises);
  const level = currentLevel(progress);
  return progress.find((entry) => entry.level === level) ?? null;
}

/**
 * Tracks that still take new exercises: no path yet, or a path not finished.
 * @param {object} ctx
 * @returns {string[]} ids
 */
export function openTracks(ctx) {
  return ctx.catalog.tracks.filter((track) => !track.path || levelNow(ctx, track)).map((track) => track.id);
}

/**
 * Finds the exercise a command acts on: the one named, or the current one.
 * @param {object} ctx
 * @param {string | undefined} query
 * @returns {{ exercise?: object, error?: string }}
 */
export function targetExercise(ctx, query) {
  const id = query ?? ctx.state.current;
  if (!id) return { error: ctx.t.noCurrent };
  const exercise = findExercise(ctx.catalog, id);
  return exercise ? { exercise } : { error: ctx.t.unknownExercise(id) };
}

/**
 * The day's queue, built on its first use of the day and kept stable after that.
 * New exercises start as slots that Claude forges when they are opened.
 * @param {object} ctx
 * @param {object} day
 * @returns {string[]}
 */
export function ensureQueue(ctx, day) {
  if (day.queue) {
    day.queue = day.queue.filter((entry) => slotTrack(entry) ? trackOf(ctx, slotTrack(entry)) : ctx.catalog.byId[entry]);
    return day.queue;
  }
  const reviews = dueReviews(ctx.catalog.exercises, ctx.state.exercises, ctx.today, ctx.config.dailyReviews);
  const daysQueued = Object.values(ctx.state.days).filter((logged) => logged.queue).length;
  const slots = allocateNew(openTracks(ctx), ctx.config.dailyNew, daysQueued).map(slotFor);
  day.queue = [...reviews, ...slots];
  day.reviews = reviews;
  return day.queue;
}

async function ensurePath(ctx, track) {
  if (track.path && !track.path.redrawPending) return;
  if (!track.path) ctx.log(ctx.paint.yellow(ctx.t.noPlacementYet(track.id)));
  await drawPath(ctx, track);
}

async function exerciseForSlot(ctx, track, queued) {
  await ensurePath(ctx, track);
  const level = levelNow(ctx, track);
  if (!level) return null;
  const [ready] = freshExercises(ctx.catalog.exercises, ctx.state.exercises, track.id, level.level, queued, franchiseOf(ctx.persona));
  if (ready) return ctx.catalog.byId[ready];
  const forged = await forgeExercises(ctx, { track, purpose: "practice", level, count: ctx.config.forgeBatch });
  return forged[0] ?? null;
}

/**
 * Turns a queue entry into an exercise, forging one with Claude when the entry is a slot.
 * @param {object} ctx
 * @param {object} day its queue is updated with the forged id
 * @param {string} entry
 * @returns {Promise<object | null>} null when the track is finished or nothing valid came out of the forge
 */
export async function resolveEntry(ctx, day, entry) {
  const trackId = slotTrack(entry);
  if (!trackId) return ctx.catalog.byId[entry];
  const exercise = await exerciseForSlot(ctx, trackOf(ctx, trackId), day.queue);
  const index = day.queue.indexOf(entry);
  if (exercise) day.queue[index] = exercise.id;
  else day.queue.splice(index, 1);
  return exercise;
}

function renderOpen({ t, paint }, data) {
  const tag = data.placement ? t.tagPlacement : data.review ? t.tagReview : t.tagNew;
  const rank = data.difficulty ? t.difficulty(data.difficulty) : t.level(data.level);
  return [
    `${paint.bold(`[${data.track} ${rank}] ${data.title}`)}  ${paint.yellow(tag)}  ${paint.dim(t.minutes(data.minutes))}`,
    `${t.concepts}: ${data.concepts.join(", ")}`,
    `${t.statement}: ${paint.cyan(data.readme)}`,
    `${t.yourFile}: ${paint.cyan(data.path)}`,
    paint.dim(t.whenReady),
  ];
}

/**
 * Prepares the exercise's workspace, makes it current and starts its clock.
 * @param {object} ctx
 * @param {object} exercise
 * @returns {Promise<{ data: object, text: string[] }>}
 */
export async function openExercise(ctx, exercise) {
  const { solution, readme } = await prepareWorkspace(ctx.config, exercise);
  const record = recordOf(ctx.state, exercise.id);
  record.startedAt ??= Date.now();
  ctx.state.current = exercise.id;
  const data = {
    id: exercise.id,
    track: exercise.track,
    title: exercise.title,
    level: exercise.level,
    difficulty: exercise.placement ? exercise.difficulty : null,
    minutes: exercise.minutes,
    concepts: exercise.concepts,
    path: solution,
    readme,
    lesson: existsSync(exerciseFiles(exercise).lesson) ? exerciseFiles(exercise).lesson : null,
    review: Boolean(record.firstSolvedAt),
    placement: isPlacementQuestion(ctx.state, exercise.id),
  };
  return { data, text: renderOpen(ctx, data) };
}
