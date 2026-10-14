/** Rules for 井字過三關: classic 3×3, optional vanishing pieces, best of three gates. */

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const MOVE_CAP = 36;

export function other(player) {
  return player === 'X' ? 'O' : 'X';
}

export function createMatch(rules = 'classic') {
  const safe = rules === 'vanish' ? 'vanish' : 'classic';
  return {
    rules: safe,
    moves: [],
    board: Array(9).fill(null),
    turn: 'X',
    gates: [null, null, null],
    gate: 0,
    phase: 'playing',
    outcome: null,
    matchWinner: null,
    placed: null,
    removed: null,
    fresh: false,
  };
}

export function boardFromMoves(moves, rules) {
  const list = rules === 'vanish' && moves.length > 6 ? moves.slice(-6) : moves;
  const board = Array(9).fill(null);
  for (const move of list) board[move.index] = move.player;
  return board;
}

export function judge(board) {
  for (const line of LINES) {
    const player = board[line[0]];
    if (player && board[line[1]] === player && board[line[2]] === player) {
      return { player, line, draw: false };
    }
  }
  if (board.every(Boolean)) return { player: null, line: null, draw: true };
  return null;
}

/**
 * Place one piece. In vanish mode the oldest piece leaves after the 6th,
 * and the line is judged only after that removal.
 */
export function playPly(state, index) {
  if (!state || !Array.isArray(state.moves)) return null;
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx > 8) return null;
  const rules = state.rules === 'vanish' ? 'vanish' : 'classic';
  const board = boardFromMoves(state.moves, rules);
  if (board[idx]) return null;
  const player = state.turn === 'O' ? 'O' : 'X';
  const moves = state.moves.concat({ index: idx, player });
  const removed = rules === 'vanish' && moves.length > 6 ? moves[moves.length - 7] : null;
  const nextBoard = boardFromMoves(moves, rules);
  let outcome = judge(nextBoard);
  if (!outcome && rules === 'vanish' && moves.length >= (state.moveCap || MOVE_CAP)) {
    outcome = { player: null, line: null, draw: true };
  }
  return {
    rules,
    moves,
    board: nextBoard,
    turn: outcome ? player : other(player),
    outcome,
    placed: { index: idx, player },
    removed,
    moveCap: state.moveCap,
  };
}

export function applyMove(match, index) {
  if (!match || match.phase !== 'playing') return null;
  const ply = playPly(match, index);
  if (!ply) return null;
  const gates = match.gates.slice();
  const next = {
    rules: match.rules,
    moves: ply.moves,
    board: ply.board,
    turn: ply.outcome ? ply.placed.player : ply.turn,
    gates,
    gate: match.gate,
    phase: 'playing',
    outcome: ply.outcome,
    matchWinner: null,
    placed: ply.placed,
    removed: ply.removed,
    fresh: false,
  };
  if (!ply.outcome) return next;
  gates[match.gate] = ply.outcome.draw ? 'draw' : ply.outcome.player;
  const xWins = gates.filter((gate) => gate === 'X').length;
  const oWins = gates.filter((gate) => gate === 'O').length;
  const finished = xWins >= 2 || oWins >= 2 || match.gate >= 2;
  next.phase = finished ? 'match_end' : 'gate_end';
  if (finished) next.matchWinner = xWins === oWins ? 'draw' : xWins > oWins ? 'X' : 'O';
  return next;
}

export function advance(match) {
  if (!match || match.phase !== 'gate_end') return null;
  const gate = match.gate + 1;
  return {
    rules: match.rules,
    moves: [],
    board: Array(9).fill(null),
    turn: gate % 2 === 0 ? 'X' : 'O',
    gates: match.gates.slice(),
    gate,
    phase: 'playing',
    outcome: null,
    matchWinner: null,
    placed: null,
    removed: null,
    fresh: true,
  };
}

export function rematch(match) {
  const next = createMatch(match?.rules);
  next.fresh = true;
  return next;
}

export function activeMarks(state) {
  const moves = state?.moves || [];
  const windowed = state?.rules === 'vanish' && moves.length > 6 ? moves.slice(-6) : moves;
  const start = moves.length - windowed.length;
  return windowed.map((move, i) => ({
    index: move.index,
    player: move.player,
    n: start + i + 1,
  }));
}

/** Piece that will disappear on the next vanish-mode move. */
export function threatenedCell(state) {
  if (!state || state.rules !== 'vanish' || state.phase !== 'playing') return null;
  const moves = state.moves || [];
  if (moves.length < 6) return null;
  return moves[moves.length - 6].index;
}

export function present(match) {
  return {
    rules: match.rules,
    board: match.board,
    turn: match.turn,
    gates: match.gates,
    gate: match.gate,
    phase: match.phase,
    outcome: match.outcome,
    matchWinner: match.matchWinner,
    placed: match.placed,
    removed: match.removed,
    fresh: !!match.fresh,
    threatened: threatenedCell(match),
    marks: activeMarks(match),
  };
}
