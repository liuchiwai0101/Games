import { createScene } from './scene.js';
import { advance, applyMove, createMatch, present, rematch } from './game/rules.js';
import { chooseMove } from './game/ai.js';
import { GATE_LABEL, resultCopy, sideName, turnLine } from './game/text.js';
import { createAudio } from './audio.js';
import { createOnline } from './net.js';

const canvas = document.querySelector('#view');
const flat = document.querySelector('#flat');
const flatGrid = document.querySelector('#flatGrid');
const setup = document.querySelector('#setup');
const matchBar = document.querySelector('#matchBar');
const banner = document.querySelector('#banner');
const seal = document.querySelector('#seal');
const bannerText = document.querySelector('#bannerText');
const bannerAction = document.querySelector('#bannerAction');
const turnPill = document.querySelector('#turnPill');
const hint = document.querySelector('#hint');
const record = document.querySelector('#record');
const netStatus = document.querySelector('#netStatus');
const netRow = document.querySelector('#netRow');
const aiRow = document.querySelector('#aiRow');
const startBtn = document.querySelector('#startBtn');
const help = document.querySelector('#help');
const toast = document.querySelector('#toast');
const live = document.querySelector('#live');
const scoreX = document.querySelector('#scoreX');
const scoreO = document.querySelector('#scoreO');
const gateLabel = document.querySelector('#gateLabel');
const roomLine = document.querySelector('#roomLine');
const copyCode = document.querySelector('#copyCode');
const matchHint = document.querySelector('#matchHint');
const soundBtn = document.querySelector('#soundBtn');
const nickInput = document.querySelector('#nick');
const roomInput = document.querySelector('#roomInput');
const pips = [...document.querySelectorAll('#pips li')];

const audio = createAudio();
const KEYS = {
  Digit1: 0, Digit2: 1, Digit3: 2,
  Digit4: 3, Digit5: 4, Digit6: 5,
  Digit7: 6, Digit8: 7, Digit9: 8,
  Numpad7: 0, Numpad8: 1, Numpad9: 2,
  Numpad4: 3, Numpad5: 4, Numpad6: 5,
  Numpad1: 6, Numpad2: 7, Numpad3: 8,
};

let world;
try {
  world = createScene(canvas);
} catch (error) {
  console.error(error);
  world = null;
  flat.hidden = false;
  canvas.hidden = true;
}

for (let index = 0; index < 9; index += 1) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', `第 ${index + 1} 格`);
  button.addEventListener('click', () => tryMove(index));
  flatGrid.append(button);
}

const stats = loadStats();
let mode = 'ai';
let match = null;
let netView = null;
let names = { X: '金叉', O: '玉環' };
let you = null;
let roomCode = '';
let thinking = false;
let aiToken = 0;
let soundKey = '';
let loggedResult = false;

const invite = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
try {
  const savedNick = localStorage.getItem('jgsg-nick');
  if (savedNick) nickInput.value = savedNick;
} catch {
  /* ignore */
}
if (invite) roomInput.value = invite;

function loadStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem('jgsg-stats-v1') || '');
    if (parsed?.ai && parsed?.hot) return parsed;
  } catch {
    /* ignore */
  }
  return { ai: { win: 0, loss: 0, draw: 0 }, hot: { X: 0, O: 0, draw: 0 } };
}

