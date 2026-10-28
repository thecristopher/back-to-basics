# async/await con try/catch

Dentro de una función `async`, `await` espera una promesa y `try/catch` atrapa tanto errores lanzados directamente como promesas rechazadas.

```js
async function leerCarta(buzon) {
  try {
    return await buzon.abrir();
  } catch (error) {
    return "el buzón estaba vacío";
  }
}
```

El `await` dentro del `try` es importante: sin él, la promesa rechazada escapa del bloque.

Un bucle con salida temprana (`return` adentro del `for`) termina en cuanto tienes lo que buscabas, sin seguir intentando.

## Errores típicos
- Hacer `return fn()` sin `await` dentro del `try` y que el error no se atrape.
- Seguir intentando después de un éxito.
- Tragarse el último error en lugar de rechazar con él.

## Para pensar
¿Cómo agregarías una espera creciente entre intentos sin que los tests tarden de verdad?
