# Funciones como parámetro

Pasar una función como argumento deja que quien llama decida una parte del comportamiento. Tu código hace el recorrido, la función decide el detalle.

```js
function contarSi(items, cumple) {
  let total = 0;
  for (const item of items) {
    if (cumple(item)) total += 1;
  }
  return total;
}

const citas = [{ con: "Inde", dia: "sab" }, { con: "Inde", dia: "dom" }];
contarSi(citas, (cita) => cita.dia === "sab"); // 1
```

Para agrupar, la función te da la llave y tú decides dónde guardar cada elemento. Un objeto vacío más `obj[llave] ??= []` crea el grupo la primera vez que aparece.

## Errores típicos
- Reiniciar el grupo cada vez en lugar de solo cuando no existe.
- Perder el orden original al ordenar o al usar estructuras que no lo respetan.
- Llamar a la función con argumentos distintos de los que promete.

## Para pensar
¿Qué ganas y qué pierdes escribiéndolo con `reduce` en lugar de `for...of`?
