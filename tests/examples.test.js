import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { proveProfile } from "../src/lib/architect.js";
import { exerciseFiles, loadExample } from "../src/lib/catalog.js";
import { listDirs, readJsonIfExists } from "../src/lib/files.js";
import { ensureRuntime, loadProfile } from "../src/lib/profiles.js";
import { runTests } from "../src/lib/runner.js";

const ROOT = new URL("..", import.meta.url).pathname;
// runtimes like React's packages install once and stay cached between runs
const config = {
  profilesDir: join(ROOT, "profiles"),
  examplesDir: join(ROOT, "examples"),
  dataDir: join(tmpdir(), "btb-test-data"),
  testTimeoutMs: 60000,
};
const withRuntimes = process.env.BTB_TEST_RUNTIMES === "1";
const ctx = { config, log: () => {}, onInstall: () => {} };

for (const id of await listDirs(join(ROOT, "examples"))) {
  const profile = await loadProfile(config, id);
  const skip = profile.runtime && !withRuntimes ? "needs BTB_TEST_RUNTIMES=1 to install its runtime" : false;

  test(`the ${id} profile proves itself with its sample`, { skip }, async () => {
    assert.deepEqual(await proveProfile(ctx, profile), []);
  });

  for (const slug of await listDirs(join(ROOT, "examples", id))) {
    const folder = join(ROOT, "examples", id, slug);
    const meta = await readJsonIfExists(join(folder, "exercise.json"));
    const files = exerciseFiles({ folder, files: meta.files });
    const run = async (file) =>
      runTests({
        config,
        profile,
        files: { solutionFile: meta.files.solution, testFile: meta.files.test },
        solutionCode: await readFile(file, "utf8"),
        testCode: await readFile(files.test, "utf8"),
      });

    test(`${id}/${slug} has what Claude is asked to write`, async () => {
      assert.ok(meta.title && meta.minutes > 0 && meta.hints.length > 0 && meta.concepts.length > 0);
      assert.ok((await readFile(files.lesson, "utf8")).trim().length > 0, "lesson.md is missing");
    });

    test(`${id}/${slug} passes with its reference`, { skip }, async () => {
      const result = await run(files.reference);
      assert.equal(result.ok, true, JSON.stringify(result, null, 2));
    });

    test(`${id}/${slug} fails with its starter without crashing`, { skip }, async () => {
      const result = await run(files.starter);
      assert.equal(result.crashed, false, result.stderr);
      assert.equal(result.ok, false);
    });
  }
}

test("a solution stuck in a loop is killed at the timeout", async () => {
  const profile = await loadProfile(config, "javascript");
  const started = Date.now();
  const result = await runTests({
    config: { ...config, testTimeoutMs: 1500 },
    profile,
    files: { solutionFile: "solution.js", testFile: "solution.test.js" },
    solutionCode: "export function spin() { while (true) {} }\n",
    testCode: 'import { test } from "node:test";\nimport { spin } from "./solution.js";\ntest("spins", () => spin());\n',
  });
  assert.equal(result.timedOut, true);
  assert.ok(Date.now() - started < 5000);
});

test("TypeScript solutions run with their types stripped", async () => {
  const profile = await loadProfile(config, "javascript");
  const result = await runTests({
    config,
    profile,
    files: { solutionFile: "solution.ts", testFile: "solution.test.ts" },
    solutionCode: "export function add(a: number, b: number): number {\n  return a + b;\n}\n",
    testCode: 'import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { add } from "./solution.ts";\n\ntest("adds", () => assert.equal(add(2, 3), 5));\n',
  });
  assert.equal(result.ok, true, result.stderr);
});

test("a track gets the example it asks for when its language has it", async () => {
  const example = await loadExample(config, "python", "throttled-converse");
  assert.equal(example.slug, "throttled-converse");
});

test("a track asking for an unknown example gets the language's first one", async () => {
  const example = await loadExample(config, "python", "love-letter-that-does-not-exist");
  assert.equal(example.slug, "converse-reply");
});

test("a learned profile may not copy runtime files from profiles/", async () => {
  const learned = { id: "malenia-lang", name: "Malenia Lang", bundled: false, runtime: { ready: "never", files: { "x.py": { copy: "python/btb_pytest.py" } } } };
  const dataDir = join(tmpdir(), "btb-test-learned");
  await assert.rejects(ensureRuntime({ ...config, dataDir }, learned, () => {}), /only bundled profiles/);
});
