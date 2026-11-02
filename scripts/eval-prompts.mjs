#!/usr/bin/env node
// Prompt evals: each scenario seeds a learner in a throwaway sandbox, lets btb forge what that learner
// needs next with the real Claude, and grades the result with deterministic checks. Run it before and
// after touching a prompt to see what the change improved or broke.
//   node scripts/eval-prompts.mjs [--only=name] [--out=file]
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { checkRates, gradeExercise } from "../src/actions/evals.js";
import { toDay } from "../src/utils/dates.js";

const run = promisify(execFile);
const ROOT = new URL("..", import.meta.url).pathname;
const BIN = join(ROOT, "bin/btb.js");
const PROXY = join(ROOT, "scripts/eval-claude-proxy.mjs");
const OWNED = { clean: 2, struggled: 0, skipped: 0, cleanDays: ["2026-10-01", "2026-10-02"], last: "clean", lastAt: "2026-10-02", ownedAt: "2026-10-02", step: 0, dueAt: "2099-01-01" };
// btb keys its days in local time, a concept due today must be due in that calendar
const TODAY = toDay();

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

// every concept of the levels before the scenario's one is owned, the scenario then marks the ones it is about
function masteryOf(seed, scenario) {
  const concepts = {};
  for (const level of seed.levels.slice(0, scenario.level - 1)) for (const concept of level.concepts) concepts[concept.id] = { ...OWNED };
  const recent = [];
  if (scenario.learning) concepts[scenario.learning] = { ...OWNED, cleanDays: ["2026-10-02"], ownedAt: undefined, dueAt: TODAY, step: -1 };
  if (scenario.weak) {
    concepts[scenario.weak.concept] = { clean: 0, struggled: 1, skipped: 0, cleanDays: [], last: "struggled", lastAt: "2026-10-02", step: -1, dueAt: TODAY };
    recent.push({ title: "Una pelea anterior", level: scenario.level, concepts: [scenario.weak.concept], outcome: "struggled", mistakes: [scenario.weak.mistake] });
  }
  if (scenario.review) concepts[scenario.review] = { ...OWNED, dueAt: TODAY };
  return { [scenario.track]: { concepts, recent } };
}

async function seedSandbox(sandbox, scenario, options) {
  const seed = await readJson(join(ROOT, "tracks", `${scenario.track}.json`));
  const data = join(sandbox, "data");
  await mkdir(join(data, "tracks"), { recursive: true });
  const path = { rationale: "Eval.", startLevel: 1, revision: 1, drawnAt: TODAY };
  await writeFile(join(data, "tracks", `${scenario.track}.json`), JSON.stringify({ id: scenario.track, path }));
  await writeFile(join(data, "state.json"), JSON.stringify({ version: 3, mastery: masteryOf(seed, scenario) }));
  if (options.runtimes && existsSync(options.runtimes)) await symlink(options.runtimes, join(data, "runtimes"));
  const config = {
    language: "es",
    tracks: [scenario.track],
    fromBasics: Boolean(scenario.fromBasics),
    forgeRetries: 2,
    workspace: join(sandbox, "workspace"),
    dataDir: data,
    claude: { command: [process.execPath, PROXY, ...options.claude], timeoutMs: 600000 },
  };
  await writeFile(join(sandbox, "config.json"), JSON.stringify(config));
  return { seed, data };
}

