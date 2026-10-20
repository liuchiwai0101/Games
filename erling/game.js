export function slideLine(line) {
  const nums = line.filter(Boolean);
  const out = [];
  let score = 0;
  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i] === nums[i + 1]) {
      const value = nums[i] * 2;
      out.push(value);
      score += value;
      i += 1;
    } else out.push(nums[i]);
  }
  while (out.length < 4) out.push(0);
  return { line: out, score };
}

function rowsOf(cells) {
  return [0, 1, 2, 3].map((row) => cells.slice(row * 4, row * 4 + 4));
}

function rotate(cells) {
  const next = Array(16).fill(0);
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) next[x * 4 + (3 - y)] = cells[y * 4 + x];
  }
  return next;
}

function spawn(cells, rng) {
  const empty = [];
  cells.forEach((value, index) => { if (!value) empty.push(index); });
  if (!empty.length) return cells;
  const next = cells.slice();
  const index = empty[Math.floor(rng() * empty.length)];
  next[index] = rng() < 0.9 ? 2 : 4;
  return next;
}

export function canMove(cells) {
  if (cells.some((value) => !value)) return true;
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const value = cells[y * 4 + x];
      if (x < 3 && cells[y * 4 + x + 1] === value) return true;
      if (y < 3 && cells[(y + 1) * 4 + x] === value) return true;
    }
  }
  return false;
}

export function createGame(rng = Math.random) {
  let cells = Array(16).fill(0);
  cells = spawn(cells, rng);
  cells = spawn(cells, rng);
  return { cells, score: 0, won: false, lost: false, rng };
}

const TURNS = { left: 0, up: 1, right: 2, down: 3 };

export function move(state, dir) {
  if (state.lost || !TURNS.hasOwnProperty(dir)) return state;
  let cells = state.cells.slice();
  const turns = TURNS[dir];
  for (let i = 0; i < turns; i += 1) cells = rotate(cells);
  let score = 0;
  let changed = false;
  const slid = rowsOf(cells).map((row) => {
    const result = slideLine(row);
    score += result.score;
    if (result.line.some((value, index) => value !== row[index])) changed = true;
    return result.line;
  }).flat();
  cells = slid;
  for (let i = 0; i < (4 - turns) % 4; i += 1) cells = rotate(cells);
  if (!changed) return state;
  cells = spawn(cells, state.rng);
  return {
    ...state,
    cells,
    score: state.score + score,
    won: state.won || cells.some((value) => value >= 2048),
    lost: !canMove(cells),
  };
}
