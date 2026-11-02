#!/usr/bin/env node
// Builds a made up back-to-basics world for screenshots: its own config, a placed path, one exercise
// already forged and the coach's briefing, so recording never touches real progress or calls Claude.
//   node scripts/demo-sandbox.mjs <dir> <persona> <track> <example>
// Prints the config path, ready for BTB_CONFIG.
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const FAKE_CLAUDE = join(ROOT, "tests/fixtures/fake-claude.js");
const TODAY = new Date().toISOString().slice(0, 10);

const TRACKS = ["python", "llm"];

const BRIEFS = {
  claire:
    "Bedrock te va a decir que no a veces, igual que Umbrella cerraba puertas en Raccoon City. Hoy aprendes a no rendirte a la primera.\n\nCuando llegue un ThrottlingException, espera y vuelve a intentar, cada vez el doble. Cualquier otro error, lo sueltas de inmediato. Y nada de dormir de verdad: usa el sleep que te pasan.\n",
  malenia:
    "Escucha. Cada palabra de una carta pesa, igual que cada runa. Hoy las cuentas a mano, sin Counter, sin atajos.\n\nPrimero limpia el texto, luego cuenta con un dict, y al final ordena: más frecuentes primero, empates por orden alfabético. Yo te espero en el Haligtree.\n",
};

// the bundled graph gives the levels, the sandbox only says where the learner starts
async function seedTrack(data, track) {
  await mkdir(join(data, "tracks"), { recursive: true });
  const path = { rationale: "Empiezas por la base y el camino termina en problemas de onsite de Amazon, Zillow y Capital One.", startLevel: 1, revision: 1, drawnAt: TODAY };
  await writeFile(join(data, "tracks", `${track}.json`), JSON.stringify({ id: track, path }, null, 2));
}

async function firstConcepts(track) {
  const seed = JSON.parse(await readFile(join(ROOT, "tracks", `${track}.json`), "utf8"));
  return seed.levels[0].concepts.slice(0, 2).map((concept) => concept.id);
}

async function seedExercise(data, track, example) {
  const folder = join(data, "exercises", track, example);
  await cp(join(ROOT, "examples/python", example), folder, { recursive: true });
  const meta = JSON.parse(await readFile(join(folder, "exercise.json"), "utf8"));
  const forged = { ...meta, concepts: await firstConcepts(track), level: 1, difficulty: null, placement: false, language: "python", seq: 1, forgedAt: TODAY };
  await writeFile(join(folder, "exercise.json"), JSON.stringify(forged, null, 2));
}

async function seedBrief(data, persona, track, example) {
  const folder = join(data, "briefs", persona, track);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, `${example}.md`), BRIEFS[persona]);
}

async function main([dir, persona, track, example]) {
  if (!dir || !BRIEFS[persona] || !TRACKS.includes(track) || !example) {
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
