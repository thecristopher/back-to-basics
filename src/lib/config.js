import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
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
  // null puts them in btb's home, outside the repo, so a fresh clone never loses them
  workspace: null,
  dataDir: null,
  // where the tests run: "off" on this machine, "auto" in Podman when it answers, "podman" always in Podman
  sandbox: "off",
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

/**
 * btb's home, where progress and solutions live by default: $XDG_DATA_HOME/btb or ~/.local/share/btb.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function btbHome(env = process.env) {
  return join(env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "btb");
}

function validate(config) {
  if (!["js", "ts"].includes(config.flavor)) throw new Error(`flavor must be "js" or "ts", got "${config.flavor}"`);
  if (config.dailyNew < 1) throw new Error("dailyNew must be at least 1");
  if (config.daysPerWeek < 1 || config.daysPerWeek > 7) throw new Error("daysPerWeek must be between 1 and 7");
  if (!["off", "auto", "podman"].includes(config.sandbox)) throw new Error(`sandbox must be "off", "auto" or "podman", got "${config.sandbox}"`);
  if (!Array.isArray(config.claude.command) || config.claude.command.length === 0) throw new Error("claude.command must be a non empty array");
}

/**
 * Loads btb.config.json (or $BTB_CONFIG) over the defaults and resolves its paths from the repo root.
 * Data and solutions go to btb's home unless the config names them. legacy says where they lived
 * inside the repo before, for the paths the config leaves to the default.
 * @param {string} root the back-to-basics folder
 * @returns {Promise<typeof DEFAULTS & { root: string, tracksDir: string, profilesDir: string, personasDir: string, examplesDir: string, dataDir: string, workspaceDir: string, statePath: string, legacy: { dataDir: string | null, workspaceDir: string | null } }>}
 */
export async function loadConfig(root) {
  const user = await readUserConfig(process.env.BTB_CONFIG ?? join(root, "btb.config.json"));
  const config = { ...DEFAULTS, ...user, claude: { ...DEFAULTS.claude, ...user.claude } };
  validate(config);
  const home = btbHome();
  const dataDir = resolve(root, config.dataDir ?? join(home, "data"));
  return {
    ...config,
    root,
    tracksDir: join(root, "tracks"),
    profilesDir: join(root, "profiles"),
    personasDir: join(root, "personas"),
    examplesDir: join(root, "examples"),
    dataDir,
    workspaceDir: resolve(root, config.workspace ?? join(home, "workspace")),
    statePath: join(dataDir, "state.json"),
    legacy: {
      dataDir: config.dataDir ? null : join(root, ".btb"),
      workspaceDir: config.workspace ? null : join(root, "workspace"),
    },
  };
}
