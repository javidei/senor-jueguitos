/**
 * Memoria — empareja cartas (8 parejas).
 */
(function () {
  "use strict";
  window.SJGames = window.SJGames || {};

  const ICONS = ["🍎", "🍋", "🍇", "🍓", "🍒", "🥝", "🍑", "🍍"];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function mount(root, api) {
    let deck = [];
    let flipped = [];
    let lock = false;
    let moves = 0;
    let matches = 0;
    let startedAt = null;
    let timerId = null;

    root.innerHTML = `
      <div class="memoria-stats">
        <span>Movimientos: <strong id="memo-moves">0</strong></span>
        <span>Parejas: <strong id="memo-pairs">0</strong> / 8</span>
        <span>Tiempo: <strong id="memo-time">0:00</strong></span>
      </div>
      <div class="memoria-board" role="grid" aria-label="Tablero de memoria"></div>
      <p class="status-line" id="memo-status">Gira dos cartas para encontrar la pareja.</p>
    `;

    const board = root.querySelector(".memoria-board");
    const movesEl = root.querySelector("#memo-moves");
    const pairsEl = root.querySelector("#memo-pairs");
    const timeEl = root.querySelector("#memo-time");
    const status = root.querySelector("#memo-status");

    function formatTime(ms) {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const r = s % 60;
      return `${m}:${String(r).padStart(2, "0")}`;
    }

    function tick() {
      if (!startedAt) return;
      timeEl.textContent = formatTime(Date.now() - startedAt);
    }

    function setStatus(msg, kind = "") {
      status.textContent = msg;
      status.className = `status-line ${kind}`.trim();
    }

    function updateStats() {
      movesEl.textContent = String(moves);
      pairsEl.textContent = String(matches);
    }

    function newGame() {
      if (timerId) clearInterval(timerId);
      timerId = null;
      startedAt = null;
      timeEl.textContent = "0:00";
      moves = 0;
      matches = 0;
      flipped = [];
      lock = false;
      updateStats();
      deck = shuffle([...ICONS, ...ICONS]).map((icon, i) => ({
        id: i,
        icon,
        matched: false,
      }));
      board.innerHTML = "";
      deck.forEach((card, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "memo-card";
        btn.dataset.index = String(index);
        btn.setAttribute("aria-label", "Carta boca abajo");
        btn.addEventListener("click", () => onFlip(index, btn));
        board.appendChild(btn);
      });
      setStatus("Nueva partida. ¡Encuentra las parejas!");
    }

    function onFlip(index, btn) {
      if (lock) return;
      const card = deck[index];
      if (card.matched || btn.classList.contains("flipped")) return;
      if (!startedAt) {
        startedAt = Date.now();
        timerId = setInterval(tick, 250);
      }

      btn.classList.add("flipped");
      btn.textContent = card.icon;
      btn.setAttribute("aria-label", `Carta ${card.icon}`);
      flipped.push({ index, btn, card });

      if (flipped.length < 2) return;

      moves += 1;
      updateStats();
      const [a, b] = flipped;
      if (a.card.icon === b.card.icon) {
        a.card.matched = true;
        b.card.matched = true;
        a.btn.classList.add("matched");
        b.btn.classList.add("matched");
        a.btn.disabled = true;
        b.btn.disabled = true;
        flipped = [];
        matches += 1;
        updateStats();
        if (matches === ICONS.length) {
          if (timerId) clearInterval(timerId);
          tick();
          setStatus(`¡Has ganado en ${moves} movimientos! 🎉`, "ok");
        } else {
          setStatus("¡Pareja! Sigue así.", "ok");
        }
      } else {
        lock = true;
        setStatus("No coinciden. Inténtalo de nuevo.", "warn");
        setTimeout(() => {
          a.btn.classList.remove("flipped");
          b.btn.classList.remove("flipped");
          a.btn.textContent = "";
          b.btn.textContent = "";
          a.btn.setAttribute("aria-label", "Carta boca abajo");
          b.btn.setAttribute("aria-label", "Carta boca abajo");
          flipped = [];
          lock = false;
        }, 650);
      }
    }

    api.addToolbarButton("Nueva partida", newGame, "btn-primary");
    newGame();

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }

  window.SJGames.memoria = { mount };
})();
