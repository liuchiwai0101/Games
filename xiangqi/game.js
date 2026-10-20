const VALUES = { K: 10000, R: 90, C: 45, H: 40, E: 20, A: 20, P: 10 };

export function emptyBoard() {
  return Array.from({ length: 10 }, () => Array(9).fill(null));
}

export function fromPieces(list, turn = 'r') {
  const board = emptyBoard();
  for (const piece of list) board[piece.y][piece.x] = { side: piece.side, type: piece.type };
  return { board, turn, winner: null };
}

export function startGame() {
  const back = ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R'];
  const list = [];
  back.forEach((type, x) => {
    list.push({ side: 'b', type, x, y: 0 }, { side: 'r', type, x, y: 9 });
  });
  list.push(
    { side: 'b', type: 'C', x: 1, y: 2 },
    { side: 'b', type: 'C', x: 7, y: 2 },
    { side: 'r', type: 'C', x: 1, y: 7 },
    { side: 'r', type: 'C', x: 7, y: 7 },
  );
  for (const x of [0, 2, 4, 6, 8]) {
    list.push({ side: 'b', type: 'P', x, y: 3 }, { side: 'r', type: 'P', x, y: 6 });
  }
  return fromPieces(list, 'r');
}

function inside(x, y) {
  return x >= 0 && x < 9 && y >= 0 && y < 10;
}

function palace(side, x, y) {
  if (x < 3 || x > 5) return false;
  return side === 'b' ? y <= 2 : y >= 7;
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function pseudoMoves(board, x, y) {
  const piece = board[y][x];
  if (!piece) return [];
  const moves = [];
  const open = (tx, ty) => inside(tx, ty) && (!board[ty][tx] || board[ty][tx].side !== piece.side);
  if (piece.type === 'R' || piece.type === 'C') {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let cx = x + dx;
      let cy = y + dy;
      let jumped = false;
      while (inside(cx, cy)) {
        const occupied = board[cy][cx];
        if (!occupied) {
          if (piece.type === 'R' || !jumped) moves.push([cx, cy]);
        } else if (piece.type === 'R') {
          if (occupied.side !== piece.side) moves.push([cx, cy]);
          break;
        } else if (!jumped) {
          jumped = true;
        } else {
          if (occupied.side !== piece.side) moves.push([cx, cy]);
          break;
        }
        cx += dx;
        cy += dy;
      }
    }
  } else if (piece.type === 'H') {
    const legs = [
      [1, 2, 0, 1], [1, -2, 0, -1], [-1, 2, 0, 1], [-1, -2, 0, -1],
      [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0],
    ];
    for (const [dx, dy, lx, ly] of legs) {
      if (!inside(x + lx, y + ly) || board[y + ly][x + lx]) continue;
      if (open(x + dx, y + dy)) moves.push([x + dx, y + dy]);
    }
  } else if (piece.type === 'E') {
    for (const [dx, dy, ex, ey] of [[2, 2, 1, 1], [2, -2, 1, -1], [-2, 2, -1, 1], [-2, -2, -1, -1]]) {
      const tx = x + dx;
      const ty = y + dy;
      if (!inside(tx, ty) || board[y + ey][x + ex]) continue;
      if (piece.side === 'r' && ty < 5) continue;
      if (piece.side === 'b' && ty > 4) continue;
      if (open(tx, ty)) moves.push([tx, ty]);
    }
  } else if (piece.type === 'A') {
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const tx = x + dx;
      const ty = y + dy;
      if (palace(piece.side, tx, ty) && open(tx, ty)) moves.push([tx, ty]);
    }
  } else if (piece.type === 'K') {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const tx = x + dx;
      const ty = y + dy;
      if (palace(piece.side, tx, ty) && open(tx, ty)) moves.push([tx, ty]);
    }
    const dir = piece.side === 'r' ? -1 : 1;
    for (let cy = y + dir; inside(x, cy); cy += dir) {
      const occupied = board[cy][x];
      if (!occupied) continue;
      if (occupied.type === 'K' && occupied.side !== piece.side) moves.push([x, cy]);
      break;
    }
  } else if (piece.type === 'P') {
    const forward = piece.side === 'r' ? -1 : 1;
    const crossed = piece.side === 'r' ? y <= 4 : y >= 5;
    const steps = [[0, forward]];
    if (crossed) steps.push([1, 0], [-1, 0]);
    for (const [dx, dy] of steps) if (open(x + dx, y + dy)) moves.push([x + dx, y + dy]);
  }
  return moves;
}

function findKing(board, side) {
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = board[y][x];
      if (piece && piece.side === side && piece.type === 'K') return [x, y];
    }
  }
  return null;
}

export function kingInCheck(board, side) {
  const king = findKing(board, side);
  if (!king) return true;
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = board[y][x];
      if (!piece || piece.side === side) continue;
      if (pseudoMoves(board, x, y).some(([tx, ty]) => tx === king[0] && ty === king[1])) return true;
    }
  }
  return false;
}

function applyRaw(state, move) {
  const [fx, fy, tx, ty] = move;
  const board = cloneBoard(state.board);
  const piece = board[fy][fx];
  const captured = board[ty][tx];
  board[ty][tx] = piece;
  board[fy][fx] = null;
  if (captured?.type === 'K') return { board, turn: state.turn, winner: state.turn };
  return { board, turn: state.turn === 'r' ? 'b' : 'r', winner: null };
}

export function allMoves(state) {
  if (state.winner) return [];
  const moves = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = state.board[y][x];
      if (!piece || piece.side !== state.turn) continue;
      for (const [tx, ty] of pseudoMoves(state.board, x, y)) {
        const next = applyRaw(state, [x, y, tx, ty]);
        if (!kingInCheck(next.board, state.turn)) moves.push([x, y, tx, ty]);
      }
    }
  }
  return moves;
}

export function movesFrom(state, x, y) {
  return allMoves(state).filter((move) => move[0] === x && move[1] === y);
}

export function play(state, fx, fy, tx, ty) {
  if (state.winner) return state;
  if (!movesFrom(state, fx, fy).some((move) => move[2] === tx && move[3] === ty)) return state;
  const next = applyRaw(state, [fx, fy, tx, ty]);
  if (!next.winner && allMoves(next).length === 0) next.winner = state.turn;
  return next;
}

function evaluate(state, side) {
  if (state.winner) return state.winner === side ? 100000 : -100000;
  let score = 0;
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = state.board[y][x];
      if (!piece) continue;
      let value = VALUES[piece.type];
      if (piece.type === 'P' && (piece.side === 'r' ? y <= 4 : y >= 5)) value += 8;
      score += piece.side === side ? value : -value;
    }
  }
  return score;
}

function scoreFor(state, side, depth) {
  if (state.winner) return state.winner === side ? 100000 + depth : -100000 - depth;
  if (depth === 0) return evaluate(state, side);
  const moves = allMoves(state);
  if (!moves.length) return state.turn === side ? -100000 : 100000;
  let best = state.turn === side ? -Infinity : Infinity;
  for (const move of moves) {
    const score = scoreFor(applyRaw(state, move), side, depth - 1);
    best = state.turn === side ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

export function choose(state) {
  const moves = allMoves(state);
  if (!moves.length) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = scoreFor(applyRaw(state, move), state.turn, 1);
    if (score > bestScore) { bestScore = score; best = move; }
  }
  return best;
}

export const NAMES = {
  r: { K: '帥', A: '仕', E: '相', H: '馬', R: '車', C: '炮', P: '兵' },
  b: { K: '將', A: '士', E: '象', H: '馬', R: '車', C: '砲', P: '卒' },
};
