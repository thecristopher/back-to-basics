import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
  sandbox = await mkdtemp(join(tmpdir(), "btb-pause-"));
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

test("an opened exercise starts with nothing paused", async () => {
  opened = await btb(["next"]);
  assert.equal(opened.pausedMs, 0);
  assert.equal(opened.pausedAt, null);
});

test("pausing the lesson stops the clock of the exercise being fought", async () => {
  const paused = await btb(["pause"]);
  assert.equal(paused.id, opened.id);
  assert.equal(paused.paused, true);
  assert.equal(typeof paused.pausedAt, "number");
});

test("while paused, submit waits for resume", async () => {
  assert.match((await btb(["submit"])).error, /btb resume/);
});

test("pausing twice says it is already paused", async () => {
  assert.match((await btb(["pause"])).error, /btb resume/);
});

test("reopening a paused exercise says since when it is paused", async () => {
  const reopened = await btb(["next"]);
  assert.equal(typeof reopened.pausedAt, "number");
});

test("resuming carries on with the same exercise and keeps the paused time", async () => {
  const resumed = await btb(["resume"]);
  assert.equal(resumed.id, opened.id);
  assert.equal(resumed.paused, false);
  assert.ok(resumed.pausedMs >= 0);
  assert.equal((await btb(["submit"])).attempt, 1, "submit runs again once resumed");
});

test("resuming with nothing paused is refused", async () => {
  assert.match((await btb(["resume"])).error, /pausa/);
});
