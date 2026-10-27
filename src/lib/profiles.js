import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expandCommand } from "../actions/command.js";
import { runCommand } from "./exec.js";
import { readJsonIfExists, writeJson } from "./files.js";

const SETUP_TIMEOUT_MS = 10 * 60 * 1000;

function learnedFile(config, id) {
  return join(config.dataDir, "profiles", `${id}.json`);
}

/**
 * A language profile: how to name, run and read the tests of a language.
 * Bundled ones live in profiles/, learned ones in the data folder and need approval before running.
 * @param {object} config
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function loadProfile(config, id) {
  const bundled = await readJsonIfExists(join(config.profilesDir, `${id}.json`));
  if (bundled) return { ...bundled, approved: true, bundled: true };
  const learned = await readJsonIfExists(learnedFile(config, id));
  if (!learned) throw new Error(`No language profile "${id}". Run btb learn ${id}.`);
  return { ...learned, bundled: false };
}

/**
 * Saves a profile written by Claude.
 * @param {object} config
 * @param {object} profile
 */
export async function saveProfile(config, profile) {
  const { bundled: _bundled, ...stored } = profile;
  await writeJson(learnedFile(config, profile.id), stored);
}

/**
 * File names and import hint for a profile in the configured flavor.
 * @param {object} profile
 * @param {"js" | "ts"} flavor
 * @returns {{ name: string, solutionFile: string, testFile: string, importHint: string }}
 */
export function filesFor(profile, flavor) {
  const base = { name: profile.name, solutionFile: profile.solutionFile, testFile: profile.testFile, importHint: profile.importHint };
  return { ...base, ...profile.variants?.[flavor] };
}

/**
 * Where a profile with a runtime keeps its installed packages.
 * @param {object} config
 * @param {object} profile
 * @returns {string}
 */
export function runtimeDir(config, profile) {
  return join(config.dataDir, "runtimes", profile.id);
}

async function runSteps(steps, cwd) {
  for (const step of steps) {
    const run = await runCommand(expandCommand(step, { node: process.execPath }), { cwd, env: process.env, timeoutMs: SETUP_TIMEOUT_MS });
    if (run.code !== 0) throw new Error(`"${step.join(" ")}" failed:\n${(run.stderr || run.stdout).trim().slice(-1500)}`);
  }
}

/**
 * Installs a profile's runtime the first time it is needed, React's packages for example.
 * @param {object} config
 * @param {object} profile
 * @param {(name: string, dir: string) => void} onInstall told before the first install starts
 * @returns {Promise<string | null>} the runtime folder, null when the profile needs none
 */
export async function ensureRuntime(config, profile, onInstall) {
  if (!profile.runtime) return null;
  const dir = runtimeDir(config, profile);
  if (existsSync(join(dir, profile.runtime.ready))) return dir;
  onInstall(profile.name, dir);
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(profile.runtime.files ?? {})) await writeFile(join(dir, name), content);
  await runSteps(profile.runtime.setup ?? [], dir);
  return dir;
}

/**
 * Runs the profile's check commands to see whether the toolchain is installed.
 * @param {object} profile
 * @returns {Promise<{ ok: boolean, failed?: string }>}
 */
export async function checkToolchain(profile) {
  for (const step of profile.check ?? []) {
    const command = expandCommand(step, { node: process.execPath });
    const run = await runCommand(command, { env: process.env, timeoutMs: 30000 });
    if (run.code !== 0) return { ok: false, failed: command.join(" ") };
  }
  return { ok: true };
}
