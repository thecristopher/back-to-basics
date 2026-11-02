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
    example: meta.example,
    readme: read("README.md"),
    lesson: read("lesson.md"),
    starter: read("starter.js"),
    reference: read("reference.js"),
    test: read("solution.test.js"),
  };
}

// a prompt aimed at a graph names the concept to teach and the ids allowed, the fake tags with them like Claude must
function aimedConcepts(fallback) {
  const primary = prompt.match(/^Set "concepts" to .*, "([a-z0-9-]+)" first\.$/m)?.[1];
  if (primary) return [primary];
  const allowed = prompt.match(/^It may lean on concepts .*?: ([a-z0-9-]+) \(/m)?.[1];
  return allowed ? [allowed] : fallback;
}

// stands in for the wrong solutions Claude writes: the starter fails every test without crashing, so it is caught.
// FAKE_CLAUDE_WEAK makes the first one the reference, a wrong solution the tests would let through
function mutants(draft, weak = false) {
  return [
    { mistake: "olvida la carta vacía de Inde", nudge: "¿Qué pasa cuando Inde no escribió ninguna carta?", code: `${weak ? draft.reference : draft.starter}\n// olvida el caso vacío\n` },
    { mistake: "se pasa por uno al contar las runas de Malenia", nudge: "¿Dónde empieza y dónde termina tu cuenta de runas?", code: `${draft.starter}\n// se pasa por uno\n` },
  ];
}

// rotates through the examples across calls so each forge brings new ones
function nextSlugs(count) {
  const slugs = readdirSync(EXAMPLES).sort();
  const counter = process.env.FAKE_CLAUDE_STATE;
  const start = counter && existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0;
  if (counter) writeFileSync(counter, String(start + count));
  return Array.from({ length: count }, (_, index) => slugs[(start + index) % slugs.length]);
}

// a bug hunt hands back sum-evens with the mistake of dropping the negative evens: it passes every test but one
function bugHunt() {
  const draft = example("sum-evens");
  draft.starter = "export function sumEvens(numbers) {\n  let total = 0;\n  for (const n of numbers) if (n % 2 === 0 && n > 0) total += n;\n  return total;\n}\n";
  return draft;
}

// the onsite levels declare their Big O, and one test checks it
function declareComplexity(draft) {
  draft.starter += 'export const COMPLEXITY = "";\n';
  draft.reference += 'export const COMPLEXITY = "O(n)";\n';
  draft.test += '\nimport { COMPLEXITY } from "./solution.js";\ntest("declara su complejidad", () => assert.equal(COMPLEXITY, "O(n)"));\n';
}

function exercises() {
  const count = Number(prompt.match(/^Write (\d+)/m)?.[1] ?? 2);
  const drafts = prompt.includes("Format: bug hunt") ? [bugHunt()] : nextSlugs(count).map(example);
  if (prompt.includes("Complexity: the solution also declares")) drafts.forEach(declareComplexity);
  for (const draft of drafts) draft.concepts = aimedConcepts(draft.concepts);
  if (prompt.includes('"mutants"')) for (const draft of drafts) draft.mutants = mutants(draft, Boolean(process.env.FAKE_CLAUDE_WEAK));
  if (process.env.FAKE_CLAUDE_BROKEN) drafts[0].reference = drafts[0].starter;
  // a coach with a voice is asked for her lines about each exercise
  if (prompt.includes('"moments"')) for (const draft of drafts) draft.moments = moments(draft.title);
  return { exercises: drafts };
}

function moments(title = prompt.match(/^Exercise: (.+)$/m)?.[1]) {
  return {
    ready: `${title}: lee bien, Inde.`,
    failed: `${title} se resiste.`,
    failed_again: `${title} otra vez, quedan {hints} pistas.`,
    hint: `Una pista para ${title}.`,
    skip: `${title} vuelve mañana.`,
    passed_clean: `${title} cayó limpio, Inde. +{xp} XP para la cita.`,
    passed_struggled: `${title} te dio pelea, pero es tuyo.`,
  };
}

function fix() {
  const lines = prompt.split("\n");
  const draft = JSON.parse(lines[lines.indexOf("The exercise:") + 1]);
  const fixed = { ...example(draft.slug), concepts: draft.concepts };
  return draft.mutants ? { ...fixed, mutants: mutants(fixed) } : fixed;
}

function path() {
  const concepts = (level) => [
    { id: `bucles-${level}`, title: `Bucles ${level}`, use: "Recorrer las cartas de Inde." },
    { id: `closures-${level}`, title: `Closures ${level}`, use: "Recordar la playlist de Claire." },
  ];
  const levels = [1, 2, 3, 4].map((level) => ({ level, title: `Nivel ${level} de Malenia`, summary: "Paso a paso.", concepts: concepts(level) }));
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

function statement() {
  return {
    readme: "# Explicado\n\n## La historia\n\nClaire le explica a Inde, paso a paso, qué hay que construir.\n",
    hints: ["Empieza por la carta de Claire.", "Usa un for...of: `for (const nota of notas) {}`.", "La forma: `let total = 0; ... return total;`."],
  };
}

const answers = { exercises, fix, path, profile, persona, statement, moments: () => moments() };
const MARKDOWN = {
  review: "## Calificación\nCorrección 9/10, Inde estaría orgullosa.\n",
  lesson: "# Closures\nUna función recuerda dónde nació, como Claire recuerda Raccoon City.\n",
  brief: "Inde, hoy toca algo bonito. Lee bien y escríbelo tú.\n",
  recall: "Casi, Inde: la función recuerda su scope, no una copia.\n",
  greet: "Hola, Inde. Ayer peleaste bonito, hoy seguimos.\n",
  debrief: "Cerramos el día, Inde. Mañana más.\n",
  preview: '```jsx\nimport { LikeButton } from "./solution.jsx";\n\nexport default function Preview() {\n  return <LikeButton initial={14} />;\n}\n```\n',
};
if (MARKDOWN[task]) process.stdout.write(MARKDOWN[task]);
else process.stdout.write(JSON.stringify(answers[task]()));
