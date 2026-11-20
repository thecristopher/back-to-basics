import assert from "node:assert/strict";
import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { briefEdges } from "../src/actions/briefs.js";
import { recentBriefs } from "../src/lib/library.js";

test("the edges of Malenia's brief are its first and last lines", () => {
  const text = "\nInde, el Árbol Sagrado espera.\n\nLa flor escarlata no perdona prisas.\n\nTu filo decide el resto.\n";
  assert.deepEqual(briefEdges(text), { opening: "Inde, el Árbol Sagrado espera.", closing: "Tu filo decide el resto." });
});

test("a long opening is clipped so the prompt stays short", () => {
  const { opening } = briefEdges(`${"Claire te deja una nota de amor. ".repeat(10)}\nFin.`);
  assert.equal(opening.length, 163);
  assert.ok(opening.endsWith("..."));
});

test("an empty brief has no edges", () => {
  assert.equal(briefEdges("\n\n"), null);
});

async function writeBriefAt(dir, name, text, seconds) {
  const file = join(dir, name);
  await writeFile(file, text);
  await utimes(file, seconds, seconds);
}

test("Malenia's recent briefs come newest first, across tracks", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "btb-briefs-"));
  const node = join(dataDir, "briefs", "malenia", "node");
  const python = join(dataDir, "briefs", "malenia", "python");
  await mkdir(node, { recursive: true });
  await mkdir(python, { recursive: true });
  await writeBriefAt(node, "aniversario.md", "oldest", 1000);
  await writeBriefAt(python, "playlist.md", "newest", 3000);
  await writeBriefAt(node, "cita.md", "middle", 2000);
  assert.deepEqual(await recentBriefs({ dataDir }, "malenia", 2), ["newest", "middle"]);
});

test("a coach with no briefs yet has none to read", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "btb-briefs-"));
  assert.deepEqual(await recentBriefs({ dataDir }, "claire", 3), []);
});
