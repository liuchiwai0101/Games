/** Classic minesweeper. The first open cell is never a mine. */

export const LEVELS = {
  easy: { rows: 9, cols: 9, mines: 10, label: '初級' },
  mid: { rows: 16, cols: 16, mines: 40, label: '中級' },
  hard: { rows: 16, cols: 30, mines: 99, label: '高級' },
};

export function createGame({ rows, cols, mines, rng = Math.random }) {
  const total = rows * cols;
  const capped = Math.max(0, Math.min(mines, total - 1));
  return {
    rows,
    cols,
    mines: capped,
    cells: Array.from({ length: total }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      exploded: false,
      count: 0,
    })),
    started: false,
    alive: true,
    won: false,
    rng,
  };
}

export function neighbors(state, index) {
  const { cols, rows } = state;
  const x = index % cols;
  const y = Math.floor(index / cols);
  const found = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      found.push(ny * cols + nx);
    }
  }
  return found;
}

function clone(state) {
  return {
    ...state,
    cells: state.cells.map((cell) => ({ ...cell })),
  };
}

function shuffle(list, rng) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function placeMines(state, safeIndex) {
  const around = new Set([safeIndex, ...neighbors(state, safeIndex)]);
  let pool = [];
  for (let i = 0; i < state.cells.length; i += 1) {
    if (!around.has(i)) pool.push(i);
  }
  if (pool.length < state.mines) {
    pool = [];
    for (let i = 0; i < state.cells.length; i += 1) {
      if (i !== safeIndex) pool.push(i);
    }
  }
  const chosen = shuffle(pool, state.rng).slice(0, state.mines);
  for (const index of chosen) state.cells[index].mine = true;
  for (let i = 0; i < state.cells.length; i += 1) {
    if (state.cells[i].mine) continue;
    state.cells[i].count = neighbors(state, i).filter((n) => state.cells[n].mine).length;
  }
  state.started = true;
}

function openCell(state, index) {
  const pending = [index];
  const seen = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (seen.has(current)) continue;
    seen.add(current);
    const cell = state.cells[current];
    if (!cell || cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.mine) {
      cell.exploded = true;
      state.alive = false;
      for (const other of state.cells) {
        if (other.mine) other.revealed = true;
      }
      return;
    }
    if (cell.count === 0) {
      pending.push(...neighbors(state, current));
    }
  }
}

function settled(state) {
  if (!state.alive || state.won) return state;
  const safe = state.cells.filter((cell) => !cell.mine).length;
  const opened = state.cells.filter((cell) => cell.revealed && !cell.mine).length;
  if (opened === safe) {
    state.won = true;
    for (const cell of state.cells) {
      if (cell.mine) cell.flagged = true;
    }
  }
  return state;
}

export function reveal(state, index) {
  if (!state.alive || state.won || index < 0 || index >= state.cells.length) return state;
  const next = clone(state);
  const cell = next.cells[index];
  if (cell.flagged) return state;
  if (cell.revealed) return chord(next, index);
  if (!next.started) placeMines(next, index);
  openCell(next, index);
  return settled(next);
}

function chord(state, index) {
  const cell = state.cells[index];
  if (!cell.revealed || cell.count === 0) return state;
  const around = neighbors(state, index);
  const flags = around.filter((n) => state.cells[n].flagged).length;
  if (flags !== cell.count) return state;
  for (const n of around) {
    if (state.cells[n].flagged || state.cells[n].revealed) continue;
    openCell(state, n);
    if (!state.alive) break;
  }
  return settled(state);
}

export function toggleFlag(state, index) {
  if (!state.alive || state.won || index < 0 || index >= state.cells.length) return state;
  const cell = state.cells[index];
  if (cell.revealed) return state;
  const next = clone(state);
  next.cells[index].flagged = !cell.flagged;
  return next;
}

export function flagCount(state) {
  return state.cells.filter((cell) => cell.flagged).length;
}
