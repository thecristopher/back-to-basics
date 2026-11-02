# Botón de me gusta

## La historia

Claire Redfield subió una foto de los dos en el muelle y quieres dejarle tu me gusta. En una app, ese botón es un componente que recuerda cuántos me gusta lleva la foto y se dibuja de nuevo cada vez que alguien lo presiona. Hoy construyes ese botón.

## Qué vas a construir

Un componente de React llamado `LikeButton`:

```jsx
export function LikeButton({ initial = 0 }) { ... }
```

- Recibe una sola prop, `initial`: un número con los me gusta que la foto ya tenía antes de que llegaras. Si no te la pasan, vale `0`.
- Devuelve un `<button>` que muestra el conteo y cambia cuando le das click.

## Cómo se comporta

- El texto del botón es `Me gusta (41)` cuando `initial` es `41`. El número siempre sale del conteo actual.
- Cada click suma uno: `41` pasa a `42`, luego a `43`. El componente tiene que recordar el número entre clicks, así que vive en el estado.
- El botón tiene el atributo `aria-pressed`, que le dice a un lector de pantalla si el botón está presionado. Vale `false` mientras tú no hayas dado click, y `true` en cuanto das el primero.
- Sin la prop, empieza en `Me gusta (0)`.

## Un ejemplo paso a paso

```jsx
<LikeButton initial={41} />
// antes del click:  <button aria-pressed="false">Me gusta (41)</button>
// después de uno:   <button aria-pressed="true">Me gusta (42)</button>
```

Al montarse, el conteo arranca en `41` porque eso trae `initial`, y como todavía no das click, `aria-pressed` es `false`. Das un click, el conteo sube a `42` y React vuelve a dibujar el botón con el número nuevo. Ahora el conteo ya es mayor que el inicial, así que `aria-pressed` pasa a `true`.

## Lo que vas a usar

`useState` le da memoria a un componente. Le pasas el valor con el que empieza y te regresa dos cosas: el valor actual y una función para cambiarlo. Cada vez que llamas esa función, React vuelve a dibujar el componente con el valor nuevo. Un ejemplo con otros datos:

```jsx
const [abierto, setAbierto] = useState(false);
<button onClick={() => setAbierto(true)}>{abierto ? "Abierto" : "Cerrado"}</button>
```
