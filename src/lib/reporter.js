import { solutionLine } from "../actions/report.js";

function failureMessage(details) {
  const error = details?.error;
  if (!error) return null;
  return String((error.cause ?? error).message ?? error);
}

// the frame inside the solution tells the editor which line to point at
function failureLine(details) {
  const error = details?.error;
  return error ? solutionLine((error.cause ?? error).stack) : null;
}

function toLine({ type, data }) {
  if (type !== "test:pass" && type !== "test:fail") return null;
  if (data.details?.type === "suite") return null;
  const line = { btb: 1, name: data.name, ok: type === "test:pass", message: failureMessage(data.details) };
  const at = failureLine(data.details);
  return at ? { ...line, line: at } : line;
}

/**
 * node:test reporter that prints one JSON line per finished test, so btb can read the verdict.
 * @param {AsyncIterable<{ type: string, data: object }>} source
 */
export default async function* reporter(source) {
  for await (const event of source) {
    const line = toLine(event);
    if (line) yield `${JSON.stringify(line)}\n`;
  }
}
