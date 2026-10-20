import { LEVELS, createGame, flagCount, reveal, toggleFlag } from './game.js';

const grid = document.querySelector('#grid');
const leftEl = document.querySelector('#left');
const timeEl = document.querySelector('#time');
const statusEl = document.querySelector('#status');
const face = document.querySelector('#face');
const levelButtons = [...document.querySelectorAll('.levels button')];

const BEST_KEY = 'cailai-best-v1';
let level = 'easy';
let state = createGame(LEVELS.easy);
let startedAt = 0;
let elapsed = 0;
let timer = 0;
let pressTimer = 0;
let suppressClick = false;

function bestMap() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch {
    return {};
  }
}

function rememberBest() {
  if (!state.won) return;
  const map = bestMap();
  const previous = map[level];
  if (previous == null || elapsed < previous) {
    map[level] = elapsed;
    localStorage.setItem(BEST_KEY, JSON.stringify(map));
  }
}

function reset(nextLevel = level) {
  level = nextLevel;
  state = createGame({ ...LEVELS[level] });
  startedAt = 0;
  elapsed = 0;
  window.clearInterval(timer);
  face.textContent = '🙂';
  statusEl.textContent = '點開一格。右鍵或長按插旗。數字上再點可一次掀開周圍。';
  for (const button of levelButtons) {
    button.classList.toggle('on', button.dataset.level === level);
  }
  render();
}

function paintStatus() {
  const left = state.mines - flagCount(state);
  leftEl.textContent = String(left);
  timeEl.textContent = String(elapsed);
  if (!state.alive) {
    face.textContent = '😵';
    statusEl.textContent = '踩中了。按笑臉再來一局。';
  } else if (state.won) {
    face.textContent = '😎';
    const best = bestMap()[level];
    statusEl.textContent = best != null ? `過關。這一難度最快 ${best} 秒。` : '過關。';
  }
}

function render() {
  grid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
  grid.replaceChildren();
  state.cells.forEach((cell, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.index = String(index);
    if (cell.revealed) button.classList.add('revealed');
    if (cell.exploded) button.classList.add('exploded');
    if (cell.flagged && !cell.mine && (cell.revealed || !state.alive)) button.classList.add('wrong');
    let label = '未揭開';
    if (cell.flagged && (!cell.revealed || cell.mine)) {
      button.textContent = '⚑';
      button.classList.add('flagged');
      label = '已插旗';
    } else if (cell.revealed && cell.mine) {
      button.textContent = '✹';
      label = '地雷';
    } else if (cell.revealed && cell.count > 0) {
      button.textContent = String(cell.count);
      button.classList.add(`n${cell.count}`);
      label = `周圍 ${cell.count} 顆雷`;
    } else if (cell.revealed) {
      label = '空格';
    }
    button.setAttribute('aria-label', label);
    grid.append(button);
  });
  paintStatus();
}

function beginTimer() {
  if (startedAt) return;
  startedAt = performance.now();
  timer = window.setInterval(() => {
    if (!state.started || !state.alive || state.won) return;
    elapsed = Math.floor((performance.now() - startedAt) / 1000);
    timeEl.textContent = String(elapsed);
  }, 200);
}

function apply(next) {
  const wasStarted = state.started;
  state = next;
  if (state.started && !wasStarted) beginTimer();
  if (!state.alive || state.won) {
    if (startedAt) elapsed = Math.floor((performance.now() - startedAt) / 1000);
    window.clearInterval(timer);
    rememberBest();
  }
  render();
}

function onReveal(index) {
  if (suppressClick) return;
  face.textContent = state.alive && !state.won ? '😮' : face.textContent;
  apply(reveal(state, index));
  if (state.alive && !state.won) face.textContent = '🙂';
}

function onFlag(index) {
  apply(toggleFlag(state, index));
}

grid.addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button) return;
  onReveal(Number(button.dataset.index));
});

grid.addEventListener('contextmenu', (event) => {
  const button = event.target.closest('.cell');
  if (!button) return;
  event.preventDefault();
  onFlag(Number(button.dataset.index));
});

grid.addEventListener('pointerdown', (event) => {
  const button = event.target.closest('.cell');
  if (!button || event.button !== 0 || event.pointerType === 'mouse') return;
  const index = Number(button.dataset.index);
  pressTimer = window.setTimeout(() => {
    suppressClick = true;
    onFlag(index);
  }, 420);
});

function clearPress() {
  window.clearTimeout(pressTimer);
  window.setTimeout(() => {
    suppressClick = false;
  }, 0);
}

grid.addEventListener('pointerup', clearPress);
grid.addEventListener('pointerleave', clearPress);
grid.addEventListener('pointercancel', clearPress);

face.addEventListener('click', () => reset(level));
for (const button of levelButtons) {
  button.addEventListener('click', () => reset(button.dataset.level));
}

reset('easy');
