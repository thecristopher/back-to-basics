import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs } from "../src/actions/args.js";
import { describeRun, parseBtbJson, parseNodeTest, parseTap, parseVitest, summarize } from "../src/actions/report.js";
import { typeScriptFlags } from "../src/actions/runtime.js";
import { streakDays } from "../src/actions/streak.js";
import { xpFor } from "../src/actions/xp.js";
import { addDays } from "../src/utils/dates.js";
import { bar, duration, excerpt } from "../src/utils/text.js";

test("no command means today", () => {
  assert.deepEqual(parseArgs([]), { command: "today", args: [], flags: {} });
});

test("flags and positional args are split", () => {
  assert.deepEqual(parseArgs(["start", "sum-evens", "--json", "--lang=en"]), {
    command: "start",
    args: ["sum-evens"],
    flags: { json: true, lang: "en" },
  });
});

test("the node:test report keeps test lines and leaves the solution's logs apart", () => {
  const stdout = ['{"btb":1,"name":"suma","ok":true,"message":null}', "hola Inde", '{"other":1}', ""].join("\n");
  assert.deepEqual(parseNodeTest(stdout), {
    tests: [{ name: "suma", ok: true, message: null }],
    logs: ["hola Inde", '{"other":1}'],
  });
});

test("the Vitest report gives each assertion and any file level crash", () => {
  const report = JSON.stringify({
    testResults: [
      {
        message: "",
        assertionResults: [
          { title: "Claire da like", status: "passed", failureMessages: [] },
          { title: "Malenia también", status: "failed", failureMessages: ["expected 1 to be 2"] },
        ],
      },
    ],
  });
  assert.deepEqual(parseVitest(report), {
    tests: [
      { name: "Claire da like", ok: true, message: null },
      { name: "Malenia también", ok: false, message: "expected 1 to be 2" },
    ],
    crash: "",
  });
  assert.equal(parseVitest(JSON.stringify({ testResults: [{ message: "Transform failed", assertionResults: [] }] })).crash, "Transform failed");
});

test("the btb-json report gives each test and any collection crash", () => {
  const report = JSON.stringify({
    tests: [
      { name: "Claire recibe su nota de aniversario", ok: true, message: null },
      { name: "Malenia comparte su playlist", ok: false, message: "assert 2 == 3" },
    ],
    crash: "",
  });
  assert.deepEqual(parseBtbJson(report), {
    tests: [
      { name: "Claire recibe su nota de aniversario", ok: true, message: null },
      { name: "Malenia comparte su playlist", ok: false, message: "assert 2 == 3" },
    ],
    crash: "",
  });
});

test("a btb-json report with only a crash is a crashed run", () => {
  const report = JSON.stringify({ tests: [], crash: "SyntaxError: invalid syntax" });
  const result = summarize("btb-json", { code: 2, stdout: "", stderr: "", timedOut: false, report });
  assert.equal(result.crashed, true);
  assert.equal(result.stderr, "SyntaxError: invalid syntax");
});

test("a missing btb-json report is a crash, not a pass", () => {
  assert.deepEqual(parseBtbJson(null), { tests: [], crash: "" });
});

test("TAP lines become results, indented subtests are ignored", () => {
  assert.deepEqual(parseTap("TAP version 13\nok 1 - suma\n    ok 1 - inner\nnot ok 2 - resta\n1..2"), [
    { name: "suma", ok: true, message: null },
    { name: "resta", ok: false, message: null },
  ]);
});

test("a node:test run with no tests reported is a crash", () => {
  const result = summarize("node-test", { code: 1, stdout: "", stderr: "SyntaxError\n", timedOut: false });
  assert.equal(result.crashed, true);
  assert.equal(result.ok, false);
  assert.equal(result.stderr, "SyntaxError");
});

test("an exit code run passes on 0 and keeps the output when it fails", () => {
  assert.equal(summarize("exit-code", { code: 0, stdout: "", stderr: "", timedOut: false }).ok, true);
  const failed = summarize("exit-code", { code: 1, stdout: "2 + 3 should be 5", stderr: "", timedOut: false });
  assert.equal(failed.ok, false);
  assert.match(failed.tests[0].message, /should be 5/);
});

test("a timed out run is never ok", () => {
  const stdout = '{"btb":1,"name":"a","ok":true,"message":null}';
  assert.equal(summarize("node-test", { code: null, stdout, stderr: "", timedOut: true }).ok, false);
});

test("a failed run is described for Claude with the failing tests", () => {
  const result = summarize("node-test", { code: 1, stdout: '{"btb":1,"name":"suma","ok":false,"message":"1 !== 2"}', stderr: "", timedOut: false });
  assert.equal(describeRun("The reference must pass", result), "The reference must pass, but 1 of 1 tests failed:\n- suma: 1 !== 2");
});

test("TypeScript flags follow the Node version", () => {
  assert.deepEqual(typeScriptFlags("24.1.0"), []);
  assert.deepEqual(typeScriptFlags("22.22.0"), []);
  assert.deepEqual(typeScriptFlags("23.3.0"), ["--experimental-strip-types"]);
  assert.deepEqual(typeScriptFlags("22.10.0"), ["--experimental-strip-types"]);
  assert.equal(typeScriptFlags("20.11.0"), null);
});

test("a streak counts back from today, or from yesterday when today is pending", () => {
  const days = { "2026-10-25": { solved: ["a"] }, "2026-10-26": { solved: ["b"] }, "2026-10-27": { solved: [] } };
  assert.equal(streakDays(days, "2026-10-27"), 2);
  assert.equal(streakDays({ ...days, "2026-10-27": { solved: ["c"] } }, "2026-10-27"), 3);
  assert.equal(streakDays(days, "2026-10-29"), 0);
});

test("clean rounds earn a bonus and hints cost, never below two", () => {
  assert.equal(xpFor({ level: 1, outcome: "clean", hints: 0 }), 15);
  assert.equal(xpFor({ level: 2, outcome: "struggled", hints: 1 }), 12);
  assert.equal(xpFor({ level: 1, outcome: "struggled", hints: 9 }), 2);
});

test("addDays crosses months and years", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
});

test("text helpers draw bars, durations and excerpts", () => {
  assert.equal(bar(1, 4, 4), "█░░░");
  assert.equal(bar(0, 0, 3), "░░░");
  assert.equal(duration(125), "2m 05s");
  assert.equal(duration(42), "42s");
  assert.deepEqual(excerpt("a\nb\nc", 2, 1), [" a", " b", " ..."]);
});
