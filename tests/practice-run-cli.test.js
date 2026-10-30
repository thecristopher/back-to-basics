import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const BIN = new URL("../bin/btb.js", import.meta.url).pathname;
const FAKE_CLAUDE = new URL("./fixtures/fake-claude.js", import.meta.url).pathname;
let sandbox;
let env;

async function btb(args) {
  try {
    const { stdout } = await run(process.execPath, [BIN, ...args, "--json"], { env });
    return JSON.parse(stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), "btb-practice-run-"));
  const config = {
    tracks: ["node"],
    workspace: join(sandbox, "workspace"),
    dataDir: join(sandbox, "data"),
    placementSize: 2,
    goals: [],
    claude: { command: [process.execPath, FAKE_CLAUDE] },
  };
  await writeFile(join(sandbox, "config.json"), JSON.stringify(config));
  env = { ...process.env, BTB_CONFIG: join(sandbox, "config.json"), FAKE_CLAUDE_STATE: join(sandbox, "fake-counter") };
  delete env.NODE_TEST_CONTEXT;
});

after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

let opened;

test("Claire's opened exercise carries its clock and the hints left", async () => {
  opened = await btb(["next"]);
  assert.equal(typeof opened.startedAt, "number");
  assert.equal(opened.hintsLeft, 0, "no hints during placement");
  assert.equal(opened.onsite, false, "a placement probe is never an onsite fight");
});

test("a practice run on the starter fails without counting an attempt", async () => {
  const trial = await btb(["test"]);
  assert.equal(trial.ok, false);
  assert.equal(trial.practice, true);
  const submitted = await btb(["submit"]);
  assert.equal(submitted.attempt, 1, "the practice run left the attempts untouched");
});

test("a practice run on Malenia's solution passes and records nothing", async () => {
  await copyFile(join(sandbox, "data/exercises", opened.id, "reference.js"), opened.path);
  const trial = await btb(["test"]);
  assert.equal(trial.ok, true);
  assert.equal(trial.practice, true);
  assert.equal((await btb(["next"])).id, opened.id, "the exercise is still the one being fought");
});
