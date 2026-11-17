import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { btbHome, loadConfig } from "../src/lib/config.js";
import { adoptRepoData } from "../src/lib/upgrade.js";

let sandbox;

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), "btb-home-"));
});

after(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

async function repoWithProgress(name) {
  const root = join(sandbox, name);
  await mkdir(join(root, ".btb", "runtimes", "python", "venv"), { recursive: true });
  await writeFile(join(root, ".btb", "state.json"), JSON.stringify({ xp: 40, note: "Claire's anniversary" }));
  await mkdir(join(root, "workspace", "node", "love-note"), { recursive: true });
  await writeFile(join(root, "workspace", "node", "love-note", "solution.js"), "export const love = () => 'Inde';\n");
  return root;
}

// sets env vars for one test and puts the old values back after it
async function withEnv(vars, work) {
  const previous = Object.fromEntries(Object.keys(vars).map((name) => [name, process.env[name]]));
  Object.assign(process.env, vars);
  try {
    return await work();
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

function homeConfig(root, home) {
  return {
    dataDir: join(home, "data"),
    workspaceDir: join(home, "workspace"),
    legacy: { dataDir: join(root, ".btb"), workspaceDir: join(root, "workspace") },
  };
}

test("btb's home follows XDG_DATA_HOME and falls back to ~/.local/share", () => {
  assert.equal(btbHome({ XDG_DATA_HOME: "/haligtree/share" }), "/haligtree/share/btb");
  assert.match(btbHome({}), /\/\.local\/share\/btb$/);
});

test("without paths in the config, Malenia's progress lives in btb's home and remembers the repo", async () => {
  const file = join(sandbox, "malenia.json");
  await writeFile(file, JSON.stringify({ language: "en" }));
  const config = await withEnv({ BTB_CONFIG: file, XDG_DATA_HOME: "/haligtree/share" }, () => loadConfig("/repo"));
  assert.equal(config.dataDir, "/haligtree/share/btb/data");
  assert.equal(config.workspaceDir, "/haligtree/share/btb/workspace");
  assert.deepEqual(config.legacy, { dataDir: "/repo/.btb", workspaceDir: "/repo/workspace" });
});

test("paths the config names win and nothing is moved for them", async () => {
  const file = join(sandbox, "claire.json");
  await writeFile(file, JSON.stringify({ dataDir: "/terrasave/data", workspace: "dojo" }));
  const config = await withEnv({ BTB_CONFIG: file }, () => loadConfig("/repo"));
  assert.equal(config.dataDir, "/terrasave/data");
  assert.equal(config.workspaceDir, "/repo/dojo");
  assert.deepEqual(config.legacy, { dataDir: null, workspaceDir: null });
});

test("Inde's progress and solutions move out of the repo once, leaving the runtimes behind", async () => {
  const root = await repoWithProgress("inde");
  const config = homeConfig(root, join(sandbox, "inde-home"));
  assert.deepEqual(await adoptRepoData(config), [config.dataDir, config.workspaceDir]);
  assert.match(await readFile(join(config.dataDir, "state.json"), "utf8"), /Claire's anniversary/);
  assert.ok(existsSync(join(config.workspaceDir, "node", "love-note", "solution.js")));
  assert.ok(!existsSync(join(config.dataDir, "runtimes")), "a moved venv would break, it installs again");
  assert.ok(!existsSync(join(root, ".btb")));
  assert.deepEqual(await adoptRepoData(config), [], "the second run finds nothing left to move");
});

test("a home that already has progress is never overwritten by the repo's", async () => {
  const root = await repoWithProgress("leon");
  const config = homeConfig(root, join(sandbox, "leon-home"));
  await mkdir(config.dataDir, { recursive: true });
  await writeFile(join(config.dataDir, "state.json"), JSON.stringify({ xp: 900 }));
  assert.deepEqual(await adoptRepoData(config), [config.workspaceDir]);
  assert.match(await readFile(join(config.dataDir, "state.json"), "utf8"), /900/);
  assert.ok(existsSync(join(root, ".btb", "state.json")), "the repo's copy stays where it was");
});
