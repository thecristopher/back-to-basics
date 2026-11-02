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

const LEVEL_ONE = ["return-a-value", "arithmetic", "comparisons", "if-else", "logical-operators"];

// Inde already owns level 1, so its concepts come back as fresh exercises when they are due
function ownLevelOne(today) {
  return (state) => {
    const owned = { clean: 2, struggled: 0, skipped: 0, cleanDays: ["2026-10-01", "2026-10-02"], last: "clean", lastAt: "2026-10-02", ownedAt: "2026-10-02", step: 0 };
    for (const id of LEVEL_ONE) state.mastery.node.concepts[id] = { ...owned, dueAt: id === "return-a-value" ? today : "2099-01-01" };
    delete state.days[Object.keys(state.days).at(-1)];
  };
}

let review;

test("a concept of a passed level that is due comes back as a fresh exercise, never the one already solved", async () => {
  const today = toDay();
  await editState(ownLevelOne(today));
  const plan = await btb(["today"]);
  const slot = plan.queue.find((item) => item.review);
  assert.deepEqual([slot.slot, slot.title, slot.concept], [true, "Devolver un valor con return", "return-a-value"]);
  assert.equal(plan.queue.some((item) => item.id === first.id), false);
  assert.deepEqual([plan.recap[0].title, plan.recap[0].standing], ["Devolver un valor con return", "owned"]);
  assert.ok(plan.recap[0].last, "the recap names the last exercise solved on it, its question warms the review up");
  review = await btb(["next"]);
  assert.notEqual(review.id, first.id);
  assert.equal(review.reviewOf, "Devolver un valor con return");
  assert.equal(review.review, true);
  const stored = JSON.parse(await readFile(join(sandbox, "data/exercises", review.id, "exercise.json"), "utf8"));
  assert.deepEqual([stored.review, stored.level, stored.concepts], [true, 1, ["return-a-value"]]);
});

test("a clean review climbs the concept a rung and the day counts it as reviewed", async () => {
  await solve(review);
  const passed = await btb(["submit"]);
  assert.equal(passed.concept, "Devolver un valor con return");
  assert.equal(passed.mastered, false);
  const state = JSON.parse(await readFile(join(sandbox, "data/state.json"), "utf8"));
  assert.equal(state.mastery.node.concepts["return-a-value"].step, 1);
  assert.equal(passed.dueAt, state.mastery.node.concepts["return-a-value"].dueAt);
  const plan = await btb(["today"]);
  assert.equal(plan.recap[0].review, review.id);
});
