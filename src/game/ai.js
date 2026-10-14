import { LINES, boardFromMoves, other, playPly } from './rules.js';

const PREFER = [4, 0, 2, 6, 8, 1, 3, 5, 7];

function emptyCells(board) {
  const cells = [];
  for (const index of PREFER) if (!board[index]) cells.push(index);
  return cells;
}

function moveRank(board, player, index) {
  let rank = 0;
  const opponent = other(player);
  for (const line of LINES) {
    if (!line.includes(index)) continue;
    let mine = 0;
    let theirs = 0;
    for (const cell of line) {
      if (cell === index) continue;
      if (board[cell] === player) mine += 1;
      else if (board[cell] === opponent) theirs += 1;
    }
    if (theirs === 0 && mine === 2) rank += 10;
    else if (mine === 0 && theirs === 2) rank += 8;
  }
  return rank;
}

function ordered(board, player) {
  return emptyCells(board).sort((a, b) => moveRank(board, player, b) - moveRank(board, player, a));
}

function evaluate(board, ai) {
  const opponent = other(ai);
  let score = 0;
  for (const line of LINES) {
    let mine = 0;
    let theirs = 0;
    for (const cell of line) {
      if (board[cell] === ai) mine += 1;
      else if (board[cell] === opponent) theirs += 1;
    }
    if (mine && theirs) continue;
    if (mine) score += mine * mine;
    if (theirs) score -= theirs * theirs;
  }
  return score;
}

function search(state, ai, depth, alpha, beta) {
  if (state.outcome?.player) {
    return (state.outcome.player === ai ? 1 : -1) * (900 + depth);
  }
  if (state.outcome?.draw) return 0;
  if (depth <= 0) return evaluate(state.board, ai);

  const legal = ordered(state.board, state.turn);
  if (!legal.length) return 0;
  const maximizing = state.turn === ai;
  if (maximizing) {
    let value = -Infinity;
    for (const index of legal) {
      const next = playPly(state, index);
      value = Math.max(value, search(next, ai, depth - 1, alpha, beta));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }
  let value = Infinity;
  for (const index of legal) {
    const next = playPly(state, index);
    value = Math.min(value, search(next, ai, depth - 1, alpha, beta));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

function bestMoves(state, depth) {
  const board = boardFromMoves(state.moves, state.rules);
  const legal = ordered(board, state.turn);
  let best = -Infinity;
  const found = [];
  for (const index of legal) {
    const next = playPly(state, index);
    const score = search(next, state.turn, depth - 1, -Infinity, Infinity);
    if (score > best) {
      best = score;
      found.length = 0;
      found.push(index);
    } else if (score === best) found.push(index);
  }
  return { score: best, moves: found };
}

function immediateWin(state) {
  const board = boardFromMoves(state.moves, state.rules);
  for (const index of PREFER) {
    if (board[index]) continue;
    const next = playPly(state, index);
    if (next?.outcome?.player === state.turn) return index;
  }
  return null;
}

function pick(list, rng) {
  if (!list.length) return null;
  const roll = rng();
  const index = Math.min(list.length - 1, Math.floor(roll * list.length));
  return list[index];
}

/**
 * novice misses wins and blocks.
 * adept always takes a win or a block, then mostly follows the search.
 * master always plays a perfect (or, in vanish mode, deep) move.
 */
export function chooseMove(state, level = 'master', rng = Math.random) {
  const rules = state.rules === 'vanish' ? 'vanish' : 'classic';
  const board = boardFromMoves(state.moves, rules);
  const legal = emptyCells(board);
  if (!legal.length) return null;
  const snapshot = { rules, moves: state.moves, turn: state.turn === 'O' ? 'O' : 'X' };

  if (level === 'novice') {
    if (rng() < 0.45) {
      const win = immediateWin(snapshot);
      if (win != null) return win;
    }
    if (rng() < 0.4) {
      const block = immediateWin({ ...snapshot, turn: other(snapshot.turn) });
      if (block != null) return block;
    }
    return pick(legal, rng);
  }

  const win = immediateWin(snapshot);
  if (win != null) return win;
  const block = immediateWin({ ...snapshot, turn: other(snapshot.turn) });

  if (level === 'adept') {
    if (block != null) return block;
    const depth = rules === 'vanish' ? 4 : 9;
    const { moves, score } = bestMoves(snapshot, depth);
    if (score > 0 || rng() < 0.82) return pick(moves, rng);
    return pick(legal, rng);
  }

  if (block != null && rules === 'classic') return block;
  const depth = rules === 'vanish' ? 6 : 9;
  const { moves } = bestMoves(snapshot, depth);
  return pick(moves.length ? moves : legal, rng);
}
