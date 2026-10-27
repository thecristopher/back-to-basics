# Aplanar arreglos

Escribe `flatten(array)`: regresa un arreglo nuevo con todos los elementos, sin importar qué tan anidados estén.

```js
flatten([1, [2, [3, [4]]]]); // [1, 2, 3, 4]
flatten([[], [[]]]); // []
flatten(["Inde", ["Malenia", ["Claire"]]]); // ["Inde", "Malenia", "Claire"]
```

Sin `.flat()` ni `.flatMap()`: los tests los desactivan. No modifiques el arreglo original.