function saveStats() {
  try {
    localStorage.setItem('jgsg-stats-v1', JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

function roomLink(code) {
  const url = new URL(location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('room', code);
  return url.href;
}

function rememberRoom(code) {
  try {
    if (code) sessionStorage.setItem('jgsg-room', code);
    else sessionStorage.removeItem('jgsg-room');
  } catch {
    /* ignore */
  }
}

let toastTimer = 0;
function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function seg(id) {
  const root = document.querySelector(id);
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || root.dataset.locked === '1') return;
    for (const item of root.querySelectorAll('button')) {
      const on = item === button;
      item.classList.toggle('on', on);
      item.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    onModeChange();
  });
  return {
    value: () => root.querySelector('button.on')?.dataset.value,
    lock(on) {
      root.dataset.locked = on ? '1' : '';
    },
  };
}

const modeSeg = seg('#modeSeg');
const rulesSeg = seg('#rulesSeg');
const sideSeg = seg('#sideSeg');
const levelSeg = seg('#levelSeg');

function onModeChange() {
  mode = modeSeg.value();
  const online = mode === 'net';
  netRow.hidden = !online;
  aiRow.hidden = online;
  startBtn.hidden = online;
  hint.textContent = online
    ? '開設房間後把密碼交給對手。兩邊打開同一個網頁即可。'
    : mode === 'hot'
      ? '同一台裝置輪流落子。第一關由金叉先手。'
      : '第一關由金叉先手，其後每關交換先手。宗師棋力不會失手。';
  if (online) onlinePlay.connect();
  paintRecord();
}

function current() {
  if (mode === 'net') return netView;
  return match ? present(match) : null;
}

function humanSide() {
  return sideSeg.value() === 'O' ? 'O' : 'X';
}

function paintRecord() {
  if (mode === 'ai') {
    const { win, loss, draw } = stats.ai;
    record.textContent = `人機戰績　勝 ${win}　負 ${loss}　和 ${draw}`;
  } else if (mode === 'hot') {
    const { X, O, draw } = stats.hot;
    record.textContent = `同機戰績　金叉 ${X}　玉環 ${O}　和 ${draw}`;
  } else record.textContent = '';
}

function paintFlat(view) {
  const buttons = flatGrid.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const owner = view?.board?.[index] || null;
    button.textContent = owner === 'X' ? '叉' : owner === 'O' ? '圈' : '';
    button.classList.toggle('x', owner === 'X');
    button.classList.toggle('o', owner === 'O');
    button.classList.toggle('win', Boolean(view?.outcome?.line?.includes(index)));
    button.disabled = !view || view.phase !== 'playing' || Boolean(owner);
  });
}

function wins(view, side) {
  return (view?.gates || []).filter((gate) => gate === side).length;
}

function paint(view) {
  const playing = Boolean(view);
  setup.hidden = playing;
  matchBar.hidden = !playing;
  for (const control of [modeSeg, rulesSeg, sideSeg, levelSeg]) control.lock(playing);

  pips.forEach((pip, index) => {
    const owner = view?.gates?.[index] || null;
    pip.classList.toggle('is-x', owner === 'X');
    pip.classList.toggle('is-o', owner === 'O');
    pip.classList.toggle('is-draw', owner === 'draw');
    pip.classList.toggle('is-now', Boolean(view && view.phase === 'playing' && view.gate === index && !owner));
  });

  const waiting = mode === 'net' && view && !view.seatedO;
  turnPill.textContent = view
    ? turnLine(view, names, { thinking, waiting, you: mode === 'net' ? you : mode === 'ai' ? humanSide() : null })
    : '拖曳可旋轉棋盤';
  live.textContent = turnPill.textContent;

  const copy = view ? resultCopy(view, names) : null;
  if (copy) {
    const changed = bannerText.textContent !== copy.text;
    banner.hidden = false;
    bannerText.textContent = copy.text;
    bannerAction.textContent = copy.action;
    seal.textContent = copy.seal;
    if (changed) {
      seal.classList.remove('pop');
      void seal.offsetWidth;
      seal.classList.add('pop');
    }
  } else banner.hidden = true;

  if (view) {
    scoreX.textContent = `${sideName('X', names)} ${wins(view, 'X')}`;
    scoreO.textContent = `${wins(view, 'O')} ${sideName('O', names)}`;
    gateLabel.textContent = view.phase === 'match_end' ? '三關已了' : `第${GATE_LABEL[view.gate] || '壹'}關`;
    const vanish = view.rules === 'vanish';
    matchHint.textContent = waiting
      ? '對手入座後即可落子。'
      : vanish
        ? '消子：第七子起，落子後先撤最舊一子。鍵盤 1 到 9。'
        : '點空格落子，或按鍵盤 1 到 9。';
  }

  const showRoom = mode === 'net' && roomCode;
  roomLine.hidden = !showRoom;
  copyCode.hidden = !showRoom;
  if (showRoom) roomLine.textContent = `房間 ${roomCode}`;
  paintFlat(view);
  paintRecord();
  refreshGhost(view);
}

