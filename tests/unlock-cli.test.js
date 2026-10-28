import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  sandbox = await mkdtemp(join(tmpdir(), "btb-unlock-"));
  const config = {
    tracks: ["python", "llm"],
    workspace: join(sandbox, "workspace"),
    dataDir: join(sandbox, "data"),
    goals: [],
    claude: { command: [process.execPath, FAKE_CLAUDE] },
  };
  await writeFile(join(sandbox, "config.json"), JSON.stringify(config));
  env = { ...process.env, BTB_CONFIG: join(sandbox, "config.json") };
  delete env.NODE_TEST_CONTEXT;
});

after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

test("Claire's day only queues Python while llm waits for it", async () => {
  const today = await btb(["today"]);
  assert.deepEqual(today.undrawn, ["python"]);
  assert.deepEqual([...new Set(today.queue.map((item) => item.track))], ["python"]);
  assert.equal(today.locked[0].id, "llm");
  assert.equal(today.locked[0].lock.needed, null);
});

test("the llm placement is refused until Python moves", async () => {
  const refused = await btb(["placement", "llm"]);
  assert.match(refused.error, /btb placement python/);
});

test("forging llm ahead is refused too", async () => {
  assert.match((await btb(["forge", "llm"])).error, /btb placement python/);
});

test("status tells Malenia what llm is waiting for", async () => {
  const status = await btb(["status"]);
  const llm = status.tracks.find((track) => track.id === "llm");
  assert.equal(llm.locked.track, "python");
});

test("a llm slot queued before the lock is dropped from the day", async () => {
  const file = join(sandbox, "data", "state.json");
  const state = JSON.parse(await readFile(file, "utf8"));
  const [day] = Object.keys(state.days);
  state.days[day].queue.push("forge:llm");
  await mkdir(join(sandbox, "data"), { recursive: true });
  await writeFile(file, JSON.stringify(state));
  const today = await btb(["today"]);
  assert.ok(today.queue.every((item) => item.track !== "llm"));
});

test("a llm placement and its open probe let go before the lock, and the day goes back to Python", async () => {
  const file = join(sandbox, "data", "state.json");
  const state = JSON.parse(await readFile(file, "utf8"));
  state.placement = { status: "running", track: "llm", size: 3, queue: ["llm/converse-request-shape"], results: {} };
  state.current = "llm/converse-request-shape";
  const probe = join(sandbox, "data", "exercises", "llm", "converse-request-shape");
  await mkdir(probe, { recursive: true });
  const meta = { title: "Forma del request", level: 0, placement: true, minutes: 10, concepts: ["Converse"], hints: ["x"], files: { solution: "solution.py", test: "test_solution.py" } };
  await writeFile(join(probe, "exercise.json"), JSON.stringify(meta));
  await writeFile(file, JSON.stringify(state));
  const today = await btb(["today"]);
  assert.equal(today.placement, null);
  assert.equal(today.current, null);
  assert.deepEqual(today.undrawn, ["python"]);
});
