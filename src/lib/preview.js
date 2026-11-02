import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { previewEntry, previewPage, viteOptions } from "../actions/preview.js";
import { previewPrompt } from "../actions/prompts/preview.js";
import { withoutEmDashes } from "../actions/json.js";
import { withoutFences } from "../utils/text.js";
import { exerciseFiles } from "./catalog.js";
import { ask } from "./claude.js";
import { readJsonIfExists, writeJson } from "./files.js";
import { solutionPath } from "./workspace.js";

const DEFAULT_PORT = 5180;

// exercises forged before previews existed get theirs from Claude once, kept beside the reference
async function writeStoredPreview(ctx, exercise) {
  const name = `preview${extname(exercise.files.solution)}`;
  const files = exerciseFiles(exercise);
  const [readme, reference] = await Promise.all([readFile(files.readme, "utf8"), readFile(files.reference, "utf8")]);
  ctx.log(ctx.paint.dim(ctx.t.writingPreview(ctx.coach, exercise.title)));
  const code = await ask(ctx.config.claude, previewPrompt({ title: exercise.title, readme, reference, files: { solutionFile: exercise.files.solution, previewFile: name } }));
  await writeFile(join(exercise.folder, name), withoutEmDashes(withoutFences(code)));
  const meta = join(exercise.folder, "exercise.json");
  const stored = await readJsonIfExists(meta);
  await writeJson(meta, { ...stored, files: { ...stored.files, preview: name } });
  exercise.files = { ...exercise.files, preview: name };
  return join(exercise.folder, name);
}

/**
 * Puts the exercise's preview beside the learner's solution, where they may tweak it to try other props.
 * Claude writes it first when the exercise has none, and again with again.
 * @param {object} ctx
 * @param {object} exercise
 * @param {boolean} again ask Claude for a new one and replace the learner's copy
 * @returns {Promise<string>} the preview in the workspace
 */
export async function previewInWorkspace(ctx, exercise, again) {
  const stored = exerciseFiles(exercise).preview;
  const source = !again && stored && existsSync(stored) ? stored : await writeStoredPreview(ctx, exercise);
  const target = join(dirname(solutionPath(ctx.config, exercise)), exercise.files.preview);
  if (again || !existsSync(target)) await copyFile(source, target);
  return target;
}

async function loadVite(runtime) {
  return import(pathToFileURL(join(runtime, "node_modules", "vite", "dist", "node", "index.js")).href);
}

function untilStopped() {
  return new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
}

/**
 * Serves the preview with the runtime's Vite and opens it in the browser. Every save reloads it.
 * Runs until the process gets SIGINT or SIGTERM.
 * @param {object} ctx
 * @param {{ exercise: object, previewFile: string, runtime: string, port?: number, open?: boolean }} input
 * @returns {Promise<string>} the url it was served at
 */
export async function servePreview(ctx, { exercise, previewFile, runtime, port = DEFAULT_PORT, open = true }) {
  const page = join(runtime, "preview");
  await mkdir(page, { recursive: true });
  await writeFile(join(page, "index.html"), previewPage({ title: exercise.title, subtitle: ctx.t.previewSubtitle, lang: ctx.config.language }));
  await writeFile(join(page, "main.jsx"), previewEntry({ previewFile, broken: ctx.t.previewBroken }));
  const { createServer } = await loadVite(runtime);
  const options = viteOptions({ runtime, page, folder: dirname(previewFile), port });
  const server = await createServer({ ...options, server: { ...options.server, open } });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  ctx.log(ctx.t.previewAt(exercise.title, url));
  await untilStopped();
  await server.close();
  return url;
}
