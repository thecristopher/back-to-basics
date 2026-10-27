# Solo una vez

Escribe `once(fn)`: regresa una función que llama a `fn` solo la primera vez. Las siguientes llamadas regresan el primer resultado sin volver a llamarla.

- Pasa los argumentos a `fn`.
- Respeta el `this` con el que se llama.

```js
const confess = once((name) => `te quiero, ${name}`);
confess("Inde"); // "te quiero, Inde"
confess("Wesker"); // "te quiero, Inde" (no se repite)
```
