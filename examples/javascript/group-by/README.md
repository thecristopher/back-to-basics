# Agrupar por llave

Escribe `groupBy(items, getKey)`: regresa un objeto donde cada llave es lo que `getKey(item)` regresa, y su valor es el arreglo de elementos con esa llave, en el orden original.

```js
const roster = [
  { name: "Claire Redfield", game: "Resident Evil" },
  { name: "Malenia", game: "Elden Ring" },
  { name: "Leon Kennedy", game: "Resident Evil" },
];

groupBy(roster, (character) => character.game);
// {
//   "Resident Evil": [claire, leon],
//   "Elden Ring": [malenia],
// }
```

Sin `Object.groupBy`, con tus propias manos.
