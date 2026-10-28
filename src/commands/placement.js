import { placementEvidence, placementStatus } from "../actions/placement.js";
import { drawPath } from "../lib/architect.js";
import { forgeExercises } from "../lib/forge.js";
import { failure, isPlacementRunning, lockOf, openExercise, trackOf } from "./shared.js";

function statusOf(ctx) {
  const { queue, results, size } = ctx.state.placement;
  return placementStatus(queue, results, ctx.catalog.byId, size ?? queue.length);
}

// one probe at a time, harder than the last one answered, so Claude only forges what will be fought
async function forgeProbe(ctx, track, difficulty) {
  const size = ctx.state.placement.size;
  const [probe] = await forgeExercises(ctx, { track, purpose: "placement", count: 1, difficulty, size });
  if (!probe) return null;
  ctx.state.placement.queue.push(probe.id);
  return probe.id;
}

/**
 * Lines describing a freshly drawn path: where it starts and why.
 * @param {object} ctx
 * @param {object} track
 * @returns {string[]}
 */
export function renderStart(ctx, track) {
  if (!track.path) return [ctx.paint.yellow(ctx.t.pathMissing(track.id))];
  const start = track.path.levels.find((level) => level.level === track.path.startLevel);
  return [
    ctx.paint.bold(ctx.t.startsAt(track.title, start.level, start.title)),
    ctx.paint.dim(track.path.rationale),
    ctx.paint.dim(ctx.t.seePath(track.id)),
  ];
}

async function finish(ctx, track) {
  const { queue, results } = ctx.state.placement;
  ctx.state.placement.status = "done";
  try {
    await drawPath(ctx, track, { placement: placementEvidence(queue, results, ctx.catalog.byId) });
  } catch (error) {
    ctx.log(ctx.paint.red(error.message));
  }
}

/**
 * Opens the next placement probe, or closes the test and draws the path when none is left.
 * @param {object} ctx
 * @returns {Promise<{ data: object, text: string[] }>}
 */
export async function nextPlacement(ctx) {
  const track = trackOf(ctx, ctx.state.placement.track);
  const status = statusOf(ctx);
  if (status.forgeDifficulty) {
    status.next = await forgeProbe(ctx, track, status.forgeDifficulty);
    if (!status.next) return failure(ctx.t.forgeEmpty);
  }
  if (!status.next) {
    await finish(ctx, track);
    return { data: { placement: "done", track: track.id, path: track.path }, text: [ctx.paint.green(ctx.t.placementDone), ...renderStart(ctx, track)] };
  }
  const answered = Object.keys(ctx.state.placement.results).length;
  const report = await openExercise(ctx, ctx.catalog.byId[status.next]);
  report.text.unshift(ctx.paint.dim(ctx.t.placementProgress(answered, status.remaining)));
  return report;
}

/**
 * Stores a placement answer. The last one closes the test and has Claude draw the path.
 * @param {object} ctx
 * @param {string} id
 * @param {"clean" | "struggled" | "skipped"} outcome
 * @returns {Promise<{ finished: boolean, remaining: number, track: string } | null>} null when it was not a pending probe
 */
export async function notePlacementResult(ctx, id, outcome) {
  const placement = ctx.state.placement;
  if (!isPlacementRunning(ctx.state) || !placement.queue.includes(id) || placement.results[id]) return null;
  placement.results[id] = outcome;
  const status = statusOf(ctx);
  if (status.finished) await finish(ctx, trackOf(ctx, placement.track));
  return { finished: status.finished, remaining: status.remaining, track: placement.track };
}

/**
 * Lines to append to a submit or skip that answered a placement probe.
 * @param {object} ctx
 * @param {{ finished: boolean, remaining: number, track: string } | null} result
 * @returns {string[]}
 */
export function renderPlacementNote(ctx, result) {
  if (!result) return [];
  if (!result.finished) return [ctx.paint.dim(ctx.t.placementLeft(result.remaining))];
  return [ctx.paint.green(ctx.t.placementDone), ...renderStart(ctx, trackOf(ctx, result.track))];
}

function pickTrack(ctx, query) {
  if (query) return trackOf(ctx, query);
  if (isPlacementRunning(ctx.state)) return trackOf(ctx, ctx.state.placement.track);
  return ctx.catalog.tracks.find((track) => !track.path && !lockOf(ctx, track)) ?? ctx.catalog.tracks[0];
}

function begin(ctx, track) {
  ctx.state.placement = { status: "running", track: track.id, size: ctx.config.placementSize, queue: [], results: {} };
}

/**
 * `btb placement [track]`: Claude forges probes of rising difficulty, then draws the path from how they went.
 * Picks up a test left halfway. --restart takes it again.
 */
export async function placement(ctx, [query], flags) {
  const track = pickTrack(ctx, query);
  if (!track) return failure(ctx.t.unknownTrack(query));
  const lock = lockOf(ctx, track);
  if (lock) return failure(ctx.t.trackLocked(track.title, lock));
  const running = isPlacementRunning(ctx.state);
  if (running && ctx.state.placement.track !== track.id && !flags.restart) return failure(ctx.t.placementBusy(ctx.state.placement.track));
  const fresh = flags.restart || !running;
  if (fresh) begin(ctx, track);
  const report = await nextPlacement(ctx);
  if (fresh && !report.data.error) report.text.unshift(ctx.t.placementIntro(track.title), "");
  return report;
}
