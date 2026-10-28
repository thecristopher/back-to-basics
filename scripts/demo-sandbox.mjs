#!/usr/bin/env node
// Builds a made up back-to-basics world for screenshots: its own config, a drawn path, one exercise
// already forged and the coach's briefing, so recording never touches real progress or calls Claude.
//   node scripts/demo-sandbox.mjs <dir> <persona> <track> <example>
// Prints the config path, ready for BTB_CONFIG.
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const FAKE_CLAUDE = join(ROOT, "tests/fixtures/fake-claude.js");
const TODAY = new Date().toISOString().slice(0, 10);

const PATHS = {
  python: [
    ["Lo básico de Python", ["strings", "listas", "dicts", "bucles"]],
    ["Comprehensions y la librería estándar", ["comprehensions", "collections", "itertools"]],
    ["Funciones, closures y decoradores", ["closures", "decoradores", "*args"]],
    ["Clases y dataclasses", ["dataclasses", "dunder methods", "protocols"]],
    ["Generators y context managers", ["yield", "with", "iteradores"]],
    ["asyncio", ["gather", "timeouts", "semaphores"]],
    ["Entrevista: estructuras de datos", ["heaps", "grafos", "dos punteros"]],
    ["Entrevista: diseño backend", ["LRU con TTL", "rate limiter", "ventanas de fraude"]],
  ],
  llm: [
    ["Mensajes y prompts", ["Converse API", "system prompts", "historial"]],
    ["Bedrock con boto3", ["converse", "stopReason", "tokens y costo"]],
    ["Streaming", ["converse_stream", "deltas", "metadata"]],
    ["Salida estructurada", ["JSON", "pydantic", "reintento"]],
    ["Tool use", ["toolConfig", "toolUse", "toolResult"]],
    ["Resiliencia y costo", ["ThrottlingException", "backoff", "fallback de modelo"]],
    ["Entrevista: RAG con evals", ["citas", "golden sets", "LLM como juez"]],
    ["Entrevista: gateway de Bedrock", ["rate limit", "fallback", "límites de costo"]],
  ],
};

const BRIEFS = {
  claire:
    "Bedrock te va a decir que no a veces, igual que Umbrella cerraba puertas en Raccoon City. Hoy aprendes a no rendirte a la primera.\n\nCuando llegue un ThrottlingException, espera y vuelve a intentar, cada vez el doble. Cualquier otro error, lo sueltas de inmediato. Y nada de dormir de verdad: usa el sleep que te pasan.\n",
  malenia:
    "Escucha. Cada palabra de una carta pesa, igual que cada runa. Hoy las cuentas a mano, sin Counter, sin atajos.\n\nPrimero limpia el texto, luego cuenta con un dict, y al final ordena: más frecuentes primero, empates por orden alfabético. Yo te espero en el Haligtree.\n",
};

function drawnPath(track) {
  const levels = PATHS[track].map(([title, concepts], index) => ({ level: index + 1, title, summary: "Paso a paso, a mano.", concepts, target: 3 }));
  return { rationale: "Empiezas por la base y el camino termina en problemas de onsite de Amazon, Zillow y Capital One.", startLevel: 1, levels, revision: 1, drawnAt: TODAY };
}

async function seedTrack(data, track) {
  const seed = JSON.parse(await readFile(join(ROOT, "tracks", `${track}.json`), "utf8"));
  await mkdir(join(data, "tracks"), { recursive: true });
  await writeFile(join(data, "tracks", `${track}.json`), JSON.stringify({ ...seed, id: track, path: drawnPath(track) }, null, 2));
}

async function seedExercise(data, track, example) {
  const folder = join(data, "exercises", track, example);
  await cp(join(ROOT, "examples/python", example), folder, { recursive: true });
  const meta = JSON.parse(await readFile(join(folder, "exercise.json"), "utf8"));
  const forged = { ...meta, level: 1, difficulty: null, placement: false, language: "python", seq: 1, forgedAt: TODAY };
  await writeFile(join(folder, "exercise.json"), JSON.stringify(forged, null, 2));
}

async function seedBrief(data, persona, track, example) {
  const folder = join(data, "briefs", persona, track);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, `${example}.md`), BRIEFS[persona]);
}

async function main([dir, persona, track, example]) {
  if (!dir || !BRIEFS[persona] || !PATHS[track] || !example) {
    throw new Error("usage: demo-sandbox.mjs <dir> <claire|malenia> <python|llm> <example>");
  }
  const sandbox = resolve(dir);
  const data = join(sandbox, "data");
  await seedTrack(data, track);
  await seedExercise(data, track, example);
  await seedBrief(data, persona, track, example);
  const config = {
    language: "es",
    tracks: [track],
    dailyNew: 1,
    persona,
    forgeBatch: 1,
    workspace: join(sandbox, "workspace"),
    dataDir: data,
    claude: { command: [process.execPath, FAKE_CLAUDE] },
  };
  const file = join(sandbox, "btb.config.json");
  await writeFile(file, JSON.stringify(config, null, 2));
  console.log(file);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
