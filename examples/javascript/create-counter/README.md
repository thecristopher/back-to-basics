# Contador con closure

Escribe `createCounter(start = 0)`: regresa un objeto con

- `increment()`: suma uno y regresa el valor nuevo
- `decrement()`: resta uno y regresa el valor nuevo
- `reset()`: vuelve al valor inicial y lo regresa
- `value()`: regresa el valor actual

Cada contador lleva su propia cuenta.

```js
const daysTogether = createCounter(364);
daysTogether.increment(); // 365
daysTogether.value(); // 365
daysTogether.reset(); // 364
```
