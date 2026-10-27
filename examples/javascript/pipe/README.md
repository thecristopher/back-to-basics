# Tubería de funciones

Escribe `pipe(...fns)`: regresa una función que recibe un valor y lo pasa por cada función de izquierda a derecha, cada una con el resultado de la anterior.

```js
const addOne = (n) => n + 1;
const double = (n) => n * 2;

pipe(addOne, double)(3); // 8
pipe()(5); // 5, sin funciones regresa el mismo valor
```
