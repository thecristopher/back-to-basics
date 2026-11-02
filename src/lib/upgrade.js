import { existsSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { readJsonIfExists } from "./files.js";

/** The progress model this version of btb reads. */
export const STATE_VERSION = 3;

// what belongs to the old model; runtimes and summoned personas carry over as they are
const OLD_MODEL = ["state.json", "exercises", "tracks", "days", "briefs", "log"];

function stamp(now) {
  return now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/**
 * Moves the progress of an older model out of the way, so the new one starts clean without losing anything.
 * Exercises forged before concepts had ids cannot feed the new mastery, so they go along with the state.
 * @param {{ dataDir: string, statePath: string, workspaceDir: string }} config
 * @param {Date} [now]
 * @returns {Promise<string | null>} the archive folder, null when there was nothing old to move
 */
export async function archiveOldModel(config, now = new Date()) {
  const state = await readJsonIfExists(config.statePath);
  if (!state || (state.version ?? 0) >= STATE_VERSION) return null;
  const archive = join(config.dataDir, "archive", `v${state.version ?? 0}-${stamp(now)}`);
  await mkdir(archive, { recursive: true });
  for (const name of OLD_MODEL) {
    const from = join(config.dataDir, name);
    if (existsSync(from)) await rename(from, join(archive, name));
  }
  if (existsSync(config.workspaceDir)) await rename(config.workspaceDir, join(archive, "workspace"));
  return archive;
}
