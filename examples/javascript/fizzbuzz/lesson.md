# El orden de las condiciones

Cuando varias condiciones pueden ser verdad a la vez, la primera que se cumple gana. Por eso el caso más específico va primero.

```js
function etiqueta(edad) {
  if (edad >= 65) return "mayor";
  if (edad >= 18) return "adulto";
  return "menor";
}
```

Si `edad >= 18` fuera primero, nadie llegaría nunca a "mayor". Las condiciones que se traslapan se ordenan de la más estrecha a la más amplia.

El operador `%` da el residuo de una división: `n % k === 0` dice que `n` es múltiplo de `k`.

## Errores típicos
- Revisar los casos simples primero y que el caso combinado nunca llegue.
- Empezar el bucle en 0 cuando el rango empieza en 1.
- Regresar números donde se esperaban strings.

## Para pensar
Si un número es múltiplo de 3 y de 5 a la vez, ¿por qué la condición combinada tiene que revisarse antes que las simples?
