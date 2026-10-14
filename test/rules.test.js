import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advance,
  applyMove,
  boardFromMoves,
  createMatch,
  judge,
  playPly,
  present,
  threatenedCell,
} from '../src/game/rules.js';

test('eight winning lines and a full-board draw', () => {
  for (const line of [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]) {
    const board = Array(9).fill(null);
    for (const cell of line) board[cell] = 'O';
    assert.equal(judge(board).player, 'O');
    assert.deepEqual(judge(board).line, line);
  }
  const draw = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  assert.equal(judge(draw).draw, true);
});

test('classic game rejects occupied cells and ends on three in a row', () => {
  let match = createMatch('classic');
  match = applyMove(match, 0);
  assert.equal(applyMove(match, 0), null);
  match = applyMove(match, 3);
  match = applyMove(match, 1);
  match = applyMove(match, 4);
  match = applyMove(match, 2);
  assert.equal(match.phase, 'gate_end');
  assert.equal(match.outcome.player, 'X');
  assert.equal(applyMove(match, 5), null);
});

test('a drawn gate can be followed, and two wins end the match early', () => {
  let match = createMatch('classic');
  const drawMoves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
  for (const cell of drawMoves) match = applyMove(match, cell);
  assert.equal(match.phase, 'gate_end');
  assert.equal(match.outcome.draw, true);
  assert.equal(match.gates[0], 'draw');

  match = createMatch('classic');
  for (const cell of [0, 3, 1, 4, 2]) match = applyMove(match, cell);
  assert.equal(match.phase, 'gate_end');
  match = advance(match);
  assert.equal(match.turn, 'O');
  assert.equal(match.gate, 1);
  for (const cell of [3, 0, 4, 1, 8, 2]) match = applyMove(match, cell);
  assert.equal(match.phase, 'match_end');
  assert.equal(match.matchWinner, 'X');
  assert.equal(match.gates[2], null);
  assert.equal(advance(match), null);
});

test('vanish mode removes the oldest piece before judging the line', () => {
  let state = { rules: 'vanish', moves: [], turn: 'X' };
  for (const cell of [0, 3, 1, 4, 6, 8, 2]) state = playPly(state, cell);
  assert.equal(state.board[0], null);
  assert.equal(state.removed.index, 0);
  assert.equal(state.outcome, null);

  state = { rules: 'vanish', moves: [], turn: 'X' };
  for (const cell of [8, 3, 0, 4, 1, 6, 2]) state = playPly(state, cell);
  assert.equal(state.board[8], null);
  assert.equal(state.outcome.player, 'X');
  assert.deepEqual(state.outcome.line, [0, 1, 2]);
});

test('the pulsing piece is the oldest of the six still on the board', () => {
  let match = createMatch('vanish');
  for (const cell of [0, 1, 2, 3, 4, 5]) match = applyMove(match, cell);
  assert.equal(threatenedCell(match), 0);
  match = applyMove(match, 7);
  assert.equal(match.phase, 'playing');
  assert.equal(match.board[0], null);
  assert.equal(threatenedCell(match), 1);
  const view = present(match);
  assert.equal(view.marks.length, 6);
  assert.equal(view.marks[0].n, 2);
});

test('vanish games declare a draw at the move cap', () => {
  let state = { rules: 'vanish', moves: [], turn: 'X', moveCap: 6 };
  for (let i = 0; i < 6; i += 1) state = playPly(state, i);
  assert.equal(state.outcome.draw, true);
  assert.equal(boardFromMoves(state.moves, 'vanish').filter(Boolean).length, 6);
});
