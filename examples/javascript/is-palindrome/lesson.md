# Dos punteros

Para comparar un texto contra sí mismo al revés no necesitas voltearlo: dos índices, uno en cada orilla, que caminan hacia el centro.

```js
function mismasOrillas(lista) {
  let izquierda = 0;
  let derecha = lista.length - 1;
  while (izquierda < derecha) {
    if (lista[izquierda] !== lista[derecha]) return false;
    izquierda += 1;
    derecha -= 1;
  }
  return true;
}
```

Limpiar el texto primero simplifica todo: `toLowerCase()` y una expresión regular como `/[^a-z0-9]/g` con `replace` te dejan solo lo que cuenta.

## Errores típicos
- Comparar antes de limpiar y fallar por una mayúscula o un espacio.
- Detenerse un índice antes o después del centro.
- Olvidar que el texto vacío también se lee igual de los dos lados.

## Para pensar
¿Cuánta memoria extra usa voltear el string comparado con los dos punteros?
