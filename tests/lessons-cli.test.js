import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const BIN = new URL("../bin/btb.js", import.meta.url).pathname;
const FAKE_CLAUDE = new URL("./fixtures/fake-claude.js", import.meta.url).pathname;
let sandbox;
let env;
let solved;

async function btb(args) {
  try {
    const { stdout } = await run(process.execPath, [BIN, ...args, "--json"], { env });
    return JSON.parse(stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

function referenceOf(id) {
  return join(sandbox, "data/exercises", id, "reference.js");
}

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), "btb-lessons-"));
  const config = {
    tracks: ["node"],
    persona: "claire",
    workspace: join(sandbox, "workspace"),
    dataDir: join(sandbox, "data"),
    placementSize: 2,
    goals: [],
    claude: { command: [process.execPath, FAKE_CLAUDE] },
  };
  await writeFile(join(sandbox, "config.json"), JSON.stringify(config));
  env = { ...process.env, BTB_CONFIG: join(sandbox, "config.json"), FAKE_CLAUDE_STATE: join(sandbox, "fake-counter") };
  delete env.NODE_TEST_CONTEXT;
  solved = await btb(["placement", "node"]);
  await copyFile(referenceOf(solved.id), solved.path);
  await btb(["submit"]);
});

after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

test("a forged exercise comes with its lesson", async () => {
  const shown = await btb(["lesson", solved.id]);
  assert.ok(shown.markdown.length > 0);
  assert.ok(shown.lesson.endsWith("lesson.md"));
});

test("Claire briefs the lesson once and keeps it for next time", async () => {
  const first = await btb(["brief", solved.id]);
  const second = await btb(["brief", solved.id]);
  assert.match(first.brief, /Inde, hoy toca algo bonito/);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(first.persona.name, "Claire Redfield");
});

test("with no coach the brief is the lesson itself", async () => {
  const lesson = await btb(["lesson", solved.id]);
  assert.equal((await btb(["brief", solved.id, "--persona=none"])).brief, lesson.markdown);
});

test("a review is kept and shown again without asking Claude", async () => {
  const first = await btb(["review", solved.id]);
  const again = await btb(["review", solved.id]);
  assert.equal(first.saved, false);
  assert.equal(again.saved, true);
  assert.equal(again.review, first.review);
});

test("the library lists the lesson, the solution and the review of a solved exercise", async () => {
  const entry = (await btb(["lessons"])).lessons.find((item) => item.id === solved.id);
  assert.ok(entry.lesson && entry.solution && entry.review);
  assert.equal(entry.unlocked, true);
});

test("an exercise never solved nor skipped cannot be redone", async () => {
  const pending = await btb(["next"]);
  assert.ok((await btb(["redo", pending.id])).error);
});

test("a redo starts from the starter and leaves the first solution alone", async () => {
  const first = await readFile(solved.path, "utf8");
  const redo = await btb(["redo", solved.id]);
  assert.notEqual(redo.path, solved.path);
  assert.equal(await readFile(solved.path, "utf8"), first);
});

test("a failed redo counts its own attempts and Claire knows a second miss", async () => {
  const first = await btb(["submit", solved.id, "--redo"]);
  const second = await btb(["submit", solved.id, "--redo"]);
  assert.equal(first.persona.moment, "failed");
  assert.equal(second.persona.moment, "failed_again");
});

test("passing a redo earns no XP and leaves the schedule alone", async () => {
  const before = await btb(["status"]);
  const redo = await btb(["redo", solved.id]);
  await copyFile(referenceOf(solved.id), redo.path);
  const result = await btb(["submit", solved.id, "--redo"]);
  assert.equal(result.ok, true);
  assert.equal(result.persona.moment, "passed_clean");
  assert.deepEqual(await btb(["status"]), before);
});

test("forge --lessons writes the lessons an older exercise is missing", async () => {
  const lessonFile = join(sandbox, "data/exercises", solved.id, "lesson.md");
  await rm(lessonFile);
  const written = await btb(["forge", "--lessons"]);
  assert.deepEqual(written.lessons, [solved.id]);
  assert.match(await readFile(lessonFile, "utf8"), /^# Closures/);
});
