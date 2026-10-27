/**
 * Splits argv into the command, its positional args and its --flags.
 * @param {string[]} argv
 * @returns {{ command: string, args: string[], flags: Record<string, string | boolean> }}
 */
export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [name, value] = arg.slice(2).split("=");
    flags[name] = value ?? true;
  }
  const [command = "today", ...args] = positional;
  return { command, args, flags };
}
