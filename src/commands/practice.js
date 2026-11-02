import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { ghostVerdict, isOnsite } from "../actions/arena.js";
import { isUnfinished, nextPending, slotFor, undrawnSlotTrack } from "../actions/queue.js";
import { daySummary } from "../actions/recap.js";
import { conceptTitle } from "../actions/graph.js";
import { noteResult, standingOf } from "../actions/mastery.js";
import { applyPass, applySkip, awardXp, noteActivity } from "../actions/record.js";
import { likelyMistakes, nudgeFor } from "../actions/mutants.js";
import { lastRun, partialFailures, runEntry, runsThisRound, trippedThisRound } from "../actions/runs.js";
import { roundOutcome } from "../actions/schedule.js";
import { generalHintsSeen, hintLines, nudgeLines } from "../actions/hints.js";
import { HINT_COST, xpFor } from "../actions/xp.js";
import { exerciseFiles, findExercise } from "../lib/catalog.js";
import { readJsonIfExists } from "../lib/files.js";
import { runTests } from "../lib/runner.js";
import { appendRun, readRuns } from "../lib/runlog.js";
import { dayOf, recordOf } from "../lib/state.js";
import { saveTrack } from "../lib/tracks.js";
import { redoPath, solutionPath } from "../lib/workspace.js";
import { duration, excerpt } from "../utils/text.js";
import { nextPlacement, notePlacementResult, placement, renderPlacementNote } from "./placement.js";
import {
  ensureQueue,
  failure,
  isPlacementQuestion,
  isPlacementRunning,
  levelNow,
  openExercise,
  openTracks,
  profileOf,
  resolveEntry,
  reviewedToday,
  targetExercise,
  trackOf,
} from "./shared.js";

function addExtra(ctx, day) {
  const tracks = openTracks(ctx);
  if (tracks.length > 0) day.queue.push(slotFor(tracks[day.queue.length % tracks.length]));
}

async function resumeCurrent(ctx) {
  const report = await openExercise(ctx, ctx.catalog.byId[ctx.state.current]);
  report.data.resumed = true;
  report.text.unshift(ctx.paint.yellow(ctx.t.finishFirst), "");
  return report;
}

/**
 * `btb next`: opens the first exercise still pending today, forging it with Claude when needed.
 * One fight at a time: the exercise left open comes back until it is solved or skipped, and a
 * track with no path yet starts with its placement. --more adds one more new exercise to the day.
 */
export async function next(ctx, _args, flags) {
  if (isPlacementRunning(ctx.state)) return nextPlacement(ctx);
  const day = dayOf(ctx.state, ctx.today);
  ensureQueue(ctx, day);
  if (flags.more) addExtra(ctx, day);
  const current = ctx.state.current;
  if (ctx.catalog.byId[current] && isUnfinished(current, ctx.state.exercises[current], day)) return resumeCurrent(ctx);
  const undrawn = undrawnSlotTrack(day.queue, day.done, (trackId) => Boolean(trackOf(ctx, trackId)?.path));
  if (undrawn) return placement(ctx, [undrawn], {});
  for (let entry = nextPending(day.queue, day.done); entry; entry = nextPending(day.queue, day.done)) {
    const exercise = await resolveEntry(ctx, day, entry);
    if (exercise) return openExercise(ctx, exercise);
  }
  const summary = summaryOf(ctx, day);
  return { data: { done: true, ...summary }, text: renderSummary(ctx, summary) };
}

function summaryOf(ctx, day) {
  const summary = daySummary(day, ctx.catalog.byId, reviewedToday(ctx, day));
  return { ...summary, goal: ctx.config.dailyGoalXp };
}

function renderSummary({ t, paint }, summary) {
  const improve = summary.toImprove.length > 0 ? paint.yellow(t.summaryImprove(summary.toImprove)) : paint.green(t.summaryAllClean);
  return [
    paint.green(t.allDone(summary.xp, summary.goal)),
    t.summarySolved(summary.solved, summary.clean, summary.struggled),
    t.summaryMisses(summary.skipped, summary.failures, summary.hints),
    ...(summary.recapped > 0 ? [t.summaryRecapped(summary.recapped)] : []),
    improve,
    paint.dim(t.moreHint),
  ];
}

// the day's rounds, so the summary at the end can tell how each one went
function logRound(day, id, round) {
  day.rounds ??= {};
  day.rounds[id] = round;
}

