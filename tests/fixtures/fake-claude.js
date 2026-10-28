// Stands in for `claude -p` in tests: reads the prompt on stdin and answers by its BTB_TASK line.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const EXAMPLES = new URL("../../examples/javascript/", import.meta.url).pathname;
const prompt = readFileSync(0, "utf8");
const task = prompt.match(/^BTB_TASK: (\w+)/m)?.[1];

function example(slug) {
  const folder = join(EXAMPLES, slug);
  const meta = JSON.parse(readFileSync(join(folder, "exercise.json"), "utf8"));
  const read = (name) => readFileSync(join(folder, name), "utf8");
  return {
    slug,
    title: meta.title,
    minutes: meta.minutes,
    concepts: meta.concepts,
    hints: meta.hints,
    readme: read("README.md"),
    lesson: read("lesson.md"),
    starter: read("starter.js"),
    reference: read("reference.js"),
    test: read("solution.test.js"),
  };
}

// rotates through the examples across calls so each forge brings new ones
function nextSlugs(count) {
  const slugs = readdirSync(EXAMPLES).sort();
  const counter = process.env.FAKE_CLAUDE_STATE;
  const start = counter && existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0;
  if (counter) writeFileSync(counter, String(start + count));
  return Array.from({ length: count }, (_, index) => slugs[(start + index) % slugs.length]);
}

function exercises() {
  const count = Number(prompt.match(/^Write (\d+)/m)?.[1] ?? 2);
  const drafts = nextSlugs(count).map(example);
  if (process.env.FAKE_CLAUDE_BROKEN) drafts[0].reference = drafts[0].starter;
  return { exercises: drafts };
}

function fix() {
  const lines = prompt.split("\n");
  const draft = JSON.parse(lines[lines.indexOf("The exercise:") + 1]);
  return example(draft.slug);
}

function path() {
  const levels = [1, 2, 3, 4].map((level) => ({ level, title: `Nivel ${level} de Malenia`, summary: "Paso a paso.", concepts: ["bucles", "closures"], target: 2 }));
  return { rationale: "Claire empieza por lo básico, sin prisa.", startLevel: 1, levels };
}

function profile() {
  return {
    id: "fakelang",
    name: "FakeLang",
    solutionFile: "solution.mjs",
    testFile: "check.mjs",
    importHint: 'import { add } from "./solution.mjs";',
    check: [["{node}", "--version"]],
    test: ["{node}", "{test}"],
    report: "exit-code",
    testGuide: "Exit with code 1 when a check fails.",
    install: "Nothing to install.",
    sample: {
      solution: "export const add = (a, b) => a + b;\n",
      broken: "export const add = (a, b) => a - b;\n",
      test: 'import { add } from "./solution.mjs";\nif (add(2, 3) !== 5) {\n  console.error("2 + 3 should be 5");\n  process.exit(1);\n}\n',
    },
  };
}

function persona() {
  const say = (line) => [line, `${line} Otra vez.`];
  const moments = ["greet", "ready", "failed", "failed_again", "passed_clean", "passed_struggled", "hint", "skip", "level_up", "debrief"];
  const lines = Object.fromEntries(moments.map((moment) => [moment, say(`Melina dice ${moment}.`)]));
  return { name: "Melina", voice: "Calm and kind, she guides without carrying you.", lines: { es: lines } };
}

const answers = { exercises, fix, path, profile, persona };
const MARKDOWN = {
  review: "## Calificación\nCorrección 9/10, Inde estaría orgullosa.\n",
  lesson: "# Closures\nUna función recuerda dónde nació, como Claire recuerda Raccoon City.\n",
  brief: "Inde, hoy toca algo bonito. Lee bien y escríbelo tú.\n",
};
if (MARKDOWN[task]) process.stdout.write(MARKDOWN[task]);
else process.stdout.write(JSON.stringify(answers[task]()));
