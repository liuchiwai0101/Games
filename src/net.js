import Peer from 'peerjs';
import { Hub } from '../server/hub.js';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function loadToken() {
  const key = 'jgsg-token';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
}

function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

function peerId(code) {
  return `jgsg${String(code || '').trim().toUpperCase()}`;
}

function validToken(token) {
  return typeof token === 'string' && token.length >= 8 && token.length <= 80;
}

const peerOptions = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true,
  debug: 0,
};

/**
 * Online rooms run in the browser. The player who opens the room keeps the
 * match, and the other browser connects directly. No game server is required.
 */
export function createOnline(handlers) {
  const token = loadToken();
  const hub = new Hub();
  let peer = null;
  let role = null;
  let roomCode = '';
  let guestConn = null;
  const guests = new Set();
  let closing = false;
  let hostAttempts = 0;

  function fail(message) {
    handlers.onError(message);
  }

  function destroy() {
    closing = true;
    for (const conn of guests) {
      try { conn.close(); } catch { /* ignore */ }
    }
    guests.clear();
    try { guestConn?.close(); } catch { /* ignore */ }
    guestConn = null;
    try { peer?.destroy(); } catch { /* ignore */ }
    peer = null;
    role = null;
    closing = false;
  }

  function emit(animate) {
    const view = hub.view(roomCode);
    if (!view) return;
    handlers.onState({ type: 'state', animate, you: 'X', ...view });
    for (const conn of guests) {
      if (conn.open) conn.send({ type: 'state', animate, you: conn.you || 'O', ...view });
    }
  }

  function hostAct(run, animate) {
    const result = run();
    if (!result?.ok) {
      fail(result?.error || '發生錯誤');
      return;
    }
    emit(animate);
  }

  function handleGuest(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'join') {
      if (!validToken(msg.token)) {
        conn.send({ type: 'error', message: '訊息不正確' });
        return;
      }
      const result = hub.join({ code: roomCode, name: msg.name, token: msg.token });
      if (!result.ok) {
        conn.send({ type: 'error', message: result.error });
        return;
      }
      conn.token = msg.token;
      conn.you = result.you;
      guests.add(conn);
      emit(false);
      return;
    }
    if (!conn.token) return;
    let result = null;
    if (msg.type === 'move') result = hub.move(conn.token, msg.index);
    else if (msg.type === 'advance') result = hub.advance(conn.token);
    else if (msg.type === 'rematch') result = hub.rematch(conn.token);
    else if (msg.type === 'leave') {
      const released = hub.release(conn.token);
      guests.delete(conn);
      if (released) emit(false);
      conn.send({ type: 'closed', message: '已離開房間' });
      return;
    } else {
      conn.send({ type: 'error', message: '訊息不正確' });
      return;
    }
    if (!result?.ok) conn.send({ type: 'error', message: result?.error || '發生錯誤' });
    else emit(true);
  }

  function watchPeer(next, onReady, retry) {
    peer = next;
    let opened = false;
    const timer = window.setTimeout(() => {
      if (opened) return;
      destroy();
      fail('連不上對局服務');
    }, 12000);
    next.on('open', () => {
      opened = true;
      window.clearTimeout(timer);
      onReady();
    });
    next.on('error', (error) => {
      const type = error?.type || '';
      if (!opened && type === 'unavailable-id' && retry && hostAttempts < 5) {
        window.clearTimeout(timer);
        startHost(retry.name, retry.rules);
        return;
      }
      if (type === 'peer-unavailable') fail('找不到這間房');
      else if (type === 'unavailable-id') fail('這個房間暫時開不了，請再試一次');
      else if (!opened) fail('連不上對局服務');
    });
  }

  function startHost(name, rules) {
    destroy();
    hostAttempts += 1;
    role = 'host';
    roomCode = makeCode();
    const next = new Peer(peerId(roomCode), peerOptions);
    watchPeer(next, () => {
      hostAttempts = 0;
      const result = hub.create({ name, rules, token, code: roomCode });
      if (!result.ok) {
        destroy();
        fail(result.error);
        return;
      }
      roomCode = result.code;
      next.on('connection', (conn) => {
        conn.on('data', (msg) => handleGuest(conn, msg));
        conn.on('close', () => {
          guests.delete(conn);
          if (!closing && conn.token) hub.disconnect(conn.token);
        });
      });
      emit(false);
    }, { name, rules });
  }

  function startGuest(code, name) {
    const room = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(room)) {
      fail('請輸入四位房間密碼');
      return;
    }
    destroy();
    role = 'guest';
    roomCode = room;
    const next = new Peer(undefined, peerOptions);
    watchPeer(next, () => {
      const conn = next.connect(peerId(room), { reliable: true });
      guestConn = conn;
      const timer = window.setTimeout(() => {
        if (conn.open) return;
        fail('找不到這間房');
      }, 8000);
      conn.on('open', () => {
        window.clearTimeout(timer);
        conn.send({ type: 'join', name, token, code: room });
      });
      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'state') handlers.onState(msg);
        else if (msg.type === 'error') fail(msg.message || '發生錯誤');
        else if (msg.type === 'closed') {
          destroy();
          handlers.onClosed(msg.message || '房間已關閉');
        }
      });
      conn.on('close', () => {
        if (closing) return;
        handlers.onClosed('連線中斷');
      });
      conn.on('error', () => fail('連不上對局服務'));
    });
  }

  function sendGuest(payload) {
    if (!guestConn?.open) {
      fail('還未連上房間');
      return;
    }
    guestConn.send({ ...payload, token });
  }

  return {
    connect() {},
    create(name, rules) {
      hostAttempts = 0;
      startHost(name, rules);
    },
    join(code, name) {
      startGuest(code, name);
    },
    move(index) {
      if (role === 'host') hostAct(() => hub.move(token, index), true);
      else sendGuest({ type: 'move', index });
    },
    advance() {
      if (role === 'host') hostAct(() => hub.advance(token), true);
      else sendGuest({ type: 'advance' });
    },
    rematch() {
      if (role === 'host') hostAct(() => hub.rematch(token), true);
      else sendGuest({ type: 'rematch' });
    },
    leave() {
      if (role === 'guest') sendGuest({ type: 'leave' });
      if (role === 'host') {
        for (const conn of guests) {
          try { conn.send({ type: 'closed', message: '對手已離開房間' }); } catch { /* ignore */ }
        }
        hub.release(token);
      }
      destroy();
      handlers.onClosed('已離開房間');
    },
    stop() {
      destroy();
    },
  };
}
