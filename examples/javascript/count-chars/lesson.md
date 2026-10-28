# Objetos como diccionario

Un objeto de JavaScript puede servir de diccionario: cada llave es un texto y su valor lo que quieras guardar. Para contar cosas, la llave es la cosa y el valor cuántas veces apareció.

```js
const votos = {};
for (const nombre of ["Claire", "Leon", "Claire"]) {
  votos[nombre] = (votos[nombre] ?? 0) + 1;
}
// { Claire: 2, Leon: 1 }
```

`votos[nombre] ?? 0` lee el conteo actual, o 0 cuando la llave todavía no existe. Sin eso, `undefined + 1` te da `NaN`.

`for...of` sobre un string recorre sus caracteres uno por uno, igual que sobre un arreglo.

## Errores típicos
- Olvidar el valor inicial y terminar con `NaN`.
- Normalizar el texto (minúsculas, espacios) dentro del bucle una y otra vez en lugar de una sola vez antes.
- Usar `obj.nombre` cuando la llave está en una variable: va `obj[nombre]`.

## Para pensar
¿Qué cambia si en lugar de un objeto usas un `Map`? ¿Cuándo importaría?
