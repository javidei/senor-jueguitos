/**
 * Sudoku — genera un tablero válido, rellenar, comprobar, nueva partida.
 */
(function () {
  "use strict";
  window.SJGames = window.SJGames || {};

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function cloneBoard(b) {
    return b.map((row) => row.slice());
  }

  function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (board[r][c] === num) return false;
      }
    }
    return true;
  }

  function findEmpty(board) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  function solve(board) {
    const empty = findEmpty(board);
    if (!empty) return true;
    const [row, col] = empty;
    for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (isValid(board, row, col, num)) {
        board[row][col] = num;
        if (solve(board)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  function generateSolution() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    solve(board);
    return board;
  }

  function makePuzzle(solution, holes = 46) {
    const puzzle = cloneBoard(solution);
    const positions = shuffle(
      Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
    );
    let removed = 0;
    for (const [r, c] of positions) {
      if (removed >= holes) break;
      puzzle[r][c] = 0;
      removed++;
    }
    return puzzle;
  }

  function mount(root, api) {
    let solution = null;
    let puzzle = null;
    let values = null;
    let selected = null;

    root.innerHTML = `
      <div class="sudoku-wrap">
        <div class="sudoku-board" role="grid" aria-label="Tablero de Sudoku"></div>
        <div class="numpad" aria-label="Teclado numérico"></div>
        <p class="status-line" id="sudoku-status">Elige una casilla e introduce un número.</p>
        <p class="hint">También puedes usar el teclado (1–9, Supr/0 para borrar, flechas).</p>
      </div>
    `;

    const boardEl = root.querySelector(".sudoku-board");
    const numpad = root.querySelector(".numpad");
    const status = root.querySelector("#sudoku-status");
    const cells = [];

    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "sudoku-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.addEventListener("click", () => selectCell(r, c));
      boardEl.appendChild(cell);
      cells.push(cell);
    }

    for (let n = 1; n <= 9; n++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = String(n);
      b.addEventListener("click", () => placeNumber(n));
      numpad.appendChild(b);
    }
    const erase = document.createElement("button");
    erase.type = "button";
    erase.className = "btn";
    erase.textContent = "⌫";
    erase.title = "Borrar";
    erase.addEventListener("click", () => placeNumber(0));
    numpad.appendChild(erase);

    function setStatus(msg, kind = "") {
      status.textContent = msg;
      status.className = `status-line ${kind}`.trim();
    }

    function selectCell(r, c) {
      selected = { r, c };
      cells.forEach((cell) => {
        const cr = +cell.dataset.r;
        const cc = +cell.dataset.c;
        cell.classList.toggle("selected", cr === r && cc === c);
      });
    }

    function render() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const idx = r * 9 + c;
          const cell = cells[idx];
          const given = puzzle[r][c] !== 0;
          const val = values[r][c];
          cell.textContent = val ? String(val) : "";
          cell.classList.toggle("given", given);
          cell.classList.remove("error", "ok-flash");
          cell.disabled = given;
        }
      }
      if (selected) selectCell(selected.r, selected.c);
    }

    function placeNumber(n) {
      if (!selected) {
        setStatus("Selecciona primero una casilla vacía.", "warn");
        return;
      }
      const { r, c } = selected;
      if (puzzle[r][c] !== 0) return;
      values[r][c] = n;
      const cell = cells[r * 9 + c];
      cell.classList.remove("error");
      render();
      if (n && n === solution[r][c]) {
        cell.classList.add("ok-flash");
        setTimeout(() => cell.classList.remove("ok-flash"), 350);
      }
      if (isComplete()) {
        if (checkBoard(false)) {
          setStatus("¡Sudoku resuelto! 🎉", "ok");
        }
      } else {
        setStatus(n ? `Colocado ${n}.` : "Casilla borrada.");
      }
    }

    function isComplete() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (!values[r][c]) return false;
        }
      }
      return true;
    }

    function checkBoard(announce = true) {
      let ok = true;
      let empty = 0;
      cells.forEach((cell) => cell.classList.remove("error"));
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const v = values[r][c];
          if (!v) {
            empty++;
            continue;
          }
          if (v !== solution[r][c]) {
            ok = false;
            cells[r * 9 + c].classList.add("error");
          }
        }
      }
      if (!announce) return ok && empty === 0;
      if (empty && ok) {
        setStatus(`Quedan ${empty} casillas vacías. Lo relleno va bien.`, "warn");
        return false;
      }
      if (!ok) {
        setStatus("Hay errores. Las casillas en rojo no coinciden.", "bad");
        return false;
      }
      setStatus("¡Perfecto! Sudoku correcto. 🎉", "ok");
      return true;
    }

    function newGame() {
      solution = generateSolution();
      puzzle = makePuzzle(solution, 46);
      values = cloneBoard(puzzle);
      selected = null;
      render();
      setStatus("Nueva partida lista. ¡A por ello!");
    }

    function onKey(e) {
      if (!root.isConnected) return;
      if (e.key >= "1" && e.key <= "9") {
        placeNumber(+e.key);
        e.preventDefault();
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        placeNumber(0);
        e.preventDefault();
      } else if (selected && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        let { r, c } = selected;
        if (e.key === "ArrowUp") r = (r + 8) % 9;
        if (e.key === "ArrowDown") r = (r + 1) % 9;
        if (e.key === "ArrowLeft") c = (c + 8) % 9;
        if (e.key === "ArrowRight") c = (c + 1) % 9;
        selectCell(r, c);
        e.preventDefault();
      }
    }

    api.addToolbarButton("Comprobar", () => checkBoard(true), "btn-ok");
    api.addToolbarButton("Nueva partida", newGame, "btn-primary");

    window.addEventListener("keydown", onKey);
    newGame();

    return () => window.removeEventListener("keydown", onKey);
  }

  window.SJGames.sudoku = { mount };
})();
