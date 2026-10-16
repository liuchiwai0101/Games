import { queueTurn, startGame, step, tickMs } from './game.js';

const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');
const veil = document.querySelector('#veil');
const panelTitle = document.querySelector('#panelTitle');
const panelCopy = document.querySelector('#panelCopy');
const seal = document.querySelector('#seal');
const startBtn = document.querySelector('#startBtn');
const pauseBtn = document.querySelector('#pauseBtn');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const lengthEl = document.querySelector('#length');

const SIZE = 18;
const KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

const BEST_KEY = 'tanshe-best-v1';
let best = Number(localStorage.getItem(BEST_KEY) || 0);
bestEl.textContent = String(best);

let state = startGame({ size: SIZE });
let playing = false;
let paused = false;
let timer = 0;
let pulse = 0;
let flash = 0;
let touchStart = null;

function paintMeter() {
  scoreEl.textContent = String(state.score);
  lengthEl.textContent = String(state.snake.length);
  if (state.score > best) {
    best = state.score;
    bestEl.textContent = String(best);
    localStorage.setItem(BEST_KEY, String(best));
  }
}

function cell() {
  return canvas.width / SIZE;
}

function drawBoard() {
  const unit = cell();
  const time = pulse;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const ground = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  ground.addColorStop(0, '#0d1f1a');
  ground.addColorStop(1, '#081411');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(126, 208, 168, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i < SIZE; i += 1) {
    const p = i * unit;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }

  if (state.food) {
    const fx = state.food.x * unit + unit / 2;
    const fy = state.food.y * unit + unit / 2;
    const r = unit * (0.28 + Math.sin(time * 0.01) * 0.04);
    const glow = ctx.createRadialGradient(fx, fy, 2, fx, fy, unit * 0.55);
    glow.addColorStop(0, 'rgba(239, 107, 74, 0.55)');
    glow.addColorStop(1, 'rgba(239, 107, 74, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fx, fy, unit * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef6b4a';
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd2c2';
    ctx.beginPath();
    ctx.arc(fx - r * 0.3, fy - r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  state.snake.forEach((part, index) => {
    const x = part.x * unit;
    const y = part.y * unit;
    const inset = index === 0 ? unit * 0.12 : unit * 0.18;
    const radius = unit * 0.28;
    const body = ctx.createLinearGradient(x, y, x + unit, y + unit);
    if (index === 0) {
      body.addColorStop(0, '#d8ffe9');
      body.addColorStop(1, '#4db889');
    } else {
      const fade = 1 - index / (state.snake.length + 4);
      body.addColorStop(0, `rgba(182, 242, 210, ${0.35 + fade * 0.45})`);
      body.addColorStop(1, `rgba(47, 143, 107, ${0.55 + fade * 0.35})`);
    }
    ctx.fillStyle = body;
    roundRect(x + inset, y + inset, unit - inset * 2, unit - inset * 2, radius);
    ctx.fill();
    if (index === 0) {
      const eye = unit * 0.08;
      ctx.fillStyle = '#062118';
      const ox = state.dir === 'left' ? -unit * 0.12 : state.dir === 'right' ? unit * 0.12 : 0;
      const oy = state.dir === 'up' ? -unit * 0.12 : state.dir === 'down' ? unit * 0.12 : 0;
      ctx.beginPath();
      ctx.arc(x + unit * 0.38 + ox, y + unit * 0.38 + oy, eye, 0, Math.PI * 2);
      ctx.arc(x + unit * 0.62 + ox, y + unit * 0.38 + oy, eye, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 220, 180, ${flash * 0.18})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function showVeil({ title, copy, ended }) {
  panelTitle.textContent = title;
  panelCopy.textContent = copy;
  seal.hidden = !ended;
  if (ended) {
    seal.textContent = '終';
    seal.classList.remove('pop');
    void seal.offsetWidth;
  }
  startBtn.textContent = ended ? '再來一局' : '開局';
  veil.hidden = false;
  pauseBtn.hidden = true;
}

function hideVeil() {
  veil.hidden = true;
  pauseBtn.hidden = false;
  pauseBtn.textContent = '暫停';
}

function schedule() {
  window.clearTimeout(timer);
  if (!playing || paused || !state.alive) return;
  timer = window.setTimeout(tick, tickMs(state.score));
}

function tick() {
  const before = state.score;
  state = step(state);
  paintMeter();
  if (state.score > before) flash = 1;
  if (!state.alive) {
    playing = false;
    pauseBtn.hidden = true;
    showVeil({
      title: '這一盤終了',
      copy: `你得了 ${state.score} 分，身子長到 ${state.snake.length} 節。`,
      ended: true,
    });
    return;
  }
  schedule();
}

function begin() {
  state = startGame({ size: SIZE });
  playing = true;
  paused = false;
  flash = 0;
  paintMeter();
  hideVeil();
  schedule();
}

function turn(dir) {
  if (!playing || paused) return;
  state = queueTurn(state, dir);
}

startBtn.addEventListener('click', begin);
pauseBtn.addEventListener('click', () => {
  if (!playing || !state.alive) return;
  paused = !paused;
  pauseBtn.textContent = paused ? '繼續' : '暫停';
  if (paused) {
    window.clearTimeout(timer);
    showVeil({
      title: '暫停',
      copy: '歇一口氣。按繼續，或再按一次暫停鍵。',
      ended: false,
    });
    startBtn.textContent = '繼續';
  } else {
    hideVeil();
    schedule();
  }
});

document.querySelectorAll('.pad button').forEach((button) => {
  button.addEventListener('click', () => turn(button.dataset.dir));
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (!playing) begin();
    else pauseBtn.click();
    return;
  }
  const dir = KEYS[event.code];
  if (!dir) return;
  event.preventDefault();
  if (!playing) begin();
  turn(dir);
});

canvas.addEventListener('pointerdown', (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener('pointerup', (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
  else turn(dy > 0 ? 'down' : 'up');
});

function frame(now) {
  pulse = now;
  flash = Math.max(0, flash - 0.04);
  drawBoard();
  requestAnimationFrame(frame);
}

paintMeter();
showVeil({
  title: '墨竹園',
  copy: '箭頭、WASD，或在棋盤上滑動轉向。吃果子會長一節，撞牆或咬到自己就結束。',
  ended: false,
});
requestAnimationFrame(frame);
