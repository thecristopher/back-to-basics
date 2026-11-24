# Estado con useState

## Qué es

El estado es la memoria de un componente: datos que cambian mientras la página está abierta, como si un botón está encendido o cuántos likes lleva. `useState` es el hook que le da esa memoria. Cuando el estado cambia, React vuelve a dibujar el componente con el valor nuevo.

Existe porque una variable normal se pierde: cada vez que React dibuja el componente ejecuta la función desde cero, y un `let` volvería a su valor inicial.

## Cómo funciona

- `const [valor, setValor] = useState(inicial)` regresa dos cosas: el valor actual y la función que lo cambia. El `inicial` solo se usa en el primer dibujo.
- Llamar `setValor(nuevo)` no cambia `valor` en esa misma línea. Le pide a React otro dibujo, y en ese dibujo `valor` ya trae lo nuevo.
- Dentro de un mismo evento, `valor` es una foto fija del dibujo actual. Por eso varias llamadas que lo leen ven el mismo número.
- Cuando el valor nuevo depende del anterior, se pasa una función: `setCuenta((cuenta) => cuenta + 1)`. React la llama con el valor más reciente, aunque haya cambios pendientes.
- `onClick` recibe una función para llamarla después, al hacer click: `onClick={sumar}`, no `onClick={sumar()}`.
- Las props con valor por defecto se escriben en la desestructuración: `function Foto({ titulo = "Sin título" })`.

## Ejemplos

Un corazón que se enciende y se apaga:

```jsx
function Corazon() {
  const [encendido, setEncendido] = useState(false);
  return <button onClick={() => setEncendido(!encendido)}>{encendido ? "♥" : "♡"}</button>;
}
```

El primer dibujo muestra ♡. Al click, `setEncendido(true)` pide otro dibujo y ahora muestra ♥.

Un contador de notas de amor:

```jsx
function Notas() {
  const [notas, setNotas] = useState(0);
  return <button onClick={() => setNotas((n) => n + 1)}>{notas} notas para Claire</button>;
}
```

Cada click suma uno al valor más reciente: 0, 1, 2.

Dos cambios en un mismo click, leyendo el valor directo:

```jsx
setNotas(notas + 1);
setNotas(notas + 1);
// con notas en 0, el siguiente dibujo muestra 1, no 2
```

Las dos líneas leen la misma foto, `notas` vale 0 en ambas.

## Errores típicos

- Modificar la variable directo (`notas = notas + 1`): React no se entera y no vuelve a dibujar.
- Llamar la función en `onClick`, que la ejecuta durante el dibujo y provoca un ciclo infinito:

  ```jsx
  <button onClick={sumar()}>   // mal: se llama al dibujar
  <button onClick={sumar}>     // bien: se llama al hacer click
  ```

- Copiar una prop al estado y esperar que se actualice sola cuando la prop cambie: `useState` solo usa el valor inicial una vez.

## Para pensar

¿Por qué tres llamadas a `setCuenta(cuenta + 1)` en un mismo click suben la cuenta solo en uno, y qué cambia cuando pasas `(c) => c + 1`?
