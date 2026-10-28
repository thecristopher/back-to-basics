# Composición con reduce

`reduce` recorre un arreglo cargando un acumulador: cada paso recibe el acumulador y el elemento, y regresa el acumulador nuevo.

```js
const notas = ["te", "quiero", "Inde"];
notas.reduce((frase, palabra) => `${frase} ${palabra}`, "Claire:");
// "Claire: te quiero Inde"
```

Cuando los elementos son funciones, el acumulador puede ser el valor que va pasando de una a otra. Componer es exactamente eso: la salida de una es la entrada de la siguiente.

Los parámetros rest (`...fns`) reciben cualquier cantidad de argumentos como un arreglo.

## Errores típicos
- Olvidar el valor inicial de `reduce` y que el primer elemento haga de acumulador.
- Aplicar las funciones en el orden contrario.
- No contemplar que no llegue ninguna función.

## Para pensar
¿Qué cambia entre `pipe` y `compose`? ¿Cuál se lee mejor en tu código?
