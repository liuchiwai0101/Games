import { NAMES, choose, movesFrom, play, startGame } from './game.js';

const layer = document.querySelector('#layer');
const statusEl = document.querySelector('#status');
const modeButtons = [...document.querySelectorAll('.modes button')];
let mode = 'ai';
let state = startGame();
let selected = null;
let thinking = false;

function say() {
  if (state.winner === 'r') return '紅方勝。';
  if (state.winner === 'b') return '黑方勝。';
  return state.turn === 'r' ? '輪到紅方。' : '輪到黑方。';
}

function render() {
  layer.replaceChildren();
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = state.board[y][x];
      if (!piece) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `piece ${piece.side}${selected && selected[0] === x && selected[1] === y ? ' on' : ''}`;
      button.textContent = NAMES[piece.side][piece.type];
      button.style.left = `${(x / 8) * 100}%`;
      button.style.top = `${(y / 9) * 100}%`;
      button.dataset.x = String(x);
      button.dataset.y = String(y);
      button.setAttribute('aria-label', button.textContent);
      layer.append(button);
    }
  }
  if (selected) {
    for (const move of movesFrom(state, selected[0], selected[1])) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = state.board[move[3]][move[2]] ? 'dot take' : 'dot';
      dot.style.left = `${(move[2] / 8) * 100}%`;
      dot.style.top = `${(move[3] / 9) * 100}%`;
      dot.dataset.tx = String(move[2]);
      dot.dataset.ty = String(move[3]);
      dot.setAttribute('aria-label', '可走');
      layer.append(dot);
    }
  }
  statusEl.textContent = say();
}

function answer() {
  if (mode !== 'ai' || state.turn !== 'b' || state.winner) { thinking = false; return; }
  const move = choose(state);
  if (!move) { thinking = false; return; }
  state = play(state, ...move);
  selected = null;
  thinking = false;
  render();
}

layer.addEventListener('click', (event) => {
  const dot = event.target.closest('.dot');
  if (dot && selected && !thinking) {
    state = play(state, selected[0], selected[1], Number(dot.dataset.tx), Number(dot.dataset.ty));
    selected = null;
    render();
    if (mode === 'ai' && state.turn === 'b' && !state.winner) {
      thinking = true;
      window.setTimeout(answer, 80);
    }
    return;
  }
  const piece = event.target.closest('.piece');
  if (!piece || state.winner || thinking) return;
  if (mode === 'ai' && state.turn !== 'r') return;
  const x = Number(piece.dataset.x);
  const y = Number(piece.dataset.y);
  if (state.board[y][x]?.side !== state.turn) return;
  selected = selected && selected[0] === x && selected[1] === y ? null : [x, y];
  render();
});

function reset() {
  state = startGame();
  selected = null;
  thinking = false;
  render();
}

for (const button of modeButtons) {
  button.addEventListener('click', () => {
    mode = button.dataset.mode;
    for (const other of modeButtons) other.classList.toggle('on', other === button);
    reset();
  });
}
document.querySelector('#reset').addEventListener('click', reset);
render();
