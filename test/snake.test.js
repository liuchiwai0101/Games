import assert from 'node:assert/strict';
import test from 'node:test';
import { placeFood, queueTurn, startGame, step, tickMs } from '../src/snake/game.js';

test('a fresh snake faces right with three segments and food on an empty cell', () => {
  const game = startGame({ size: 10, rng: () => 0 });
  assert.equal(game.snake.length, 3);
  assert.equal(game.dir, 'right');
  assert.ok(game.food);
  assert.equal(game.alive, true);
  assert.ok(!game.snake.some((part) => part.x === game.food.x && part.y === game.food.y));
});

test('the snake cannot reverse into itself in one turn', () => {
  let game = startGame({ size: 10, rng: () => 0.2 });
  game = queueTurn(game, 'left');
  assert.equal(game.pending, null);
  game = queueTurn(game, 'up');
  assert.equal(game.pending, 'up');
});

test('eating food grows the body and raises the score', () => {
  let game = startGame({ size: 10, rng: () => 0 });
  const head = game.snake[0];
  game.food = { x: head.x + 1, y: head.y };
  const length = game.snake.length;
  game = step(game);
  assert.equal(game.snake.length, length + 1);
  assert.equal(game.score, 1);
  assert.ok(game.food);
});

test('hitting a wall ends the run', () => {
  let game = startGame({ size: 5, rng: () => 0 });
  game.snake = [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }];
  game.dir = 'right';
  game.food = { x: 0, y: 0 };
  game = step(game);
  assert.equal(game.alive, false);
});

test('biting the body ends the run', () => {
  let game = startGame({ size: 8, rng: () => 0 });
  game.snake = [
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 3 },
    { x: 4, y: 2 },
  ];
  game.dir = 'right';
  game.food = { x: 0, y: 0 };
  game = step(game);
  assert.equal(game.alive, false);
});

test('food never lands on the snake', () => {
  const game = startGame({ size: 4, rng: () => 0.99 });
  game.snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  placeFood(game);
  assert.ok(game.food);
  assert.ok(!game.snake.some((part) => part.x === game.food.x && part.y === game.food.y));
});

test('the step interval shortens with score but never below the floor', () => {
  assert.equal(tickMs(0), 150);
  assert.ok(tickMs(10) < tickMs(0));
  assert.equal(tickMs(100), 70);
});
