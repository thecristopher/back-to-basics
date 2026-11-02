#!/usr/bin/env node
// Writes contracts/samples/*.json from a real run of btb in a throwaway sandbox, with the fake Claude
// the tests use. The editors' specs read these samples, so btb's --json and its consumers meet in one place.
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = new URL("..", import.meta.url).pathname;
const BIN = join(ROOT, "bin/btb.js");
const FAKE_CLAUDE = join(ROOT, "tests/fixtures/fake-claude.js");

/**
 * Runs btb in the sandbox and returns its JSON, failed commands included.
 * @param {Record<string, string>} env
 * @param {string[]} args
 * @returns {Promise<object>}
 */
async function btb(env, args) {
  try {
    return JSON.parse((await run(process.execPath, [BIN, ...args, "--json"], { env })).stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

/**
 * Plays one short day in a sandbox and keeps each answer an editor reads.
 * @returns {Promise<Record<string, object>>} samples by contract name
 */
export async function playSampleDay() {
  const sandbox = await mkdtemp(join(tmpdir(), "btb-contracts-"));
  try {
    const config = {
      tracks: ["node"],
      workspace: join(sandbox, "workspace"),
      dataDir: join(sandbox, "data"),
      placementSize: 1,
      forgeRetries: 1,
      claude: { command: [process.execPath, FAKE_CLAUDE] },
    };
    await writeFile(join(sandbox, "config.json"), JSON.stringify(config));
    const env = { ...process.env, BTB_CONFIG: join(sandbox, "config.json"), FAKE_CLAUDE_STATE: join(sandbox, "counter") };
    delete env.NODE_TEST_CONTEXT;
    await btb(env, ["placement", "node"]);
    await btb(env, ["skip"]);
    const open = await btb(env, ["next"]);
    const failed = await btb(env, ["submit", "--active=40", "--edits=5"]);
    const hint = await btb(env, ["hint"]);
    await copyFile(join(sandbox, "data/exercises", open.id, "reference.js"), open.path);
    const passed = await btb(env, ["submit", "--active=60", "--edits=4"]);
    return { open, "submit-failed": failed, hint, "submit-passed": passed, today: await btb(env, ["today"]), status: await btb(env, ["status"]) };
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}

// paths of the sandbox would change on every run and mean nothing to a reader
function scrubbed(value) {
  return JSON.parse(JSON.stringify(value).replace(/\/[^"]*btb-contracts-[^/"]+/g, "/sandbox"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const samples = await playSampleDay();
  for (const [name, sample] of Object.entries(samples)) {
    await writeFile(join(ROOT, "contracts/samples", `${name}.json`), `${JSON.stringify(scrubbed(sample), null, 2)}\n`);
  }
  console.log(`wrote ${Object.keys(samples).length} samples to contracts/samples`);
}