/**
 * `btb start <id>`: opens a specific exercise.
 */
export async function start(ctx, [query]) {
  if (!query) return failure(ctx.t.startNeedsId);
  const exercise = findExercise(ctx.catalog, query);
  if (!exercise) return failure(ctx.t.unknownExercise(query));
  return openExercise(ctx, exercise);
}

function elapsedSeconds(startedAt) {
  return startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
}

function afterFailLine(t, data) {
  if (data.redo) return t.afterFailRedo(data.id);
  if (data.placement) return t.afterFailPlacement;
  if (data.nudgeReady) return t.afterFailNudge;
  return data.hintsLeft > 0 ? t.afterFail : t.afterFailNoHints;
}

function renderFailure({ t, paint }, data) {
  const after = paint.dim(afterFailLine(t, data));
  if (data.unapproved) return [paint.red(t.unapproved(data.track))];
  if (data.unsupported) return [paint.red(t.tsUnsupported)];
  if (data.timedOut) return [paint.red(t.timedOut(data.timeoutSeconds)), after];
  if (data.crashed) return [paint.red(t.crashed), ...excerpt(data.stderr, 12), after];
  const lines = [paint.red(t.failedCount(data.passed, data.total, data.attempt))];
  for (const test of data.failures) {
    lines.push(`  ${paint.red("✗")} ${test.name}`, ...excerpt(test.message, 8).map(paint.dim));
  }
  if (data.logs.length > 0) lines.push(t.yourConsole, ...excerpt(data.logs.join("\n"), 10));
  lines.push(after);
  return lines;
}

function failureData(ctx, exercise, result, hintsUsed = 0) {
  const placement = isPlacementQuestion(ctx.state, exercise.id);
  return {
    id: exercise.id,
    title: exercise.title,
    track: exercise.track,
    ok: false,
    passed: result.passed,
    total: result.tests.length,
    failures: result.tests.filter((test) => !test.ok),
    logs: result.logs,
    timedOut: result.timedOut,
    timeoutSeconds: Math.round(ctx.config.testTimeoutMs / 1000),
    crashed: result.crashed,
    unsupported: Boolean(result.unsupported),
    unapproved: Boolean(result.unapproved),
    stderr: result.stderr,
    placement,
    onsite: isOnsite(trackOf(ctx, exercise.track), exercise),
    hintsLeft: placement ? 0 : Math.max(0, exercise.hints.length - hintsUsed),
  };
}

async function mutantsOf(exercise) {
  return (await readJsonIfExists(exerciseFiles(exercise).mutants)) ?? [];
}

// a run that fails exactly like a known mistake has a hint waiting that aims straight at it
async function nudgeReady(ctx, exercise, result, round) {
  if (isPlacementQuestion(ctx.state, exercise.id)) return false;
  return Boolean(nudgeFor(await mutantsOf(exercise), runEntry(exercise, "test", result), round?.nudges));
}

async function failed(ctx, exercise, record, result) {
  record.round.failures += 1;
  const data = {
    ...failureData(ctx, exercise, result, generalHintsSeen(record.round)),
    attempt: record.round.failures,
    nudgeReady: await nudgeReady(ctx, exercise, result, record.round),
  };
  return { code: 1, data, text: renderFailure(ctx, data) };
}

// the redo races the best time of the first solution, its ghost
function redoPassed(ctx, exercise, result) {
  delete ctx.state.redos[exercise.id];
  const startedAt = ctx.state.redoStarts?.[exercise.id];
  if (ctx.state.redoStarts) delete ctx.state.redoStarts[exercise.id];
  const seconds = elapsedSeconds(startedAt);
  const ghostSeconds = ctx.state.exercises[exercise.id]?.bestSeconds ?? null;
  const ghost = ghostVerdict(seconds, ghostSeconds);
  const data = { id: exercise.id, title: exercise.title, ok: true, redo: true, passed: result.passed, total: result.tests.length, seconds, ghostSeconds, ghost };
  const lines = [ctx.paint.green(ctx.t.redoPassed(data.passed, data.total, exercise.title))];
  if (ghost) lines.push(ctx.t.redoGhost(ghost, duration(seconds), duration(ghostSeconds)));
  return { data, text: lines };
}

