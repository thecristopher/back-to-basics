import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const BIN = new URL("../bin/btb.js", import.meta.url).pathname;
const FAKE_CLAUDE = new URL("./fixtures/fake-claude.js", import.meta.url).pathname;
const NODE = JSON.parse(await readFile(new URL("../tracks/node.json", import.meta.url), "utf8"));
let sandbox;
let env;

async function btb(args) {
  try {
    return JSON.parse((await run(process.execPath, [BIN, ...args, "--json"], { env })).stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

async function editState(change) {
  const file = join(sandbox, "data/state.json");
  const state = JSON.parse(await readFile(file, "utf8"));
  change(state);
  await writeFile(file, JSON.stringify(state));
}

async function forged(id) {
  const folder = join(sandbox, "data/exercises", id);
  const meta = JSON.parse(await readFile(join(folder, "exercise.json"), "utf8"));
  return { meta, starter: await readFile(join(folder, "starter.js"), "utf8"), test: await readFile(join(folder, "solution.test.js"), "utf8") };
}

const owned = { clean: 2, struggled: 0, skipped: 0, cleanDays: ["2026-10-01", "2026-10-02"], last: "clean", lastAt: "2026-10-02", ownedAt: "2026-10-02", step: 0, dueAt: "2099-01-01" };

// Claire owns every concept of the first levels, so the current level is the one after them
function ownLevels(count) {
  return (state) => {
    state.mastery.node ??= { concepts: {}, recent: [] };
    for (const level of NODE.levels.slice(0, count)) for (const concept of level.concepts) state.mastery.node.concepts[concept.id] = { ...owned };
  };
}

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), "btb-formats-"));
  const config = { tracks: ["node"], workspace: join(sandbox, "workspace"), dataDir: join(sandbox, "data"), placementSize: 1, forgeRetries: 1, claude: { command: [process.execPath, FAKE_CLAUDE] } };
  await writeFile(join(sandbox, "config.json"), JSON.stringify(config));
  env = { ...process.env, BTB_CONFIG: join(sandbox, "config.json"), FAKE_CLAUDE_STATE: join(sandbox, "counter") };
  delete env.NODE_TEST_CONTEXT;
  await btb(["placement", "node"]);
  await btb(["skip"]);
});

after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

test("a weak concept whose mistake btb knows comes back as a bug hunt with that very mistake", async () => {
  const weak = NODE.levels[1].concepts[0].id;
  await editState((state) => {
    ownLevels(1)(state);
    state.mastery.node.concepts[weak] = { clean: 0, struggled: 1, skipped: 0, cleanDays: [], last: "struggled", lastAt: "2026-10-03", step: -1, dueAt: "2026-10-04" };
    state.mastery.node.recent.unshift({ title: "Runas de Malenia", level: 2, concepts: [weak], outcome: "struggled", mistakes: ["olvida los pares negativos"] });
  });
  const result = await btb(["forge", "node", "--count=2"]);
  assert.equal(result.forged.length, 1, "a bug hunt is built from one mistake, one at a time");
  const hunt = await forged(result.forged[0]);
  assert.equal(hunt.meta.format, "debug");
  assert.match(hunt.starter, /n > 0/, "the starter carries the bug, it is not empty");
  const opened = await btb(["start", result.forged[0]]);
  assert.equal(opened.format, "debug");
  assert.ok(opened.text[0].includes("caza de bugs"));
});

test("the levels that prepare the onsite ask every solution for its Big O", async () => {
  await editState(ownLevels(NODE.levels.length - 4));
  const result = await btb(["forge", "node", "--count=1"]);
  const exercise = await forged(result.forged[0]);
  assert.deepEqual([exercise.meta.format, exercise.meta.declaresComplexity], ["build", true]);
  assert.match(exercise.test, /COMPLEXITY/);
});
