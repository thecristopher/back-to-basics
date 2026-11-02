import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runEntry, runsThisRound, trippedThisRound } from "../src/actions/runs.js";
import { appendRun, readRuns } from "../src/lib/runlog.js";
import { archiveOldModel } from "../src/lib/upgrade.js";

const playlist = { id: "node/claire-playlist", track: "node" };
const failing = {
  ok: false,
  passed: 2,
  tests: [
    { name: "suma los minutos de la playlist de Claire", ok: true },
    { name: "devuelve 0 con una lista vacía", ok: false },
    { name: "ignora las canciones que Inde saltó", ok: false },
  ],
};

test("a run entry names the tests that failed", () => {
  const entry = runEntry(playlist, "test", failing, new Date("2026-11-01T10:00:00Z"));
  assert.deepEqual(entry, {
    at: "2026-11-01T10:00:00.000Z",
    id: "node/claire-playlist",
    track: "node",
    kind: "test",
    ok: false,
    passed: 2,
    total: 3,
    failing: ["devuelve 0 con una lista vacía", "ignora las canciones que Inde saltó"],
    error: null,
  });
});

test("a run that timed out says so instead of naming tests", () => {
  assert.equal(runEntry(playlist, "submit", { ...failing, timedOut: true }).error, "timeout");
});

const runs = [
  { at: "2026-10-30T10:00:00.000Z", id: "node/claire-playlist", kind: "submit", failing: ["de una ronda anterior"], error: null },
  { at: "2026-11-01T10:00:00.000Z", id: "node/claire-playlist", kind: "test", failing: ["devuelve 0 con una lista vacía"], error: null },
  { at: "2026-11-01T10:05:00.000Z", id: "node/claire-playlist", kind: "submit", failing: ["devuelve 0 con una lista vacía", "ignora las canciones que Inde saltó"], error: null },
  { at: "2026-11-01T10:06:00.000Z", id: "node/malenia-runes", kind: "test", failing: ["cuenta las runas"], error: null },
  { at: "2026-11-01T10:07:00.000Z", id: "node/claire-playlist", kind: "redo", failing: ["de un redo"], error: null },
  { at: "2026-11-01T10:08:00.000Z", id: "node/claire-playlist", kind: "submit", failing: [], error: null },
];
const roundStart = Date.parse("2026-11-01T09:00:00.000Z");

test("the round's tripped tests come once each, only from this exercise and this round", () => {
  assert.deepEqual(trippedThisRound(runs, "node/claire-playlist", roundStart), ["devuelve 0 con una lista vacía", "ignora las canciones que Inde saltó"]);
});

test("the runs of a round count practice runs and submits, never a redo", () => {
  assert.equal(runsThisRound(runs, "node/claire-playlist", roundStart), 3);
});

test("the run log appends and reads back, skipping a broken line", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "btb-runs-"));
  await appendRun({ dataDir }, { id: "node/claire-playlist", ok: true });
  await writeFile(join(dataDir, "log", "runs.jsonl"), "not json\n", { flag: "a" });
  await appendRun({ dataDir }, { id: "node/malenia-runes", ok: false });
  assert.deepEqual(
    (await readRuns({ dataDir })).map((run) => run.id),
    ["node/claire-playlist", "node/malenia-runes"],
  );
  await rm(dataDir, { recursive: true, force: true });
});

test("an empty log reads as no runs", async () => {
  assert.deepEqual(await readRuns({ dataDir: join(tmpdir(), "btb-never-ran") }), []);
});

async function oldModel() {
  const root = await mkdtemp(join(tmpdir(), "btb-upgrade-"));
  const dataDir = join(root, ".btb");
  const config = { dataDir, statePath: join(dataDir, "state.json"), workspaceDir: join(root, "workspace") };
  await mkdir(join(dataDir, "exercises", "node", "claire-love-notes"), { recursive: true });
  await mkdir(join(dataDir, "runtimes", "react"), { recursive: true });
  await mkdir(join(dataDir, "personas"), { recursive: true });
  await mkdir(config.workspaceDir, { recursive: true });
  await writeFile(config.statePath, JSON.stringify({ version: 2, xp: 713 }));
  return { root, config };
}

test("an older model is archived whole, while runtimes and summoned personas stay", async () => {
  const { root, config } = await oldModel();
  const archive = await archiveOldModel(config, new Date("2026-11-01T10:00:00Z"));
  assert.equal(archive, join(config.dataDir, "archive", "v2-2026-11-01-10-00-00"));
  assert.equal(JSON.parse(await readFile(join(archive, "state.json"), "utf8")).xp, 713);
  assert.ok(existsSync(join(archive, "exercises", "node", "claire-love-notes")));
  assert.ok(existsSync(join(archive, "workspace")));
  assert.ok(!existsSync(config.statePath));
  assert.ok(existsSync(join(config.dataDir, "runtimes", "react")));
  assert.ok(existsSync(join(config.dataDir, "personas")));
  await rm(root, { recursive: true, force: true });
});

test("a current model is left alone", async () => {
  const { root, config } = await oldModel();
  await writeFile(config.statePath, JSON.stringify({ version: 3 }));
  assert.equal(await archiveOldModel(config), null);
  assert.ok(existsSync(config.statePath));
  await rm(root, { recursive: true, force: true });
});
