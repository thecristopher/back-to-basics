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
  sandbox = await mkdtemp(join(tmpdir(), "btb-persona-"));
  const config = {
    tracks: ["node"],
    persona: "claire",
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

test("Claire greets Inde on opening today's plan", async () => {
  const { persona } = await btb(["today"]);
  assert.equal(persona.name, "Claire Redfield");
  assert.equal(persona.moment, "greet");
  assert.equal(persona.portrait, "claire.jpg");
  assert.ok(persona.line.length > 0);
});

test("Claire never greets with the same line twice in a row", async () => {
  const first = await btb(["today"]);
  const second = await btb(["today"]);
  assert.notEqual(first.persona.line, second.persona.line);
});

test("the JSON text stays free of the line so editors show it their own way", async () => {
  const today = await btb(["today"]);
  assert.ok(!today.text.join("\n").includes(today.persona.line));
});

test("--persona switches to Malenia for one run", async () => {
  assert.equal((await btb(["today", "--persona=malenia"])).persona.name, "Malenia");
});

test("--persona=none silences the coach", async () => {
  assert.equal((await btb(["today", "--persona=none"])).persona, undefined);
});

test("an unknown persona is an error", async () => {
  assert.match((await btb(["today", "--persona=nemesis"])).error, /nemesis/);
});

test("persona list shows the bundled coaches and the one in use", async () => {
  const listed = await btb(["persona", "list"]);
  assert.deepEqual(listed.personas, ["ada", "claire", "malenia"]);
  assert.equal(listed.current, "claire");
});

test("Claude drafts Melina and she can coach right away", async () => {
  const created = await btb(["persona", "new", "melina", "--from=the maiden who guides you to the Erdtree"]);
  const saved = JSON.parse(await readFile(created.file, "utf8"));
  assert.equal(saved.name, "Melina");
  assert.match((await btb(["today", "--persona=melina"])).persona.line, /^Melina dice greet/);
});

test("a persona name already taken is refused", async () => {
  assert.match((await btb(["persona", "new", "claire", "--from=another Claire"])).error, /claire/);
});

test("a new persona needs a description", async () => {
  assert.ok((await btb(["persona", "new", "rennala"])).error);
});
