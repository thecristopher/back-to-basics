# Bucles con acumulador

## Qué es

Un acumulador es una variable que resume un arreglo mientras lo recorres. Empieza en un valor neutro, el que no cambia el resultado (0 para sumar, 1 para multiplicar, `""` para juntar texto), y en cada vuelta del bucle se actualiza con el elemento de esa vuelta. Al terminar el bucle, el acumulador ya tiene la respuesta.

Existe porque casi todo lo que haces con una lista es resumirla: un total, un conteo, el más grande. El acumulador es la forma más directa de llevar ese resumen.

## Cómo funciona

- `let total = 0` crea el acumulador antes del bucle. Si lo crearas adentro, volvería a 0 en cada vuelta.
- `for (const n of numeros)` toma los elementos uno por uno, en orden, y ejecuta el cuerpo una vez por cada uno.
- `total += n` es lo mismo que `total = total + n`: lee el valor viejo, le suma y guarda el nuevo.
- Un `if` dentro del bucle decide qué elementos cuentan. Los que no pasan la condición simplemente no tocan el acumulador.
- El operador `%` da el residuo de una división: `7 % 2` es `1`, `8 % 2` es `0`. Un número es par cuando su residuo entre 2 es `0`.
- El `return` va después del bucle, cuando ya se recorrió todo.

## Ejemplos

Sumar todos los minutos de nuestras citas:

```js
let minutosJuntos = 0;
for (const cita of [90, 45, 120]) {
  minutosJuntos += cita;
}
// 255
```

Las vueltas dejan el acumulador en 90, luego 135 y al final 255.

Contar solo las citas largas, con un `if` adentro:

```js
let largas = 0;
for (const cita of [90, 45, 120]) {
  if (cita > 60) largas += 1;
}
// 2
```

El 45 no pasa la condición, así que el contador solo sube con 90 y 120.

Multiplicar necesita otro valor neutro:

```js
let producto = 1;
for (const n of [2, 3, 4]) producto *= n;
// 24
```

Si empezara en 0, cualquier multiplicación daría 0.

## Errores típicos

- Empezar el acumulador sin valor: `let total;` deja `undefined`, y `undefined + 2` es `NaN`. Siempre arranca en el neutro.
- Revisar paridad con `=== 1`, que falla con los negativos impares porque `-3 % 2` es `-1`:

  ```js
  if (n % 2 === 1) // mal: -3 no entra como impar
  if (n % 2 !== 0) // bien: cualquier residuo distinto de 0 es impar
  ```

- Poner el `return` dentro del bucle: la función termina en la primera vuelta.
- Modificar el arreglo que te pasaron en lugar de solo leerlo.

## Para pensar

¿Por qué el acumulador de una suma empieza en 0 y el de una multiplicación en 1, y qué regresaría cada uno si el arreglo llega vacío?
