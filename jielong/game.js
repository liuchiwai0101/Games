const SUITS = ['S', 'H', 'D', 'C'];

export function isRed(suit) {
  return suit === 'H' || suit === 'D';
}

export function rankLabel(rank) {
  return ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][rank];
}

function shuffle(list, rng) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clone(state) {
  return {
    tableau: state.tableau.map((pile) => pile.map((card) => ({ ...card }))),
    stock: state.stock.map((card) => ({ ...card })),
    waste: state.waste.map((card) => ({ ...card })),
    foundations: Object.fromEntries(SUITS.map((suit) => [suit, state.foundations[suit].map((card) => ({ ...card }))])),
    won: state.won,
  };
}

export function createGame(rng = Math.random) {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) deck.push({ suit, rank, up: false });
  }
  const cards = shuffle(deck, rng);
  const tableau = [];
  for (let col = 0; col < 7; col += 1) {
    const pile = [];
    for (let i = 0; i <= col; i += 1) {
      const card = cards.pop();
      card.up = i === col;
      pile.push(card);
    }
    tableau.push(pile);
  }
  return { tableau, stock: cards, waste: [], foundations: { S: [], H: [], D: [], C: [] }, won: false };
}

function fitsTableau(card, pile) {
  if (!pile.length) return card.rank === 13;
  const top = pile[pile.length - 1];
  return top.up && isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
}

function fitsFoundation(card, pile) {
  if (!pile.length) return card.rank === 1;
  return card.suit === pile[pile.length - 1].suit && card.rank === pile[pile.length - 1].rank + 1;
}

function sequenceOk(pile, index) {
  if (!pile[index] || !pile[index].up) return false;
  for (let i = index; i < pile.length - 1; i += 1) {
    const current = pile[i];
    const next = pile[i + 1];
    if (!next.up || isRed(current.suit) === isRed(next.suit) || current.rank !== next.rank + 1) return false;
  }
  return true;
}

function won(state) {
  return SUITS.every((suit) => state.foundations[suit].length === 13);
}

export function draw(state) {
  if (state.won) return state;
  const next = clone(state);
  if (next.stock.length) {
    const card = next.stock.pop();
    card.up = true;
    next.waste.push(card);
    return next;
  }
  if (!next.waste.length) return state;
  next.stock = next.waste.reverse().map((card) => ({ ...card, up: false }));
  next.waste = [];
  return next;
}

export function moveWasteToTableau(state, col) {
  if (state.won || !state.waste.length) return state;
  const card = state.waste[state.waste.length - 1];
  if (!fitsTableau(card, state.tableau[col])) return state;
  const next = clone(state);
  next.tableau[col].push(next.waste.pop());
  return next;
}

export function moveWasteToFoundation(state) {
  if (state.won || !state.waste.length) return state;
  const card = state.waste[state.waste.length - 1];
  if (!fitsFoundation(card, state.foundations[card.suit])) return state;
  const next = clone(state);
  next.foundations[card.suit].push(next.waste.pop());
  next.won = won(next);
  return next;
}

export function moveTableau(state, from, index, col) {
  if (state.won || from === col) return state;
  const pile = state.tableau[from];
  if (!sequenceOk(pile, index)) return state;
  if (!fitsTableau(pile[index], state.tableau[col])) return state;
  const next = clone(state);
  const moving = next.tableau[from].splice(index);
  next.tableau[col].push(...moving);
  const left = next.tableau[from];
  if (left.length && !left[left.length - 1].up) left[left.length - 1].up = true;
  return next;
}

export function moveTableauToFoundation(state, from) {
  if (state.won) return state;
  const pile = state.tableau[from];
  const card = pile[pile.length - 1];
  if (!card?.up || !fitsFoundation(card, state.foundations[card.suit])) return state;
  const next = clone(state);
  next.foundations[card.suit].push(next.tableau[from].pop());
  const left = next.tableau[from];
  if (left.length && !left[left.length - 1].up) left[left.length - 1].up = true;
  next.won = won(next);
  return next;
}

export { SUITS };