function refreshGhost(view) {
  if (!world) return;
  if (!view || view.phase !== 'playing' || thinking) {
    world.setTurn(null);
    return;
  }
  if (mode === 'net' && (!view.seatedO || view.turn !== you)) {
    world.setTurn(null);
    return;
  }
  if (mode === 'ai' && view.turn !== humanSide()) {
    world.setTurn(null);
    return;
  }
  world.setTurn(view.turn);
}

function noteSounds(view, animate) {
  if (!view || !animate || view.fresh) return;
  const key = `${view.gate}:${view.phase}:${view.placed?.index}:${view.marks?.length}:${view.removed?.index ?? ''}:${view.matchWinner ?? ''}`;
  if (key === soundKey) return;
  soundKey = key;
  if (view.placed) audio.place(view.placed.player);
  if (view.removed) audio.vanish();
  if (view.phase !== 'playing') audio.fanfare(view.outcome?.draw || view.matchWinner === 'draw' ? 'draw' : 'win');
}

function noteResult(view) {
  if (!view || view.phase !== 'match_end' || mode === 'net') {
    if (!view || (view.phase === 'playing' && view.gate === 0 && !view.board.some(Boolean))) loggedResult = false;
    return;
  }
  if (loggedResult) return;
  loggedResult = true;
  if (mode === 'ai') {
    const human = humanSide();
    if (view.matchWinner === 'draw') stats.ai.draw += 1;
    else if (view.matchWinner === human) stats.ai.win += 1;
    else stats.ai.loss += 1;
  } else if (mode === 'hot') {
    if (view.matchWinner === 'draw') stats.hot.draw += 1;
    else stats.hot[view.matchWinner] += 1;
  }
  saveStats();
}

function show(view, animate, onReady) {
  if (world && view) world.sync(view, { animate, onReady });
  else onReady?.();
  paint(view);
  noteSounds(view, animate);
  noteResult(view);
}

function blankView() {
  return {
    rules: rulesSeg.value(),
    board: Array(9).fill(null),
    marks: [],
    gates: [null, null, null],
    gate: 0,
    phase: 'playing',
    outcome: null,
    threatened: null,
    fresh: true,
    placed: null,
    removed: null,
    seatedO: false,
  };
}

function startLocal() {
  aiToken += 1;
  thinking = false;
  match = createMatch(rulesSeg.value());
  names = { X: '金叉', O: '玉環' };
  you = mode === 'ai' ? humanSide() : null;
  world?.frameHome();
  show(present(match), false, () => maybeAi());
}

function maybeAi() {
  const token = ++aiToken;
  if (mode !== 'ai' || !match || match.phase !== 'playing' || match.turn === humanSide()) {
    thinking = false;
    paint(current());
    return;
  }
  thinking = true;
  paint(current());
  const snapshot = match;
  const level = levelSeg.value();
  window.setTimeout(() => {
    if (token !== aiToken || match !== snapshot || match.phase !== 'playing') return;
    const index = chooseMove(snapshot, level);
    thinking = false;
    if (index == null) {
      paint(current());
      return;
    }
    const next = applyMove(snapshot, index);
    if (!next) return;
    match = next;
    show(present(match), true);
  }, 480);
}

function tryMove(index) {
  const view = current();
  if (!view || thinking || view.phase !== 'playing') return;
  if (mode === 'net') {
    if (!view.seatedO) {
      showToast('等待對手入座');
      return;
    }
    if (view.turn !== you) return;
    onlinePlay.move(index);
    return;
  }
  if (mode === 'ai' && view.turn !== humanSide()) return;
  const next = applyMove(match, index);
  if (!next) return;
  match = next;
  show(present(match), true);
  if (match.phase === 'playing') maybeAi();
}

