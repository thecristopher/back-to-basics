import { existsSync, readFileSync } from "node:fs";
import { conceptStanding, lessonQuestion } from "../actions/arena.js";
import { conceptTitle } from "../actions/graph.js";
import { currentLevel } from "../actions/levels.js";
import { standingOf } from "../actions/mastery.js";
import { goalStatus, projectLevels } from "../actions/plan.js";
import { freshExercises, reviewSlotOf, slotTrack } from "../actions/queue.js";
import { exerciseState } from "../actions/record.js";
import { streakDays } from "../actions/streak.js";
import { franchiseOf } from "../actions/cast.js";
import { exerciseFiles } from "../lib/catalog.js";
import { dayOf } from "../lib/state.js";
import { bar } from "../utils/text.js";
import { conceptReviewsOf, ensureQueue, isPlacementRunning, levelNow, lockOf, openTracks, progressOf, trackOf } from "./shared.js";

/** The mark of each exercise state, shared by list and lessons. */
export const GLYPHS = { mastered: "★", due: "↻", solved: "✓", started: "~", new: "·" };

// each concept of a level with its title and standing, so an editor can draw what is left without the graph
function withItems(ctx, track, level) {
  const concepts = ctx.state.mastery[track.id]?.concepts ?? {};
  return { ...level, items: level.concepts.map((id) => ({ id, title: conceptTitle(track, id), standing: standingOf(concepts[id]) })) };
}

function trackLevels(ctx) {
  return ctx.catalog.tracks.map((track) => {
    const levels = progressOf(ctx, track).map((level) => withItems(ctx, track, level));
    return { id: track.id, title: track.title, drawn: Boolean(track.path), current: currentLevel(levels), levels, locked: lockOf(ctx, track) };
  });
}

function spareExercises(ctx, track, queued) {
  const level = levelNow(ctx, track);
  return level ? freshExercises(ctx.catalog.exercises, ctx.state.exercises, track.id, level.level, queued, franchiseOf(ctx.persona)).length : 0;
}

// how many exercises each track already has forged and waiting, so slots can say whether they open instantly
function spareByTrack(ctx, queue) {
  const tracks = [...new Set(queue.map(slotTrack).filter(Boolean))];
  return Object.fromEntries(tracks.map((id) => [id, spareExercises(ctx, trackOf(ctx, id), queue)]));
}

function queueItem(ctx, day, entry, spare) {
  const review = reviewSlotOf(entry);
  if (review) {
    const title = conceptTitle(trackOf(ctx, review.track), review.concept);
    return { id: null, track: review.track, title, concept: review.concept, done: false, review: true, slot: true, ready: false };
  }
  const track = slotTrack(entry);
  if (track) {
    const ready = spare[track] > 0;
    spare[track] -= 1;
    return { id: null, track, title: null, done: false, review: false, slot: true, ready };
  }
  const exercise = ctx.catalog.byId[entry];
  const isReview = day.reviews.includes(entry) || Boolean(day.reviewOf?.[entry]);
  return { id: entry, track: exercise.track, title: exercise.title, done: day.done.includes(entry), review: isReview, slot: false };
}

function queueLine({ t, paint, coach }, item, isNext) {
  const mark = item.done ? paint.green("✓") : isNext ? paint.yellow("→") : " ";
  if (item.slot && item.review) return `  ${mark} [${item.track}] ${paint.dim(t.reviewSlotTitle(item.title))}`;
  if (item.slot) return `  ${mark} [${item.track}] ${paint.dim(t.slotTitle(coach))}`;
  const tag = paint.dim(`(${item.review ? t.tagReview : t.tagNew})`);
  return `  ${mark} [${item.track}] ${item.title}  ${tag}`;
}

// the lesson's closing question, so an editor can ask it before showing the recap
function questionOf(exercise) {
  const file = exerciseFiles(exercise).lesson;
  return existsSync(file) ? lessonQuestion(readFileSync(file, "utf8")) : null;
}

// the last exercise the learner solved on a concept, whose lesson question warms the review up
function lastSolvedOn(ctx, track, concept) {
  const solved = ctx.catalog.exercises.filter(
    (exercise) => exercise.track === track && exercise.conceptIds?.[0] === concept && ctx.state.exercises[exercise.id]?.firstSolvedAt,
  );
  return solved.sort((a, b) => ctx.state.exercises[b.id].lastSolvedAt.localeCompare(ctx.state.exercises[a.id].lastSolvedAt))[0] ?? null;
}

