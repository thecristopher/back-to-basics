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

async function solve(opened) {
  await copyFile(join(sandbox, "data/exercises", opened.id, "reference.js"), opened.path);
  return btb(["submit"]);
}

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), "btb-one-fight-"));
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

let probe;

test("Inde's first next starts the placement instead of a blind path", async () => {
  probe = await btb(["next"]);
  assert.equal(probe.placement, true);
  assert.equal((await btb(["list"])).exercises.length, 1, "only the probe being fought is forged");
  assert.equal((await btb(["path", "node"])).tracks[0].path, null);
});

test("the same probe comes back until it is answered", async () => {
  assert.equal((await btb(["next"])).id, probe.id);
});

let practice;

test("once the placement is over, practice opens one exercise at a time", async () => {
  await solve(probe);
  await btb(["skip", (await btb(["next"])).id]);
  practice = await btb(["next"]);
  assert.equal(practice.placement, false);
  const again = await btb(["next"]);
  assert.equal(again.id, practice.id);
  assert.equal(again.resumed, true);
});

test("asking for one more still finishes the open one first", async () => {
  assert.equal((await btb(["next", "--more"])).id, practice.id);
});

test("an exercise Claire opened by hand holds until she solves it", async () => {
  const other = (await btb(["list"])).exercises.find((item) => item.state === "new" && item.id !== practice.id);
  await btb(["start", other.id]);
  assert.equal((await btb(["next"])).id, other.id);
});

test("giving up lets the next one through", async () => {
  const current = (await btb(["next"])).id;
  await btb(["skip"]);
  assert.notEqual((await btb(["next"])).id, current);
});
