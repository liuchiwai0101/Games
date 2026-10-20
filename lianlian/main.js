import { SYMBOLS, createBoard, hasMove, hint, reshuffle, take } from './game.js';

const grid = document.querySelector('#grid');
const statusEl = document.querySelector('#status');
let state = createBoard();

function render() {
  grid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
  grid.replaceChildren();
  state.cells.forEach((value, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tile${value ? ` t${value}` : ' gone'}${state.selected === index ? ' on' : ''}`;
    button.textContent = value ? SYMBOLS[value - 1] : '';
    button.dataset.index = String(index);
    button.disabled = !value;
    grid.append(button);
  });
  if (state.won) statusEl.textContent = '清完了。';
  else if (!hasMove(state)) statusEl.textContent = '沒有路了。按重排。';
  else statusEl.textContent = '點兩枚相同圖案。連線最多轉兩個彎。';
}

grid.addEventListener('click', (event) => {
  const button = event.target.closest('.tile');
  if (!button || state.won || !state.cells[button.dataset.index]) return;
  const index = Number(button.dataset.index);
  if (state.selected === index) {
    state = { ...state, selected: -1 };
    render();
    return;
  }
  if (state.selected < 0) {
    state = { ...state, selected: index };
    render();
    return;
  }
  const next = take(state, state.selected, index);
  state = next === state ? { ...state, selected: index } : next;
  render();
});

document.querySelector('#hint').addEventListener('click', () => {
  const pair = hint(state);
  if (!pair) { render(); return; }
  state = { ...state, selected: pair[0] };
  render();
  grid.querySelector(`[data-index="${pair[1]}"]`)?.classList.add('on');
});

document.querySelector('#mix').addEventListener('click', () => {
  if (state.won) return;
  state = reshuffle(state);
  render();
});

document.querySelector('#reset').addEventListener('click', () => {
  state = createBoard();
  render();
});

render();
