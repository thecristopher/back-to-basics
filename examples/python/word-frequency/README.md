# Palabras más frecuentes

## La historia

Malenia guarda en el Haligtree las cartas que le has escrito, y quiere saber qué palabras repites más. Para eso hay que leer el texto completo, contar cuántas veces aparece cada palabra y quedarse con las más repetidas.

## Qué vas a construir

Una función llamada `top_words`:

```python
def top_words(text: str, n: int) -> list[tuple[str, int]]: ...
```

- `text` es el texto de la carta, con mayúsculas, puntuación y espacios.
- `n` es cuántas palabras quieres en el resultado.
- Regresa una lista de tuplas `(palabra, veces)`: la palabra en minúsculas y cuántas veces aparece.

## Cómo se comporta

- No distingue mayúsculas: `Malenia` y `malenia` son la misma palabra, y en el resultado va en minúsculas.
- La puntuación no forma parte de la palabra: `"amor,"` cuenta como `"amor"`.
- Las más frecuentes van primero. Si dos palabras aparecen las mismas veces, van en orden alfabético.
- Si el texto tiene menos de `n` palabras distintas, regresa las que haya.
- Cuéntalas a mano: los tests desactivan `collections.Counter`.

## Un ejemplo paso a paso

```python
top_words("Malenia ama el Haligtree. Malenia te ama, y tú amas a Malenia.", 2)
# [("malenia", 3), ("ama", 2)]
```

Primero todo pasa a minúsculas y se quita la puntuación, así `"ama,"` queda como `"ama"`. Al contar, `malenia` aparece 3 veces, `ama` 2 veces y el resto una sola vez. Ordenadas de más a menos, las 2 primeras son `malenia` y `ama`. Fíjate que `amas` es otra palabra distinta de `ama`.

## Lo que vas a usar

Un `dict` sirve para contar: la llave es lo que cuentas y el valor cuántas veces lo has visto. `dict.get(llave, 0)` te da el valor o `0` si la llave todavía no existe. Un ejemplo con otros datos:

```python
colores = {}
for color in ["rojo", "azul", "rojo"]:
    colores[color] = colores.get(color, 0) + 1
# {"rojo": 2, "azul": 1}
```
