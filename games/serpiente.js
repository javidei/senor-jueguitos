/**
 * Serpiente — wrap walls, self-bite only, accelerating speed.
 * Visuals: oriented head + capsule body. Swipe on full panel. Mobile fullscreen.
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

    function fitCanvas() {
      const maxSide = Math.min(
        Math.floor(canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth),
        Math.floor(window.innerWidth - 24),
        Math.floor((window.visualViewport ? window.visualViewport.height : window.innerHeight) * (window.matchMedia("(max-width: 640px)").matches ? 0.62 : 0.7))
      );
      const cssSide = Math.max(240, Math.min(420, maxSide));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const px = Math.round(cssSide * dpr);
      if (canvas.width !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      canvas.style.width = cssSide + "px";
      canvas.style.height = cssSide + "px";
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

    function stopLoop() {
      if (tickId) {
        clearInterval(tickId);
        tickId = null;
      }
    }

    function startLoop() {
      stopLoop();
      tickId = setInterval(step, tickMs);
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
      fitCanvas();
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

    function centerOf(seg, size) {
      return { x: seg.x * size + size / 2, y: seg.y * size + size / 2 };
    }

    
    function shortDelta(a, b) {
      let d = b - a;
      if (d > GRID / 2) d -= GRID;
      if (d < -GRID / 2) d += GRID;
      return d;
    }

    function drawCapsule(ax, ay, bx, by, radius, color) {
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 0.001;
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy * radius;
      const py = ux * radius;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ax, ay, radius, 0, Math.PI * 2);
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.moveTo(ax + px, ay + py);
      ctx.lineTo(bx + px, by + py);
      ctx.lineTo(bx - px, by - py);
      ctx.lineTo(ax - px, ay - py);
      ctx.closePath();
      ctx.fill();
    }

    function drawHead(cx, cy, size, dx, dy) {
      const r = size * 0.42;
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.15, r * 0.1, 0, 0, r * 1.1);
      grad.addColorStop(0, "#b8ffe0");
      grad.addColorStop(0.55, "#7cffc4");
      grad.addColorStop(1, "#00b894");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(r * 0.12, 0, r * 1.05, r * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 80, 60, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#5ae0a8";
      ctx.beginPath();
      ctx.ellipse(r * 0.85, 0, r * 0.28, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      const eyeX = r * 0.15;
      const eyeY = r * 0.38;
      const eyeR = r * 0.22;
      [[eyeX, -eyeY], [eyeX, eyeY]].forEach(([ex, ey]) => {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#132018";
        ctx.beginPath();
        ctx.arc(ex + eyeR * 0.35, ey, eyeR * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ex + eyeR * 0.15, ey - eyeR * 0.25, eyeR * 0.18, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    function drawFood(size) {
      const cx = food.x * size + size / 2;
      const cy = food.y * size + size / 2;
      const r = size * 0.32;

      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.55, r * 0.7, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
      grad.addColorStop(0, "#ffb3c9");
      grad.addColorStop(0.5, "#ff6b9d");
      grad.addColorStop(1, "#e04070");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.28, cy - r * 0.32, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3dd68c";
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.15, cy - r * 0.85, r * 0.28, r * 0.14, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2a9d66";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.55);
      ctx.quadraticCurveTo(cx + r * 0.05, cy - r * 0.95, cx + r * 0.2, cy - r * 1.05);
      ctx.stroke();
    }

    function draw(flash = false) {
      const size = cellSize();
      ctx.fillStyle = "#0a0d18";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(255,255,255,0.035)";
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

      drawFood(size);

      for (let i = snake.length - 1; i >= 1; i--) {
        const a = snake[i];
        const b = snake[i - 1];
        const dx = shortDelta(a.x, b.x);
        const dy = shortDelta(a.y, b.y);
        if (Math.abs(dx) + Math.abs(dy) !== 1 && !(Math.abs(dx) <= 1 && Math.abs(dy) <= 1)) {
          const ca = centerOf(a, size);
          const t = i / Math.max(snake.length - 1, 1);
          const radius = size * (0.28 - t * 0.06);
          ctx.fillStyle = `rgba(0, 212, 170, ${0.92 - t * 0.4})`;
          ctx.beginPath();
          ctx.arc(ca.x, ca.y, radius, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const ca = centerOf(a, size);
        const cb = {
          x: ca.x + dx * size,
          y: ca.y + dy * size,
        };
        const t = i / Math.max(snake.length - 1, 1);
        const radius = size * (0.34 - t * 0.08);
        const alpha = 0.95 - t * 0.35;
        drawCapsule(ca.x, ca.y, cb.x, cb.y, radius, `rgba(0, 212, 170, ${alpha})`);
      }

      const head = snake[0];
      const hc = centerOf(head, size);
      drawHead(hc.x, hc.y, size, dir.x, dir.y);

      if (flash) {
        ctx.fillStyle = "rgba(255, 92, 122, 0.18)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
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

    const swipeSurface = root.querySelector(".snake-layout") || root;
    let touchStart = null;
    function onTouchStart(e) {
      if (e.target.closest && e.target.closest(".dpad, button, a")) return;
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    }
    function onTouchMove(e) {
      if (!touchStart) return;
      if (e.cancelable) e.preventDefault();
    }
    function onTouchEnd(e) {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.hypot(dx, dy) < 28) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
      else setDir(0, dy > 0 ? 1 : -1);
    }
    swipeSurface.addEventListener("touchstart", onTouchStart, { passive: true });
    swipeSurface.addEventListener("touchmove", onTouchMove, { passive: false });
    swipeSurface.addEventListener("touchend", onTouchEnd, { passive: true });

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

    function onResizeFit() {
      fitCanvas();
      draw();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResizeFit);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", onResizeFit);
    reset();

    return () => {
      stopLoop();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResizeFit);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", onResizeFit);
      swipeSurface.removeEventListener("touchstart", onTouchStart);
      swipeSurface.removeEventListener("touchmove", onTouchMove);
      swipeSurface.removeEventListener("touchend", onTouchEnd);
      playBtn.remove();
    };
  }

  window.SJGames.serpiente = { mount };
})();
