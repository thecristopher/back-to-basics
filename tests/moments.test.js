import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanMoments, EXERCISE_MOMENTS, exerciseLine, lacksMoments, speech, withMoments } from "../src/actions/moments.js";

function linesOf(prefix) {
  return Object.fromEntries(EXERCISE_MOMENTS.map((moment) => [moment, `${prefix} ${moment}`]));
}

const herbs = {
  title: "Mezcla de hierbas",
  moments: { claire: { ...linesOf("Claire:"), passed_clean: "Mezclaste las hierbas sin tirar ni una, Inde. +{xp} XP.", failed_again: "Quedan {hints} pistas." } },
};

test("lines that cover every moment are kept, em dashes out", () => {
  const lines = cleanMoments({ ...linesOf("Ada"), ready: "Entra \u2014 sal limpio." });
  assert.equal(lines.ready, "Entra, sal limpio.");
});

test("lines missing a moment are not kept", () => {
  const { skip, ...rest } = linesOf("Leon");
  assert.equal(cleanMoments(rest), null);
});

test("Ada's lines join Claire's on the same exercise", () => {
  const moments = withMoments(herbs.moments, "ada", linesOf("Ada:"));
  assert.deepEqual(Object.keys(moments), ["claire", "ada"]);
  assert.equal(lacksMoments({ moments }, "ada"), false);
  assert.equal(lacksMoments({ moments }, "malenia"), true);
});

test("without a coach or valid lines the moments stay as they were", () => {
  assert.equal(withMoments(herbs.moments, null, linesOf("Ada")), herbs.moments);
});

test("each moment of the exercise gets its own line", () => {
  assert.equal(exerciseLine(herbs, "claire", "ready", {}), "Claire: ready");
  assert.equal(exerciseLine(herbs, "claire", "skip", {}), "Claire: skip");
  assert.equal(exerciseLine(herbs, "claire", "failed_again", { hintsLeft: 2 }), "Quedan 2 pistas.");
});

test("a pass that levels up or ends the day still talks about the exercise", () => {
  const data = { ok: true, outcome: "clean", xp: 12 };
  assert.equal(exerciseLine(herbs, "claire", "level_up", data), "Mezclaste las hierbas sin tirar ni una, Inde. +12 XP.");
  assert.equal(exerciseLine(herbs, "claire", "debrief", { ok: true, outcome: "struggled" }), "Claire: passed_struggled");
});

test("a line the round cannot fill, another coach or a greeting has no exercise line", () => {
  assert.equal(exerciseLine(herbs, "claire", "failed_again", { hintsLeft: 0 }), null);
  assert.equal(exerciseLine(herbs, "malenia", "ready", {}), null);
  assert.equal(exerciseLine(herbs, "claire", "greet", {}), null);
});

test("the exercise's line speaks alone, a level up or the end of the day add theirs after it", () => {
  assert.equal(speech("passed_clean", "Hierbas limpias.", "Ese es mi chico."), "Hierbas limpias.");
  assert.equal(speech("debrief", "Hierbas limpias.", "Súbete a la moto."), "Hierbas limpias. Súbete a la moto.");
  assert.equal(speech("ready", null, "Lee todo."), "Lee todo.");
});
