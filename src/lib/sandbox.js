import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { containerfile, imageTag, sandboxChoice } from "../actions/sandbox.js";
import { runCommand } from "./exec.js";
import { onlyOnce } from "./lock.js";
import { SETUP_TIMEOUT_MS, runtimeFiles } from "./profiles.js";

const ANSWER_MS = 10000;
let answering = null;

/**
 * Whether Podman answers right now, asked once per btb run. On macOS that means its machine is up.
 * @returns {Promise<boolean>}
 */
export function podmanAnswers() {
  answering ??= runCommand(["podman", "info", "--format", "{{.Host.Arch}}"], { env: process.env, timeoutMs: ANSWER_MS }).then((run) => run.code === 0);
  return answering;
}

/**
 * Where a profile's tests run under the config's sandbox setting.
 * @param {{ sandbox?: "off" | "auto" | "podman" }} config
 * @param {object} profile
 * @returns {Promise<"container" | "host" | "unavailable">}
 */
export async function placeOf(config, profile) {
  // a config built by hand, without loadConfig, never opts into containers by accident
  const mode = config.sandbox ?? "off";
  const ready = mode !== "off" && Boolean(profile.sandbox?.image) && (await podmanAnswers());
  return sandboxChoice(mode, profile, ready);
}

function sandboxDir(config) {
  return join(config.dataDir, "sandbox");
}

async function imageExists(tag) {
  return (await runCommand(["podman", "image", "exists", tag], { env: process.env, timeoutMs: ANSWER_MS })).code === 0;
}

async function build(config, profile, files, tag) {
  const context = join(sandboxDir(config), profile.id);
  await rm(context, { recursive: true, force: true });
  await mkdir(context, { recursive: true });
  for (const [name, content] of Object.entries(files)) await writeFile(join(context, name), content);
  const recipe = join(sandboxDir(config), `${profile.id}.Containerfile`);
  await writeFile(recipe, containerfile(profile, Object.keys(files)));
  const run = await runCommand(["podman", "build", "--tag", tag, "--file", recipe, context], { env: process.env, timeoutMs: SETUP_TIMEOUT_MS });
  if (run.code !== 0) throw new Error(`Podman could not build ${tag}:\n${(run.stderr || run.stdout).trim().slice(-1500)}`);
  return tag;
}

/**
 * The profile's sandbox image, built once with its runtime inside. Several btb runs at once build it only once.
 * @param {object} config
 * @param {object} profile with sandbox.image
 * @param {(name: string, where: string) => void} onInstall told before the first build starts
 * @returns {Promise<string>} the image tag
 */
export async function ensureImage(config, profile, onInstall) {
  const files = await runtimeFiles(config, profile);
  const tag = imageTag(profile, files);
  if (await imageExists(tag)) return tag;
  onInstall(profile.name, tag);
  await mkdir(sandboxDir(config), { recursive: true });
  const lock = join(sandboxDir(config), `${profile.id}.lock`);
  const ready = async () => ((await imageExists(tag)) ? tag : null);
  const built = await onlyOnce(lock, () => build(config, profile, files, tag), ready, SETUP_TIMEOUT_MS);
  if (!built) throw new Error(`Podman did not finish building ${tag}`);
  return built;
}

/**
 * A fresh folder on this machine that one container run mounts as its working files.
 * @param {object} config
 * @returns {Promise<string>}
 */
export async function containerRunDir(config) {
  const base = join(sandboxDir(config), "runs");
  await mkdir(base, { recursive: true });
  return mkdtemp(join(base, "run-"));
}

/**
 * Removes a container that outlived its timeout, killing the podman client does not stop it.
 * @param {string} name
 */
export async function removeContainer(name) {
  await runCommand(["podman", "rm", "--force", name], { env: process.env, timeoutMs: ANSWER_MS });
}
