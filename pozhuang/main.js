import { HEIGHT, WIDTH, createMatch, launch, movePaddle, step } from './game.js';

const canvas = document.querySelector('#view');
const statusEl = document.querySelector('#status');
const ctx = canvas.getContext('2d');
const tones = ['#e7c27a', '#e09445', '#d45445', '#8fd0a8', '#9eb7e8'];
let state = createMatch();
let pointer = null;

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#141a24';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (const brick of state.bricks) {
    if (!brick.hp) continue;
    ctx.fillStyle = tones[brick.tone];
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
  }
  ctx.fillStyle = '#f4ecdf';
  ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbbda8';
  ctx.font = '20px "Noto Serif TC", serif';
  ctx.fillText(`分數 ${state.score}　命 ${state.lives}　第 ${state.level} 層`, 16, 30);
}

function frame() {
  state = step(state);
  if (pointer != null) state = movePaddle(state, pointer);
  draw();
  statusEl.textContent = state.lost
    ? '彈珠落地了。按重開。'
    : state.held
      ? '按一下畫面或空白鍵發球。'
      : '左右移動，或用方向鍵。';
  window.requestAnimationFrame(frame);
}

function aim(event) {
  const rect = canvas.getBoundingClientRect();
  pointer = ((event.clientX - rect.left) / rect.width) * WIDTH;
  state = movePaddle(state, pointer);
}

canvas.addEventListener('pointerdown', (event) => {
  aim(event);
  state = launch(state);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.buttons || event.pointerType === 'touch') aim(event);
});
window.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'ArrowUp') { event.preventDefault(); state = launch(state); }
  if (event.key === 'ArrowLeft') state = movePaddle(state, state.paddle.x + state.paddle.w / 2 - 24);
  if (event.key === 'ArrowRight') state = movePaddle(state, state.paddle.x + state.paddle.w / 2 + 24);
});
document.querySelector('#reset').addEventListener('click', () => {
  state = createMatch();
  pointer = null;
});
frame();
