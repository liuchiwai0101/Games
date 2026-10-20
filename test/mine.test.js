import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, flagCount, reveal, toggleFlag } from '../src/mine/game.js';

test('the first open cell and its neighbors are never mines', () => {
  const game = reveal(createGame({ rows: 9, cols: 9, mines: 10, rng: () => 0.3 }), 40);
  assert.equal(game.cells[40].mine, false);
  assert.equal(game.cells[40].revealed, true);
  assert.equal(game.started, true);
  assert.equal(game.alive, true);
  assert.equal(game.cells.filter((cell) => cell.mine).length, 10);
  for (const index of [30, 31, 32, 39, 41, 48, 49, 50]) {
    assert.equal(game.cells[index].mine, false);
  }
});

test('a blank cell opens its whole clearing', () => {
  const game = reveal(createGame({ rows: 3, cols: 3, mines: 0 }), 4);
  assert.equal(game.won, true);
  assert.equal(game.cells.every((cell) => cell.revealed), true);
});

test('opening a mine ends the game and uncovers every mine', () => {
  let game = createGame({ rows: 5, cols: 5, mines: 8, rng: () => 0.4 });
  game = reveal(game, 0);
  assert.equal(game.alive, true);
  const mine = game.cells.findIndex((cell) => cell.mine && !cell.revealed && !cell.flagged);
  assert.ok(mine >= 0);
  game = reveal(game, mine);
  assert.equal(game.alive, false);
  assert.equal(game.cells.filter((cell) => cell.mine && cell.revealed).length, 8);
  assert.equal(game.cells[mine].exploded, true);
});

test('flags block opening and can be removed', () => {
  let game = createGame({ rows: 5, cols: 5, mines: 3, rng: () => 0.2 });
  game = toggleFlag(game, 0);
  assert.equal(flagCount(game), 1);
  const after = reveal(game, 0);
  assert.equal(after.cells[0].revealed, false);
  game = toggleFlag(game, 0);
  assert.equal(game.cells[0].flagged, false);
});

test('a correct chord opens the remaining neighbors', () => {
  let game = createGame({ rows: 2, cols: 2, mines: 1, rng: () => 0 });
  game = reveal(game, 0);
  const mine = game.cells.findIndex((cell) => cell.mine);
  game = toggleFlag(game, mine);
  const numbered = game.cells.findIndex((cell, index) => cell.revealed && cell.count > 0 && index !== mine);
  game = reveal(game, numbered);
  assert.equal(game.won, true);
});

test('a wrong chord explodes', () => {
  let game = createGame({ rows: 2, cols: 2, mines: 1, rng: () => 0 });
  game = reveal(game, 0);
  const mine = game.cells.findIndex((cell) => cell.mine);
  const decoy = game.cells.findIndex((cell) => !cell.mine && !cell.revealed);
  assert.ok(mine >= 0);
  assert.ok(decoy >= 0);
  assert.equal(game.cells[0].count, 1);
  game = toggleFlag(game, decoy);
  game = reveal(game, 0);
  assert.equal(game.alive, false);
  assert.equal(game.cells[mine].revealed, true);
  assert.equal(game.cells[mine].exploded, true);
});
