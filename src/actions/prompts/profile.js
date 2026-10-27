const SCHEMA = JSON.stringify({
  id: "kebab-case",
  name: "Language name",
  solutionFile: "solution.ext",
  testFile: "test file name",
  importHint: "how the test file imports the solution, one line of code",
  check: [["tool", "--version"]],
  test: ["command", "that", "runs", "{test}"],
  report: "tap or exit-code",
  testGuide: "how exercise tests must be written: framework, assertions, faking time",
  install: "how to install the toolchain on this platform",
  sample: { solution: "a tiny correct solution", broken: "the same with a bug", test: "a tiny test for it" },
});

/**
 * The prompt that asks Claude how to run tests for a language back-to-basics does not know yet.
 * @param {{ language: string, platform: string, problems?: string[] }} input problems from a previous attempt, if any
 * @returns {string}
 */
export function profilePrompt({ language, platform, problems = [] }) {
  return [
    "BTB_TASK: profile",
    `back-to-basics grades exercises by running tests. Describe how to run them for ${language} on ${platform}.`,
    "",
    "How it runs: the solution file and the test file are written into one fresh folder, the test command runs from that folder,",
    "and the verdict comes from the report: with report tap, top level TAP lines (ok 1 - name, not ok 2 - name); with report exit-code, exit code 0 means every test passed.",
    "Placeholders you can use in commands: {test} and {solution} (absolute paths), {dir} (the folder), {testRel} (the test file name).",
    "",
    "Rules:",
    "- Use the language's standard toolchain and its most common test framework. Prefer one that prints TAP, otherwise use exit-code.",
    "- The test command must not install anything, download anything or need a project scaffold beyond those two files.",
    "- check commands only print versions of the tools the test command needs.",
    "- sample.solution passes sample.test, and sample.broken fails it.",
    "- Never use em dashes.",
    problems.length > 0 ? `\nA previous attempt failed like this, fix it:\n${problems.map((problem) => `- ${problem}`).join("\n")}` : "",
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    SCHEMA,
  ].join("\n");
}