// a redo only counts its own failed submits, so the coach can tell a first miss from a stubborn one
function redoFinished(ctx, exercise, result) {
  ctx.state.redos ??= {};
  if (result.ok) return redoPassed(ctx, exercise, result);
  ctx.state.redos[exercise.id] = (ctx.state.redos[exercise.id] ?? 0) + 1;
  const data = { ...failureData(ctx, exercise, result), placement: false, redo: true, hintsLeft: 0, attempt: ctx.state.redos[exercise.id] };
  return { code: 1, data, text: renderFailure(ctx, data) };
}

function timeLine(t, data) {
  if (data.seconds === null) return "";
  const active = data.activeSeconds ? t.activeTime(duration(data.activeSeconds)) : "";
  return `${t.timeTaken(duration(data.seconds), data.minutes, data.seconds <= data.minutes * 60)}${active}`;
}

// what an editor measured of the round, only when it measured something
function activityOf(round) {
  return round.active || round.edits ? { activeSeconds: round.active ?? 0, edits: round.edits ?? 0 } : {};
}

function renderPass(ctx, exercise, data, placement) {
  const { t, paint } = ctx;
  const outcome = data.outcome === "clean" ? paint.green(t.clean) : paint.yellow(t.struggled);
  const after = data.day ? ["", ...renderSummary(ctx, data.day)] : [paint.dim(t.afterPass)];
  return [
    paint.green(t.passed(data.passed, data.total, exercise.title)),
    `${outcome}   +${data.xp} XP   ${timeLine(t, data)}`,
    ...conceptNote(ctx, data),
    ...(data.levelUp ? [paint.green(t.levelUp(ctx.coach, data.levelUp))] : []),
    ...renderPlacementNote(ctx, placement),
    ...after,
  ];
}

function primaryEntry(ctx, exercise) {
  const id = exercise.conceptIds?.[0];
  return id ? ctx.state.mastery[exercise.track]?.concepts?.[id] : undefined;
}

function primaryStanding(ctx, exercise) {
  return standingOf(primaryEntry(ctx, exercise));
}

// where the main concept stands after the pass: owned just now, or when it comes back
function conceptAfter(ctx, exercise, track, ownedBefore) {
  const entry = primaryEntry(ctx, exercise);
  if (!entry?.dueAt) return null;
  const owned = !ownedBefore && standingOf(entry) === "owned";
  return { title: conceptTitle(track, exercise.conceptIds[0]), dueAt: entry.dueAt, owned };
}

function conceptNote({ t, paint }, data) {
  if (!data.concept) return [];
  return [data.mastered ? paint.green(t.conceptOwned(data.concept, data.dueAt)) : t.conceptBack(data.concept, data.dueAt)];
}

// the summary comes with the pass that ends the day, so nobody has to ask for it
function finishedDay(ctx, day, placement) {
  if (placement || isPlacementRunning(ctx.state) || !day.queue || nextPending(day.queue, day.done)) return null;
  return summaryOf(ctx, day);
}

async function markLevelUp(ctx, track, before) {
  const after = levelNow(ctx, track)?.level ?? null;
  if (!track.path || before === after) return null;
  // Claude redraws what comes next the next time it forges, with this level's evidence in hand
  track.path.redrawPending = true;
  await saveTrack(ctx.config, track);
  return before;
}

async function passed(ctx, exercise, record, result) {
  const day = dayOf(ctx.state, ctx.today);
  if (day.solved.includes(exercise.id)) {
    return { data: { id: exercise.id, ok: true, xp: 0, repeat: true }, text: [ctx.paint.green(ctx.t.alreadySolved(result.passed))] };
  }
  const track = trackOf(ctx, exercise.track);
  const levelBefore = levelNow(ctx, track)?.level ?? null;
  const round = { ...record.round };
  const outcome = roundOutcome(round, ctx.config.cleanMaxFailures);
  const seconds = elapsedSeconds(record.startedAt);
  const evidence = await roundEvidence(ctx, exercise, record.startedAt);
  const xp = xpFor({ level: Math.max(exercise.level, exercise.difficulty ?? 1), outcome, hints: round.hints });
  applyPass(record, { outcome, seconds, today: ctx.today });
  awardXp(ctx.state, day, exercise.id, xp);
  logRound(day, exercise.id, { outcome, failures: round.failures, hints: round.hints });
  const ownedBefore = primaryStanding(ctx, exercise) === "owned";
  noteResult(ctx.state.mastery, exercise, { outcome, failures: round.failures, hints: round.hints, seconds, ...activityOf(round), ...evidence }, ctx.today);
  const concept = conceptAfter(ctx, exercise, track, ownedBefore);
  const placement = await notePlacementResult(ctx, exercise.id, outcome);
  const levelUp = placement ? null : await markLevelUp(ctx, track, levelBefore);
  const data = {
    id: exercise.id,
    title: exercise.title,
    ok: true,
    passed: result.passed,
    total: result.tests.length,
    outcome,
    xp,
    seconds,
    activeSeconds: round.active ?? null,
    minutes: exercise.minutes,
    // the exercise's main concept: when it comes back for review, and whether this pass made it owned
    concept: concept?.title ?? null,
    dueAt: concept?.dueAt ?? null,
    mastered: Boolean(concept?.owned),
    levelUp,
    placement,
    day: finishedDay(ctx, day, placement),
  };
  return { data, text: renderPass(ctx, exercise, data, placement) };
}

