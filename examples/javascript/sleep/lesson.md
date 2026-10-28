# Envolver un callback en una promesa

Muchas APIs viejas avisan con un callback. Envolverlas en `new Promise` te deja usarlas con `await`.

```js
function cuandoLlegue(cita, alLlegar) {
  // una API de callback cualquiera
}

function esperarCita(cita) {
  return new Promise((resolve) => cuandoLlegue(cita, resolve));
}

await esperarCita("cena con Inde");
```

El truco es pasar `resolve` como el callback: cuando la API avisa, la promesa se resuelve.

`setTimeout` es justo una API de callback: recibe la función y los milisegundos.

## Errores típicos
- Llamar a `resolve()` de inmediato en lugar de pasarlo como callback.
- Olvidar regresar la promesa.
- Pasar los argumentos de `setTimeout` en el orden contrario.

## Para pensar
¿Cómo harías una versión que se pueda cancelar antes de tiempo?
