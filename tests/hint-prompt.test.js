import assert from "node:assert/strict";
import { test } from "node:test";
import { hintPrompt } from "../src/actions/prompts/hint.js";

const playlist = {
  title: "Playlist de aniversario",
  readme: "# Playlist de aniversario\nClaire arma la playlist para Inde.\n",
  code: "export function playlist(songs) {\n  const picked = songs.filter((song) => song.loved);\n}\n",
  run: { passed: 1, total: 3, failures: [{ name: "Claire elige las canciones favoritas de Inde", message: "expected [ 'Leon' ] got undefined" }] },
  reference: "export function playlist(songs) {\n  return songs.filter((song) => song.loved).map((song) => song.title);\n}\n",
  planned: "Fíjate qué regresa tu función.",
  earlier: [],
  step: 1,
  total: 3,
  language: "es",
};

test("the hint prompt carries Inde's code and the failing test with its message", () => {
  const prompt = hintPrompt(playlist);
  assert.match(prompt, /^BTB_TASK: hint/);
  assert.match(prompt, /const picked = songs\.filter/);
  assert.match(prompt, /1 of 3 tests pass\. Failing:/);
  assert.match(prompt, /- Claire elige las canciones favoritas de Inde/);
  assert.match(prompt, /expected \[ 'Leon' \] got undefined/);
});

test("the hint is about the code, not a recap of the lesson", () => {
  const prompt = hintPrompt(playlist);
  assert.match(prompt, /Not a recap of the lesson/);
  assert.match(prompt, /never shown or quoted/);
  assert.match(prompt, /One to three sentences in Spanish/);
});

test("the planned hint sets the depth and the step says how concrete to get", () => {
  const prompt = hintPrompt({ ...playlist, step: 3 });
  assert.match(prompt, /hint 3 of 3/);
  assert.match(prompt, /depth to aim for: Fíjate qué regresa tu función\./);
});

test("the hints Inde already got are listed so they are not repeated", () => {
  const prompt = hintPrompt({ ...playlist, earlier: ["Tu función no regresa nada."] });
  assert.match(prompt, /do not repeat them:\n- Tu función no regresa nada\./);
});

test("a run that timed out or crashed says so instead of listing tests", () => {
  assert.match(hintPrompt({ ...playlist, run: { ...playlist.run, timedOut: true } }), /The tests timed out/);
  const crashed = hintPrompt({ ...playlist, run: { ...playlist.run, crashed: true, stderr: "SyntaxError: Malenia no cerró la llave" } });
  assert.match(crashed, /crashed before the tests could run:\n {4}SyntaxError: Malenia no cerró la llave/);
});

test("a passing run tells Claude every test passes", () => {
  assert.match(hintPrompt({ ...playlist, run: { passed: 3, total: 3, failures: [] } }), /All 3 tests pass\./);
});

test("the hint prompt carries no em dash", () => {
  assert.doesNotMatch(hintPrompt(playlist), /\u2014/);
});
