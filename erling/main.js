import { createGame, move } from './game.js';

const grid = document.querySelector('#grid');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const statusEl = document.querySelector('#status');
const BEST = 'erling-best-v1';
let state = createGame();
let start = null;

function best() {
  const saved = Number(localStorage.getItem(BEST) || 0);
  if (state.score > saved) localStorage.setItem(BEST, String(state.score));
  return Math.max(saved, state.score);
}

function render() {
  grid.replaceChildren();
  state.cells.forEach((value) => {
    const tile = document.createElement('div');
    tile.className = value ? `tile v${Math.min(value, 2048)}` : 'tile';
    tile.textContent = value ? String(value) : '';
    grid.append(tile);
  });
  scoreEl.textContent = String(state.score);
  bestEl.textContent = String(best());
  statusEl.textContent = state.lost ? '沒有步可走了。' : state.won ? '湊到 2048，還可以繼續。' : '方向鍵、滑動，或按下面的按鈕。';
}

function go(dir) {
  state = move(state, dir);
  render();
}

window.addEventListener('keydown', (event) => {
  const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (!dirs[event.key]) return;
  event.preventDefault();
  go(dirs[event.key]);
});

grid.addEventListener('pointerdown', (event) => { start = [event.clientX, event.clientY]; });
grid.addEventListener('pointerup', (event) => {
  if (!start) return;
  const dx = event.clientX - start[0];
  const dy = event.clientY - start[1];
  start = null;
  if (Math.hypot(dx, dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) go(dx > 0 ? 'right' : 'left');
  else go(dy > 0 ? 'down' : 'up');
});

for (const button of document.querySelectorAll('.pad button')) {
  button.addEventListener('click', () => go(button.dataset.dir));
}

document.querySelector('#reset').addEventListener('click', () => {
  state = createGame();
  render();
});

render();
