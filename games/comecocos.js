/**
 * Comecocos — Pac-Man style arcade with swipe controls.
 */
(function () {
  "use strict";
  window.SJGames = window.SJGames || {};

  const MAZE_ROWS = [
    "###################",
    "#........#........#",
    "#o##.###.#.###.##o#",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "####.###.#.###.####",
    "----#.........#----",
    "####.#.##=##.#.####",
    ".....#.#GGG#.#.....",
    "####.#.#####.#.####",
    "----#.........#----",
    "####.#.#####.#.####",
    "#........#........#",
    "#.##.###.#.###.##.#",
    "#o.#.....P.....#.o#",
    "##.#.#.#####.#.#.##",
    "#....#...#...#....#",
    "#.######.#.######.#",
    "#.................#",
    "###################",
  ];

  const COLS = MAZE_ROWS[0].length;
  const ROWS = MAZE_ROWS.length;
  const TILE = 22;
  const SPEED = 6.2; // tiles/segundo
  const GHOST_SPEED = 5.4;
  const FRIGHT_SPEED = 3.6;
  const FRIGHT_MS = 7000;
  const FRIGHT_FLASH_MS = 2200;
  const DIRS = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
  };
  const DIR_LIST = ["left", "right", "up", "down"];
  const OPP = { left: "right", right: "left", up: "down", down: "up" };

  const GHOST_DEFS = [
    { name: "Blinky", color: "#ff5c5c", personality: "chase" },
    { name: "Pinky", color: "#ff9ad5", personality: "ambush" },
    { name: "Inky", color: "#5ce1ff", personality: "flank" },
    { name: "Clyde", color: "#ffb347", personality: "scatter" },
  ];

  function parseMaze() {
    const walls = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const pellets = new Set();
    const powers = new Set();
    let playerStart = { x: 9, y: 15 };
    const ghostStarts = [];
    let houseDoor = null;

    for (let y = 0; y < ROWS; y++) {
      const row = MAZE_ROWS[y];
      for (let x = 0; x < COLS; x++) {
        const ch = row[x];
        if (ch === "#") walls[y][x] = true;
        else if (ch === ".") pellets.add(key(x, y));
        else if (ch === "o") powers.add(key(x, y));
        else if (ch === "P") playerStart = { x, y };
        else if (ch === "G") ghostStarts.push({ x, y });
        else if (ch === "=") {
          houseDoor = { x, y };
        }
      }
    }
    while (ghostStarts.length < 4) {
      ghostStarts.push(ghostStarts[ghostStarts.length - 1] || { x: 9, y: 9 });
    }
    return { walls, pellets, powers, playerStart, ghostStarts, houseDoor };
  }

  function key(x, y) {
    return `${x},${y}`;
  }

  function mount(root, api) {
    const W = COLS * TILE;
    const H = ROWS * TILE;

    root.innerHTML = `
      <div class="cc-layout">
        <div class="cc-meta">
          <span>Puntos: <strong id="cc-score">0</strong></span>
          <span>Vidas: <strong id="cc-lives">3</strong></span>
          <span>Récord: <strong id="cc-best">0</strong></span>
        </div>
        <canvas id="cc-canvas" width="${W}" height="${H}" aria-label="Tablero de Comecocos"></canvas>
        <div class="dpad" aria-label="Controles de dirección">
          <button type="button" class="btn up" data-dir="up" aria-label="Arriba">▲</button>
          <button type="button" class="btn left" data-dir="left" aria-label="Izquierda">◀</button>
          <button type="button" class="btn down" data-dir="down" aria-label="Abajo">▼</button>
          <button type="button" class="btn right" data-dir="right" aria-label="Derecha">▶</button>
        </div>
        <p class="status-line" id="cc-status">Pulsa Jugar o desliza el dedo para empezar.</p>
        <p class="hint">Come todos los puntos · Power pellet = fantasmas azules · Swipe o flechas · Evita morderte… espera, ¡a los fantasmas!</p>
      </div>
    `;

    const canvas = root.querySelector("#cc-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = root.querySelector("#cc-score");
    const livesEl = root.querySelector("#cc-lives");
    const bestEl = root.querySelector("#cc-best");
    const status = root.querySelector("#cc-status");
    const layout = root.querySelector(".cc-layout");

    const base = parseMaze();
    let walls = base.walls;
    let pellets, powers, player, ghosts, score, lives, best, running, paused, won, dead;
    let frightUntil = 0;
    let mouthPhase = 0;
    let lastTs = 0;
    let raf = 0;
    let eatStreak = 0;

    best = Number(localStorage.getItem("sj-comecocos-best") || 0);
    bestEl.textContent = String(best);

    function setStatus(msg, kind = "") {
      status.textContent = msg;
      status.className = `status-line ${kind}`.trim();
    }

    function tileWalkable(x, y, allowHouse) {
      if (y >= 0 && y < ROWS && (x < 0 || x >= COLS)) {
        const row = MAZE_ROWS[y];
        if (row && (row[0] === "-" || row[COLS - 1] === "-")) return true;
        return false;
      }
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
      if (walls[y][x]) return false;
      const ch = MAZE_ROWS[y][x];
      if (ch === "G" || ch === "=") return !!allowHouse;
      return true;
    }

    function wrapX(x) {
      if (x < -0.5) return COLS - 0.5;
      if (x >= COLS - 0.5) return -0.5;
      return x;
    }

    function makeActor(x, y, dir) {
      return {
        x: x + 0.0,
        y: y + 0.0,
        dir,
        nextDir: dir,
        moving: false,
      };
    }

    function resetLevel(full) {
      pellets = new Set(base.pellets);
      powers = new Set(base.powers);
      player = makeActor(base.playerStart.x, base.playerStart.y, "left");
      ghosts = GHOST_DEFS.map((def, i) => {
        const s = base.ghostStarts[i];
        return {
          ...def,
          x: s.x,
          y: s.y,
          dir: "left",
          mode: "scatter",
          eaten: false,
          leaveTimer: i * 0.7,
          inHouse: true,
        };
      });
      frightUntil = 0;
      eatStreak = 0;
      mouthPhase = 0;
      won = false;
      dead = false;
      if (full) {
        score = 0;
        lives = 3;
        scoreEl.textContent = "0";
        livesEl.textContent = "3";
      }
    }

    function reset() {
      stopLoop();
      running = false;
      paused = false;
      resetLevel(true);
      setStatus("Pulsa Jugar o desliza el dedo para empezar.");
      draw(performance.now());
    }

    function start() {
      if (won || (dead && lives <= 0)) {
        resetLevel(true);
      } else if (dead) {
        player = makeActor(base.playerStart.x, base.playerStart.y, "left");
        ghosts = GHOST_DEFS.map((def, i) => {
          const s = base.ghostStarts[i];
          return {
            ...def,
            x: s.x,
            y: s.y,
            dir: "left",
            mode: "scatter",
            eaten: false,
            leaveTimer: i * 0.55,
            inHouse: true,
          };
        });
        frightUntil = 0;
        dead = false;
      }
      if (running && !paused) return;
      running = true;
      paused = false;
      setStatus("¡A comer pellets!");
      lastTs = 0;
      startLoop();
    }

    function pause() {
      if (!running || paused || won || dead) return;
      paused = true;
      setStatus("Pausa. Pulsa Jugar o desliza para continuar.", "warn");
    }

    function togglePause() {
      if (!running || won || (dead && lives <= 0)) {
        start();
        return;
      }
      if (paused) {
        paused = false;
        setStatus("¡A comer pellets!");
        lastTs = 0;
      } else {
        pause();
      }
    }

    function stopLoop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function startLoop() {
      stopLoop();
      lastTs = 0;
      raf = requestAnimationFrame(frame);
    }

    function wantDir(name) {
      if (!DIRS[name]) return;
      if (OPP[player.dir] === name) {
        const cx = Math.abs(player.x - Math.round(player.x));
        const cy = Math.abs(player.y - Math.round(player.y));
        if (cx < 0.12 && cy < 0.12) {
          player.dir = name;
          player.nextDir = name;
        } else {
          player.nextDir = name;
        }
      } else {
        player.nextDir = name;
      }
      if (!running || paused) start();
    }

    function centeredEnough(actor) {
      return Math.abs(actor.x - Math.round(actor.x)) < 0.08 &&
        Math.abs(actor.y - Math.round(actor.y)) < 0.08;
    }

    function snap(actor) {
      actor.x = Math.round(actor.x);
      actor.y = Math.round(actor.y);
    }

    function tryTurn(actor, dirName, allowHouse) {
      const d = DIRS[dirName];
      if (!d) return false;
      const tx = Math.round(actor.x) + d.x;
      const ty = Math.round(actor.y) + d.y;
      const wx = tx < 0 ? COLS - 1 : tx >= COLS ? 0 : tx;
      if (!tileWalkable(wx, ty, allowHouse)) return false;
      actor.dir = dirName;
      return true;
    }

    function moveActor(actor, dt, speed, allowHouse) {
      if (actor.nextDir && actor.nextDir !== actor.dir && centeredEnough(actor)) {
        snap(actor);
        tryTurn(actor, actor.nextDir, allowHouse);
      }

      const d = DIRS[actor.dir];
      let nx = actor.x + d.x * speed * dt;
      let ny = actor.y + d.y * speed * dt;

      const goingPos = d.x > 0 || d.y > 0;
      const edgeX = d.x !== 0;
      let blocked = false;

      if (edgeX) {
        const nextTile = goingPos ? Math.floor(nx + 0.5) : Math.ceil(nx - 0.5);
        const checkX = nextTile;
        const checkY = Math.round(actor.y);
        const wx = checkX < 0 ? COLS - 1 : checkX >= COLS ? 0 : checkX;
        if (!tileWalkable(wx, checkY, allowHouse) &&
            ((goingPos && nx > Math.round(actor.x)) || (!goingPos && nx < Math.round(actor.x)))) {
          blocked = true;
          nx = Math.round(actor.x);
        }
      } else {
        const nextTile = goingPos ? Math.floor(ny + 0.5) : Math.ceil(ny - 0.5);
        const checkX = Math.round(actor.x);
        const checkY = nextTile;
        if (!tileWalkable(checkX, checkY, allowHouse) &&
            ((goingPos && ny > Math.round(actor.y)) || (!goingPos && ny < Math.round(actor.y)))) {
          blocked = true;
          ny = Math.round(actor.y);
        }
      }

      if (!blocked) {
        actor.x = wrapX(nx);
        actor.y = ny;
      } else if (actor.nextDir && tryTurn(actor, actor.nextDir, allowHouse)) {
      }

      if (actor.y < 0) actor.y = 0;
      if (actor.y > ROWS - 1) actor.y = ROWS - 1;
    }

    function dist2(ax, ay, bx, by) {
      const dx = ax - bx;
      const dy = ay - by;
      return dx * dx + dy * dy;
    }

    function ghostTarget(g) {
      const px = player.x;
      const py = player.y;
      const pd = DIRS[player.dir];
      if (g.eaten) {
        const home = base.ghostStarts[0];
        return { x: home.x, y: home.y };
      }
      if (performance.now() < frightUntil) {
        return { x: g.x + (Math.random() - 0.5) * 10, y: g.y + (Math.random() - 0.5) * 10 };
      }
      if (g.personality === "ambush") {
        return { x: px + pd.x * 4, y: py + pd.y * 4 };
      }
      if (g.personality === "flank") {
        return { x: px + pd.x * 2 - (ghosts[0].x - px), y: py + pd.y * 2 - (ghosts[0].y - py) };
      }
      if (g.personality === "scatter") {
        if (dist2(g.x, g.y, px, py) > 49) return { x: px, y: py };
        return { x: 1, y: ROWS - 2 };
      }
      return { x: px, y: py };
    }

    function chooseGhostDir(g) {
      if (!centeredEnough(g)) return;
      snap(g);
      const allowHouse = g.inHouse || g.eaten;
      const target = ghostTarget(g);
      const options = DIR_LIST.filter((name) => {
        if (name === OPP[g.dir] && !g.inHouse) return false;
        const d = DIRS[name];
        const tx = Math.round(g.x) + d.x;
        const ty = Math.round(g.y) + d.y;
        const wx = tx < 0 ? COLS - 1 : tx >= COLS ? 0 : tx;
        return tileWalkable(wx, ty, allowHouse);
      });
      if (!options.length) {
        g.dir = OPP[g.dir] || "left";
        return;
      }
      let bestDir = options[0];
      let bestScore = Infinity;
      const frightened = performance.now() < frightUntil && !g.eaten;
      for (const name of options) {
        const d = DIRS[name];
        const nx = Math.round(g.x) + d.x;
        const ny = Math.round(g.y) + d.y;
        let scoreN = dist2(nx, ny, target.x, target.y);
        if (frightened) scoreN = -scoreN + Math.random() * 4;
        else scoreN += Math.random() * 0.15;
        if (scoreN < bestScore) {
          bestScore = scoreN;
          bestDir = name;
        }
      }
      g.dir = bestDir;

      if (g.inHouse && g.leaveTimer <= 0) {
        const door = base.houseDoor || { x: 9, y: 8 };
        if (Math.round(g.y) <= door.y) {
          g.inHouse = false;
        }
      }
    }

    function updateGhosts(dt) {
      const now = performance.now();
      for (const g of ghosts) {
        if (g.inHouse) {
          g.leaveTimer -= dt;
          if (g.leaveTimer <= 0) {
            g.dir = "up";
            const door = base.houseDoor || { x: 9, y: 8 };
            if (Math.abs(g.x - door.x) > 0.15) {
              g.dir = g.x < door.x ? "right" : "left";
            } else if (Math.round(g.y) > door.y) {
              g.dir = "up";
            } else {
              g.inHouse = false;
              g.dir = Math.random() < 0.5 ? "left" : "right";
            }
          }
        } else {
          chooseGhostDir(g);
        }
        const spd = g.eaten ? 9
          : (now < frightUntil && !g.eaten ? FRIGHT_SPEED : GHOST_SPEED);
        g.nextDir = g.dir;
        moveActor(g, dt, spd, g.inHouse || g.eaten);

        if (g.eaten) {
          const home = base.ghostStarts[0];
          if (dist2(g.x, g.y, home.x, home.y) < 0.3) {
            g.eaten = false;
            g.inHouse = true;
            g.leaveTimer = 0.4;
            g.x = home.x;
            g.y = home.y;
          }
        }
      }
    }

    function checkCollisions() {
      const now = performance.now();
      const px = Math.round(player.x);
      const py = Math.round(player.y);
      const pk = key(px, py);
      if (pellets.has(pk) && Math.abs(player.x - px) < 0.35 && Math.abs(player.y - py) < 0.35) {
        pellets.delete(pk);
        score += 10;
        scoreEl.textContent = String(score);
      }
      if (powers.has(pk) && Math.abs(player.x - px) < 0.4 && Math.abs(player.y - py) < 0.4) {
        powers.delete(pk);
        score += 50;
        scoreEl.textContent = String(score);
        frightUntil = now + FRIGHT_MS;
        eatStreak = 0;
        for (const g of ghosts) {
          if (!g.inHouse && !g.eaten) g.dir = OPP[g.dir] || g.dir;
        }
        setStatus("¡Power! Fantasmas azules — cómelos.");
      }

      for (const g of ghosts) {
        if (dist2(player.x, player.y, g.x, g.y) < 0.45) {
          if (g.eaten) continue;
          if (now < frightUntil) {
            g.eaten = true;
            eatStreak += 1;
            const pts = 200 * Math.pow(2, eatStreak - 1);
            score += pts;
            scoreEl.textContent = String(score);
            setStatus(`¡Fantasma! +${pts}`);
          } else {
            loseLife();
            return;
          }
        }
      }

      if (pellets.size === 0 && powers.size === 0) {
        winGame();
      }

      if (score > best) {
        best = score;
        bestEl.textContent = String(best);
        localStorage.setItem("sj-comecocos-best", String(best));
      }
    }

    function loseLife() {
      lives -= 1;
      livesEl.textContent = String(lives);
      dead = true;
      running = false;
      stopLoop();
      if (lives <= 0) {
        setStatus(`Game over · ${score} puntos. Pulsa Nueva partida.`, "bad");
      } else {
        setStatus(`¡Auch! Te queda${lives === 1 ? "" : "n"} ${lives} vida${lives === 1 ? "" : "s"}. Pulsa Jugar.`, "warn");
      }
      draw(performance.now());
    }

    function winGame() {
      won = true;
      running = false;
      stopLoop();
      setStatus(`¡Laberinto limpio! ${score} puntos. Nueva partida para repetir.`, "ok");
      if (score > best) {
        best = score;
        bestEl.textContent = String(best);
        localStorage.setItem("sj-comecocos-best", String(best));
      }
      draw(performance.now());
    }

    function frame(ts) {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      let dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (dt > 0.05) dt = 0.05;

      if (!paused && !won && !dead) {
        player.nextDir = player.nextDir || player.dir;
        moveActor(player, dt, SPEED, false);
        mouthPhase += dt * (SPEED * 2.2);
        updateGhosts(dt);
        checkCollisions();
      }

      draw(ts);
      if (running) raf = requestAnimationFrame(frame);
    }

    function drawWalls() {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!walls[y][x]) continue;
          const px = x * TILE;
          const py = y * TILE;
          ctx.fillStyle = "#1a2470";
          ctx.strokeStyle = "#3d5cff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(px + 1, py + 1, TILE - 2, TILE - 2, 4);
          ctx.fill();
          ctx.stroke();
        }
      }
      if (base.houseDoor) {
        const d = base.houseDoor;
        ctx.fillStyle = "#ff9ad5";
        ctx.fillRect(d.x * TILE + 2, d.y * TILE + TILE * 0.4, TILE - 4, 3);
      }
    }

    function drawPellets() {
      ctx.fillStyle = "#f5e6c8";
      for (const k of pellets) {
        const [x, y] = k.split(",").map(Number);
        ctx.beginPath();
        ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      const pulse = 0.65 + Math.sin(performance.now() / 180) * 0.25;
      for (const k of powers) {
        const [x, y] = k.split(",").map(Number);
        ctx.fillStyle = `rgba(255, 200, 120, ${pulse})`;
        ctx.beginPath();
        ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPac(ts) {
      const cx = player.x * TILE + TILE / 2;
      const cy = player.y * TILE + TILE / 2;
      const r = TILE * 0.42;
      const ang = {
        right: 0,
        down: Math.PI / 2,
        left: Math.PI,
        up: -Math.PI / 2,
      }[player.dir] || 0;
      const chomp = 0.15 + (0.5 + 0.5 * Math.sin(mouthPhase * Math.PI)) * 0.45;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = "#ffe14a";
      ctx.beginPath();
      ctx.arc(0, 0, r, chomp, Math.PI * 2 - chomp, false);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(r * 0.1, -r * 0.45, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawGhost(g, ts) {
      const cx = g.x * TILE + TILE / 2;
      const cy = g.y * TILE + TILE / 2;
      const r = TILE * 0.4;
      const now = ts;
      const frightened = now < frightUntil && !g.eaten;
      const flashing = frightened && frightUntil - now < FRIGHT_FLASH_MS && Math.floor(now / 160) % 2 === 0;

      let body = g.color;
      if (g.eaten) body = "transparent";
      else if (frightened) body = flashing ? "#eef3ff" : "#3b5bff";

      if (!g.eaten) {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, r * 0.92, Math.PI, 0, false);
        ctx.lineTo(cx + r * 0.92, cy + r * 0.75);
        const scallops = 3;
        for (let i = scallops; i >= 0; i--) {
          const sx = cx - r * 0.92 + (i / scallops) * r * 1.84;
          const sy = cy + r * 0.75 + ((i % 2 === 0) ? r * 0.22 : 0);
          ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }

      const look = DIRS[g.dir] || { x: 0, y: 0 };
      const ex = look.x * 2.2;
      const ey = look.y * 2.2;
      [[-0.32, -0.2], [0.32, -0.2]].forEach(([ox, oy]) => {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(cx + ox * r + ex, cy + oy * r + ey - 2, r * 0.22, r * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!frightened || g.eaten) {
          ctx.fillStyle = "#2a3cff";
          ctx.beginPath();
          ctx.arc(cx + ox * r + ex * 1.4, cy + oy * r + ey * 1.4 - 2, r * 0.1, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#fff";
        }
      });
      if (frightened && !g.eaten) {
        ctx.strokeStyle = flashing ? "#3b5bff" : "#fff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.35, cy + r * 0.25);
        for (let i = 0; i < 4; i++) {
          const wx = cx - r * 0.35 + i * (r * 0.23);
          ctx.quadraticCurveTo(wx + r * 0.08, cy + r * 0.4, wx + r * 0.18, cy + r * 0.25);
        }
        ctx.stroke();
      }
    }

    function draw(ts) {
      ctx.fillStyle = "#050714";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(40, 60, 160, 0.08)";
      ctx.fillRect(0, 0, W, H);

      drawWalls();
      drawPellets();
      for (const g of ghosts) drawGhost(g, ts);
      drawPac(ts);

      if (paused) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PAUSA", W / 2, H / 2);
      }
      if (won) {
        ctx.fillStyle = "rgba(0, 80, 40, 0.3)";
        ctx.fillRect(0, 0, W, H);
      }
      if (dead && lives <= 0) {
        ctx.fillStyle = "rgba(80, 0, 20, 0.28)";
        ctx.fillRect(0, 0, W, H);
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
      if (["arrowup", "w"].includes(k)) { wantDir("up"); e.preventDefault(); }
      else if (["arrowdown", "s"].includes(k)) { wantDir("down"); e.preventDefault(); }
      else if (["arrowleft", "a"].includes(k)) { wantDir("left"); e.preventDefault(); }
      else if (["arrowright", "d"].includes(k)) { wantDir("right"); e.preventDefault(); }
      else if (k === " " || k === "enter" || k === "p") {
        togglePause();
        e.preventDefault();
      }
    }

    root.querySelectorAll(".dpad .btn").forEach((btn) => {
      btn.addEventListener("click", () => wantDir(btn.dataset.dir));
    });

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
      if (Math.abs(dx) > Math.abs(dy)) wantDir(dx > 0 ? "right" : "left");
      else wantDir(dy > 0 ? "down" : "up");
    }
    layout.addEventListener("touchstart", onTouchStart, { passive: true });
    layout.addEventListener("touchmove", onTouchMove, { passive: false });
    layout.addEventListener("touchend", onTouchEnd, { passive: true });

    const playBtn = api.addToolbarButton("Jugar / Pausa", () => togglePause(), "btn-ok");
    api.addToolbarButton("Nueva partida", () => {
      reset();
      setStatus("Nueva partida lista. Pulsa Jugar o desliza el dedo.");
    }, "btn-primary");

    window.addEventListener("keydown", onKey);
    reset();

    return () => {
      stopLoop();
      window.removeEventListener("keydown", onKey);
      layout.removeEventListener("touchstart", onTouchStart);
      layout.removeEventListener("touchmove", onTouchMove);
      layout.removeEventListener("touchend", onTouchEnd);
      playBtn.remove();
    };
  }

  window.SJGames.comecocos = { mount };
})();
