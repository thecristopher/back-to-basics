import { existsSync } from "node:fs";
import { currentLevel, levelProgress } from "../actions/levels.js";
import { drawPath, proveProfile, writeProfile } from "../lib/architect.js";
import { exerciseFiles } from "../lib/catalog.js";
import { forgeExercises } from "../lib/forge.js";
import { franchiseOf } from "../actions/cast.js";
import { lacksMoments } from "../actions/moments.js";
import { writeMissingLesson, writeMissingMoments } from "../lib/library.js";
import { loadProfile, saveProfile } from "../lib/profiles.js";
import { saveTrack } from "../lib/tracks.js";
import { toSlug } from "../utils/slug.js";
import { failure, levelNow, lockOf, profileOf, trackOf } from "./shared.js";

function levelLine({ t, paint }, level, isCurrent) {
  const mark = level.done ? paint.green("✓") : isCurrent ? paint.yellow("→") : " ";
  const count = level.placedOut ? paint.dim(t.placedOut) : t.cleanOf(level.clean, level.target);
  return [`  ${mark} ${t.level(level.level).padEnd(8)} ${paint.bold(level.title)}  ${count}`, paint.dim(`      ${level.concepts.join(", ")}`)];
}

function renderTrackPath(ctx, track) {
  const { t, paint } = ctx;
  if (!track.path) return [paint.bold(track.title), paint.yellow(`  ${t.pathMissing(ctx.coach, track.id)}`)];
  const progress = levelProgress(track, ctx.catalog.exercises, ctx.state.exercises);
  const current = currentLevel(progress);
  return [
    `${paint.bold(track.title)}  ${paint.dim(t.revision(track.path.revision, track.path.drawnAt))}`,
    paint.dim(`  ${track.path.rationale}`),
    ...progress.flatMap((level) => levelLine(ctx, level, level.level === current)),
  ];
}

/**
 * `btb path [track]`: the path Claude drew for each track. --redraw asks for a new one from today's evidence.
 */
export async function path(ctx, [query], flags) {
  const tracks = query ? [trackOf(ctx, query)] : ctx.catalog.tracks;
  if (flags.redraw) {
    for (const track of tracks) await drawPath(ctx, track);
  }
  const text = tracks.flatMap((track, index) => [...(index > 0 ? [""] : []), ...renderTrackPath(ctx, track)]);
  return { data: { tracks: tracks.map((track) => ({ id: track.id, title: track.title, path: track.path })) }, text };
}

async function profileForLanguage(ctx, id, name, flags) {
  const known = await loadProfile(ctx.config, id).catch(() => null);
  if (known && (known.bundled || !flags.again)) return known;
  return writeProfile(ctx, name, id, known?.lastProblems ?? []);
}

function renderCommands({ t, paint }, profile) {
  return [
    paint.bold(t.reviewCommands),
    ...profile.check.map((command) => `  ${t.checkLabel}  ${command.join(" ")}`),
    `  ${t.testLabel}  ${profile.test.join(" ")}`,
    paint.dim(`  ${t.installLabel}: ${profile.install}`),
  ];
}

/**
 * `btb learn <language> [--goal="..."]`: a new track for any language. Claude works out how to run its tests
 * and, once approved with btb setup, draws the path from a placement test. --again rewrites the language profile.
 */
export async function learn(ctx, args, flags) {
  const name = args.join(" ").trim();
  if (!name) return failure(ctx.t.learnNeedsName);
  const id = toSlug(name);
  const existing = trackOf(ctx, id);
  if (existing && !flags.again) return failure(ctx.t.trackExists(id));
  const profile = await profileForLanguage(ctx, id, name, flags);
  const goal = typeof flags.goal === "string" ? flags.goal : "";
  const track = existing ?? { id, title: profile.name, language: profile.id, focus: ctx.t.defaultFocus(profile.name), goal, ladder: [], path: null };
  await saveTrack(ctx.config, track);
  const next = profile.approved ? ctx.t.learnReady(id) : ctx.t.learnApprove(id);
  const text = [ctx.paint.green(ctx.t.learned(profile.name, id)), ...(profile.approved ? [] : renderCommands(ctx, profile)), ctx.paint.dim(next)];
  return { data: { track: id, profile: profile.id, approved: profile.approved }, text };
}

