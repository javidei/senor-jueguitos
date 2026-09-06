# Señor Jueguitos

Hub estático de minijuegos en el navegador: menú principal con **Sudoku**, **Memoria** y **Serpiente**.

Interfaz en español, estética oscura y jugable en móvil. Sin frameworks ni paso de compilación: solo HTML, CSS y JavaScript.

## Jugar online

**GitHub Pages:** [https://javidei.github.io/senor-jueguitos/](https://javidei.github.io/senor-jueguitos/)

## Jugar en local

Abre `index.html` en el navegador, o sirve la carpeta con cualquier servidor estático:

```bash
# Ejemplo con Python 3
python3 -m http.server 8080
# Luego visita http://localhost:8080
```

## Juegos incluidos

| Juego     | Descripción                                      |
|-----------|--------------------------------------------------|
| Sudoku    | Genera un puzzle válido, rellena, comprueba      |
| Memoria   | Empareja 8 parejas de cartas                     |
| Serpiente | Snake clásico (teclado, gestos y cruceta)        |

## Cómo añadir un juego

1. Crea `games/mi-juego.js` que registre el módulo en `window.SJGames`:

```js
(function () {
  window.SJGames = window.SJGames || {};
  window.SJGames.mijuego = {
    mount(root, api) {
      root.innerHTML = "<p>¡Hola!</p>";
      // api.goMenu() · api.addToolbarButton(label, onClick, className?)
      // Devuelve una función de limpieza si hace falta
      return () => {};
    },
  };
})();
```

2. Incluye el script en `index.html` (con `?v=…` para cache-bust).

3. Añade una entrada al array `GAMES` en `app.js`:

```js
{
  id: "mijuego",
  title: "Mi juego",
  description: "Descripción corta.",
  icon: "🎮",
  mount: (root, api) => window.SJGames.mijuego.mount(root, api),
}
```

## Estructura

```
index.html          # Shell + carga de scripts
styles.css          # Tema oscuro, responsive
app.js              # Menú, registro GAMES y routing por hash
games/sudoku.js
games/memoria.js
games/serpiente.js
version.json        # Versión visible en el pie
.nojekyll           # GitHub Pages sin Jekyll
.github/workflows/pages.yml
```

## Versión

Pie de página / `version.json`: **v0.1.0 · 06/09/2026**

Los assets llevan `?v=0.1.0` para invalidar caché al publicar.

## Despliegue (GitHub Pages)

El workflow `.github/workflows/pages.yml` publica la raíz de `main` con Actions (`upload-pages-artifact` + `deploy-pages`).

La primera vez hay que activar Pages en el repositorio:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

Tras el primer push a `main` (o un `workflow_dispatch`), el sitio quedará en:

https://javidei.github.io/senor-jueguitos/

## Licencia

Código de ejemplo / portfolio — úsalo y modifícalo a tu gusto.
