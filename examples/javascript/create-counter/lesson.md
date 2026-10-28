# Closures y estado privado

Una función recuerda las variables del lugar donde nació, aunque ese lugar ya haya terminado de ejecutarse. Eso es un closure, y es la forma más simple de tener estado que nadie de afuera puede tocar.

```js
function crearPlaylist() {
  const canciones = [];
  return {
    agregar(cancion) {
      canciones.push(cancion);
      return canciones.length;
    },
  };
}

const nuestra = crearPlaylist();
nuestra.agregar("Moonlight"); // 1
nuestra.canciones; // undefined, nadie la ve desde afuera
```

Cada llamada a `crearPlaylist()` crea su propio `canciones`. Dos playlists nunca se mezclan.

Los parámetros por defecto (`function f(x = 0)`) se usan cuando el argumento llega como `undefined`.

## Errores típicos
- Guardar el estado afuera de la función fábrica: todas las instancias lo compartirían.
- Regresar una copia del valor en lugar de leerlo en cada llamada.

## Para pensar
¿Qué pasa si dos métodos del objeto modifican la misma variable del closure?
