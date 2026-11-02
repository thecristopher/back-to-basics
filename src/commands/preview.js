import { existsSync } from "node:fs";
import { previewInWorkspace, servePreview } from "../lib/preview.js";
import { ensureRuntime } from "../lib/profiles.js";
import { solutionPath } from "../lib/workspace.js";
import { failure, profileOf, targetExercise, trackOf } from "./shared.js";

/**
 * `btb preview [id]`: shows the component you are building in the browser and reloads it on every save.
 * Only for languages that render something, React. --again has Claude write the preview again,
 * --port picks the port and --no-open leaves the browser alone. Runs until stopped.
 */
export async function preview(ctx, [query], flags) {
  const target = targetExercise(ctx, query);
  if (target.error) return failure(target.error);
  const { exercise } = target;
  const track = trackOf(ctx, exercise.track);
  const profile = await profileOf(ctx, track);
  if (!profile.previewFile) return failure(ctx.t.noPreview(track.title));
  if (!existsSync(solutionPath(ctx.config, exercise))) return failure(ctx.t.notStarted(exercise.slug));
  const previewFile = await previewInWorkspace(ctx, exercise, Boolean(flags.again));
  const runtime = await ensureRuntime(ctx.config, profile, ctx.onInstall);
  const port = Number(flags.port) || undefined;
  const url = await servePreview(ctx, { exercise, previewFile, runtime, port, open: !flags["no-open"] });
  return { data: { id: exercise.id, url }, text: [] };
}
