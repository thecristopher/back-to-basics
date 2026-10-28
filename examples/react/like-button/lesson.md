# Estado con useState

`useState(inicial)` le da memoria a un componente: regresa el valor actual y una función para cambiarlo. Cada cambio vuelve a dibujar el componente con el valor nuevo.

```jsx
function Corazon() {
  const [encendido, setEncendido] = useState(false);
  return (
    <button onClick={() => setEncendido(!encendido)}>
      {encendido ? "♥" : "♡"}
    </button>
  );
}
```

`onClick` recibe una función, no el resultado de llamarla: `onClick={sumar}` y no `onClick={sumar()}`.

Cuando el valor nuevo depende del anterior, la forma segura es pasar una función: `setCuenta((cuenta) => cuenta + 1)`.

Las props con valor por defecto se escriben en la desestructuración: `function Foto({ titulo = "Sin título" })`.

## Errores típicos
- Modificar la variable directamente en lugar de usar el setter.
- Llamar a la función en `onClick` y disparar un render infinito.
- Copiar la prop al estado y esperar que se actualice sola cuando la prop cambie.

## Para pensar
¿Qué pasa si das tres clicks seguidos con `setCuenta(cuenta + 1)` dentro de un mismo evento?
