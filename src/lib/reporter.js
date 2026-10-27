function failureMessage(details) {
  const error = details?.error;
  if (!error) return null;
  return String((error.cause ?? error).message ?? error);
}

function toLine({ type, data }) {
  if (type !== "test:pass" && type !== "test:fail") return null;
  if (data.details?.type === "suite") return null;
  return { btb: 1, name: data.name, ok: type === "test:pass", message: failureMessage(data.details) };
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
