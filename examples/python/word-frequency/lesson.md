# Contar con un dict y ordenar con key

Un `dict` cuenta cosas: la llave es lo que cuentas y el valor cuántas veces apareció. `get` con un valor por defecto evita el `KeyError` la primera vez.

```python
runas = {}
for jefe in ["Godrick", "Radahn", "Godrick"]:
    runas[jefe] = runas.get(jefe, 0) + 1
# {"Godrick": 2, "Radahn": 1}
```

`sorted` recibe una `key` que dice por qué ordenar. Una tupla ordena por su primer valor y desempata con el siguiente, y un número negativo invierte el orden de ese valor nada más.

```python
sorted([("melina", 1), ("blaidd", 3)], key=lambda pair: (-pair[1], pair[0]))
# [("blaidd", 3), ("melina", 1)]
```

## Errores típicos
- Olvidar pasar a minúsculas y contar `Malenia` y `malenia` por separado.
- Usar `reverse=True` y que el desempate alfabético quede al revés.
- Dejar la puntuación pegada a la palabra.

## Para pensar
¿Qué cambia si el texto tiene millones de palabras y solo quieres las 10 primeras? Busca qué hace `heapq.nlargest`.
