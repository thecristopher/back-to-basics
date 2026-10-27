import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const BIN = fileURLToPath(new URL("../bin/btb.js", import.meta.url));
const FAKE_CLAUDE = fileURLToPath(new URL("./fixtures/fake-claude.js", import.meta.url));
let sandbox;
let env;

async function btb(args, extraEnv = {}) {
  try {
    const { stdout } = await run(process.execPath, [BIN, ...args, "--json"], { env: { ...env, ...extraEnv } });
    return JSON.parse(stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

// solves the current exercise by copying its reference into the workspace
async function solve(opened) {
  const exercise = join(sandbox, "data/exercises", opened.id);
  await copyFile(join(exercise, "reference.js"), opened.path);
}

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), "btb-"));
  const config = {
    tracks: ["node"],
    workspace: join(sandbox, "workspace"),
    dataDir: join(sandbox, "data"),
    placementSize: 3,
    forgeRetries: 1,
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

test("Inde's first day queues slots for Claude to forge and suggests placement", async () => {
  const today = await btb(["today"]);
  assert.deepEqual(today.undrawn, ["node"]);
  assert.deepEqual(
    today.queue.map((item) => item.slot),
    [true, true],
  );
});

let probe;

test("placement forges probes and opens the easiest one", async () => {
  probe = await btb(["placement", "node"]);
  assert.equal(probe.placement, true);
  assert.equal(probe.difficulty, 1);
  assert.ok(probe.path.startsWith(sandbox));
});

test("hints are refused during placement", async () => {
  assert.ok((await btb(["hint"])).error);
});

test("solving a probe moves the placement along", async () => {
  await solve(probe);
  const result = await btb(["submit"]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.placement, { finished: false, remaining: 2, track: "node" });
});

test("a skipped probe ends the placement and Claude draws the path", async () => {
  await btb(["next"]);
  const skipped = await btb(["skip"]);
  assert.equal(skipped.placement.finished, true);
  const shown = await btb(["path", "node"]);
  assert.equal(shown.tracks[0].path.levels.length, 4);
  assert.equal(shown.tracks[0].path.startLevel, 1);
});

let practice;

test("next forges a practice exercise for the current level", async () => {
  practice = await btb(["next"]);
  assert.equal(practice.level, 1);
  assert.equal(practice.placement, false);
});

test("the empty starter fails and the reference stays locked", async () => {
  assert.equal((await btb(["submit"])).ok, false);
  assert.ok((await btb(["reveal"])).error);
});

test("a correct solution passes, earns XP and feeds the review", async () => {
  await solve(practice);
  const result = await btb(["submit"]);
  assert.equal(result.ok, true);
  assert.ok(result.xp > 0);
  assert.match((await btb(["review"])).review, /Calificación/);
});

test("status counts the solve toward level 1", async () => {
  const status = await btb(["status"]);
  assert.equal(status.tracks[0].levels[0].solved, 1);
});

test("forge fixes an exercise whose reference Claude got wrong", async () => {
  const forged = await btb(["forge", "node", "--count=1"], { FAKE_CLAUDE_BROKEN: "1" });
  assert.equal(forged.forged.length, 1);
});

test("forge leaves progress alone so it can run beside practice", async () => {
  const state = join(sandbox, "data/state.json");
  const before = await readFile(state, "utf8");
  await btb(["forge", "node", "--count=1"]);
  assert.equal(await readFile(state, "utf8"), before);
});

test("today tells whether a new slot already has an exercise forged", async () => {
  const today = await btb(["today"]);
  const slots = today.queue.filter((item) => item.slot);
  assert.ok(slots.length > 0);
  assert.equal(slots[0].ready, true);
});

test("the JSON report carries the same text the terminal shows", async () => {
  const status = await btb(["status"]);
  assert.match(status.text[0], /XP/);
});

test("a learned language waits for approval before its commands run", async () => {
  const learned = await btb(["learn", "fakelang"]);
  assert.equal(learned.approved, false);
  assert.equal((await btb(["setup", "fakelang"])).approved, false);
  assert.equal((await btb(["setup", "fakelang", "--yes"])).ok, true);
});

test("an unknown command exits with an error", async () => {
  assert.ok((await btb(["dance"])).error);
});

test("the workspace keeps solutions beside their statement", async () => {
  assert.equal(dirname(practice.path), dirname(practice.readme));
});