async function btb(env, args) {
  try {
    return JSON.parse((await run(process.execPath, [BIN, ...args, "--json"], { env, maxBuffer: 16 * 1024 * 1024 })).stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

async function readExercise(data, id) {
  const folder = join(data, "exercises", id);
  const meta = await readJson(join(folder, "exercise.json"));
  const read = (name) => readFile(join(folder, name), "utf8");
  const ext = meta.files.solution.slice(meta.files.solution.lastIndexOf("."));
  const mutants = existsSync(join(folder, "mutants.json")) ? await readJson(join(folder, "mutants.json")) : null;
  return { meta, readme: await read("README.md"), test: await read(meta.files.test), reference: await read(`reference${ext}`), mutants };
}

// each line of the proxy's log is one prompt, the fix ones carry the problems that sent the draft back
async function fixesOf(log) {
  if (!existsSync(log)) return [];
  const entries = (await readFile(log, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
  return entries.filter((entry) => entry.task === "fix").map((entry) => entry.problems);
}

// a review comes from the day's queue, anything else straight from the forge
async function forgeFor(env, scenario) {
  const answer = scenario.review ? await btb(env, ["next"]) : await btb(env, ["forge", scenario.track, "--count=1"]);
  const id = (scenario.review ? answer.id : answer.forged?.[0]) ?? null;
  return { id, error: answer.error ?? null };
}

/**
 * Plays one scenario and grades what came out.
 * @param {object} scenario see evals/scenarios.json
 * @param {{ claude: string[], runtimes?: string, env?: Record<string, string> }} options claude is the real command
 * @returns {Promise<{ name: string, id: string | null, error: string | null, ok: boolean, fixRounds: number, fixes: string[][], seconds: number, checks: Record<string, boolean> }>}
 *   fixes holds the problems validation found each time the draft went back to Claude, error what btb said when it failed
 */
export async function playScenario(scenario, options) {
  const sandbox = await mkdtemp(join(tmpdir(), "btb-eval-"));
  const started = Date.now();
  try {
    const { seed, data } = await seedSandbox(sandbox, scenario, options);
    const log = join(sandbox, "claude.log");
    const env = { ...process.env, ...options.env, BTB_CONFIG: join(sandbox, "config.json"), BTB_EVAL_LOG: log };
    delete env.NODE_TEST_CONTEXT;
    const { id, error } = await forgeFor(env, scenario);
    const fixes = await fixesOf(log);
    const fixRounds = fixes.length;
    const interview = scenario.level > seed.levels.length - 2;
    const exercise = id ? await readExercise(data, id) : null;
    const grade = gradeExercise(exercise, { ...scenario, interview }, fixRounds);
    return { name: scenario.name, id, error, fixRounds, fixes, seconds: Math.round((Date.now() - started) / 1000), ...grade };
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}

/**
 * Plays every scenario, one at a time so the learner's sandboxes never share a Claude session.
 * @param {object[]} scenarios
 * @param {{ claude: string[], runtimes?: string, env?: Record<string, string>, onResult?: (result: object) => void }} options
 * @returns {Promise<{ at: string, results: object[], rates: Record<string, { passed: number, total: number }>, passed: number, total: number }>}
 */
export async function runEvals(scenarios, options) {
  const results = [];
  for (const scenario of scenarios) {
    const result = await playScenario(scenario, options);
    options.onResult?.(result);
    results.push(result);
  }
  return { at: new Date().toISOString(), results, rates: checkRates(results), passed: results.filter((result) => result.ok).length, total: results.length };
}

function flagOf(name) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
}

async function main() {
  const all = await readJson(join(ROOT, "evals/scenarios.json"));
  const only = flagOf("only");
  const scenarios = only ? all.filter((scenario) => scenario.name === only) : all;
  const config = existsSync(join(ROOT, "btb.config.json")) ? await readJson(join(ROOT, "btb.config.json")) : {};
  const claude = config.claude?.command ?? ["claude", "-p"];
  const report = await runEvals(scenarios, {
    claude,
    runtimes: join(ROOT, ".btb/runtimes"),
    onResult: (result) => {
      const failed = Object.entries(result.checks).filter(([, held]) => !held).map(([name]) => name);
      console.log(`${result.ok ? "✓" : "✗"} ${result.name}  ${result.seconds}s  fixes ${result.fixRounds}${failed.length ? `  failed: ${failed.join(", ")}` : ""}`);
      if (result.error) console.log(`    error: ${result.error.slice(0, 300)}`);
      result.fixes.forEach((problems, round) => problems.forEach((problem) => console.log(`    fix ${round + 1}: ${problem.slice(0, 300)}`)));
    },
  });
  const out = flagOf("out") ?? join(ROOT, ".btb/evals", `report-${report.at.replace(/[:.]/g, "-")}.json`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${report.passed}/${report.total} scenarios held every check. Report: ${out}`);
  for (const [name, rate] of Object.entries(report.rates)) console.log(`  ${rate.passed}/${rate.total}  ${name}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
