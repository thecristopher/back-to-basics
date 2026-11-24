# Contar con un dict y ordenar con key

## Qué es

Contar frecuencias es responder "¿cuántas veces aparece cada cosa?". Un `dict` lo resuelve directo: la llave es lo que cuentas y el valor cuántas veces lo has visto. Ordenar con `key` es decirle a `sorted` por qué dato comparar cada elemento, en lugar de comparar el elemento completo.

Juntos son la base de cualquier ranking: las palabras más repetidas, los clientes que más compran, los errores más comunes de un log.

## Cómo funciona

- Buscar una llave que no existe con `d[llave]` lanza `KeyError`. `d.get(llave, 0)` regresa el valor guardado o `0` si todavía no está, así la primera aparición no rompe nada.
- `d[llave] = d.get(llave, 0) + 1` lee la cuenta actual, le suma uno y la guarda. Buscar y guardar en un `dict` cuesta lo mismo sin importar cuántas llaves tenga.
- `d.items()` da pares `(llave, valor)` que puedes ordenar.
- `sorted(datos, key=f)` llama `f` una vez por elemento y ordena por lo que `f` regresa, de menor a mayor.
- Si `f` regresa una tupla, Python compara por el primer valor y solo usa el segundo para desempatar.
- Un número negativo en la tupla invierte el orden de ese valor nada más: `-veces` pone las más grandes primero sin voltear el desempate.

## Ejemplos

Contar a quién ha derrotado Malenia:

```python
runas = {}
for jefe in ["Godrick", "Radahn", "Godrick"]:
    runas[jefe] = runas.get(jefe, 0) + 1
# {"Godrick": 2, "Radahn": 1}
```

La primera vez `Godrick` no existe y `get` da 0, la segunda ya vale 1 y sube a 2.

Ordenar por un solo dato con `key`:

```python
sorted(["melina", "ranni", "blaidd"], key=len)
# ["ranni", "melina", "blaidd"]
```

`len` da 6, 5 y 6. Ordena por esos números, y los empatados quedan en el orden en que llegaron.

Ordenar por dos datos, uno al revés:

```python
sorted([("melina", 1), ("blaidd", 3), ("ranni", 3)], key=lambda par: (-par[1], par[0]))
# [("blaidd", 3), ("ranni", 3), ("melina", 1)]
```

Las de 3 van primero por el `-`, y entre ellas desempata el nombre en orden alfabético.

## Errores típicos

- Contar `Malenia` y `malenia` por separado: normaliza a minúsculas antes de contar.
- Dejar la puntuación pegada y contar `"amor,"` distinto de `"amor"`.
- Usar `reverse=True` para tener las más frecuentes primero, que también voltea el desempate alfabético:

  ```python
  sorted(pares, key=lambda p: (p[1], p[0]), reverse=True)  # mal: desempata de la z a la a
  sorted(pares, key=lambda p: (-p[1], p[0]))               # bien: solo invierte las veces
  ```

## Para pensar

¿Por qué `-veces` dentro de la tupla del `key` ordena distinto que `reverse=True` cuando dos palabras aparecen las mismas veces?
