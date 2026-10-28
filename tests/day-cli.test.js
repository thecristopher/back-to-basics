import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";
import { toDay } from "../src/utils/dates.js";

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

async function solve(opened) {
  await copyFile(join(sandbox, "data/exercises", opened.id, "reference.js"), opened.path);
}

async function editState(change) {
  const file = join(sandbox, "data/state.json");
  const state = JSON.parse(await readFile(file, "utf8"));
  change(state);
  await writeFile(file, JSON.stringify(state));
}

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), "btb-day-"));
  const config = {
    tracks: ["node"],
    workspace: join(sandbox, "workspace"),
    dataDir: join(sandbox, "data"),
    placementSize: 1,
    dailyNew: 2,
    forgeRetries: 1,
    goals: [],
    claude: { command: [process.execPath, FAKE_CLAUDE] },
  };
  await writeFile(join(sandbox, "config.json"), JSON.stringify(config));
  env = { ...process.env, BTB_CONFIG: join(sandbox, "config.json"), FAKE_CLAUDE_STATE: join(sandbox, "fake-counter") };
  delete env.NODE_TEST_CONTEXT;
  await btb(["placement", "node"]);
  await btb(["skip"]);
});

after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

let first;

test("a failed submit only points to hints while Claire still has one to give", async () => {
  first = await btb(["next"]);
  const failed = await btb(["submit"]);
  assert.equal(failed.hintsLeft > 0, failed.text.some((line) => line.includes("btb hint")));
});

test("a pass with more of the day ahead carries no summary", async () => {
  await solve(first);
  const passed = await btb(["submit"]);
  assert.equal(passed.ok, true);
  assert.equal(passed.day, null);
});

test("the pass that ends Inde's day brings the summary with it", async () => {
  await solve(await btb(["next"]));
  const passed = await btb(["submit"]);
  assert.equal(passed.day.solved, 2);
  assert.equal(passed.day.struggled, 0);
  assert.equal(passed.day.failures, 1);
});

test("next after the last exercise sums up the day", async () => {
  const done = await btb(["next"]);
  assert.equal(done.done, true);
  assert.equal(done.solved, 2);
});

test("a review already solved shows up as a recap, not as something to send again", async () => {
  const today = toDay();
  await editState((state) => {
    state.exercises[first.id].dueAt = today;
    delete state.days[Object.keys(state.days).at(-1)];
  });
  const plan = await btb(["today"]);
  assert.deepEqual(plan.recap.map((item) => item.id), [first.id]);
  assert.equal(plan.queue.some((item) => item.id === first.id), false);
  assert.ok(plan.recap[0].dueAt > today);
});
