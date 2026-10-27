# Tu propio Promise.all

Escribe `promiseAll(values)`: igual que `Promise.all`.

- Recibe un arreglo de promesas o valores normales.
- Se resuelve con un arreglo de resultados **en el mismo orden** que la entrada, aunque terminen en otro orden.
- Si alguna se rechaza, se rechaza con ese error.
- Con un arreglo vacío se resuelve con `[]`.

```js
await promiseAll([Promise.resolve("Claire"), "Inde"]); // ["Claire", "Inde"]
```

Sin `Promise.all`, `allSettled`, `any` ni `race`: los tests los desactivan.
