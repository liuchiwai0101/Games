export const WIDTH = 4;
export const HEIGHT = 5;

export function classic() {
  return {
    moves: 0,
    won: false,
    pieces: [
      { id: 'cao', name: '曹操', w: 2, h: 2, x: 1, y: 0 },
      { id: 'zhang', name: '張飛', w: 1, h: 2, x: 0, y: 0 },
      { id: 'zhao', name: '趙雲', w: 1, h: 2, x: 3, y: 0 },
      { id: 'ma', name: '馬超', w: 1, h: 2, x: 0, y: 2 },
      { id: 'huang', name: '黃忠', w: 1, h: 2, x: 3, y: 2 },
      { id: 'guan', name: '關羽', w: 2, h: 1, x: 1, y: 2 },
      { id: 's1', name: '兵', w: 1, h: 1, x: 1, y: 3 },
      { id: 's2', name: '兵', w: 1, h: 1, x: 2, y: 3 },
      { id: 's3', name: '兵', w: 1, h: 1, x: 0, y: 4 },
      { id: 's4', name: '兵', w: 1, h: 1, x: 3, y: 4 },
    ],
  };
}

function occupied(pieces, ignore) {
  const cells = new Set();
  for (const piece of pieces) {
    if (piece === ignore) continue;
    for (let y = piece.y; y < piece.y + piece.h; y += 1) {
      for (let x = piece.x; x < piece.x + piece.w; x += 1) cells.add(`${x},${y}`);
    }
  }
  return cells;
}

export function canMove(state, id, dx, dy) {
  if (state.won || Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const piece = state.pieces.find((item) => item.id === id);
  if (!piece) return false;
  const blocked = occupied(state.pieces, piece);
  for (let y = piece.y + dy; y < piece.y + dy + piece.h; y += 1) {
    for (let x = piece.x + dx; x < piece.x + dx + piece.w; x += 1) {
      if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT || blocked.has(`${x},${y}`)) return false;
    }
  }
  return true;
}

export function move(state, id, dx, dy) {
  if (!canMove(state, id, dx, dy)) return state;
  const pieces = state.pieces.map((piece) => ({ ...piece }));
  const piece = pieces.find((item) => item.id === id);
  piece.x += dx;
  piece.y += dy;
  const cao = pieces.find((item) => item.id === 'cao');
  return { pieces, moves: state.moves + 1, won: cao.x === 1 && cao.y === 3 };
}

export function options(state, id) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => canMove(state, id, dx, dy));
}
