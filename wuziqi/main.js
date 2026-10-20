import { SIZE, choose, createGame, place } from './game.js';

const board = document.querySelector('#board');
const statusEl = document.querySelector('#status');
const modeButtons = [...document.querySelectorAll('.modes button')];
let mode = 'ai';
let state = createGame();
let thinking = false;

function say() {
  if (state.winner === 1) return '黑子勝。';
  if (state.winner === 2) return '白子勝。';
  if (state.winner === 3) return '和棋。';
  return state.turn === 1 ? '輪到黑子。' : '輪到白子。';
}

function render() {
  board.replaceChildren();
  board.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
  state.cells.forEach((value, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cell${value ? ` p${value}` : ''}${state.last === index ? ' last' : ''}`;
    button.dataset.index = String(index);
    button.setAttribute('aria-label', value === 1 ? '黑子' : value === 2 ? '白子' : '空位');
    board.append(button);
  });
  statusEl.textContent = say();
}

function answer() {
  if (mode !== 'ai' || state.turn !== 2 || state.winner) { thinking = false; return; }
  state = place(state, choose(state));
  thinking = false;
  render();
}

board.addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button || state.winner || thinking) return;
  if (mode === 'ai' && state.turn !== 1) return;
  const next = place(state, Number(button.dataset.index));
  if (next === state) return;
  state = next;
  render();
  if (mode === 'ai' && state.turn === 2 && !state.winner) {
    thinking = true;
    window.setTimeout(answer, 90);
  }
});

for (const button of modeButtons) {
  button.addEventListener('click', () => {
    mode = button.dataset.mode;
    for (const other of modeButtons) other.classList.toggle('on', other === button);
    state = createGame();
    thinking = false;
    render();
  });
}

document.querySelector('#reset').addEventListener('click', () => {
  state = createGame();
  thinking = false;
  render();
});

render();
