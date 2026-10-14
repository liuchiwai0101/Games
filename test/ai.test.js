import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseMove } from '../src/game/ai.js';
import { playPly } from '../src/game/rules.js';

function empty(rules = 'classic') {
  return { rules, moves: [], turn: 'X' };
}

function playUntilOver(aiSide, level, rng) {
  let state = empty();
  let guard = 0;
  while (!state.outcome && guard < 12) {
    const index = state.turn === aiSide ? chooseMove(state, level, rng) : randomMove(state, rng);
    state = playPly(state, index);
    guard += 1;
  }
  return state;
}

function randomMove(state, rng) {
  const board = Array(9).fill(null);
  for (const move of state.moves) board[move.index] = move.player;
  const open = [];
  for (let i = 0; i < 9; i += 1) if (!board[i]) open.push(i);
  return open[Math.floor(rng() * open.length)];
}

test('a master opening takes the centre when every perfect move draws', () => {
  assert.equal(chooseMove(empty(), 'master', () => 0), 4);
});

test('master takes a win and answers a threat', () => {
  const win = {
    rules: 'classic',
    turn: 'X',
    moves: [
      { index: 0, player: 'X' },
      { index: 3, player: 'O' },
      { index: 1, player: 'X' },
      { index: 4, player: 'O' },
    ],
  };
  assert.equal(chooseMove(win, 'master', () => 0), 2);

  const block = {
    rules: 'classic',
    turn: 'O',
    moves: [
      { index: 0, player: 'X' },
      { index: 3, player: 'O' },
      { index: 1, player: 'X' },
    ],
  };
  assert.equal(chooseMove(block, 'master', () => 0), 2);
});

test('master finds the fork', () => {
  const fork = {
    rules: 'classic',
    turn: 'O',
    moves: [
      { index: 0, player: 'O' },
      { index: 4, player: 'X' },
      { index: 8, player: 'O' },
      { index: 6, player: 'X' },
    ],
  };
  assert.equal(chooseMove(fork, 'master', () => 0), 2);
});

test('perfect play between two masters is a draw', () => {
  let state = empty();
  while (!state.outcome) state = playPly(state, chooseMove(state, 'master', () => 0));
  assert.equal(state.outcome.draw, true);
});

test('a master does not lose to random play', () => {
  let seed = 7;
  const rng = () => {
    seed = (seed * 48271) % 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (const side of ['X', 'O']) {
    for (let game = 0; game < 6; game += 1) {
      const end = playUntilOver(side, 'master', rng);
      assert.notEqual(end.outcome?.player, side === 'X' ? 'O' : 'X');
    }
  }
});

test('vanish master returns a legal opening move', () => {
  const index = chooseMove(empty('vanish'), 'master', () => 0);
  assert.ok(index >= 0 && index <= 8);
});
