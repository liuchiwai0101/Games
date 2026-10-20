import assert from 'node:assert/strict';
import test from 'node:test';
import { choose as gomokuChoose, createGame as gomoku, place as gomokuPlace } from '../wuziqi/game.js';
import { createGame as make2048, move as move2048, slideLine } from '../erling/game.js';
import { choose as reversiChoose, counts, createGame as reversi, flips, place as reversiPlace } from '../heibai/game.js';
import { allMoves, choose as xiangqiChoose, fromPieces, kingInCheck, play, startGame } from '../xiangqi/game.js';
import { canMove, classic, move as slideBlock } from '../huarong/game.js';
import { createGame as solitaire, draw, moveTableau, moveWasteToFoundation } from '../jielong/game.js';
import { connected, createBoard, hasMove, take } from '../lianlian/game.js';
import { countSolutions, generate, solved } from '../shudu/game.js';
import { createMatch, launch, movePaddle, step } from '../pozhuang/game.js';

test('gomoku wins on five and the computer answers a four', () => {
  let game = gomoku();
  for (const index of [0, 15, 1, 16, 2, 17, 3, 18]) game = gomokuPlace(game, index);
  assert.equal(game.winner, 0);
  game = gomokuPlace(game, 4);
  assert.equal(game.winner, 1);
  const threat = gomoku();
  for (const index of [20, 21, 22, 23]) threat.cells[index] = 2;
  threat.turn = 1;
  assert.ok([19, 24].includes(gomokuChoose(threat)));
});

