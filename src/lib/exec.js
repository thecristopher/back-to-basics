import { spawn } from "node:child_process";

const MAX_OUTPUT = 1024 * 1024;

function killTree(child) {
  try {
    // detached children lead their own process group, so this also reaches test runners they spawned
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
}

function append(buffer, chunk) {
  return buffer.length >= MAX_OUTPUT ? buffer : buffer + chunk;
}

/**
 * Runs a command and collects its output, killing it and everything it started after the timeout.
 * @param {string[]} command
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, timeoutMs: number, input?: string }} options
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, timedOut: boolean, missing: boolean }>}
 */
export function runCommand([bin, ...args], { cwd, env, timeoutMs, input }) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd, env, detached: true, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = append(stderr, chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: `${stderr}${error.message}`, timedOut, missing: error.code === "ENOENT" });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, missing: false });
    });
    if (input === undefined) return;
    // a command that exits early closes stdin, the close event above already reports it
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}