/**
 * `btb setup [track] --yes`: approves a learned language's commands, installs what a runtime needs,
 * and proves the toolchain with the profile's sample.
 */
export async function setup(ctx, [query], flags) {
  const track = trackOf(ctx, query ?? ctx.catalog.tracks[0]?.id);
  if (!track) return failure(ctx.t.unknownTrack(query));
  const profile = await profileOf(ctx, track);
  if (!profile.approved && !flags.yes) return { code: 1, data: { approved: false }, text: [...renderCommands(ctx, profile), ctx.paint.dim(ctx.t.learnApprove(track.id))] };
  profile.approved = true;
  const problems = await proveProfile(ctx, profile);
  profile.lastProblems = problems;
  if (!profile.bundled) await saveProfile(ctx.config, profile);
  if (problems.length > 0) {
    return { code: 1, data: { ok: false, problems }, text: [ctx.paint.red(ctx.t.setupFailed(profile.name)), ...problems.map((problem) => `  ${problem}`), ctx.paint.dim(ctx.t.learnAgain(track.id))] };
  }
  return { data: { ok: true }, text: [ctx.paint.green(ctx.t.setupDone(profile.name)), ctx.paint.dim(ctx.t.learnReady(track.id))] };
}

// an exercise from another franchise keeps the lines of its own coach
function needsMoments(ctx, exercise) {
  if (!ctx.persona || !lacksMoments(exercise, ctx.persona.id)) return false;
  return !exercise.franchise || exercise.franchise === franchiseOf(ctx.persona);
}

function listed(ctx, heading, exercises) {
  if (exercises.length === 0) return [];
  return [ctx.paint.green(heading), ...exercises.map((exercise) => `  ${exercise.id}  ${exercise.title}`)];
}

async function forgeLessons(ctx, query) {
  const inTrack = ctx.catalog.exercises.filter((exercise) => !query || exercise.track === query);
  const missing = inTrack.filter((exercise) => !existsSync(exerciseFiles(exercise).lesson));
  for (const exercise of missing) await writeMissingLesson(ctx, exercise);
  const voiced = [];
  for (const exercise of inTrack.filter((exercise) => needsMoments(ctx, exercise))) {
    if (await writeMissingMoments(ctx, exercise)) voiced.push(exercise);
  }
  const lines = [...listed(ctx, ctx.t.lessonsWritten(missing.length), missing), ...listed(ctx, ctx.t.momentsWritten(ctx.coach, voiced.length), voiced)];
  const text = lines.length === 0 ? [ctx.t.lessonsComplete] : lines;
  return { data: { lessons: missing.map((exercise) => exercise.id), moments: voiced.map((exercise) => exercise.id) }, text };
}

/**
 * `btb forge [track] [--count=n]`: has Claude forge exercises ahead of time for the current level, so next opens instantly.
 * --lessons writes the lesson of every exercise forged before lessons existed, and the coach's
 * lines for every exercise of her franchise that has none from her yet.
 */
export async function forge(ctx, [query], flags) {
  if (query && !trackOf(ctx, query)) return failure(ctx.t.unknownTrack(query));
  if (flags.lessons) return forgeLessons(ctx, query);
  const lock = query ? lockOf(ctx, trackOf(ctx, query)) : null;
  if (lock) return failure(ctx.t.trackLocked(trackOf(ctx, query).title, lock));
  const tracks = query ? [trackOf(ctx, query)] : ctx.catalog.tracks.filter((track) => track.path && !lockOf(ctx, track));
  const count = Number(flags.count) || ctx.config.forgeBatch;
  const forged = [];
  for (const track of tracks) {
    if (!track.path || track.path.redrawPending) await drawPath(ctx, track);
    const level = levelNow(ctx, track);
    if (level) forged.push(...(await forgeExercises(ctx, { track, purpose: "practice", level, count })));
  }
  const text = forged.length === 0 ? [ctx.t.forgeEmpty(ctx.coach)] : [ctx.paint.green(ctx.t.forged(forged.length)), ...forged.map((exercise) => `  ${exercise.id}  ${exercise.title}`)];
  return { data: { forged: forged.map((exercise) => exercise.id) }, text };
}
