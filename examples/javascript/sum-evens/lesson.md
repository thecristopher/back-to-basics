# Bucles con acumulador

El patrón más básico para resumir un arreglo: una variable que empieza en un valor neutro y se actualiza en cada vuelta.

```js
let minutosJuntos = 0;
for (const cita of [90, 45, 120]) {
  minutosJuntos += cita;
}
// 255
```

Para quedarte solo con algunos elementos, un `if` dentro del bucle decide cuáles suman.

El operador `%` da el residuo: `n % 2 === 0` es par. Con negativos el residuo puede ser `-0` o negativo, compara con `=== 0` y no con `> 0`.

## Errores típicos
- Empezar el acumulador en `undefined`.
- Revisar la paridad con `n % 2 === 1`, que falla con los negativos impares (`-3 % 2` es `-1`).
- Modificar el arreglo que te pasaron.

## Para pensar
¿Cómo se ve con `filter` y `reduce`? ¿Cuál es más claro a las 2 AM?
