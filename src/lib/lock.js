import { stat, rm, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const POLL_MS = 500;

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

// a lock left by a process that died is older than any run could take
async function isStale(file, timeoutMs) {
  try {
    return Date.now() - (await stat(file)).mtimeMs > timeoutMs;
  } catch {
    return true;
  }
}

async function claim(file) {
  try {
    await writeFile(file, String(process.pid), { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}

async function waitFor(ready, file, timeoutMs) {
  while (!(await isStale(file, timeoutMs))) {
    const value = await ready();
    if (value) return value;
    await sleep(POLL_MS);
  }
  return ready();
}

/**
 * Runs work in one process only: the others wait for what it leaves behind, so several btb runs
 * started at once never ask Claude for the same thing twice.
 * @template T
 * @param {string} file the lock file
 * @param {() => Promise<T>} work
 * @param {() => Promise<T | null>} ready what the work leaves behind, null until it is there
 * @param {number} timeoutMs how long the work may take before its lock counts as abandoned
 * @returns {Promise<T | null>}
 */
export async function onlyOnce(file, work, ready, timeoutMs) {
  await mkdir(dirname(file), { recursive: true });
  if (!(await claim(file))) {
    const value = await waitFor(ready, file, timeoutMs);
    if (value || !(await isStale(file, timeoutMs))) return value;
    await rm(file, { force: true });
    if (!(await claim(file))) return waitFor(ready, file, timeoutMs);
  }
  try {
    return await work();
  } finally {
    await rm(file, { force: true });
  }
}
