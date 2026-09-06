/**
 * Señor Jueguitos — menú, registro de juegos y enrutado simple.
 * Para añadir un juego: registra un módulo en GAMES (abajo) e incluye su script en index.html.
 */
(function () {
  "use strict";

  const VERSION = { version: "0.1.0", date: "06/09/2026", label: "v0.1.0 · 06/09/2026" };

  /** @type {{ id: string, title: string, description: string, icon: string, mount: Function }[]} */
  const GAMES = [
    {
      id: "sudoku",
      title: "Sudoku",
      description: "Rellena la cuadrícula 9×9. Genera, comprueba y parte de nuevo.",
      icon: "🔢",
      mount: (root, api) => window.SJGames.sudoku.mount(root, api),
    },
    {
      id: "memoria",
      title: "Memoria",
      description: "Encuentra todas las parejas. Entrena la memoria visual.",
      icon: "🧠",
      mount: (root, api) => window.SJGames.memoria.mount(root, api),
    },
    {
      id: "serpiente",
      title: "Serpiente",
      description: "Come, crece y no te choques. Clásico Snake.",
      icon: "🐍",
      mount: (root, api) => window.SJGames.serpiente.mount(root, api),
    },
  ];

  const app = document.getElementById("app");
  const brandBtn = document.getElementById("brand-btn");
  let activeCleanup = null;

  function setBuildInfo(label) {
    document.querySelectorAll("#build-info, #footer-build").forEach((el) => {
      el.textContent = label;
    });
  }

  async function loadVersion() {
    try {
      const res = await fetch(`version.json?v=${VERSION.version}&t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("version fetch failed");
      const data = await res.json();
      const label = data.label || `v${data.version} · ${data.date}`;
      setBuildInfo(label);
    } catch (_) {
      setBuildInfo(VERSION.label);
    }
  }

  function clearApp() {
    if (typeof activeCleanup === "function") {
      try { activeCleanup(); } catch (_) { /* ignore */ }
      activeCleanup = null;
    }
    app.innerHTML = "";
  }

  function goMenu() {
    clearApp();
    history.replaceState({ screen: "menu" }, "", "#/");
    renderMenu();
  }

  function goGame(id) {
    const game = GAMES.find((g) => g.id === id);
    if (!game) {
      goMenu();
      return;
    }
    clearApp();
    history.replaceState({ screen: "game", id }, "", `#/${id}`);

    const shell = document.createElement("section");
    shell.className = "game-shell";
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="game-title-wrap">
          <h2>${game.icon} ${game.title}</h2>
          <p>${game.description}</p>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="btn btn-ghost" data-action="menu">← Volver al menú</button>
        </div>
      </div>
      <div class="panel game-mount"></div>
    `;
    app.appendChild(shell);

    shell.querySelector('[data-action="menu"]').addEventListener("click", goMenu);

    const mountRoot = shell.querySelector(".game-mount");
    const api = {
      goMenu,
      addToolbarButton(label, onClick, className = "") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn ${className}`.trim();
        btn.textContent = label;
        btn.addEventListener("click", onClick);
        shell.querySelector(".toolbar-actions").prepend(btn);
        return btn;
      },
    };

    const cleanup = game.mount(mountRoot, api);
    if (typeof cleanup === "function") activeCleanup = cleanup;
  }

  function renderMenu() {
    const section = document.createElement("section");
    section.className = "menu";
    section.innerHTML = `
      <p class="menu-kicker">Hub de minijuegos</p>
      <h1>Señor Jueguitos</h1>
      <p class="menu-sub">Elige un juego y a divertirse. Todo en el navegador, sin instalaciones.</p>
      <div class="game-grid" role="list"></div>
    `;
    const grid = section.querySelector(".game-grid");
    GAMES.forEach((game) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "game-card";
      btn.setAttribute("role", "listitem");
      btn.innerHTML = `
        <div class="game-card-icon" aria-hidden="true">${game.icon}</div>
        <h2>${game.title}</h2>
        <p>${game.description}</p>
      `;
      btn.addEventListener("click", () => goGame(game.id));
      grid.appendChild(btn);
    });
    app.appendChild(section);
  }

  function routeFromHash() {
    const hash = (location.hash || "#/").replace(/^#\/?/, "");
    const id = hash.split("/")[0];
    if (id && GAMES.some((g) => g.id === id)) {
      goGame(id);
    } else {
      goMenu();
    }
  }

  brandBtn.addEventListener("click", goMenu);
  window.addEventListener("hashchange", routeFromHash);

  // Exponer registro por si se quiere inspeccionar o ampliar en consola
  window.SJHub = { GAMES, goMenu, goGame, VERSION };

  loadVersion();
  routeFromHash();
})();
