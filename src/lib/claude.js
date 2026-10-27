import { extractJson } from "../actions/json.js";
import { runCommand } from "./exec.js";

/**
 * Sends a prompt to Claude (or whatever claude.command names) on stdin and returns the answer.
 * @param {{ command: string[], timeoutMs: number }} claude
 * @param {string} prompt
 * @returns {Promise<string>}
 * @throws {Error} when the command is missing, fails or times out
 */
export async function ask(claude, prompt) {
  const run = await runCommand(claude.command, { timeoutMs: claude.timeoutMs, input: prompt, env: process.env });
  if (run.missing) throw new Error(`Could not find "${claude.command[0]}". Set claude.command in btb.config.json.`);
  if (run.timedOut) throw new Error(`Claude did not answer within ${Math.round(claude.timeoutMs / 1000)}s.`);
  if (run.code !== 0) throw new Error(`Claude exited with code ${run.code}: ${run.stderr.trim().slice(0, 500)}`);
  return run.stdout;
}

/**
 * Asks Claude and parses the JSON object in its answer.
 * @param {{ command: string[], timeoutMs: number }} claude
 * @param {string} prompt
 * @returns {Promise<any>}
 */
export async function askJson(claude, prompt) {
  return extractJson(await ask(claude, prompt));
}