// a concept the day reviews: where it stands, and the question of the last exercise solved on it, so an
// editor can ask it from memory before the fresh exercise opens
function recapItem(ctx, { track, concept, id }) {
  const last = lastSolvedOn(ctx, track, concept);
  const entry = ctx.state.mastery[track]?.concepts?.[concept];
  return {
    id: last?.id ?? id,
    track,
    concept,
    title: conceptTitle(trackOf(ctx, track), concept),
    last: last?.title ?? null,
    review: id,
    concepts: [conceptTitle(trackOf(ctx, track), concept)],
    outcome: entry?.last ?? null,
    standing: standingOf(entry),
    dueAt: entry?.dueAt ?? null,
    mastered: false,
    question: last ? questionOf(last) : null,
  };
}

function recapLine({ t, paint }, item) {
  const outcome = item.standing === "weak" ? paint.yellow(t.struggled) : paint.green(t.clean);
  const head = `  ↻ [${item.track}] ${item.title}  ${outcome}`;
  return item.last ? [head, paint.dim(`      ${t.recapLast(item.last)}`)] : [head];
}

function renderRecap(ctx, recap) {
  if (recap.length === 0) return [];
  return [ctx.paint.bold(ctx.t.recapHeader), ...recap.flatMap((item) => recapLine(ctx, item)), ""];
}

function renderToday(ctx, data) {
  const { t, paint } = ctx;
  const lines = [`${paint.bold(t.todayHeader(data.today))}   ${t.streak(data.streak)}   ${t.xpToday(data.xp, data.goal)}`];
  if (data.placement === "running") return [...lines, t.placementPending];
  lines.push(...renderRecap(ctx, data.recap));
  if (data.undrawn.length > 0) lines.push(paint.yellow(t.firstTime(ctx.coach, data.undrawn[0])));
  lines.push(...data.locked.map((track) => paint.dim(t.trackLocked(track.title, track.lock))));
  const next = data.queue.find((item) => !item.done);
  lines.push(...data.queue.map((item) => queueLine(ctx, item, item === next)));
  lines.push(paint.dim(next ? t.goNext : t.moreHint));
  return lines;
}

/**
 * `btb today`: the day's queue, streak and XP. The default command.
 */
export async function today(ctx) {
  const day = dayOf(ctx.state, ctx.today);
  const running = isPlacementRunning(ctx.state);
  const queue = running ? [] : ensureQueue(ctx, day);
  const spare = spareByTrack(ctx, queue);
  const data = {
    today: ctx.today,
    streak: streakDays(ctx.state.days, ctx.today),
    xp: day.xp,
    goal: ctx.config.dailyGoalXp,
    queue: queue.map((entry) => queueItem(ctx, day, entry, spare)),
    recap: running ? [] : conceptReviewsOf(ctx, day).map((review) => recapItem(ctx, review)),
    current: ctx.state.current,
    placement: ctx.state.placement?.status ?? null,
    undrawn: ctx.catalog.tracks.filter((track) => !track.path && !lockOf(ctx, track)).map((track) => track.id),
    locked: ctx.catalog.tracks.map((track) => ({ id: track.id, title: track.title, lock: lockOf(ctx, track) })).filter((track) => track.lock),
  };
  return { data, text: renderToday(ctx, data) };
}

function levelLine({ t, paint }, level, isCurrent) {
  const mark = level.done ? paint.green("✓") : isCurrent ? paint.yellow("→") : " ";
  const count = level.placedOut ? paint.dim(t.placedOut) : t.cleanOf(level.clean, level.target);
  return `  ${mark} ${t.level(level.level).padEnd(8)} ${level.title.padEnd(32)} ${bar(level.clean, level.target)}  ${count}`;
}

function renderStatus(ctx, data) {
  const { t, paint } = ctx;
  const lines = [t.totals(data.xp, data.streak, data.solved, data.mastered)];
  for (const track of data.tracks) {
    lines.push("", paint.bold(track.title));
    if (track.locked) lines.push(paint.dim(`  ${t.trackLocked(track.title, track.locked)}`));
    else if (!track.drawn) lines.push(paint.yellow(`  ${t.pathMissing(ctx.coach, track.id)}`));
    lines.push(...track.levels.map((level) => levelLine(ctx, level, level.level === track.current)));
  }
  return lines;
}

/**
 * `btb status`: levels per track, total XP, streak and mastery.
 */