// what the run log tells about the round: which tests tripped the learner, how many runs it took,
// and which of the exercise's known mistakes those runs look like
async function roundEvidence(ctx, exercise, startedAt) {
  const runs = await readRuns(ctx.config);
  const mutants = (await readJsonIfExists(exerciseFiles(exercise).mutants)) ?? [];
  return {
    tripped: trippedThisRound(runs, exercise.id, startedAt),
    runs: runsThisRound(runs, exercise.id, startedAt),
    mistakes: likelyMistakes(mutants, partialFailures(runs, exercise.id, startedAt)),
  };
}

async function testsOf(ctx, exercise, solution, kind) {
  const result = await runTests({
    config: ctx.config,
    profile: await profileOf(ctx, trackOf(ctx, exercise.track)),
    files: { solutionFile: exercise.files.solution, testFile: exercise.files.test },
    solutionCode: await readFile(solution, "utf8"),
    testCode: await readFile(exerciseFiles(exercise).test, "utf8"),
    onInstall: ctx.onInstall,
  });
  // a toolchain that refused to run says nothing about the learner
  if (!result.unsupported && !result.unapproved) await appendRun(ctx.config, runEntry(exercise, kind, result));
  return result;
}

/**
 * `btb submit [id]`: runs the tests against the solution and records the round.
 * --redo runs them against the redo instead, and records nothing but the redo's own failures.
 */
export async function submit(ctx, [query], flags = {}) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const solution = flags.redo ? redoPath(ctx.config, exercise) : solutionPath(ctx.config, exercise);
  if (!existsSync(solution)) return failure(flags.redo ? ctx.t.redoNotStarted(exercise.id) : ctx.t.notStarted(exercise.slug));
  if (flags.redo) return redoFinished(ctx, exercise, await testsOf(ctx, exercise, solution, "redo"));
  ctx.state.current = exercise.id;
  const result = await testsOf(ctx, exercise, solution, "submit");
  const record = recordOf(ctx.state, exercise.id);
  noteActivity(record, flags);
  record.attempts += 1;
  return result.ok ? passed(ctx, exercise, record, result) : failed(ctx, exercise, record, result);
}

function renderTrial({ t, paint }, data) {
  if (data.ok) return [paint.green(t.trialPassed(data.passed, data.total)), paint.dim(t.trialAfterPass)];
  if (data.timedOut) return [paint.red(t.timedOut(data.timeoutSeconds))];
  if (data.crashed) return [paint.red(t.crashed), ...excerpt(data.stderr, 12)];
  const lines = [paint.red(t.trialFailed(data.passed, data.total))];
  for (const test of data.failures) {
    lines.push(`  ${paint.red("✗")} ${test.name}`, ...excerpt(test.message, 8).map(paint.dim));
  }
  if (data.logs.length > 0) lines.push(t.yourConsole, ...excerpt(data.logs.join("\n"), 10));
  if (data.nudgeReady) lines.push(paint.dim(t.afterFailNudge));
  return lines;
}

/**
 * `btb test [id]`: runs the tests without counting an attempt, so trying things out costs nothing.
 * The round, the clock and the schedule stay as they are, only submit records. --redo tests the redo.
 */
