# Reintentar

Escribe `retry(fn, attempts)`: llama a `fn` hasta que funcione, con un máximo de `attempts` intentos.

- `fn` puede regresar una promesa o lanzar un error directamente.
- En cuanto un intento funciona, la promesa se resuelve con ese valor y no se vuelve a llamar.
- Si todos fallan, la promesa se rechaza con el error del último intento.

```js
const page = await retry(() => fetch("https://terrasave.org"), 3);
```
