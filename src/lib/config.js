import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULTS = {
  language: "es",
  flavor: "js",
  tracks: ["node", "react"],
  dailyNew: 2,
  dailyReviews: 3,
  daysPerWeek: 6,
  dailyGoalXp: 40,
  cleanMaxFailures: 1,
  testTimeoutMs: 15000,
  placementSize: 5,
  forgeBatch: 2,
  forgeRetries: 2,
  theme: "",
  cast: null,
  persona: "",
  fromBasics: false,
  workspace: "workspace",
  dataDir: ".btb",
  claude: { command: ["claude", "-p"], timeoutMs: 300000 },
  goals: [],
};

async function readUserConfig(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`Could not read ${file}: ${error.message}`);
  }
}

function validate(config) {
  if (!["js", "ts"].includes(config.flavor)) throw new Error(`flavor must be "js" or "ts", got "${config.flavor}"`);
  if (config.dailyNew < 1) throw new Error("dailyNew must be at least 1");
  if (config.daysPerWeek < 1 || config.daysPerWeek > 7) throw new Error("daysPerWeek must be between 1 and 7");
  if (!Array.isArray(config.claude.command) || config.claude.command.length === 0) throw new Error("claude.command must be a non empty array");
}

/**
 * Loads btb.config.json (or $BTB_CONFIG) over the defaults and resolves its paths from the repo root.
 * @param {string} root the back-to-basics folder
 * @returns {Promise<typeof DEFAULTS & { root: string, tracksDir: string, profilesDir: string, personasDir: string, examplesDir: string, dataDir: string, workspaceDir: string, statePath: string }>}
 */
export async function loadConfig(root) {
  const user = await readUserConfig(process.env.BTB_CONFIG ?? join(root, "btb.config.json"));
  const config = { ...DEFAULTS, ...user, claude: { ...DEFAULTS.claude, ...user.claude } };
  validate(config);
  const dataDir = resolve(root, config.dataDir);
  return {
    ...config,
    root,
    tracksDir: join(root, "tracks"),
    profilesDir: join(root, "profiles"),
    personasDir: join(root, "personas"),
    examplesDir: join(root, "examples"),
    dataDir,
    workspaceDir: resolve(root, config.workspace),
    statePath: join(dataDir, "state.json"),
  };
}
