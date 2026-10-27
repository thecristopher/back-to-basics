import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./actions/args.js";
import { forge, learn, path, setup } from "./commands/path.js";
import { placement } from "./commands/placement.js";
import { hint, next, reveal, skip, start, submit } from "./commands/practice.js";
import { list, plan, status, today } from "./commands/progress.js";
import { review } from "./commands/review.js";
import { loadCatalog } from "./lib/catalog.js";
import { loadConfig } from "./lib/config.js";
import { createT } from "./lib/i18n.js";
import { loadState, saveState } from "./lib/state.js";
import { loadTracks } from "./lib/tracks.js";
import { toDay } from "./utils/dates.js";
import { createPaint } from "./utils/text.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const COMMANDS = { today, next, start, submit, hint, skip, reveal, review, placement, path, forge, learn, setup, status, plan, list };

async function createContext(config, t, flags) {
  const json = Boolean(flags.json);
  const color = !json && process.stdout.isTTY && !process.env.NO_COLOR;
  // progress goes to stderr, so --json output on stdout stays parseable
  const log = (text) => process.stderr.write(`${text}\n`);
  return {
    config,
    t,
    json,
    paint: createPaint(color),
    log,
    onInstall: (name, dir) => log(t.installing(name, dir)),
    today: toDay(),
    profiles: {},
    catalog: await loadCatalog(config, await loadTracks(config)),
    state: await loadState(config.statePath),
  };
}

// forge runs in the background from editors while the learner keeps practicing, so it never writes progress
const READS_PROGRESS_ONLY = new Set(["forge"]);

function print(report, json) {
  // the text rides along so an editor can show exactly what the terminal would
  if (json) console.log(JSON.stringify({ ...report.data, text: report.text }, null, 2));
  else if (report.text.length > 0) console.log(report.text.join("\n"));
}

async function run(argv) {
  const { command, args, flags } = parseArgs(argv);
  const config = await loadConfig(ROOT);
  const t = createT(config.language);
  if (command === "help" || flags.help) return { text: [t.help] };
  const handler = COMMANDS[command];
  if (!handler) return { code: 1, data: { error: t.unknownCommand(command) }, text: [t.unknownCommand(command)] };
  const ctx = await createContext(config, t, flags);
  try {
    return await handler(ctx, args, flags);
  } finally {
    // whatever was answered before an error is kept
    if (!READS_PROGRESS_ONLY.has(command)) await saveState(config.statePath, ctx.state);
  }
}

/**
 * Runs one btb command and prints its report as text, or as JSON with --json.
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
export async function main(argv) {
  const json = argv.includes("--json");
  try {
    const report = await run(argv);
    print(report, json);
    return report.code ?? 0;
  } catch (error) {
    print({ data: { error: error.message }, text: [error.message] }, json);
    return 1;
  }
}
