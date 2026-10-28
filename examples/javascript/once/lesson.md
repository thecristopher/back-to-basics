# Funciones de orden superior y this

Una función de orden superior recibe una función y regresa otra que la envuelve. La envoltura decide cuándo y cómo llamar a la original.

```js
function conAviso(fn) {
  return function (...args) {
    console.log("llamando con", args);
    return fn.apply(this, args);
  };
}
```

`fn.apply(this, args)` llama a `fn` con el mismo `this` con el que llamaron a la envoltura y con sus argumentos. Si usas una arrow function como envoltura, el `this` ya no es el de quien llama.

Para recordar algo entre llamadas, como si ya pasó o qué regresó, usa variables del closure.

## Errores típicos
- Envolver con una arrow function y perder el `this`.
- Guardar el resultado pero seguir llamando a la función original.
- Usar `undefined` como bandera cuando `fn` puede regresar `undefined`.

## Para pensar
¿Qué debería pasar si `fn` lanza un error la primera vez?
