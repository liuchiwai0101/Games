import { conflicts, generate, solved } from './game.js';

const grid = document.querySelector('#grid');
const statusEl = document.querySelector('#status');
let puzzle = [];
let board = [];
let selected = 0;

function fresh() {
  puzzle = generate(Math.random, 34);
  board = puzzle.map((row) => row.slice());
  selected = 0;
  render();
}

function render() {
  const bad = conflicts(board);
  grid.replaceChildren();
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const index = y * 9 + x;
      const button = document.createElement('button');
      button.type = 'button';
      const given = puzzle[y][x] !== 0;
      button.className = `cell${given ? ' given' : ' entry'}${bad[y][x] ? ' bad' : ''}${selected === index ? ' on' : ''}${x % 3 === 2 && x !== 8 ? ' b' : ''}${y % 3 === 2 && y !== 8 ? ' d' : ''}`;
      button.textContent = board[y][x] ? String(board[y][x]) : '';
      button.dataset.index = String(index);
      grid.append(button);
    }
  }
  statusEl.textContent = solved(board) ? '完成。' : '選一格，再按數字。題目格子不能改。';
}

function write(value) {
  const y = Math.floor(selected / 9);
  const x = selected % 9;
  if (puzzle[y][x]) return;
  board[y][x] = value;
  render();
}

grid.addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button) return;
  selected = Number(button.dataset.index);
  render();
});

document.querySelector('#nums').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  write(Number(button.dataset.n));
});

window.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '9') write(Number(event.key));
  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') write(0);
  const y = Math.floor(selected / 9);
  const x = selected % 9;
  const dirs = { ArrowLeft: [x - 1, y], ArrowRight: [x + 1, y], ArrowUp: [x, y - 1], ArrowDown: [x, y + 1] };
  if (!dirs[event.key]) return;
  const [nx, ny] = dirs[event.key];
  if (nx < 0 || ny < 0 || nx > 8 || ny > 8) return;
  selected = ny * 9 + nx;
  render();
});

document.querySelector('#reset').addEventListener('click', fresh);
fresh();
