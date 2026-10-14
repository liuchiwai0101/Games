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

export function createOnline(handlers) {
  const token = loadToken();
  let ws = null;
  let intentional = false;
  let retries = 0;
  let openedOnce = false;
  const outbound = [];

  function url() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws`;
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    intentional = false;
    ws = new WebSocket(url());
    ws.onopen = () => {
      openedOnce = true;
      retries = 0;
      const queued = outbound.splice(0);
      for (const data of queued) ws.send(data);
      handlers.onOpen?.();
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === 'state') handlers.onState(msg);
      else if (msg.type === 'error') handlers.onError(msg.message || '發生錯誤');
      else if (msg.type === 'closed') handlers.onClosed(msg.message || '房間已關閉');
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      ws = null;
      if (intentional) return;
      if (!openedOnce) {
        outbound.length = 0;
        handlers.onError('連不上對局伺服器');
        return;
      }
      if (retries >= 4) {
        handlers.onError('連線中斷');
        return;
      }
      retries += 1;
      window.setTimeout(connect, 400 * retries);
    };
  }

  function send(payload) {
    const data = JSON.stringify({ ...payload, token });
    if (ws?.readyState === WebSocket.OPEN) ws.send(data);
    else {
      outbound.push(data);
      connect();
    }
  }

  return {
    connect,
    create(name, rules) {
      send({ type: 'create', name, rules });
    },
    join(code, name) {
      send({ type: 'join', code, name });
    },
    move(index) {
      send({ type: 'move', index });
    },
    advance() {
      send({ type: 'advance' });
    },
    rematch() {
      send({ type: 'rematch' });
    },
    leave() {
      send({ type: 'leave' });
    },
    stop() {
      intentional = true;
      outbound.length = 0;
      ws?.close();
      ws = null;
    },
  };
}
