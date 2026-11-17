import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { filesFor, loadProfile } from "../src/lib/profiles.js";
import { runTests } from "../src/lib/runner.js";

// builds images and starts containers, so it only runs when asked: BTB_PODMAN_TESTS=1 npm test
const skip = process.env.BTB_PODMAN_TESTS !== "1" && "set BTB_PODMAN_TESTS=1 to run the tests in Podman";
const ROOT = new URL("..", import.meta.url).pathname;
const head = 'import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { f } from "./solution.js";\n';
let config;
let profile;

before(async () => {
  config = { root: ROOT, dataDir: await mkdtemp(join(tmpdir(), "btb-podman-")), profilesDir: join(ROOT, "profiles"), testTimeoutMs: 4000, sandbox: "podman" };
  profile = await loadProfile(config, "javascript");
});

after(async () => {
  await rm(config.dataDir, { recursive: true, force: true });
});

function trial(solutionCode, body) {
  return runTests({ config, profile, files: filesFor(profile, "js"), solutionCode, testCode: `${head}${body}` });
}

test("Claire's love note passes inside the container", { skip }, async () => {
  const result = await trial('export const f = () => "te amo";\n', 'test("note", () => assert.equal(f(), "te amo"));\n');
  assert.equal(result.ok, true);
});

test("Wesker's solution cannot reach the network", { skip }, async () => {
  const code = 'export async function f() { try { await fetch("https://example.com", { signal: AbortSignal.timeout(2000) }); return "reached"; } catch { return "blocked"; } }\n';
  const result = await trial(code, 'test("offline", async () => assert.equal(await f(), "blocked"));\n');
  assert.equal(result.ok, true);
});

test("Malenia's endless loop is reported as a timeout, not a crash", { skip }, async () => {
  const result = await trial("export function f() { for (;;) {} }\n", 'test("never ends", () => f());\n');
  assert.equal(result.timedOut, true);
});
