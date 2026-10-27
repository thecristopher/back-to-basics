import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Reads a JSON file, null when it does not exist.
 * @param {string} file
 * @returns {Promise<any | null>}
 */
export async function readJsonIfExists(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Could not read ${file}: ${error.message}`);
  }
}

/**
 * Writes JSON through a temp file so a crash never leaves it half written.
 * @param {string} file
 * @param {any} value
 */
export async function writeJson(file, value) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
}

/**
 * Names of the subfolders of a folder, empty when it does not exist.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function listDirs(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Names of the .json files of a folder without the extension, empty when it does not exist.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function listJsonNames(dir) {
  try {
    const entries = await readdir(dir);
    return entries.filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
