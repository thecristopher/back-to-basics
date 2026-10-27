# Dormir un rato

Escribe `sleep(ms)`: regresa una promesa que se resuelve después de `ms` milisegundos.

```js
await sleep(1000); // espera un segundo
console.log("ya");
```

Los tests usan relojes falsos, así que no esperan de verdad.
