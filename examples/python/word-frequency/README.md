# Palabras más frecuentes

Escribe `top_words(text, n)`: regresa las `n` palabras que más se repiten en `text`, como una lista de tuplas `(palabra, veces)`.

- No distingue mayúsculas: `Malenia` y `malenia` son la misma palabra, y se regresa en minúsculas.
- La puntuación no cuenta: `"amor,"` es `"amor"`.
- Primero las más frecuentes. Si empatan, en orden alfabético.
- Si hay menos de `n` palabras distintas, regresa las que haya.
- Hazlo a mano: los tests desactivan `collections.Counter`.

```python
top_words("Malenia ama el Haligtree. Malenia te ama, y tú amas a Malenia.", 2)
# [("malenia", 3), ("ama", 2)]
```
