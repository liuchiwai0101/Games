import { choose, counts, createGame, legal, place } from './game.js';

const board = document.querySelector('#board');
const statusEl = document.querySelector('#status');
const modeButtons = [...document.querySelectorAll('.modes button')];
let mode = 'ai';
let state = createGame();
let thinking = false;

function say() {
  const score = counts(state);
  const tally = `黑 ${score.black}　白 ${score.white}`;
  if (state.winner === 3) return `和棋。${tally}`;
  if (state.winner === 1) return `黑子勝。${tally}`;
  if (state.winner === 2) return `白子勝。${tally}`;
  const who = state.turn === 1 ? '黑子' : '白子';
  return state.passed ? `${who}繼續，對方無子可下。${tally}` : `輪到${who}。${tally}`;
}

function render() {
  const options = state.winner ? [] : legal(state.cells, state.turn);
  board.replaceChildren();
  state.cells.forEach((value, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cell${value ? ` p${value}` : ''}${options.includes(index) ? ' hint' : ''}`;
    button.dataset.index = String(index);
    button.setAttribute('aria-label', value === 1 ? '黑子' : value === 2 ? '白子' : options.includes(index) ? '可下' : '空位');
    board.append(button);
  });
  statusEl.textContent = say();
}

function answer() {
  if (mode !== 'ai' || state.winner || state.turn !== 2) { thinking = false; render(); return; }
  const index = choose(state);
  if (index < 0) { thinking = false; render(); return; }
  state = place(state, index);
  thinking = false;
  render();
  if (state.turn === 2 && !state.winner) {
    thinking = true;
    window.setTimeout(answer, 160);
  }
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
    window.setTimeout(answer, 160);
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
