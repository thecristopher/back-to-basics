import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { expandCommand } from "../actions/command.js";
import { summarize } from "../actions/report.js";
import { typeScriptFlags } from "../actions/runtime.js";
import { runCommand } from "./exec.js";
import { ensureRuntime } from "./profiles.js";

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

/**
 * Runs tests against a solution with the language profile, in a fresh folder holding just those two files.
 * The whole process tree dies at the timeout, so an infinite loop cannot hang btb.
 * @param {{ config: object, profile: object, files: { solutionFile: string, testFile: string }, solutionCode: string, testCode: string, onInstall?: (name: string, dir: string) => void }} input
 * @returns {Promise<ReturnType<typeof summarize> & { unsupported?: boolean, unapproved?: boolean }>}
 */
export async function runTests({ config, profile, files, solutionCode, testCode, onInstall = () => {} }) {
  if (!profile.approved) return { ...summarize("exit-code", { code: 1, stdout: "", stderr: "", timedOut: false }), unapproved: true };
  const { dir, cwd, runtime } = await prepareRun(config, profile, onInstall);
  const test = join(dir, files.testFile);
  const vars = { node: process.execPath, reporter: REPORTER, test, testRel: relative(cwd, test), solution: join(dir, files.solutionFile), dir, runtime: runtime ?? dir, report: join(dir, "report.json") };
  try {
    await writeFile(vars.solution, solutionCode);
    await writeFile(test, testCode);
    const command = withTypeScript(expandCommand(profile.test, vars), files.testFile);
    if (!command) return { ...summarize("exit-code", { code: 1, stdout: "", stderr: "", timedOut: false }), unsupported: true };
    const run = await runCommand(command, { cwd, env: childEnv(), timeoutMs: config.testTimeoutMs });
    return summarize(profile.report, { ...run, report: await readIfExists(vars.report) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
