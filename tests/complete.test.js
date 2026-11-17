import assert from "node:assert/strict";
import test from "node:test";
import { accuracyOf, closingLines, lessonCard, levelUpLines, takeawayOf, workedTime, wrapWords } from "../src/actions/complete.js";
import es from "../src/i18n/es.js";
import { bar, createPaint } from "../src/utils/text.js";

const ctx = { t: es, paint: createPaint(false) };
const loveLetter = "# Closures\n\nUna función recuerda dónde nació,\ncomo Claire recuerda Raccoon City.\n\n## Errores típicos\n- Olvidar el return.";

test("Claire's exercise keeps the takeaway it was forged with", () => {
  assert.equal(takeawayOf({ takeaway: " Pon el caso más específico arriba. " }, loveLetter), "Pon el caso más específico arriba.");
});

test("an exercise forged before takeaways teaches the first paragraph of its lesson", () => {
  assert.equal(takeawayOf({}, loveLetter), "Una función recuerda dónde nació, como Claire recuerda Raccoon City.");
});

test("a lesson with no prose leaves nothing to take away", () => {
  assert.equal(takeawayOf({}, "# Título\n\n```js\nconst x = 1;\n```"), null);
  assert.equal(takeawayOf(undefined, null), null);
});

test("Malenia's first try is a perfect accuracy and every failed submit lowers it", () => {
  assert.equal(accuracyOf({ failures: 0 }), 100);
  assert.equal(accuracyOf({ failures: 1 }), 50);
  assert.equal(accuracyOf({ failures: 3 }), 25);
  assert.equal(accuracyOf({}), 100);
});

test("a long love note wraps between words, never inside one", () => {
  const lines = wrapWords("Inde guarda cada nota de amor en la playlist que comparten los domingos", 20);
  assert.ok(lines.every((line) => line.length <= 20));
  assert.equal(lines.join(" "), "Inde guarda cada nota de amor en la playlist que comparten los domingos");
});

test("the card closes Inde's anniversary lesson with the numbers, the goal and what it taught", () => {
  const data = { title: "Aniversario de Inde", passed: 5, total: 5, outcome: "clean", xp: 10, accuracy: 100, hints: 0, streak: 3, takeaway: "Gana la primera condición que se cumple.", seconds: 900, activeSeconds: 134, minutes: 10, dayXp: 10, dailyGoal: 40 };
  assert.deepEqual(lessonCard(ctx, data), [
    "★ ¡Lección completada! ★",
    "Aniversario de Inde · 5/5 tests · Limpio",
    "+10 XP   Precisión 100%   Racha 🔥 3",
    "2m 14s (dentro de 10 min)",
    "Meta del día ███░░░░░░░ 10/40 XP",
    "",
    "Lo que aprendiste",
    "  Gana la primera condición que se cumple.",
  ]);
});

test("a hard fought round shows the hints it bought and skips what is missing", () => {
  const data = { title: "Cita con Malenia", passed: 4, total: 4, outcome: "struggled", xp: 6, accuracy: 50, hints: 1, streak: 0, takeaway: null, seconds: null, minutes: 10 };
  assert.deepEqual(lessonCard(ctx, data), ["★ ¡Lección completada! ★", "Cita con Malenia · 4/4 tests · Con batalla", "+6 XP   Precisión 50%   1 pista"]);
});

test("Malenia's day past its goal shows the bar full and met", () => {
  const data = { title: "Duelo", passed: 1, total: 1, outcome: "clean", xp: 20, accuracy: 100, hints: 0, streak: 1, takeaway: null, seconds: null, minutes: 10, dayXp: 55, dailyGoal: 40 };
  assert.ok(lessonCard(ctx, data).includes("Meta del día ██████████ 55/40 XP ¡cumplida!"));
});

test("the time is the real work the editor measured, never beside a contradicting clock", () => {
  assert.equal(workedTime(es, { seconds: 0, activeSeconds: 100, minutes: 15 }), "1m 40s (dentro de 15 min)");
});

test("without a measure the clock tells the time, and past the target it says so", () => {
  assert.equal(workedTime(es, { seconds: 1200, activeSeconds: null, minutes: 15 }), "20m 00s (meta: 15 min)");
  assert.equal(workedTime(es, { seconds: null, minutes: 15 }), "");
});

test("the lesson's closing question follows the card with how to answer it", () => {
  const lines = closingLines(ctx, { id: "node/carta-de-claire", question: "¿Qué recuerda la carta que Claire guardó?" });
  assert.deepEqual(lines, ["", "Para cerrar", "  ¿Qué recuerda la carta que Claire guardó?", 'Responde con tus palabras: btb recall node/carta-de-claire --closing --answer="..."']);
});

test("a lesson that asks nothing closes without a question", () => {
  assert.deepEqual(closingLines(ctx, { id: "x", question: null }), []);
});

test("a progress bar past its total stays full instead of breaking", () => {
  assert.equal(bar(55, 40, 4), "████");
});

test("Malenia's level up gets a block of its own after the lesson", () => {
  assert.deepEqual(levelUpLines(ctx, { levelUp: 2 }, "Malenia"), ["", "▲ ¡Subiste de nivel! Nivel 2 superado ▲", "Malenia ajusta lo que sigue con lo que acabas de mostrar."]);
});

test("a pass that stays on its level has no level up block", () => {
  assert.deepEqual(levelUpLines(ctx, { levelUp: null }, "Malenia"), []);
});
