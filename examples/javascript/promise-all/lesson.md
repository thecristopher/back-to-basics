# Construir una promesa a mano

`new Promise((resolve, reject) => { ... })` te da el control: tú decides cuándo resolver y cuándo rechazar. Solo cuenta la primera vez que llamas a cualquiera de los dos.

```js
function primeraRespuesta(cartas) {
  return new Promise((resolve) => {
    for (const carta of cartas) {
      Promise.resolve(carta).then(resolve);
    }
  });
}
```

`Promise.resolve(x)` convierte cualquier valor en promesa, así tratas igual a las promesas y a los valores normales.

Cuando esperas varias cosas a la vez, cuenta cuántas faltan y guarda cada resultado en su índice, no en el orden en que llegan.

## Errores típicos
- Hacer `push` de los resultados y perder el orden.
- Olvidar resolver de inmediato cuando la entrada está vacía.
- No rechazar en cuanto falla una.

## Para pensar
¿Cómo cambiaría para comportarse como `Promise.allSettled`?
