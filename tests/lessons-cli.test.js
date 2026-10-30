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
let firstPass;
let forgeLog;

async function btb(args) {
  try {
    const { stdout, stderr } = await run(process.execPath, [BIN, ...args, "--json"], { env });
    forgeLog = stderr;
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
  firstPass = await btb(["submit"]);
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

test("Claire forges the exercise, not Claude", async () => {
  await btb(["forge", "node", "--count=1"]);
  assert.match(forgeLog, /Claire está forjando un ejercicio de/);
});

test("passing an exercise has Claire talk about that exercise", async () => {
  assert.equal(firstPass.persona.moment, "passed_clean");
  assert.equal(firstPass.persona.line, `${solved.title} cayó limpio, Inde. +${firstPass.xp} XP para la cita.`);
});

test("Claire answers what Inde remembered of the lesson's question", async () => {
  const answer = await btb(["recall", solved.id, "--answer=un Map deja llaves que no son texto"]);
  assert.equal(answer.answer, "un Map deja llaves que no son texto");
  assert.match(answer.question, /\?/);
  assert.match(answer.feedback, /Casi, Inde/);
  assert.match(forgeLog, /Claire está leyendo lo que recordaste/);
});

test("a recall with no answer still gets the coach's feedback", async () => {
  const answer = await btb(["recall", solved.id]);
  assert.equal(answer.answer, "");
  assert.ok(answer.feedback.length > 0);
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

test("Inde's redo keeps its clock and races the ghost of her first solve", async () => {
  const redo = await btb(["redo", solved.id]);
  const again = await btb(["redo", solved.id]);
  assert.equal(typeof redo.startedAt, "number");
  assert.equal(again.startedAt, redo.startedAt, "reopening keeps the clock running");
  await copyFile(referenceOf(solved.id), redo.path);
  const result = await btb(["submit", solved.id, "--redo"]);
  assert.ok(["ahead", "behind", "tied"].includes(result.ghost));
  assert.equal(typeof result.ghostSeconds, "number");
});

test("forge --lessons writes the lessons an older exercise is missing", async () => {
  const lessonFile = join(sandbox, "data/exercises", solved.id, "lesson.md");
  await rm(lessonFile);
  const written = await btb(["forge", "--lessons"]);
  assert.deepEqual(written.lessons, [solved.id]);
  assert.match(await readFile(lessonFile, "utf8"), /^# Closures/);
});

test("forge --lessons gives Claire her lines on an exercise forged without them", async () => {
  const metaFile = join(sandbox, "data/exercises", solved.id, "exercise.json");
  const { moments, ...meta } = JSON.parse(await readFile(metaFile, "utf8"));
  assert.ok(moments.claire, "forged with Claire, it came with her lines");
  await writeFile(metaFile, JSON.stringify(meta));
  const written = await btb(["forge", "--lessons"]);
  assert.deepEqual(written.moments, [solved.id]);
  assert.match(JSON.parse(await readFile(metaFile, "utf8")).moments.claire.passed_clean, /cayó limpio/);
});

test("Claire greets Inde once a day and keeps the greeting", async () => {
  const first = await btb(["greet"]);
  const again = await btb(["greet"]);
  assert.match(first.line, /Hola, Inde/);
  assert.equal(first.cached, false);
  assert.equal(again.cached, true);
  assert.equal(first.persona.name, "Claire Redfield");
});

test("Claire says goodbye from the day's rounds", async () => {
  const goodbye = await btb(["debrief"]);
  assert.match(goodbye.line, /Cerramos el día/);
  assert.match(forgeLog, /Claire está repasando cómo te fue hoy/);
});

test("Malenia prepares her own day with her lines for what is queued", async () => {
  await btb(["today"]);
  const prepared = await btb(["prepare", "--persona=malenia"]);
  assert.match(prepared.greeting, /Hola, Inde/);
  for (const id of prepared.moments) {
    const meta = JSON.parse(await readFile(join(sandbox, "data/exercises", id, "exercise.json"), "utf8"));
    assert.ok(meta.moments.malenia.ready);
  }
});

test("with no coach there is no greeting to write", async () => {
  assert.equal((await btb(["greet", "--persona=none"])).line, null);
});

test("Claire says the CLI's own texts in her voice", async () => {
  const shown = await run(process.execPath, [BIN, "today"], { env });
  assert.match(shown.stdout, /Casco puesto/);
});

test("on Leon's day Claude summons him once, borrowing Claire's world, with no romance", async () => {
  const leonDay = ["greet", "--persona=leon-s-kennedy", "--character=Leon S. Kennedy", "--franchise=Resident Evil"];
  const first = await btb(leonDay);
  assert.match(forgeLog, /Claude está invocando a Leon S\. Kennedy/);
  assert.equal(first.persona.name, "Leon S. Kennedy");
  const leon = JSON.parse(await readFile(join(sandbox, "data/personas/leon-s-kennedy.json"), "utf8"));
  assert.equal(leon.partner, undefined);
  assert.ok(leon.world.supporting.includes("Claire Redfield"));
  assert.ok(!leon.world.supporting.includes("Leon S. Kennedy"));
  await btb(leonDay);
  assert.doesNotMatch(forgeLog, /invocando/);
});

test("a coach with no persona and no character to summon is refused", async () => {
  assert.match((await btb(["greet", "--persona=hunk"])).error, /hunk/);
});
