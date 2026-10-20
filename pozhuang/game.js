export const WIDTH = 480;
export const HEIGHT = 640;

function bricksFor(level) {
  const rows = Math.min(5 + (level % 4), 8);
  const bricks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      bricks.push({ x: 16 + col * 58, y: 46 + row * 26, w: 54, h: 20, hp: 1, tone: row % 5 });
    }
  }
  return bricks;
}

export function createMatch() {
  return {
    paddle: { x: 190, y: 586, w: 100, h: 14 },
    ball: { x: 240, y: 560, r: 7, vx: 3.2, vy: -3.8 },
    bricks: bricksFor(0),
    score: 0,
    lives: 3,
    level: 1,
    held: true,
    lost: false,
  };
}

export function movePaddle(state, center) {
  const x = Math.max(0, Math.min(WIDTH - state.paddle.w, center - state.paddle.w / 2));
  const paddle = { ...state.paddle, x };
  const ball = state.held
    ? { ...state.ball, x: x + paddle.w / 2, y: paddle.y - state.ball.r - 1 }
    : state.ball;
  return { ...state, paddle, ball };
}

export function launch(state) {
  if (state.lost || !state.held) return state;
  return { ...state, held: false };
}

function hits(ball, rect) {
  const cx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  return dx * dx + dy * dy <= ball.r * ball.r;
}

export function step(state) {
  if (state.lost || state.held) return state;
  const ball = { ...state.ball };
  const bricks = state.bricks.map((brick) => ({ ...brick }));
  let { score, lives, level } = state;
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; }
  if (ball.x > WIDTH - ball.r) { ball.x = WIDTH - ball.r; ball.vx *= -1; }
  if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }
  const paddle = state.paddle;
  if (ball.vy > 0 && hits(ball, paddle)) {
    ball.y = paddle.y - ball.r;
    ball.vy = -Math.abs(ball.vy);
    const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    ball.vx = hit * (3.4 + level * 0.25);
  }
  for (const brick of bricks) {
    if (!brick.hp || !hits(ball, brick)) continue;
    brick.hp = 0;
    score += 10;
    ball.vy *= -1;
    ball.y += ball.vy;
    break;
  }
  let held = false;
  let lost = false;
  if (ball.y - ball.r > HEIGHT) {
    lives -= 1;
    held = true;
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 1;
    ball.vx = 3.2 + (level - 1) * 0.2;
    ball.vy = -(3.8 + (level - 1) * 0.25);
    lost = lives <= 0;
  }
  let nextBricks = bricks;
  if (!lost && bricks.every((brick) => !brick.hp)) {
    level += 1;
    nextBricks = bricksFor(level);
    held = true;
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 1;
    ball.vx = 3.2 + (level - 1) * 0.2;
    ball.vy = -(3.8 + (level - 1) * 0.25);
    score += 50;
  }
  return { ...state, ball, bricks: nextBricks, paddle, score, lives, level, held, lost };
}
