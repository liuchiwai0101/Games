import { classic, move, options } from './game.js';

const board = document.querySelector('#board');
const statusEl = document.querySelector('#status');
let state = classic();
let selected = 'cao';
const history = [];

function render() {
  board.replaceChildren();
  for (const piece of state.pieces) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `piece${piece.id === 'cao' ? ' cao' : ''}${piece.id === selected ? ' on' : ''}`;
    button.textContent = piece.name;
    button.dataset.id = piece.id;
    button.style.gridColumn = `${piece.x + 1} / span ${piece.w}`;
    button.style.gridRow = `${piece.y + 1} / span ${piece.h}`;
    board.append(button);
  }
  statusEl.textContent = state.won ? `過關，共 ${state.moves} 步。` : `已走 ${state.moves} 步。點木塊，再按方向。`;
}

function step(dx, dy) {
  if (!selected) return;
  const next = move(state, selected, dx, dy);
  if (next === state) return;
  history.push(state);
  state = next;
  render();
}

board.addEventListener('click', (event) => {
  const button = event.target.closest('.piece');
  if (!button) return;
  selected = button.dataset.id;
  const ways = options(state, selected);
  if (ways.length === 1) step(...ways[0]);
  else render();
});

for (const button of document.querySelectorAll('.dirs button')) {
  button.addEventListener('click', () => {
    const [dx, dy] = button.dataset.dir.split(',').map(Number);
    step(dx, dy);
  });
}

window.addEventListener('keydown', (event) => {
  const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (!dirs[event.key]) return;
  event.preventDefault();
  step(...dirs[event.key]);
});

document.querySelector('#reset').addEventListener('click', () => {
  state = classic();
  selected = 'cao';
  history.length = 0;
  render();
});

render();