export async function test(ctx, [query], flags = {}) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const solution = flags.redo ? redoPath(ctx.config, exercise) : solutionPath(ctx.config, exercise);
  if (!existsSync(solution)) return failure(flags.redo ? ctx.t.redoNotStarted(exercise.id) : ctx.t.notStarted(exercise.slug));
  const result = await testsOf(ctx, exercise, solution, flags.redo ? "redo" : "test");
  if (!flags.redo && flags.active) noteActivity(recordOf(ctx.state, exercise.id), flags);
  const round = ctx.state.exercises[exercise.id]?.round;
  const data = { ...failureData(ctx, exercise, result, round ? generalHintsSeen(round) : 0), ok: result.ok, practice: true, redo: Boolean(flags.redo) };
  if (!result.ok && !flags.redo) data.nudgeReady = await nudgeReady(ctx, exercise, result, round);
  return { code: result.ok ? 0 : 1, data, text: renderTrial(ctx, data) };
}

// the latest run of the round failed exactly like a known mistake: the hint aims at that mistake first
async function nudgeOf(ctx, exercise, record) {
  const run = lastRun(await readRuns(ctx.config), exercise.id, record.startedAt);
  return nudgeFor(await mutantsOf(exercise), run, record.round.nudges);
}

function nudged(ctx, exercise, record, found) {
  record.round.hints += 1;
  record.round.nudges = [...(record.round.nudges ?? []), found.mistake];
  const shown = exercise.hints.slice(0, generalHintsSeen(record.round));
  return {
    data: { id: exercise.id, hints: shown, total: exercise.hints.length, cost: HINT_COST, nudge: found.nudge },
    text: nudgeLines({ nudge: found.nudge, header: ctx.t.nudgeHeader(HINT_COST), after: ctx.t.nudgeAfter, paint: ctx.paint }),
  };
}

/**
 * `btb hint [id]`: reveals the next hint of the round. Each one costs XP, none during placement.
 * When the latest run failed exactly like one of the exercise's known mistakes, the hint points at
 * that mistake first, and the general hints wait for the next one.
 */
export async function hint(ctx, [query]) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  if (isPlacementQuestion(ctx.state, exercise.id)) return failure(ctx.t.noHintsInPlacement);
  const record = recordOf(ctx.state, exercise.id);
  const found = await nudgeOf(ctx, exercise, record);
  if (found) return nudged(ctx, exercise, record, found);
  const seen = generalHintsSeen(record.round);
  const fresh = seen < exercise.hints.length;
  if (fresh) record.round.hints += 1;
  const shown = exercise.hints.slice(0, generalHintsSeen(record.round));
  const header = fresh ? ctx.t.hintHeader(shown.length, exercise.hints.length, HINT_COST) : ctx.t.noMoreHints;
  return {
    data: { id: exercise.id, hints: shown, total: exercise.hints.length, cost: fresh ? HINT_COST : 0 },
    text: hintLines({ shown, fresh, header, earlierLabel: ctx.t.hintsEarlier, paint: ctx.paint }),
  };
}

/**
 * `btb skip [id]`: leaves the exercise for tomorrow and unlocks its reference solution.
 */
export async function skip(ctx, [query], flags = {}) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const record = recordOf(ctx.state, exercise.id);
  noteActivity(record, flags);
  const round = { ...record.round };
  const evidence = await roundEvidence(ctx, exercise, record.startedAt);
  applySkip(record, ctx.today);
  const day = dayOf(ctx.state, ctx.today);
  if (!day.done.includes(exercise.id)) day.done.push(exercise.id);
  logRound(day, exercise.id, { outcome: "skipped", failures: round.failures, hints: round.hints });
  const work = activityOf(round);
  noteResult(ctx.state.mastery, exercise, { outcome: "skipped", failures: round.failures, hints: round.hints, seconds: null, ...work, ...evidence }, ctx.today);
  const placement = await notePlacementResult(ctx, exercise.id, "skipped");
  return {
    data: { id: exercise.id, skipped: true, dueAt: record.dueAt, placement },
    text: [ctx.t.skipped(record.dueAt), ...renderPlacementNote(ctx, placement), ctx.paint.dim(ctx.t.revealHint)],
  };
}

/**
 * `btb reveal [id]`: prints the reference solution, only once the exercise was solved or skipped.
 */
export async function reveal(ctx, [query]) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const record = ctx.state.exercises[exercise.id];
  if (!record?.firstSolvedAt && !record?.skips) return failure(ctx.t.revealLocked);
  const code = await readFile(exerciseFiles(exercise).reference, "utf8");
  return { data: { id: exercise.id, code }, text: [ctx.paint.bold(ctx.t.revealHeader(exercise.title)), "", code.trimEnd()] };
}
