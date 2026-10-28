# Recursión

Una función recursiva resuelve un caso grande llamándose a sí misma con un caso más chico, hasta llegar a uno que ya sabe responder sin llamarse (el caso base).

```js
function contarCartas(caja) {
  let total = 0;
  for (const cosa of caja) {
    total += Array.isArray(cosa) ? contarCartas(cosa) : 1;
  }
  return total;
}

contarCartas(["nota", ["nota", ["nota"]]]); // 3
```

`Array.isArray(x)` es la forma confiable de saber si algo es un arreglo, `typeof` te diría `"object"`.

Un acumulador (aquí `total`) junta el resultado mientras recorres. Para arreglos, el acumulador puede ser otro arreglo.

## Errores típicos
- Olvidar el caso base y caer en una recursión infinita.
- Modificar el arreglo de entrada en lugar de construir uno nuevo.
- Llamar a la recursión pero no usar lo que regresa.

## Para pensar
¿Cómo lo harías sin recursión, con una pila explícita?
