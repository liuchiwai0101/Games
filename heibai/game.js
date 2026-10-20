const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

export function createGame() {
  const cells = Array(64).fill(0);
  cells[27] = 2;
  cells[28] = 1;
  cells[35] = 1;
  cells[36] = 2;
  return { cells, turn: 1, winner: 0, passed: false };
}

export function flips(cells, index, turn) {
  if (cells[index]) return [];
  const x = index % 8;
  const y = Math.floor(index / 8);
  const found = [];
  for (const [dx, dy] of DIRS) {
    const line = [];
    let cx = x + dx;
    let cy = y + dy;
    while (cx >= 0 && cy >= 0 && cx < 8 && cy < 8) {
      const value = cells[cy * 8 + cx];
      if (!value) break;
      if (value === turn) {
        found.push(...line);
        break;
      }
      line.push(cy * 8 + cx);
      cx += dx;
      cy += dy;
    }
  }
  return found;
}

export function legal(cells, turn) {
  const list = [];
  for (let i = 0; i < 64; i += 1) if (flips(cells, i, turn).length) list.push(i);
  return list;
}

function finish(cells) {
  const black = cells.filter((value) => value === 1).length;
  const white = cells.filter((value) => value === 2).length;
  if (black === white) return 3;
  return black > white ? 1 : 2;
}

export function place(state, index) {
  if (state.winner) return state;
  const gained = flips(state.cells, index, state.turn);
  if (!gained.length) return state;
  const cells = state.cells.slice();
  cells[index] = state.turn;
  for (const spot of gained) cells[spot] = state.turn;
  const other = state.turn === 1 ? 2 : 1;
  if (legal(cells, other).length) {
    return { ...state, cells, turn: other, passed: false };
  }
  if (legal(cells, state.turn).length) {
    return { ...state, cells, passed: true };
  }
  return { ...state, cells, winner: finish(cells), passed: false };
}

export function counts(state) {
  return {
    black: state.cells.filter((value) => value === 1).length,
    white: state.cells.filter((value) => value === 2).length,
  };
}

export function choose(state) {
  const options = legal(state.cells, state.turn);
  if (!options.length) return -1;
  let best = options[0];
  let bestScore = -Infinity;
  for (const index of options) {
    const next = place(state, index);
    let score = WEIGHTS[index] * 8 + flips(state.cells, index, state.turn).length;
    score += legal(next.cells, state.turn).length;
    score -= legal(next.cells, state.turn === 1 ? 2 : 1).length * 2;
    if (score > bestScore) { bestScore = score; best = index; }
  }
  return best;
}
