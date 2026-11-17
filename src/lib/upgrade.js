import { existsSync } from "node:fs";
import { cp, mkdir, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
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

// a different disk cannot take a rename, the folder is copied and the original removed instead
async function move(from, to) {
  await mkdir(dirname(to), { recursive: true });
  try {
    await rename(from, to);
  } catch (error) {
    if (error.code !== "EXDEV") throw error;
    await cp(from, to, { recursive: true });
    await rm(from, { recursive: true, force: true });
  }
}

async function adoptOne(from, to) {
  if (!from || !existsSync(from) || existsSync(to)) return false;
  try {
    await move(from, to);
    return true;
  } catch (error) {
    // another btb started at the same time already moved it
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

/**
 * Moves the progress and solutions that lived inside the repo to btb's home, once. Installed
 * runtimes stay behind: a Python venv keeps absolute paths and breaks when moved, so it is
 * installed again the next time it is needed.
 * @param {{ dataDir: string, workspaceDir: string, legacy?: { dataDir: string | null, workspaceDir: string | null } }} config
 * @returns {Promise<string[]>} the folders that moved
 */
export async function adoptRepoData(config) {
  const moved = [];
  if (await adoptOne(config.legacy?.dataDir, config.dataDir)) {
    await rm(join(config.dataDir, "runtimes"), { recursive: true, force: true });
    moved.push(config.dataDir);
  }
  if (await adoptOne(config.legacy?.workspaceDir, config.workspaceDir)) moved.push(config.workspaceDir);
  return moved;
}
