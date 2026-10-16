/** Classic grid snake. Walls kill. One bite grows the body by one. */

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function createGame({ size = 18, rng = Math.random } = {}) {
  const mid = Math.floor(size / 2);
  return {
    size,
    snake: [
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
    ],
    dir: 'right',
    pending: null,
    food: null,
    score: 0,
    alive: true,
    ticks: 0,
    rng,
  };
}

export function placeFood(state) {
  const open = [];
  for (let y = 0; y < state.size; y += 1) {
    for (let x = 0; x < state.size; x += 1) {
      if (!state.snake.some((part) => part.x === x && part.y === y)) open.push({ x, y });
    }
  }
  if (!open.length) {
    state.food = null;
    return state;
  }
  state.food = open[Math.floor(state.rng() * open.length)];
  return state;
}

export function queueTurn(state, next) {
  if (!DIRS[next] || !state.alive) return state;
  const current = state.pending || state.dir;
  if (OPPOSITE[current] === next) return state;
  return { ...state, pending: next };
}

export function step(state) {
  if (!state.alive) return state;
  const dir = state.pending && OPPOSITE[state.dir] !== state.pending ? state.pending : state.dir;
  const head = state.snake[0];
  const next = { x: head.x + DIRS[dir].x, y: head.y + DIRS[dir].y };
  const hitWall = next.x < 0 || next.y < 0 || next.x >= state.size || next.y >= state.size;
  const hitSelf = state.snake.some((part, index) => index < state.snake.length - 1 && part.x === next.x && part.y === next.y);
  if (hitWall || hitSelf) {
    return { ...state, dir, pending: null, alive: false, ticks: state.ticks + 1 };
  }
  const ate = state.food && state.food.x === next.x && state.food.y === next.y;
  const snake = [next, ...state.snake];
  if (!ate) snake.pop();
  const nextState = {
    ...state,
    snake,
    dir,
    pending: null,
    score: ate ? state.score + 1 : state.score,
    ticks: state.ticks + 1,
  };
  if (ate) placeFood(nextState);
  return nextState;
}

export function tickMs(score) {
  return Math.max(70, 150 - score * 4);
}

export function startGame(options) {
  const state = createGame(options);
  placeFood(state);
  return state;
}
