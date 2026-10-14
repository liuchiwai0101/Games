import { WebSocketServer } from 'ws';

function validToken(token) {
  return typeof token === 'string' && token.length >= 8 && token.length <= 80;
}

export function attachSockets(server, hub) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const sockets = new Map();
  const tokenWs = new Map();

  function send(ws, data) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data));
  }

  function emit(code, animate) {
    const view = hub.view(code);
    if (!view) return;
    for (const [socket, meta] of sockets) {
      if (meta.code !== code) continue;
      send(socket, { type: 'state', animate, you: meta.you, ...view });
    }
  }

  function bind(ws, token, code, you) {
    const prev = tokenWs.get(token);
    sockets.set(ws, { token, code, you });
    tokenWs.set(token, ws);
    if (prev && prev !== ws) {
      sockets.delete(prev);
      send(prev, { type: 'closed', message: '已在另一個頁面開啟' });
      prev.close();
    }
  }

  function notifyReleased(released) {
    if (!released?.other) return;
    const other = tokenWs.get(released.other);
    if (!other) return;
    sockets.delete(other);
    send(other, { type: 'closed', message: '對手已離開房間' });
  }

  wss.on('connection', (ws) => {
    ws.on('message', (buf) => {
      if (buf.length > 2000) return;
      let msg;
      try {
        msg = JSON.parse(buf.toString());
      } catch {
        send(ws, { type: 'error', message: '訊息不正確' });
        return;
      }
      if (!msg || typeof msg !== 'object' || !validToken(msg.token)) {
        send(ws, { type: 'error', message: '訊息不正確' });
        return;
      }
      const token = msg.token;

      if (msg.type === 'create') {
        const result = hub.create({ name: msg.name, rules: msg.rules, token });
        if (!result.ok) {
          send(ws, { type: 'error', message: result.error });
          return;
        }
        notifyReleased(result.released);
        bind(ws, token, result.code, 'X');
        emit(result.code, false);
        return;
      }

      if (msg.type === 'join') {
        const result = hub.join({ code: msg.code, name: msg.name, token });
        if (!result.ok) {
          send(ws, { type: 'error', message: result.error });
          return;
        }
        notifyReleased(result.released);
        bind(ws, token, result.code, result.you);
        emit(result.code, false);
        return;
      }

      if (msg.type === 'leave') {
        const released = hub.release(token);
        sockets.delete(ws);
        if (tokenWs.get(token) === ws) tokenWs.delete(token);
        notifyReleased(released);
        send(ws, { type: 'closed', message: '已離開房間' });
        return;
      }

      const meta = sockets.get(ws);
      if (!meta || meta.token !== token) {
        send(ws, { type: 'error', message: '找不到這間房' });
        return;
      }

      let result = null;
      if (msg.type === 'move') result = hub.move(token, msg.index);
      else if (msg.type === 'advance') result = hub.advance(token);
      else if (msg.type === 'rematch') result = hub.rematch(token);
      else {
        send(ws, { type: 'error', message: '訊息不正確' });
        return;
      }
      if (!result.ok) {
        send(ws, { type: 'error', message: result.error });
        return;
      }
      emit(result.code, true);
    });

    ws.on('close', () => {
      const meta = sockets.get(ws);
      sockets.delete(ws);
      if (!meta) return;
      if (tokenWs.get(meta.token) !== ws) return;
      tokenWs.delete(meta.token);
      hub.disconnect(meta.token);
    });
  });

  return wss;
}
