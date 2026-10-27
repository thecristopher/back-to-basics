import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { groupBy } from "./solution.js";

const claire = { name: "Claire Redfield", game: "Resident Evil" };
const malenia = { name: "Malenia", game: "Elden Ring" };
const leon = { name: "Leon Kennedy", game: "Resident Evil" };

const realGroupBy = Object.groupBy;
before(() => {
  Object.groupBy = () => {
    throw new Error("Sin Object.groupBy, con tus propias manos");
  };
});
after(() => {
  Object.groupBy = realGroupBy;
});

test("agrupa a Claire, Malenia y Leon por juego", () => {
  assert.deepEqual(groupBy([claire, malenia, leon], (character) => character.game), {
    "Resident Evil": [claire, leon],
    "Elden Ring": [malenia],
  });
});

test("guarda los mismos objetos, no copias", () => {
  const groups = groupBy([claire], (character) => character.game);
  assert.equal(groups["Resident Evil"][0], claire);
});

test("agrupa números en pares e impares", () => {
  const parity = (n) => (n % 2 === 0 ? "par" : "impar");
  assert.deepEqual(groupBy([1, 2, 3, 4], parity), { impar: [1, 3], par: [2, 4] });
});

test("regresa un objeto vacío sin elementos", () => {
  assert.deepEqual(
    groupBy([], () => "x"),
    {},
  );
});
