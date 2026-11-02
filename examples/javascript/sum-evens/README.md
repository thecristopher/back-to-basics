# Suma de pares

## La historia

Inde Navarrete lleva la cuenta de las cartas que le escribes a Claire cada semana. Solo las semanas con un número par de cartas cuentan para el álbum del aniversario, y quiere saber cuántas cartas suman esas semanas juntas.

## Qué vas a construir

Una función llamada `sumEvens`:

```js
export function sumEvens(numbers) { ... }
```

- Recibe `numbers`, un arreglo de enteros. Cada entero es el número de cartas de una semana.
- Regresa un solo número: la suma de los enteros del arreglo que son pares.

## Cómo se comporta

- Un número es par cuando se puede dividir entre 2 sin que sobre nada: `4` es par, `7` no.
- Solo los pares entran a la suma, los impares se ignoran.
- Si no hay ningún par, o el arreglo está vacío, la suma es `0`.
- Los negativos también cuentan: `-4` es par y resta en la suma.
- No cambies el arreglo que recibes, solo léelo.

## Un ejemplo paso a paso

```js
sumEvens([1, 2, 3, 4]); // 6
sumEvens([7, 9]); // 0
```

En el primero recorres los números uno por uno: `1` es impar y se ignora, `2` es par y la suma va en `2`, `3` es impar, `4` es par y la suma llega a `6`. En el segundo ninguno es par, así que la suma se queda en `0`, el valor con el que empezó.

## Lo que vas a usar

El operador `%` te da el residuo de una división: lo que sobra. Si el residuo de dividir entre 2 es `0`, el número es par. Un ejemplo con otros datos:

```js
10 % 3; // 1, porque 10 entre 3 da 3 y sobra 1
```
