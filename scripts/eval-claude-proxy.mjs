#!/usr/bin/env node
// Stands between btb and Claude during prompt evals: notes the task of every prompt in BTB_EVAL_LOG,
// then hands the prompt to the real command and its answer back to btb.
//   node eval-claude-proxy.mjs <command> [args...]
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

const prompt = readFileSync(0, "utf8");
const task = prompt.match(/^BTB_TASK: (\w+)/m)?.[1] ?? "unknown";
// a fix prompt lists the problems validation found, the report keeps them so a prompt change can aim at them
function problemsOf(text) {
  const lines = text.split("\n");
  const start = lines.indexOf("Problems found:");
  if (start === -1) return [];
  const end = lines.indexOf("", start);
  return lines.slice(start + 1, end === -1 ? undefined : end).map((line) => line.replace(/^- /, ""));
}

if (process.env.BTB_EVAL_LOG) {
  const entry = task === "fix" ? { task, problems: problemsOf(prompt) } : { task };
  appendFileSync(process.env.BTB_EVAL_LOG, `${JSON.stringify(entry)}\n`);
}
const [command, ...args] = process.argv.slice(2);
const answer = spawnSync(command, args, { input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (answer.error) {
  console.error(answer.error.message);
  process.exit(127);
}
process.stdout.write(answer.stdout);
process.stderr.write(answer.stderr);
process.exit(answer.status ?? 1);
