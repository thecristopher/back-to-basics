import { doneLevels } from "./levels.js";

/**
 * What a track still waits for, from the "after" in its seed: { track, share } opens it once
 * that share of the other track's path is done, so llm waits for half of python for example.
 * A track that already has its path stays open, a longer redraw of the other one never closes it again.
 * @param {{ after?: { track: string, share?: number }, path?: object | null }} track
 * @param {{ id: string, title: string, path?: object | null } | undefined} required the track it waits for, undefined when it is not active
 * @param {{ done: boolean }[]} requiredProgress levelProgress of the required track
 * @returns {{ track: string, title: string, done: number, needed: number | null } | null} null when the track is open,
 *   needed is null while the required track has no path yet
 */
export function waitingFor(track, required, requiredProgress) {
  if (!track.after || track.path || !required) return null;
  const { title } = required;
  if (!required.path) return { track: required.id, title, done: 0, needed: null };
  const share = track.after.share ?? 1;
  const needed = Math.ceil(required.path.levels.length * share);
  const done = doneLevels(requiredProgress);
  return done >= needed ? null : { track: required.id, title, done, needed };
}