test('2048 slides and merges a row once', () => {
  assert.deepEqual(slideLine([2, 2, 2, 2]), { line: [4, 4, 0, 0], score: 8 });
  assert.deepEqual(slideLine([4, 2, 2, 0]), { line: [4, 4, 0, 0], score: 4 });
  const game = move2048({ cells: [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 0, won: false, lost: false, rng: () => 0 }, 'left');
  assert.equal(game.score, 4);
  assert.equal(game.cells[0], 4);
  assert.equal(game.cells.filter(Boolean).length, 2);
  const stuck = move2048({ cells: [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 0, won: false, lost: false, rng: () => 0 }, 'left');
  assert.equal(stuck.score, 0);
  assert.equal(make2048(() => 0).cells.filter(Boolean).length, 2);
});

test('reversi opens with four legal moves and flips a line', () => {
  const game = reversi();
  assert.equal(flips(game.cells, 26, 1).length, 1);
  const next = reversiPlace(game, 26);
  assert.equal(next.cells[26], 1);
  assert.equal(next.cells[27], 1);
  assert.equal(next.turn, 2);
  assert.equal(counts(next).black, 4);
  assert.ok(reversiChoose(next) >= 0);
});

test('xiangqi enforces horse, cannon, palace, river, and facing generals', () => {
  const horse = fromPieces([
    { side: 'r', type: 'K', x: 4, y: 9 },
    { side: 'b', type: 'K', x: 3, y: 0 },
    { side: 'r', type: 'H', x: 1, y: 9 },
    { side: 'b', type: 'P', x: 1, y: 8 },
  ]);
  assert.ok(!allMoves(horse).some((move) => move[2] === 2 && move[3] === 7));

  const cannon = fromPieces([
    { side: 'r', type: 'K', x: 4, y: 9 },
    { side: 'b', type: 'K', x: 3, y: 0 },
    { side: 'r', type: 'C', x: 0, y: 0 },
    { side: 'b', type: 'P', x: 3, y: 0 },
    { side: 'b', type: 'R', x: 5, y: 0 },
  ]);
  const shots = allMoves(cannon).filter((move) => move[0] === 0 && move[1] === 0);
  assert.ok(shots.some((move) => move[2] === 5 && move[3] === 0));
  assert.ok(!shots.some((move) => move[2] === 3 && move[3] === 0));
  assert.ok(!shots.some((move) => move[2] === 4 && move[3] === 0));

  const advisor = fromPieces([
    { side: 'r', type: 'K', x: 4, y: 9 },
    { side: 'b', type: 'K', x: 3, y: 0 },
    { side: 'r', type: 'A', x: 3, y: 9 },
  ]);
  assert.ok(allMoves(advisor).some((move) => move[2] === 4 && move[3] === 8));
  assert.ok(!allMoves(advisor).some((move) => move[2] === 2 && move[3] === 8));

  const elephant = fromPieces([
    { side: 'r', type: 'K', x: 4, y: 9 },
    { side: 'b', type: 'K', x: 3, y: 0 },
    { side: 'r', type: 'E', x: 4, y: 5 },
  ]);
  assert.ok(!allMoves(elephant).some((move) => move[3] < 5 && move[0] === 4));

  const pawn = fromPieces([
    { side: 'r', type: 'K', x: 4, y: 9 },
    { side: 'b', type: 'K', x: 3, y: 0 },
    { side: 'r', type: 'P', x: 0, y: 6 },
    { side: 'r', type: 'P', x: 8, y: 4 },
  ]);
  const homePawn = allMoves(pawn).filter((move) => move[0] === 0 && move[1] === 6);
  assert.deepEqual(homePawn.map((move) => [move[2], move[3]]), [[0, 5]]);
  const crossed = allMoves(pawn).filter((move) => move[0] === 8 && move[1] === 4);
  assert.equal(crossed.length, 2);

  const facing = fromPieces([
    { side: 'r', type: 'K', x: 4, y: 9 },
    { side: 'b', type: 'K', x: 4, y: 0 },
    { side: 'r', type: 'P', x: 4, y: 5 },
  ]);
  assert.equal(kingInCheck(facing.board, 'r'), false);
  const opened = play(facing, 4, 5, 3, 5);
  assert.equal(opened.board[5][4]?.type, 'P');
  const blocked = play(facing, 4, 9, 3, 9);
  assert.equal(blocked.turn, 'b');

  const hanging = fromPieces([
    { side: 'r', type: 'K', x: 4, y: 9 },
    { side: 'b', type: 'K', x: 3, y: 0 },
    { side: 'r', type: 'R', x: 0, y: 9 },
    { side: 'b', type: 'R', x: 0, y: 4 },
  ]);
  const started = Date.now();
  const choice = xiangqiChoose(hanging);
  assert.ok(Date.now() - started < 1500);
  assert.deepEqual(choice, [0, 9, 0, 4]);
  assert.equal(startGame().turn, 'r');
  assert.ok(allMoves(startGame()).length > 20);
});

test('huarong slides a soldier and keeps 曹操 in place', () => {
  const board = classic();
  assert.equal(canMove(board, 'cao', 0, 1), false);
  const next = slideBlock(board, 's1', 0, 1);
  assert.equal(next.pieces.find((piece) => piece.id === 's1').y, 4);
  assert.equal(next.moves, 1);
  assert.equal(next.won, false);
});

test('klondike builds down in alternating colors and accepts an ace', () => {
  const state = {
    tableau: [
      [{ suit: 'S', rank: 13, up: true }],
      [{ suit: 'H', rank: 12, up: true }],
      [], [], [], [], [],
    ],
    stock: [{ suit: 'D', rank: 9, up: false }],
    waste: [{ suit: 'S', rank: 1, up: true }],
    foundations: { S: [], H: [], D: [], C: [] },
    won: false,
  };
  const stacked = moveTableau(state, 1, 0, 0);
  assert.equal(stacked.tableau[0].length, 2);
  assert.equal(stacked.tableau[1].length, 0);
  const sameColor = moveTableau(state, 1, 0, 0);
  assert.equal(sameColor.tableau[0][0].suit, 'S');
  const redOnRed = {
    ...state,
    tableau: [[{ suit: 'D', rank: 13, up: true }], [{ suit: 'H', rank: 12, up: true }], [], [], [], [], []],
  };
  assert.equal(moveTableau(redOnRed, 1, 0, 0), redOnRed);
  const founded = moveWasteToFoundation(state);
  assert.equal(founded.foundations.S.length, 1);
  assert.equal(founded.waste.length, 0);
  const recycled = draw({ ...state, stock: [], waste: state.waste });
  assert.equal(recycled.stock.length, 1);
  assert.equal(solitaire(() => 0.3).tableau[6].length, 7);
});

test('lianlian connects around a block and not through a closed box', () => {
  const around = { cols: 3, rows: 1, cells: [2, 1, 2], selected: -1, won: false };
  assert.equal(connected(around, 0, 2), true);
  const cleared = take(around, 0, 2);
  assert.equal(cleared.won, false);
  assert.equal(cleared.cells[0], 0);
  const boxed = {
    cols: 4,
    rows: 4,
    cells: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
    selected: -1,
    won: false,
  };
  assert.equal(connected(boxed, 5, 10), false);
  assert.equal(connected({ cols: 2, rows: 1, cells: [3, 3], selected: -1, won: false }, 0, 1), true);
  assert.equal(hasMove(createBoard(() => 0.2)), true);
});

test('sudoku puzzles keep a single solution', () => {
  const board = generate(() => 0.4, 12);
  assert.equal(countSolutions(board, 2), 1);
  assert.ok(board.flat().some((value) => value === 0));
  const filled = generate(() => 0.2, 0);
  assert.equal(solved(filled), true);
});

test('breakout removes a brick and loses a life below the paddle', () => {
  let match = launch(createMatch());
  match = { ...match, ball: { ...match.ball, x: match.bricks[0].x + 10, y: match.bricks[0].y + 28, vx: 0, vy: -6 } };
  const before = Math.hypot(match.ball.vx, match.ball.vy);
  let hit = match;
  for (let i = 0; i < 6; i += 1) hit = step(hit);
  assert.ok(hit.score >= 10);
  assert.ok(Math.hypot(hit.ball.vx, hit.ball.vy) > before + 0.2);
  let fallen = launch(createMatch());
  fallen = { ...fallen, ball: { ...fallen.ball, x: 200, y: 642, vx: 0, vy: 8 } };
  fallen = step(fallen);
  assert.equal(fallen.lives, 2);
  assert.equal(fallen.held, true);
  const moved = movePaddle(createMatch(), 20);
  assert.equal(moved.paddle.x, 0);
});