function continueMatch() {
  if (mode === 'net') {
    if (netView?.phase === 'gate_end') onlinePlay.advance();
    else if (netView?.phase === 'match_end') onlinePlay.rematch();
    return;
  }
  if (!match) return;
  if (match.phase === 'gate_end') {
    match = advance(match);
    show(present(match), true, () => maybeAi());
  } else if (match.phase === 'match_end') {
    match = rematch(match);
    show(present(match), true, () => maybeAi());
  }
}

function leave() {
  aiToken += 1;
  thinking = false;
  if (mode === 'net') {
    onlinePlay.leave();
    netView = null;
    roomCode = '';
    you = null;
    rememberRoom('');
  }
  match = null;
  world?.setTurn(null);
  world?.setAutoRotate(true);
  if (world) world.sync(blankView(), { animate: true });
  paint(null);
}

const onlinePlay = createOnline({
  onState(msg) {
    mode = 'net';
    modeSeg.lock(false);
    for (const button of document.querySelectorAll('#modeSeg button')) {
      const on = button.dataset.value === 'net';
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    netView = { ...msg.match, seatedO: msg.seated?.O };
    names = msg.names || names;
    you = msg.you;
    roomCode = msg.code || roomCode;
    rememberRoom(roomCode);
    world?.setAutoRotate(false);
    show(netView, Boolean(msg.animate));
    netStatus.hidden = true;
  },
  onError(message) {
    showToast(message);
    if (message.includes('找不到')) rememberRoom('');
  },
  onClosed(message) {
    netView = null;
    roomCode = '';
    you = null;
    rememberRoom('');
    if (mode === 'net') {
      world?.sync(blankView(), { animate: true });
      paint(null);
      onModeChange();
    }
    showToast(message);
  },
});

document.querySelector('#startBtn').addEventListener('click', startLocal);
document.querySelector('#leaveBtn').addEventListener('click', leave);
bannerAction.addEventListener('click', continueMatch);
document.querySelector('#helpBtn').addEventListener('click', () => help.showModal());
document.querySelector('#createRoom').addEventListener('click', () => {
  const name = nickInput.value.trim();
  try { localStorage.setItem('jgsg-nick', name); } catch { /* ignore */ }
  onlinePlay.create(name, rulesSeg.value());
});
document.querySelector('#joinRoom').addEventListener('click', () => {
  const name = nickInput.value.trim();
  const code = roomInput.value.trim().toUpperCase();
  if (code.length < 4) {
    showToast('請輸入四位房間密碼');
    return;
  }
  try { localStorage.setItem('jgsg-nick', name); } catch { /* ignore */ }
  onlinePlay.join(code, name);
});
copyCode.addEventListener('click', async () => {
  const link = roomLink(roomCode);
  try {
    await navigator.clipboard.writeText(`${roomCode}　${link}`);
    showToast('已複製密碼與連結');
  } catch {
    showToast(`房間密碼 ${roomCode}`);
  }
});
soundBtn.addEventListener('click', () => {
  const muted = audio.toggle();
  soundBtn.textContent = muted ? '靜音' : '聲音';
  soundBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
});
roomInput.addEventListener('input', () => {
  roomInput.value = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
});

window.addEventListener('keydown', (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target.matches('input, textarea')) return;
  if (help.open) return;
  if (event.key === 'Enter' && !banner.hidden) {
    event.preventDefault();
    continueMatch();
    return;
  }
  const index = KEYS[event.code];
  if (index == null) return;
  event.preventDefault();
  tryMove(index);
});

window.addEventListener('pointerdown', () => {}, { once: true });
window.addEventListener('resize', () => world?.resize());

if (world) world.onPick = (index) => tryMove(index);
if (audio.muted) {
  soundBtn.textContent = '靜音';
  soundBtn.setAttribute('aria-pressed', 'false');
}

let savedRoom = '';
try { savedRoom = sessionStorage.getItem('jgsg-room') || ''; } catch { /* ignore */ }
if (invite || savedRoom) {
  for (const button of document.querySelectorAll('#modeSeg button')) {
    const on = button.dataset.value === 'net';
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  onModeChange();
  const code = invite || savedRoom;
  roomInput.value = code;
  onlinePlay.join(code, nickInput.value.trim());
} else onModeChange();

paint(null);
