# Debounce

Escribe `debounce(fn, ms)`: regresa una función que espera `ms` milisegundos de calma antes de llamar a `fn`.

- Si la llaman de nuevo antes de tiempo, el reloj vuelve a empezar.
- `fn` recibe los argumentos de la **última** llamada.
- La función regresada tiene `.cancel()`, que descarta la llamada pendiente.

```js
const save = debounce((text) => saveDraft(text), 300);
save("te");
save("te quiero");

// con draft guardando cada llamada que le llega:
const save = debounce(draft.fn, 300);
save("te");
save("te quiero", "Inde");
// 300 ms después, draft.calls es [["te quiero", "Inde"]]
// 300 ms después: saveDraft("te quiero"), una sola vez
```
