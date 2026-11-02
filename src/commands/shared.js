import { currentLevel, levelProgress } from "../actions/levels.js";
import { conceptTitle } from "../actions/graph.js";
import { dueConcepts, focusConcept, standingOf } from "../actions/mastery.js";
import { allocateNew, conceptReviewSlots, dueReviews, freshExercises, pendingTrack, reviewSlotOf, slotFor } from "../actions/queue.js";
import { isOnsite } from "../actions/arena.js";
import { HINT_COST } from "../actions/xp.js";
import { generalHintsSeen } from "../actions/hints.js";
import { franchiseOf } from "../actions/cast.js";
import { waitingFor } from "../actions/unlock.js";
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

function isLockedTrack(ctx, trackId) {
  const track = trackOf(ctx, trackId);
  return Boolean(track) && Boolean(lockOf(ctx, track));
}

/**
 * Lets go of what a closed track left open, a running placement or the current exercise, so the day
 * goes back to the track it waits for. Forged probes stay on disk, the test starts over once it opens.
 * @param {object} ctx
 */
export function leaveLockedTracks(ctx) {
  if (isPlacementRunning(ctx.state) && isLockedTrack(ctx, ctx.state.placement.track)) ctx.state.placement = null;
  const current = ctx.catalog.byId[ctx.state.current];
  if (current && isLockedTrack(ctx, current.track)) ctx.state.current = null;
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
 * Each level of a track's path with how many of its concepts the learner owns.
 * @param {object} ctx
 * @param {object} track
 * @returns {ReturnType<typeof levelProgress>}
 */
export function progressOf(ctx, track) {
  return levelProgress(track, ctx.state.mastery[track.id]?.concepts);
}

const CONCEPT_GLYPHS = { owned: "✓", learning: "~", weak: "!", new: "·" };

/**
 * A level's concepts as one line, each with the mark of where the learner stands on it.
 * @param {object} ctx
 * @param {object} track
 * @param {{ concepts: string[] }} level
 * @returns {string}
 */
export function conceptMarks(ctx, track, level) {
  const concepts = ctx.state.mastery[track.id]?.concepts ?? {};
  return level.concepts.map((id) => `${CONCEPT_GLYPHS[standingOf(concepts[id])]} ${conceptTitle(track, id)}`).join("   ");
}

/**
 * The track's level now, from its path and the concepts owned.
 * @param {object} ctx
 * @param {object} track
 * @returns {object | null} the level entry, null when the path is done or not drawn
 */
export function levelNow(ctx, track) {
  const progress = progressOf(ctx, track);
  const level = currentLevel(progress);
  return progress.find((entry) => entry.level === level) ?? null;
}

/**
 * What a track still waits for before it opens, null when it is open.
 * @param {object} ctx
 * @param {object} track
 * @returns {ReturnType<typeof waitingFor>}
 */
export function lockOf(ctx, track) {
  const required = track.after ? trackOf(ctx, track.after.track) : undefined;
  const progress = required ? progressOf(ctx, required) : [];
  return waitingFor(track, required, progress);
}

/**
 * Tracks that still take new exercises: open, with no path yet or a path not finished.
 * @param {object} ctx
 * @returns {string[]} ids
 */
export function openTracks(ctx) {
  return ctx.catalog.tracks
    .filter((track) => !lockOf(ctx, track))
    .filter((track) => !track.path || levelNow(ctx, track))
    .map((track) => track.id);
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

// a slot queued before its track closed, or before it was removed, is dropped from the day
function isOpenSlot(ctx, trackId) {
  const track = trackOf(ctx, trackId);
  return Boolean(track) && !lockOf(ctx, track);
}

// the concepts of passed levels that are due, on every open track with a path. A concept whose
// skipped exercise already comes back today needs no second review
function conceptReviews(ctx, limit, reviews) {
  const comingBack = new Set(reviews.map((id) => ctx.catalog.byId[id]?.conceptIds?.[0]));
  const byTrack = openTracksWithPath(ctx).map((track) => ({
    track: track.id,
    due: dueConcepts(progressOf(ctx, track), ctx.state.mastery[track.id]?.concepts, ctx.today).filter((due) => !comingBack.has(due.id)),
  }));
  return conceptReviewSlots(byTrack, limit);
}

function openTracksWithPath(ctx) {
  return ctx.catalog.tracks.filter((track) => track.path && !lockOf(ctx, track));
}

function buildQueue(ctx, day) {
  const reviews = dueReviews(ctx.catalog.exercises, ctx.state.exercises, ctx.today, ctx.config.dailyReviews);
  const concepts = conceptReviews(ctx, ctx.config.dailyReviews - reviews.length, reviews);
  const daysQueued = Object.values(ctx.state.days).filter((logged) => logged.queue).length;
  const slots = allocateNew(openTracks(ctx), ctx.config.dailyNew, daysQueued).map(slotFor);
  day.reviews = reviews;
  return [...reviews, ...concepts, ...slots];
}

/**
 * The concepts the day reviews with a fresh exercise, the ones still waiting and the ones already forged.
 * @param {object} ctx
 * @param {object} day
 * @returns {{ track: string, concept: string, id: string | null }[]} id is the exercise once forged
 */
export function conceptReviewsOf(ctx, day) {
  const waiting = (day.queue ?? []).map(reviewSlotOf).filter(Boolean).map((slot) => ({ ...slot, id: null }));
  const forged = Object.entries(day.reviewOf ?? {}).map(([id, concept]) => ({ track: ctx.catalog.byId[id]?.track, concept, id }));
  return [...forged.filter((entry) => entry.track), ...waiting];
}

/**
 * How many concepts the day already reviewed with a fresh exercise.
 * @param {object} ctx
 * @param {object} day
 * @returns {number}
 */
export function reviewedToday(ctx, day) {
  return Object.keys(day.reviewOf ?? {}).filter((id) => day.solved?.includes(id)).length;
}

function isQueued(ctx, entry) {
  const track = pendingTrack(entry);
  if (track) return isOpenSlot(ctx, track);
  return Boolean(ctx.catalog.byId[entry]);
}

/**
 * The day's queue, built on its first use of the day and kept stable after that. New exercises and
 * concept reviews start as slots that Claude forges when they are opened, a skipped exercise comes back as is.
 * @param {object} ctx
 * @param {object} day
 * @returns {string[]}
 */
export function ensureQueue(ctx, day) {
  day.queue ??= buildQueue(ctx, day);
  day.queue = day.queue.filter((entry) => isQueued(ctx, entry));
  return day.queue;
}

async function ensurePath(ctx, track) {
  if (track.path && !track.path.redrawPending) return;
  if (!track.path) ctx.log(ctx.paint.yellow(ctx.t.noPlacementYet(ctx.coach, track.id)));
  await drawPath(ctx, track);
}

async function exerciseForSlot(ctx, track, queued) {
  await ensurePath(ctx, track);
  const level = levelNow(ctx, track);
  if (!level) return null;
  const ready = freshExercises(ctx.catalog.exercises, ctx.state.exercises, track.id, level.level, queued, franchiseOf(ctx.persona));
  // one forged ahead for the concept that is due now goes first, so the path keeps its order
  const focus = focusConcept(level, ctx.state.mastery[track.id]?.concepts);
  const aimed = ready.find((id) => ctx.catalog.byId[id].conceptIds?.[0] === focus) ?? ready[0];
  if (aimed) return ctx.catalog.byId[aimed];
  const forged = await forgeExercises(ctx, { track, purpose: "practice", level, count: ctx.config.forgeBatch });
  return forged[0] ?? null;
}

/**
 * The level of the path a concept belongs to.
 * @param {object} track
 * @param {string} concept
 * @returns {object | undefined}
 */
export function levelOfConcept(track, concept) {
  return track.path?.levels.find((level) => level.concepts.includes(concept));
}

// a review never sends back an exercise already fought: one forged for the concept and never opened, or a new one
async function exerciseForReview(ctx, track, concept, queued) {
  const level = levelOfConcept(track, concept);
  if (!level) return null;
  const records = ctx.state.exercises;
  const unused = ctx.catalog.exercises.find(
    (exercise) =>
      exercise.track === track.id &&
      !exercise.placement &&
      exercise.conceptIds?.[0] === concept &&
      exercise.level <= level.level &&
      !records[exercise.id]?.startedAt &&
      !records[exercise.id]?.firstSolvedAt &&
      !records[exercise.id]?.skips &&
      !queued.includes(exercise.id),
  );
  if (unused) return unused;
  const forged = await forgeExercises(ctx, { track, purpose: "review", level, concept, count: 1 });
  return forged[0] ?? null;
}

async function exerciseForEntry(ctx, day, entry) {
  const review = reviewSlotOf(entry);
  if (!review) return exerciseForSlot(ctx, trackOf(ctx, pendingTrack(entry)), day.queue);
  const exercise = await exerciseForReview(ctx, trackOf(ctx, review.track), review.concept, day.queue);
  if (exercise) {
    day.reviewOf ??= {};
    day.reviewOf[exercise.id] = review.concept;
  }
  return exercise;
}

/**
 * Turns a queue entry into an exercise, forging one with Claude when the entry is a slot.
 * @param {object} ctx
 * @param {object} day its queue is updated with the forged id
 * @param {string} entry
 * @returns {Promise<object | null>} null when the track is finished or nothing valid came out of the forge
 */
export async function resolveEntry(ctx, day, entry) {
  if (!pendingTrack(entry)) return ctx.catalog.byId[entry];
  const exercise = await exerciseForEntry(ctx, day, entry);
  const index = day.queue.indexOf(entry);
  if (exercise) day.queue[index] = exercise.id;
  else day.queue.splice(index, 1);
  return exercise;
}

function tagOf(t, data) {
  if (data.placement) return t.tagPlacement;
  if (data.review) return t.tagReview;
  return data.format === "debug" ? t.tagBugHunt : t.tagNew;
}

function renderOpen({ t, paint }, data) {
  const tag = tagOf(t, data);
  const reviewing = data.reviewOf ? [paint.dim(t.reviewingConcept(data.reviewOf))] : [];
  const rank = data.difficulty ? t.difficulty(data.difficulty) : t.level(data.level);
  return [
    `${paint.bold(`[${data.track} ${rank}] ${data.title}`)}  ${paint.yellow(tag)}  ${paint.dim(t.minutes(data.minutes))}`,
    `${t.concepts}: ${data.concepts.join(", ")}`,
    ...reviewing,
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
  const reviewConcept = ctx.state.days[ctx.today]?.reviewOf?.[exercise.id] ?? null;
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
    review: Boolean(record.firstSolvedAt || record.skips || reviewConcept),
    // the concept a fresh exercise brings back from a level already passed
    reviewOf: reviewConcept ? conceptTitle(trackOf(ctx, exercise.track), reviewConcept) : null,
    // a bug hunt opens on code that already carries the learner's last mistake on this concept
    format: exercise.format ?? "build",
    placement: isPlacementQuestion(ctx.state, exercise.id),
    // the last 2 levels of the path are onsite fights, an editor can stage them as one
    onsite: isOnsite(trackOf(ctx, exercise.track), exercise),
    // an editor keeps the clock and the hints in sight while the learner writes
    startedAt: record.startedAt,
    hintsLeft: isPlacementQuestion(ctx.state, exercise.id) ? 0 : Math.max(0, exercise.hints.length - generalHintsSeen(record.round)),
    hintCost: HINT_COST,
  };
  return { data, text: renderOpen(ctx, data) };
}
