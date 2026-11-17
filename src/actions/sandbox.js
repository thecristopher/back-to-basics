import { createHash } from "node:crypto";
import { expandCommand } from "./command.js";

/** Where the runtime lives inside the container, and where each run's files are mounted. */
export const RUNTIME = "/runtime";
export const RUN_DIR = "/runtime/runs/run";
/** btb's own source, read only, so the Node reporter can import what it needs. */
export const BTB_DIR = "/btb";

/**
 * Whether a run goes into a container: "auto" only when Podman answers, "podman" always.
 * A profile without a sandbox image always runs on this machine.
 * @param {"off" | "auto" | "podman"} mode
 * @param {{ sandbox?: { image?: string } }} profile
 * @param {boolean} podmanReady
 * @returns {"container" | "host" | "unavailable"} unavailable when "podman" was asked for and cannot be used
 */
export function sandboxChoice(mode, profile, podmanReady) {
  if (mode === "off" || !profile.sandbox?.image) return mode === "podman" ? "unavailable" : "host";
  if (podmanReady) return "container";
  return mode === "podman" ? "unavailable" : "host";
}

/**
 * The runtime files a profile writes, as file name and content, sorted so the image tag is stable.
 * @param {Record<string, string>} files content already read
 * @returns {[string, string][]}
 */
function sortedFiles(files) {
  return Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
}

/**
 * The image tag of a profile's sandbox: it changes whenever its base, files or setup change.
 * @param {{ id: string, sandbox: { image: string }, runtime?: { setup?: string[][] } }} profile
 * @param {Record<string, string>} files the runtime files with their content
 * @returns {string}
 */
export function imageTag(profile, files) {
  const recipe = JSON.stringify([profile.sandbox.image, sortedFiles(files), profile.runtime?.setup ?? []]);
  const hash = createHash("sha256").update(recipe).digest("hex").slice(0, 12);
  return `localhost/btb-${profile.id}:${hash}`;
}

/**
 * The Containerfile that bakes a profile's runtime into its image, setup steps run at build time
 * with the network they need. The tests themselves later run without it.
 * @param {{ sandbox: { image: string }, runtime?: { setup?: string[][] } }} profile
 * @param {string[]} fileNames runtime files copied from the build context
 * @returns {string}
 */
export function containerfile(profile, fileNames) {
  const copies = fileNames.map((name) => `COPY ${JSON.stringify([name, `${RUNTIME}/${name}`])}`);
  const steps = (profile.runtime?.setup ?? []).map((step) => `RUN ${JSON.stringify(expandCommand(step, { node: "node" }))}`);
  return [`FROM ${profile.sandbox.image}`, `WORKDIR ${RUNTIME}`, ...copies, ...steps, `RUN ["mkdir", "-p", "${RUN_DIR}"]`, ""].join("\n");
}

/**
 * The placeholders of a profile's test command as the container sees them.
 * @param {{ solutionFile: string, testFile: string }} files
 * @param {boolean} hasRuntime
 * @returns {Record<string, string>}
 */
export function containerVars(files, hasRuntime) {
  const test = `${RUN_DIR}/${files.testFile}`;
  return {
    node: "node",
    reporter: `file://${BTB_DIR}/src/lib/reporter.js`,
    test,
    testRel: `runs/run/${files.testFile}`,
    solution: `${RUN_DIR}/${files.solutionFile}`,
    dir: RUN_DIR,
    runtime: hasRuntime ? RUNTIME : RUN_DIR,
    report: `${RUN_DIR}/report.json`,
  };
}

/**
 * The podman command that runs one test inside the profile's image: no network, no capabilities,
 * bounded memory and processes, and gone as soon as it ends.
 * @param {{ name: string, image: string, runDir: string, root: string, timeoutMs: number, hasRuntime: boolean, command: string[] }} run
 * @returns {string[]}
 */
export function podmanRunArgs({ name, image, runDir, root, timeoutMs, hasRuntime, command }) {
  return [
    "podman",
    "run",
    "--rm",
    `--name=${name}`,
    "--network=none",
    "--cap-drop=all",
    "--security-opt=no-new-privileges",
    "--memory=1g",
    "--pids-limit=512",
    `--timeout=${Math.ceil(timeoutMs / 1000)}`,
    `--volume=${runDir}:${RUN_DIR}`,
    `--volume=${root}/src:${BTB_DIR}/src:ro`,
    `--volume=${root}/package.json:${BTB_DIR}/package.json:ro`,
    `--workdir=${hasRuntime ? RUNTIME : RUN_DIR}`,
    image,
    ...command,
  ];
}
