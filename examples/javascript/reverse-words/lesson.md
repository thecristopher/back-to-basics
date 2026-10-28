# split, join y los espacios

`split(separador)` parte un string en un arreglo y `join(separador)` lo vuelve a unir. Entre los dos puedes reacomodar palabras con métodos de arreglo.

```js
"Claire,Leon,Jill".split(","); // ["Claire", "Leon", "Jill"]
["sab", "dom"].join(" y "); // "sab y dom"
```

Los espacios repetidos son la trampa: `"a  b".split(" ")` da `["a", "", "b"]`. `trim()` quita los de las orillas, y `split(/\s+/)` parte en cualquier cantidad de espacios.

## Errores típicos
- Dejar strings vacíos en el arreglo por espacios dobles.
- Olvidar las orillas y regresar espacios al inicio o al final.
- Usar `reverse()` sobre un arreglo que no es tuyo, porque lo modifica en su lugar.

## Para pensar
¿Qué debería regresar una frase hecha solo de espacios?
