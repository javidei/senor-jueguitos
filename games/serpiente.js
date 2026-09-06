/**
 * Serpiente — wrap en paredes, muerte solo al morderse, velocidad creciente.
 */
(function () {
  "use strict";
  window.SJGames = window.SJGames || {};

  const GRID = 20;
  const TICK_START_MS = 220;
  const TICK_MIN_MS = 70;
  const TICK_STEP_MS = 8;

  function mount(root, api) {
    root.innerHTML = `
      <div class="snake-layout">
        <div class="snake-meta">
          <span>Puntos: <strong id="snake-score">0</strong></span>
          <span>Récord: <strong id="snake-best">0</strong></span>
        </div>
        <canvas id="snake-canvas" width="400" height="400" aria-label="Tablero de Serpiente"></canvas>
        <div class="dpad" aria-label="Controles de dirección">
          <button type="button" class="btn up" data-dir="up" aria-label="Arriba">▲</button>
          <button type="button" class="btn left" data-dir="left" aria-label="Izquierda">◀</button>
          <button type="button" class="btn down" data-dir="down" aria-label="Abajo">▼</button>
          <button type="button" class="btn right" data-dir="right" aria-label="Derecha">▶</button>
        </div>
        <p class="status-line" id="snake-status">Pulsa Jugar o una flecha para empezar.</p>
        <p class="hint">Paredes = sales por el otro lado · Mueres solo si te muerdes · Empieza lento y acelera al comer</p>
      </div>
    `;

    const canvas = root.querySelector("#snake-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = root.querySelector("#snake-score");
    const bestEl = root.querySelector("#snake-best");
    const status = root.querySelector("#snake-status");

    let snake, dir, nextDir, food, score, best, running, alive, tickId, tickMs;
    best = Number(localStorage.getItem("sj-serpiente-best") || 0);
    bestEl.textContent = String(best);

    function setStatus(msg, kind = "") {
      status.textContent = msg;
      status.className = `status-line ${kind}`.trim();
    }

    function cellSize() {
      return canvas.width / GRID;
    }

    function wrap(n) {
      return ((n % GRID) + GRID) % GRID;
    }

    function randCell() {
      return {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
    }

    function placeFood() {
      let spot;
      do {
        spot = randCell();
      } while (snake.some((s) => s.x === spot.x && s.y === spot.y));
      food = spot;
    }

    function currentTick() {
      return tickMs;
    }

    function stopLoop() {
      if (tickId) {
        clearInterval(tickId);
        tickId = null;
      }
    }

    function startLoop() {
      stopLoop();
      tickId = setInterval(step, currentTick());
    }

    function speedUp() {
      const next = Math.max(TICK_MIN_MS, tickMs - TICK_STEP_MS);
      if (next === tickMs) return;
      tickMs = next;
      if (running) startLoop();
    }

    function reset() {
      stopLoop();
      snake = [
        { x: 8, y: 10 },
        { x: 7, y: 10 },
        { x: 6, y: 10 },
      ];
      dir = { x: 1, y: 0 };
      nextDir = { ...dir };
      score = 0;
      tickMs = TICK_START_MS;
      scoreEl.textContent = "0";
      alive = true;
      running = false;
      placeFood();
      draw();
      setStatus("Pulsa Jugar o una flecha para empezar.");
    }

    function start() {
      if (!alive) reset();
      if (running) return;
      running = true;
      setStatus("¡En marcha! Las paredes te atraviesan.");
      startLoop();
    }

    function pause() {
      if (!running) return;
      running = false;
      stopLoop();
      setStatus("Pausa. Pulsa Jugar para continuar.", "warn");
    }

    function setDir(nx, ny) {
      if (nx === -dir.x && ny === -dir.y) return;
      nextDir = { x: nx, y: ny };
      if (!running && alive) start();
    }

    function step() {
      dir = nextDir;
      const head = {
        x: wrap(snake[0].x + dir.x),
        y: wrap(snake[0].y + dir.y),
      };

      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        gameOver();
        return;
      }

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = String(score);
        if (score > best) {
          best = score;
          bestEl.textContent = String(best);
          localStorage.setItem("sj-serpiente-best", String(best));
        }
        placeFood();
        speedUp();
      } else {
        snake.pop();
      }
      draw();
    }

    function gameOver() {
      alive = false;
      running = false;
      stopLoop();
      setStatus(`Te mordiste la cola · ${score} puntos. Pulsa Nueva partida.`, "bad");
      draw(true);
    }

    function draw(flash = false) {
      const size = cellSize();
      ctx.fillStyle = "#0a0d18";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size, 0);
        ctx.lineTo(i * size, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * size);
        ctx.lineTo(canvas.width, i * size);
        ctx.stroke();
      }

      const pad = size * 0.18;
      const grad = ctx.createRadialGradient(
        food.x * size + size / 2,
        food.y * size + size / 2,
        2,
        food.x * size + size / 2,
        food.y * size + size / 2,
        size / 2
      );
      grad.addColorStop(0, "#ff8fb3");
      grad.addColorStop(1, "#ff6b9d");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(food.x * size + pad, food.y * size + pad, size - pad * 2, size - pad * 2, 6);
      ctx.fill();

      snake.forEach((seg, i) => {
        const t = i / Math.max(snake.length - 1, 1);
        ctx.fillStyle = i === 0
          ? "#7cffc4"
          : `rgba(0, 212, 170, ${0.95 - t * 0.45})`;
        const sPad = i === 0 ? size * 0.1 : size * 0.16;
        ctx.beginPath();
        ctx.roundRect(seg.x * size + sPad, seg.y * size + sPad, size - sPad * 2, size - sPad * 2, 5);
        ctx.fill();
      });

      if (flash) {
        ctx.fillStyle = "rgba(255, 92, 122, 0.18)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        const radius = typeof r === "number" ? r : 0;
        this.moveTo(x + radius, y);
        this.arcTo(x + w, y, x + w, y + h, radius);
        this.arcTo(x + w, y + h, x, y + h, radius);
        this.arcTo(x, y + h, x, y, radius);
        this.arcTo(x, y, x + w, y, radius);
        this.closePath();
        return this;
      };
    }

    function onKey(e) {
      if (!root.isConnected) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "w"].includes(k)) { setDir(0, -1); e.preventDefault(); }
      else if (["arrowdown", "s"].includes(k)) { setDir(0, 1); e.preventDefault(); }
      else if (["arrowleft", "a"].includes(k)) { setDir(-1, 0); e.preventDefault(); }
      else if (["arrowright", "d"].includes(k)) { setDir(1, 0); e.preventDefault(); }
      else if (k === " " || k === "enter") {
        if (running) pause();
        else start();
        e.preventDefault();
      }
    }

    root.querySelectorAll(".dpad .btn").forEach((btn) => {
      const map = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0],
      };
      btn.addEventListener("click", () => {
        const d = map[btn.dataset.dir];
        if (d) setDir(d[0], d[1]);
      });
    });

    let touchStart = null;
    canvas.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    canvas.addEventListener("touchend", (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.hypot(dx, dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
      else setDir(0, dy > 0 ? 1 : -1);
    }, { passive: true });

    const playBtn = api.addToolbarButton("Jugar / Pausa", () => {
      if (!alive) {
        reset();
        start();
      } else if (running) {
        pause();
      } else {
        start();
      }
    }, "btn-ok");
    api.addToolbarButton("Nueva partida", () => {
      reset();
      setStatus("Nueva partida lista. Pulsa Jugar o una flecha.");
    }, "btn-primary");

    window.addEventListener("keydown", onKey);
    reset();

    return () => {
      stopLoop();
      window.removeEventListener("keydown", onKey);
      playBtn.remove();
    };
  }

  window.SJGames.serpiente = { mount };
})();
