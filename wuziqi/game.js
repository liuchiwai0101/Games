export const SIZE = 15;

export function createGame() {
  return {
    size: SIZE,
    cells: Array(SIZE * SIZE).fill(0),
    turn: 1,
    winner: 0,
    last: -1,
  };
}

function run(cells, index, side) {
  const x = index % SIZE;
  const y = Math.floor(index / SIZE);
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dx, dy] of dirs) {
    let count = 1;
    for (const sign of [1, -1]) {
      for (let step = 1; step < 5; step += 1) {
        const nx = x + dx * step * sign;
        const ny = y + dy * step * sign;
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) break;
        if (cells[ny * SIZE + nx] !== side) break;
        count += 1;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}

export function place(state, index) {
  if (state.winner || index < 0 || index >= state.cells.length || state.cells[index]) return state;
  const cells = state.cells.slice();
  cells[index] = state.turn;
  const win = run(cells, index, state.turn);
  const full = cells.every(Boolean);
  return {
    ...state,
    cells,
    last: index,
    winner: win ? state.turn : full ? 3 : 0,
    turn: state.turn === 1 ? 2 : 1,
  };
}

function lineScore(cells, index, side) {
  const x = index % SIZE;
  const y = Math.floor(index / SIZE);
  let score = 0;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let count = 1;
    let open = 0;
    for (const sign of [1, -1]) {
      let blocked = false;
      for (let step = 1; step < 5; step += 1) {
        const nx = x + dx * step * sign;
        const ny = y + dy * step * sign;
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) { blocked = true; break; }
        const value = cells[ny * SIZE + nx];
        if (value === side) count += 1;
        else {
          if (value === 0) open += 1;
          else blocked = true;
          break;
        }
      }
      if (blocked) open -= 0;
    }
    if (count >= 5) score += 100000;
    else if (count === 4 && open > 0) score += 8000;
    else if (count === 3 && open > 1) score += 800;
    else if (count === 3) score += 200;
    else if (count === 2 && open > 1) score += 40;
    else score += count;
  }
  const cx = x - 7;
  const cy = y - 7;
  score += Math.max(0, 8 - Math.abs(cx) - Math.abs(cy));
  return score;
}

export function choose(state) {
  if (state.winner) return -1;
  const opp = state.turn === 1 ? 2 : 1;
  let block = -1;
  let blockScore = -1;
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < state.cells.length; i += 1) {
    if (state.cells[i]) continue;
    const mine = state.cells.slice();
    mine[i] = state.turn;
    if (run(mine, i, state.turn)) return i;
    const theirs = state.cells.slice();
    theirs[i] = opp;
    if (run(theirs, i, opp)) {
      const threat = lineScore(theirs, i, opp);
      if (threat > blockScore) { blockScore = threat; block = i; }
    }
    const score = lineScore(mine, i, state.turn);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return block >= 0 ? block : best;
}
