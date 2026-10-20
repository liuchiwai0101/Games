import {
  SUITS,
  createGame,
  draw,
  isRed,
  moveTableau,
  moveTableauToFoundation,
  moveWasteToFoundation,
  moveWasteToTableau,
  rankLabel,
} from './game.js';

const table = document.querySelector('#table');
const statusEl = document.querySelector('#status');
const suitMark = { S: '♠', H: '♥', D: '♦', C: '♣' };
let state = createGame();
let selection = null;

function cardButton(card, extra = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `card ${isRed(card.suit) ? 'red' : 'black'} ${card.up ? '' : 'down'} ${extra}`;
  button.textContent = card.up ? `${suitMark[card.suit]}\n${rankLabel(card.rank)}` : '';
  return button;
}

function sameSelection(next) {
  return selection && next && selection.kind === next.kind && selection.col === next.col && selection.index === next.index;
}

function render() {
  table.replaceChildren();
  const top = document.createElement('div');
  top.className = 'toprow';
  const stock = document.createElement('button');
  stock.type = 'button';
  stock.className = state.stock.length ? 'card down' : 'slot';
  stock.dataset.action = 'stock';
  stock.setAttribute('aria-label', '牌牌堆');
  top.append(stock);
  const waste = document.createElement('div');
  waste.className = 'pile';
  if (state.waste.length) {
    const button = cardButton(state.waste.at(-1), selection?.kind === 'waste' ? 'on' : '');
    button.dataset.action = 'waste';
    waste.append(button);
  } else {
    const slot = document.createElement('div');
    slot.className = 'slot';
    waste.append(slot);
  }
  top.append(waste);
  const gap = document.createElement('div');
  gap.className = 'spacer';
  top.append(gap);
  for (const suit of SUITS) {
    const pile = state.foundations[suit];
    const holder = document.createElement('div');
    if (pile.length) {
      const button = cardButton(pile.at(-1));
      button.dataset.action = 'foundation';
      button.dataset.suit = suit;
      holder.append(button);
    } else {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'slot';
      slot.textContent = suitMark[suit];
      slot.dataset.action = 'foundation';
      slot.dataset.suit = suit;
      holder.append(slot);
    }
    top.append(holder);
  }
  const columns = document.createElement('div');
  columns.className = 'columns';
  state.tableau.forEach((pile, col) => {
    const column = document.createElement('div');
    column.className = 'pile';
    if (!pile.length) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'slot';
      slot.dataset.action = 'column';
      slot.dataset.col = String(col);
      column.append(slot);
    }
    pile.forEach((card, index) => {
      const selected = selection?.kind === 'tableau' && selection.col === col && index >= selection.index;
      const button = cardButton(card, selected && card.up ? 'on' : '');
      button.dataset.action = 'column';
      button.dataset.col = String(col);
      button.dataset.index = String(index);
      column.append(button);
    });
    columns.append(column);
  });
  table.append(top, columns);
  statusEl.textContent = state.won ? '收完了。' : '點牌堆翻牌。點一張，再點要接上去的位置。';
}

function clearIfMoved(next) {
  if (next === state) return false;
  state = next;
  selection = null;
  render();
  return true;
}

table.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || state.won) return;
  const action = target.dataset.action;
  if (action === 'stock') {
    state = draw(state);
    selection = null;
    render();
    return;
  }
  if (action === 'waste') {
    selection = sameSelection({ kind: 'waste' }) ? null : { kind: 'waste' };
    render();
    return;
  }
  if (action === 'foundation') {
    if (selection?.kind === 'waste' && clearIfMoved(moveWasteToFoundation(state))) return;
    if (selection?.kind === 'tableau' && clearIfMoved(moveTableauToFoundation(state, selection.col))) return;
    return;
  }
  const col = Number(target.dataset.col);
  const index = target.dataset.index == null ? state.tableau[col].length : Number(target.dataset.index);
  if (selection?.kind === 'waste' && clearIfMoved(moveWasteToTableau(state, col))) return;
  if (selection?.kind === 'tableau' && clearIfMoved(moveTableau(state, selection.col, selection.index, col))) return;
  const card = state.tableau[col][index];
  if (!card?.up) { selection = null; render(); return; }
  const next = { kind: 'tableau', col, index };
  selection = sameSelection(next) ? null : next;
  render();
});

document.querySelector('#reset').addEventListener('click', () => {
  state = createGame();
  selection = null;
  render();
});

render();
