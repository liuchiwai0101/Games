export const SYMBOLS = ['日', '月', '山', '水', '火', '木', '金', '土', '風', '雲', '星', '雨'];

function shuffle(list, rng) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createBoard(rng = Math.random, cols = 8, rows = 6) {
  const tiles = [];
  for (let symbol = 1; symbol <= 12; symbol += 1) {
    for (let copy = 0; copy < 4; copy += 1) tiles.push(symbol);
  }
  return { cols, rows, cells: shuffle(tiles, rng).slice(0, cols * rows), selected: -1, won: false };
}

export function connected(state, a, b) {
  const { cells, cols, rows } = state;
  if (a === b || !cells[a] || cells[a] !== cells[b]) return false;
  const width = cols + 2;
  const height = rows + 2;
  const grid = Array.from({ length: height }, () => Array(width).fill(0));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) grid[y + 1][x + 1] = cells[y * cols + x];
  }
  const ax = (a % cols) + 1;
  const ay = Math.floor(a / cols) + 1;
  const bx = (b % cols) + 1;
  const by = Math.floor(b / cols) + 1;
  grid[ay][ax] = 0;
  grid[by][bx] = 0;
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const seen = new Set();
  const queue = dirs.map((_, dir) => [ax, ay, dir, 0]);
  while (queue.length) {
    const [x, y, dir, turns] = queue.shift();
    const key = `${x},${y},${dir},${turns}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const [dx, dy] = dirs[dir];
    let cx = x + dx;
    let cy = y + dy;
    while (cx >= 0 && cy >= 0 && cx < width && cy < height && grid[cy][cx] === 0) {
      if (cx === bx && cy === by) return true;
      if (turns < 2) {
        for (let next = 0; next < 4; next += 1) {
          if (next === dir || next === (dir + 2) % 4) continue;
          queue.push([cx, cy, next, turns + 1]);
        }
      }
      cx += dx;
      cy += dy;
    }
  }
  return false;
}

export function take(state, a, b) {
  if (!connected(state, a, b)) return state;
  const cells = state.cells.slice();
  cells[a] = 0;
  cells[b] = 0;
  return { ...state, cells, selected: -1, won: cells.every((value) => !value) };
}

export function hasMove(state) {
  const spots = [];
  state.cells.forEach((value, index) => { if (value) spots.push(index); });
  for (let i = 0; i < spots.length; i += 1) {
    for (let j = i + 1; j < spots.length; j += 1) {
      if (state.cells[spots[i]] === state.cells[spots[j]] && connected(state, spots[i], spots[j])) return true;
    }
  }
  return false;
}

export function hint(state) {
  const spots = [];
  state.cells.forEach((value, index) => { if (value) spots.push(index); });
  for (let i = 0; i < spots.length; i += 1) {
    for (let j = i + 1; j < spots.length; j += 1) {
      if (state.cells[spots[i]] === state.cells[spots[j]] && connected(state, spots[i], spots[j])) {
        return [spots[i], spots[j]];
      }
    }
  }
  return null;
}

export function reshuffle(state, rng = Math.random) {
  const values = shuffle(state.cells.filter(Boolean), rng);
  const cells = state.cells.slice();
  let cursor = 0;
  for (let i = 0; i < cells.length; i += 1) if (cells[i]) cells[i] = values[cursor++];
  return { ...state, cells, selected: -1 };
}
