import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, relative } from "node:path";
import { expandCommand } from "../actions/command.js";
import { summarize } from "../actions/report.js";
import { typeScriptFlags } from "../actions/runtime.js";
import { containerVars, podmanRunArgs } from "../actions/sandbox.js";
import { runCommand } from "./exec.js";
import { ensureRuntime } from "./profiles.js";
import { containerRunDir, ensureImage, placeOf, removeContainer } from "./sandbox.js";

const REPORTER = new URL("./reporter.js", import.meta.url).href;

function childEnv() {
  const env = { ...process.env };
  // set when btb itself runs under node --test, it would make the child talk to our runner instead of printing
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function withTypeScript(command, testFile) {
  if (command[0] !== process.execPath || !testFile.endsWith(".ts")) return command;
  const flags = typeScriptFlags(process.versions.node);
  return flags === null ? null : [command[0], ...flags, ...command.slice(1)];
}

async function readIfExists(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function prepareRun(config, profile, onInstall) {
  const runtime = await ensureRuntime(config, profile, onInstall);
  const base = join(runtime ?? config.dataDir, "runs");
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(join(base, "run-"));
  return { dir, cwd: runtime ?? dir, runtime };
}

function notRun(flag) {
  return { ...summarize("exit-code", { code: 1, stdout: "", stderr: "", timedOut: false }), [flag]: true };
}

const UNAVAILABLE = 'sandbox is "podman" but Podman is not answering or this language has no sandbox image. Start it with podman machine start, or set sandbox to "auto".';

/**
 * Runs tests against a solution with the language profile, in a fresh folder holding just those two files.
 * With a sandbox they run in a Podman container with no network, otherwise on this machine.
 * The whole process tree dies at the timeout, so an infinite loop cannot hang btb.
 * @param {{ config: object, profile: object, files: { solutionFile: string, testFile: string }, solutionCode: string, testCode: string, onInstall?: (name: string, dir: string) => void }} input
 * @returns {Promise<ReturnType<typeof summarize> & { unsupported?: boolean, unapproved?: boolean }>}
 * @throws {Error} when sandbox is "podman" and Podman cannot run it
 */
export async function runTests(input) {
  if (!input.profile.approved) return notRun("unapproved");
  const place = await placeOf(input.config, input.profile);
  if (place === "unavailable") throw new Error(UNAVAILABLE);
  return place === "container" ? runInContainer(input) : runOnHost(input);
}

async function runOnHost({ config, profile, files, solutionCode, testCode, onInstall = () => {} }) {
  const { dir, cwd, runtime } = await prepareRun(config, profile, onInstall);
  const test = join(dir, files.testFile);
  const vars = { node: process.execPath, reporter: REPORTER, test, testRel: relative(cwd, test), solution: join(dir, files.solutionFile), dir, runtime: runtime ?? dir, report: join(dir, "report.json") };
  try {
    await writeFile(vars.solution, solutionCode);
    await writeFile(test, testCode);
    const command = withTypeScript(expandCommand(profile.test, vars), files.testFile);
    if (!command) return notRun("unsupported");
    const run = await runCommand(command, { cwd, env: childEnv(), timeoutMs: config.testTimeoutMs });
    return summarize(profile.report, { ...run, report: await readIfExists(vars.report) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// starting the container is not the solution's time, it gets this much on top of the test timeout
const STARTUP_MS = 3000;

// the container sees the run folder at a fixed path inside its runtime, and Node there strips types on its own
async function runInContainer({ config, profile, files, solutionCode, testCode, onInstall = () => {} }) {
  const image = await ensureImage(config, profile, onInstall);
  const runDir = await containerRunDir(config);
  const hasRuntime = Boolean(profile.runtime);
  const name = `btb-run-${randomUUID().slice(0, 8)}`;
  try {
    await writeFile(join(runDir, files.solutionFile), solutionCode);
    await writeFile(join(runDir, files.testFile), testCode);
    const command = expandCommand(profile.test, containerVars(files, hasRuntime));
    const timeoutMs = config.testTimeoutMs + STARTUP_MS;
    const args = podmanRunArgs({ name, image, runDir, root: config.root, timeoutMs, hasRuntime, command });
    const started = Date.now();
    // the client gets a little longer than the container, so the container's own timeout ends it first
    const run = await runCommand(args, { env: process.env, timeoutMs: timeoutMs + 5000 });
    if (run.timedOut) await removeContainer(name);
    // Podman stops a container at its timeout on its own, the client only sees it exit
    const timedOut = run.timedOut || Date.now() - started >= timeoutMs;
    return summarize(profile.report, { ...run, timedOut, report: await readIfExists(join(runDir, "report.json")) });
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
}
