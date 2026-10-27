# Botón de me gusta

Escribe el componente `LikeButton({ initial = 0 })`: un botón que cuenta los me gusta de una foto.

- Muestra `Me gusta (N)`, empezando en `initial`.
- Cada click suma uno.
- Tiene `aria-pressed` en `false` hasta que tú le das click, luego en `true`.

```jsx
<LikeButton initial={41} />
// <button aria-pressed="false">Me gusta (41)</button>
// después de un click: <button aria-pressed="true">Me gusta (42)</button>
```
