/**
 * @typedef {{ name: string, ok: boolean, message: string | null, line?: number }} TestResult
 * @typedef {{ code: number | null, stdout: string, stderr: string, timedOut: boolean, report?: string | null }} Run
 */

const SOLUTION_FRAME = /(?<![\w.])solution\.(?:[cm]?[jt]sx?|py):(\d+)/;

/**
 * Finds the solution's line a failure points at, from a stack trace or a traceback.
 * @param {string | null | undefined} text
 * @returns {number | null}
 */
export function solutionLine(text) {
  const match = String(text ?? "").match(SOLUTION_FRAME);
  return match ? Number(match[1]) : null;
}

// the line only travels when the failure points at the solution, so results stay small otherwise
function withLine(result, line) {
  return line ? { ...result, line } : result;
}

function parseLine(line) {
  if (!line.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(line);
    return parsed.btb === 1 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Splits node:test output from btb's reporter into results and whatever the solution printed.
 * @param {string} stdout
 * @returns {{ tests: TestResult[], logs: string[] }}
 */
export function parseNodeTest(stdout) {
  const tests = [];
  const logs = [];
  for (const line of stdout.split("\n")) {
    const parsed = parseLine(line);
    if (parsed) tests.push(withLine({ name: parsed.name, ok: parsed.ok, message: parsed.message }, parsed.line));
    else if (line.trim() !== "") logs.push(line);
  }
  return { tests, logs };
}

/**
 * Reads the JSON report Vitest writes with --reporter=json.
 * @param {string | null} report
 * @returns {{ tests: TestResult[], crash: string }} crash holds a file level error, like a syntax error
 */
export function parseVitest(report) {
  if (!report) return { tests: [], crash: "" };
  const files = JSON.parse(report).testResults ?? [];
  const tests = files.flatMap((file) =>
    file.assertionResults.map((assertion) => {
      const message = assertion.status === "passed" ? null : (assertion.failureMessages[0] ?? null);
      return withLine({ name: assertion.title, ok: assertion.status === "passed", message }, solutionLine(message));
    }),
  );
  return { tests, crash: files.map((file) => file.message).filter(Boolean).join("\n") };
}

/**
 * Reads a report already in btb's shape, like the one profiles/python/btb_pytest.py writes.
 * @param {string | null} report
 * @returns {{ tests: TestResult[], crash: string }} crash holds a collection error, like a syntax error
 */
export function parseBtbJson(report) {
  if (!report) return { tests: [], crash: "" };
  const { tests = [], crash = "" } = JSON.parse(report);
  return { tests: tests.map(({ name, ok, message, line }) => withLine({ name, ok, message: message ?? null }, line)), crash };
}

/**
 * Reads top level TAP lines: "ok 1 - name" and "not ok 2 - name".
 * @param {string} stdout
 * @returns {TestResult[]}
 */
export function parseTap(stdout) {
  const tests = [];
  for (const line of stdout.split("\n")) {
    const match = line.match(/^(not )?ok \d+(?: -)? ?(.*)$/);
    if (match) tests.push({ name: match[2].trim() || "test", ok: !match[1], message: null });
  }
  return tests;
}

function tail(text, lines) {
  return text.trimEnd().split("\n").slice(-lines).join("\n");
}

function collect(kind, run) {
  if (kind === "node-test") return { ...parseNodeTest(run.stdout), crash: "" };
  if (kind === "vitest-json") return { ...parseVitest(run.report), logs: [] };
  if (kind === "btb-json") return { ...parseBtbJson(run.report), logs: [] };
  if (kind === "tap") return { tests: parseTap(run.stdout), logs: [], crash: "" };
  const message = run.code === 0 ? null : tail(`${run.stdout}\n${run.stderr}`, 30);
  return { tests: run.timedOut ? [] : [{ name: "tests", ok: run.code === 0, message }], logs: [], crash: "" };
}

/**
 * Turns a raw test run into a verdict, whatever reporter the language uses.
 * @param {"node-test" | "vitest-json" | "btb-json" | "tap" | "exit-code"} kind
 * @param {Run} run
 * @returns {{ ok: boolean, tests: TestResult[], logs: string[], passed: number, timedOut: boolean, crashed: boolean, stderr: string }}
 */
export function summarize(kind, run) {
  const { tests, logs, crash } = collect(kind, run);
  const passed = tests.filter((test) => test.ok).length;
  const crashed = !run.timedOut && tests.length === 0;
  const ok = !run.timedOut && tests.length > 0 && passed === tests.length;
  const stderr = (crash || run.stderr).trim();
  return { ok, tests, logs, passed, timedOut: run.timedOut, crashed, stderr };
}

/**
 * One paragraph explaining why a run failed, to hand back to Claude.
 * @param {string} label what was expected
 * @param {ReturnType<typeof summarize>} result
 * @returns {string}
 */
export function describeRun(label, result) {
  if (result.timedOut) return `${label}, but the run timed out`;
  if (result.crashed) return `${label}, but the run crashed:\n${tail(result.stderr, 20)}`;
  const failing = result.tests.filter((test) => !test.ok);
  const details = failing.map((test) => `- ${test.name}: ${tail(test.message ?? "", 6)}`).join("\n");
  return `${label}, but ${failing.length} of ${result.tests.length} tests failed:\n${details}`;
}
