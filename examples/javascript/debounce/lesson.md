# Temporizadores dentro de un closure

`setTimeout(fn, ms)` agenda `fn` y regresa un id. `clearTimeout(id)` cancela lo agendado si todavía no corrió. Guardar ese id dentro de un closure te deja cancelar y reagendar entre llamadas.

```js
function recordatorio(mensaje) {
  let pendiente = null;
  return function () {
    if (pendiente) return;
    pendiente = setTimeout(() => {
      console.log(mensaje);
      pendiente = null;
    }, 1000);
  };
}
```

Este ejemplo ignora las llamadas mientras hay algo agendado. Un debounce hace lo contrario: cada llamada nueva cancela la anterior y vuelve a empezar la cuenta.

Los parámetros rest (`...args`) juntan todos los argumentos en un arreglo, y `fn(...args)` los vuelve a repartir.

## Errores típicos
- Guardar el id en una variable fuera del closure y compartirlo entre funciones distintas.
- Capturar los argumentos de la primera llamada en lugar de los de la última.
- Probar con tiempo real en lugar de relojes falsos.

## Para pensar
¿Qué diferencia hay entre debounce y throttle? ¿Cuál usarías para guardar mientras escribes?
