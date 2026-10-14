import { advance, applyMove, createMatch, present, rematch } from '../src/game/rules.js';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_ROOMS = 400;
const GRACE_MS = 20_000;

function makeCode() {
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function cleanName(name) {
  return String(name ?? '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 8);
}

export class Hub {
  constructor() {
    this.rooms = new Map();
    this.byToken = new Map();
  }

  sweep(now = Date.now()) {
    for (const [code, room] of this.rooms) {
      if (room.expireAt && room.expireAt <= now) this.#drop(code);
    }
  }

  #drop(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    for (const side of ['X', 'O']) {
      const token = room.players[side]?.token;
      if (token) this.byToken.delete(token);
    }
    this.rooms.delete(code);
  }

  #touch(room) {
    const alive = [room.players.X, room.players.O].some((player) => player?.connected);
    room.expireAt = alive ? null : Date.now() + GRACE_MS;
  }

  release(token) {
    const code = this.byToken.get(token);
    if (!code) return null;
    const room = this.rooms.get(code);
    if (!room) {
      this.byToken.delete(token);
      return null;
    }
    const otherSide = room.players.X?.token === token ? 'O' : 'X';
    const other = room.players[otherSide]?.token || null;
    this.#drop(code);
    return { code, other };
  }

  create({ name, rules, token, code: requested }) {
    this.sweep();
    if (this.rooms.size >= MAX_ROOMS && !this.byToken.has(token)) {
      return { ok: false, error: '房間太多，稍後再試' };
    }
    const released = this.release(token);
    const preferred = String(requested || '').trim().toUpperCase();
    let code = /^[A-Z0-9]{4}$/.test(preferred) ? preferred : makeCode();
    while (this.rooms.has(code)) code = makeCode();
    const match = createMatch(rules === 'vanish' ? 'vanish' : 'classic');
    const room = {
      code,
      rules: match.rules,
      expireAt: null,
      players: {
        X: { name: cleanName(name) || '金叉', token, connected: true },
        O: null,
      },
      match,
    };
    this.rooms.set(code, room);
    this.byToken.set(token, code);
    return { ok: true, you: 'X', code, released };
  }

  join({ code, name, token }) {
    this.sweep();
    const room = this.rooms.get(String(code || '').trim().toUpperCase());
    if (!room) return { ok: false, error: '找不到這間房' };
    const existing = room.players.X?.token === token ? 'X' : room.players.O?.token === token ? 'O' : null;
    if (existing) {
      room.players[existing].connected = true;
      const nextName = cleanName(name);
      if (nextName) room.players[existing].name = nextName;
      this.#touch(room);
      return { ok: true, you: existing, code: room.code };
    }
    if (room.players.O) return { ok: false, error: '房間已滿' };
    const released = this.release(token);
    room.players.O = { name: cleanName(name) || '玉環', token, connected: true };
    this.byToken.set(token, room.code);
    this.#touch(room);
    return { ok: true, you: 'O', code: room.code, released };
  }

  disconnect(token) {
    const code = this.byToken.get(token);
    const room = code ? this.rooms.get(code) : null;
    if (!room) return;
    for (const side of ['X', 'O']) {
      if (room.players[side]?.token === token) room.players[side].connected = false;
    }
    this.#touch(room);
  }

  #roomOf(token) {
    const code = this.byToken.get(token);
    return code ? this.rooms.get(code) || null : null;
  }

  #sideOf(room, token) {
    if (room.players.X?.token === token) return 'X';
    if (room.players.O?.token === token) return 'O';
    return null;
  }

  move(token, index) {
    const room = this.#roomOf(token);
    if (!room) return { ok: false, error: '找不到這間房' };
    if (!room.players.O) return { ok: false, error: '等待對手入座' };
    const side = this.#sideOf(room, token);
    if (room.match.phase !== 'playing') return { ok: false, error: '這一關已經結束' };
    if (room.match.turn !== side) return { ok: false, error: '還沒輪到你' };
    const cell = Number(index);
    if (!Number.isInteger(cell)) return { ok: false, error: '訊息不正確' };
    const next = applyMove(room.match, cell);
    if (!next) return { ok: false, error: '這一格已經有子' };
    room.match = next;
    return { ok: true, code: room.code };
  }

  advance(token) {
    const room = this.#roomOf(token);
    if (!room) return { ok: false, error: '找不到這間房' };
    if (!this.#sideOf(room, token)) return { ok: false, error: '找不到這間房' };
    const next = advance(room.match);
    if (!next) return { ok: false, error: '這一關還沒結束' };
    room.match = next;
    return { ok: true, code: room.code };
  }

  rematch(token) {
    const room = this.#roomOf(token);
    if (!room) return { ok: false, error: '找不到這間房' };
    if (room.match.phase !== 'match_end') return { ok: false, error: '三關尚未結束' };
    room.match = rematch(room.match);
    return { ok: true, code: room.code };
  }

  view(code) {
    const room = this.rooms.get(code);
    if (!room) return null;
    return {
      code: room.code,
      rules: room.rules,
      names: {
        X: room.players.X?.name || '金叉',
        O: room.players.O?.name || '玉環',
      },
      seated: {
        X: !!room.players.X,
        O: !!room.players.O,
      },
      connected: {
        X: !!room.players.X?.connected,
        O: !!room.players.O?.connected,
      },
      match: present(room.match),
    };
  }
}
