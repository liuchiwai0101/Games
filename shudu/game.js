function shuffle(list, rng) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function fits(board, x, y, value) {
  for (let i = 0; i < 9; i += 1) {
    if (board[y][i] === value || board[i][x] === value) return false;
  }
  const bx = Math.floor(x / 3) * 3;
  const by = Math.floor(y / 3) * 3;
  for (let dy = 0; dy < 3; dy += 1) {
    for (let dx = 0; dx < 3; dx += 1) if (board[by + dy][bx + dx] === value) return false;
  }
  return true;
}

function findEmpty(board) {
  let best = null;
  let bestCount = 10;
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      if (board[y][x]) continue;
      let count = 0;
      for (let value = 1; value <= 9; value += 1) if (fits(board, x, y, value)) count += 1;
      if (count < bestCount) {
        bestCount = count;
        best = [y, x];
        if (!count) return best;
      }
    }
  }
  return best;
}

export function countSolutions(puzzle, cap = 2) {
  const board = puzzle.map((row) => row.slice());
  let count = 0;
  function walk() {
    if (count >= cap) return;
    const cell = findEmpty(board);
    if (!cell) { count += 1; return; }
    const [y, x] = cell;
    for (let value = 1; value <= 9; value += 1) {
      if (!fits(board, x, y, value)) continue;
      board[y][x] = value;
      walk();
      board[y][x] = 0;
      if (count >= cap) return;
    }
  }
  walk();
  return count;
}

function fill(board, rng) {
  const cell = findEmpty(board);
  if (!cell) return true;
  const [y, x] = cell;
  for (const value of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
    if (!fits(board, x, y, value)) continue;
    board[y][x] = value;
    if (fill(board, rng)) return true;
    board[y][x] = 0;
  }
  return false;
}

export function generate(rng = Math.random, holes = 36) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  fill(board, rng);
  const order = shuffle(Array.from({ length: 81 }, (_, index) => index), rng);
  let removed = 0;
  for (const index of order) {
    if (removed >= holes) break;
    const y = Math.floor(index / 9);
    const x = index % 9;
    const saved = board[y][x];
    board[y][x] = 0;
    if (countSolutions(board, 2) === 1) removed += 1;
    else board[y][x] = saved;
  }
  return board;
}

export function conflicts(board) {
  const bad = Array.from({ length: 9 }, () => Array(9).fill(false));
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const value = board[y][x];
      if (!value) continue;
      board[y][x] = 0;
      if (!fits(board, x, y, value)) bad[y][x] = true;
      board[y][x] = value;
    }
  }
  return bad;
}

export function solved(board) {
  return board.every((row) => row.every(Boolean)) && conflicts(board).every((row) => row.every((cell) => !cell));
}
