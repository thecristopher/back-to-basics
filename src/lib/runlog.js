import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * The append only log of every test run, practice runs included.
 * @param {{ dataDir: string }} config
 * @returns {string}
 */
export function runLogFile(config) {
  return join(config.dataDir, "log", "runs.jsonl");
}

/**
 * Appends one run to the log. A run never fails because the log could not be written.
 * @param {{ dataDir: string }} config
 * @param {object} entry
 */
export async function appendRun(config, entry) {
  const file = runLogFile(config);
  try {
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, `${JSON.stringify(entry)}\n`);
  } catch {
    // the log is evidence for Claude, losing one line is better than losing the round
  }
}

function parseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * Every run logged so far, oldest first. Lines that do not parse are skipped.
 * @param {{ dataDir: string }} config
 * @returns {Promise<object[]>}
 */
export async function readRuns(config) {
  try {
    const text = await readFile(runLogFile(config), "utf8");
    return text.split("\n").filter(Boolean).map(parseLine).filter(Boolean);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