export async function status(ctx) {
  const records = Object.values(ctx.state.exercises);
  const data = {
    xp: ctx.state.xp,
    streak: streakDays(ctx.state.days, ctx.today),
    solved: records.filter((record) => record.firstSolvedAt).length,
    // concepts owned across every track, what a level and an interview are made of
    mastered: Object.values(ctx.state.mastery).reduce((sum, track) => sum + Object.values(track.concepts).filter((entry) => standingOf(entry) === "owned").length, 0),
    tracks: trackLevels(ctx),
    concepts: conceptStanding(ctx.state.mastery, ctx.catalog.tracks),
  };
  return { data, text: renderStatus(ctx, data) };
}

function projectTrack(ctx, track, perSession) {
  const levels = track.levels.map((level) => ({
    track: track.id,
    trackTitle: track.title,
    level: level.level,
    title: level.title,
    remaining: level.remaining,
    done: level.done,
  }));
  return projectLevels(levels, { perSession, daysPerWeek: ctx.config.daysPerWeek, today: ctx.today });
}

function goalLine({ t, paint }, goal) {
  const labels = { done: paint.green(t.goalDone), onTrack: paint.green(t.goalOnTrack), behind: paint.red(t.goalBehind), unknown: paint.dim(t.goalUnknown) };
  const projection = goal.finishBy ? paint.dim(t.projected(goal.finishBy)) : "";
  return `  ${labels[goal.state]}  ${goal.title} (${goal.track} ${t.level(goal.level)}) ${t.by(goal.by)} ${projection}`;
}

function renderPlan(ctx, data) {
  const { t, paint } = ctx;
  const lines = [paint.bold(t.planHeader), paint.dim(t.pace(data.pace.dailyNew, data.pace.daysPerWeek, data.pace.tracks))];
  for (const level of data.levels) {
    const when = level.done ? paint.green("✓") : t.readyBy(level.finishBy);
    lines.push(`  ${level.trackTitle.padEnd(10)} ${t.level(level.level).padEnd(8)} ${level.title.padEnd(32)} ${when}`);
  }
  if (data.goals.length === 0) return [...lines, "", paint.dim(t.noGoals)];
  return [...lines, "", paint.bold(t.goalsHeader), ...data.goals.map((goal) => goalLine(ctx, goal))];
}

/**
 * `btb plan`: when each level will be done at the configured pace, and whether the goals hold.
 * Tracks share the day's new exercises, so each one moves at its share of the pace.
 */
export async function plan(ctx) {
  const sharing = Math.max(1, openTracks(ctx).length);
  const perSession = ctx.config.dailyNew / sharing;
  const levels = trackLevels(ctx).flatMap((track) => projectTrack(ctx, track, perSession));
  const goals = ctx.config.goals.map((goal) => goalStatus(goal, levels));
  const pace = { dailyNew: ctx.config.dailyNew, daysPerWeek: ctx.config.daysPerWeek, tracks: sharing };
  return { data: { pace, levels, goals }, text: renderPlan(ctx, { pace, levels, goals }) };
}

/**
 * The heading an exercise falls under: its track and level, or its track's placement.
 * @param {object} ctx
 * @param {{ track: string, level: number, placement: boolean }} item
 * @returns {string}
 */
export function listHeading(ctx, item) {
  const title = trackOf(ctx, item.track)?.title ?? item.track;
  return item.placement ? `${title} ${ctx.t.placementHeading}` : `${title} ${ctx.t.level(item.level)}`;
}

/**
 * `btb list`: every exercise Claude forged for the active tracks, with where it stands.
 */
export async function list(ctx) {
  const items = ctx.catalog.exercises.map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
    track: exercise.track,
    level: exercise.level,
    placement: exercise.placement,
    state: exerciseState(ctx.state.exercises[exercise.id], ctx.today),
  }));
  if (items.length === 0) return { data: { exercises: [] }, text: [ctx.t.nothingForged(ctx.coach)] };
  const lines = [ctx.paint.dim(ctx.t.legend)];
  let heading = "";
  for (const item of items) {
    const next = listHeading(ctx, item);
    if (next !== heading) lines.push("", ctx.paint.bold(next));
    heading = next;
    lines.push(`  ${GLYPHS[item.state]} ${item.title.padEnd(32)} ${ctx.paint.dim(item.id)}`);
  }
  return { data: { exercises: items }, text: lines };
}
