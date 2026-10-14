import assert from 'node:assert/strict';
import test from 'node:test';
import WebSocket from 'ws';
import { createApp } from '../server/app.js';
import { Hub } from '../server/hub.js';

test('rooms seat two players and reject illegal moves', () => {
  const hub = new Hub();
  const created = hub.create({ name: '甲', rules: 'classic', token: 'token-aaaa-1111' });
  assert.equal(created.ok, true);
  const fixed = hub.create({ name: '甲', rules: 'classic', token: 'token-cccc-3333', code: 'ab3k' });
  assert.equal(fixed.code, 'AB3K');
  assert.equal(hub.view(created.code).seated.O, false);
  const joined = hub.join({ code: created.code.toLowerCase(), name: '乙', token: 'token-bbbb-2222' });
  assert.equal(joined.you, 'O');

  assert.equal(hub.move('token-bbbb-2222', 0).error, '還沒輪到你');
  assert.equal(hub.move('token-aaaa-1111', 0).ok, true);
  assert.equal(hub.move('token-aaaa-1111', 1).error, '還沒輪到你');
  assert.equal(hub.move('token-bbbb-2222', 0).error, '這一格已經有子');

  const again = hub.create({ name: '甲', rules: 'vanish', token: 'token-aaaa-1111' });
  assert.equal(hub.view(created.code), null);
  assert.equal(again.released.other, 'token-bbbb-2222');
  assert.equal(hub.view(again.code).rules, 'vanish');
  assert.equal(hub.join({ code: 'nope', name: '乙', token: 'token-bbbb-2222' }).error, '找不到這間房');
});

test('an empty room expires after both players disconnect', () => {
  const hub = new Hub();
  const { code } = hub.create({ name: '甲', rules: 'classic', token: 'token-aaaa-1111' });
  hub.join({ code, name: '乙', token: 'token-bbbb-2222' });
  hub.disconnect('token-aaaa-1111');
  hub.sweep(Date.now() + 60_000);
  assert.ok(hub.view(code));
  hub.disconnect('token-bbbb-2222');
  hub.sweep(Date.now() + 60_000);
  assert.equal(hub.view(code), null);
});

function track(ws) {
  const queued = [];
  const waiters = [];
  ws.on('message', (buf) => {
    const msg = JSON.parse(buf.toString());
    const waiter = waiters.shift();
    if (waiter) waiter(msg);
    else queued.push(msg);
  });
  return {
    next: () => (queued.length ? Promise.resolve(queued.shift()) : new Promise((resolve) => waiters.push(resolve))),
  };
}

function opened(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

test('two sockets can play a gate and open the next one', async () => {
  const { server, wss } = await createApp('api');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal((await health.json()).game, '井字過三關');

  const url = `ws://127.0.0.1:${port}/ws`;
  const x = new WebSocket(url);
  const o = new WebSocket(url);
  const xMsg = track(x);
  const oMsg = track(o);
  await opened(x);
  await opened(o);

  x.send(JSON.stringify({ type: 'create', name: '金叉', rules: 'classic', token: 'token-xxxx-1111' }));
  const created = await xMsg.next();
  assert.equal(created.you, 'X');
  assert.equal(created.seated.O, false);
  assert.equal(created.animate, false);

  o.send(JSON.stringify({ type: 'join', code: created.code, name: '玉環', token: 'token-oooo-2222' }));
  const joinedX = await xMsg.next();
  const joinedO = await oMsg.next();
  assert.equal(joinedO.you, 'O');
  assert.equal(joinedX.seated.O, true);

  o.send(JSON.stringify({ type: 'move', index: 4, token: 'token-oooo-2222' }));
  assert.equal((await oMsg.next()).message, '還沒輪到你');

  const moves = [
    ['token-xxxx-1111', 0],
    ['token-oooo-2222', 3],
    ['token-xxxx-1111', 1],
    ['token-oooo-2222', 4],
  ];
  for (const [token, index] of moves) {
    const socket = token.startsWith('token-xxxx') ? x : o;
    socket.send(JSON.stringify({ type: 'move', index, token }));
    await xMsg.next();
    await oMsg.next();
  }

  x.send(JSON.stringify({ type: 'move', index: 2, token: 'token-xxxx-1111' }));
  const xState = await xMsg.next();
  const oState = await oMsg.next();
  assert.equal(xState.match.phase, 'gate_end');
  assert.equal(xState.match.outcome.player, 'X');
  assert.equal(xState.match.gates[0], 'X');
  assert.equal(xState.animate, true);
  assert.deepEqual(oState.match.board, xState.match.board);

  o.send(JSON.stringify({ type: 'advance', token: 'token-oooo-2222' }));
  const next = await xMsg.next();
  await oMsg.next();
  assert.equal(next.match.phase, 'playing');
  assert.equal(next.match.turn, 'O');
  assert.equal(next.match.gate, 1);
  assert.equal(next.match.fresh, true);

  x.close();
  o.close();
  await new Promise((resolve, reject) => {
    wss.close(() => server.close((err) => (err ? reject(err) : resolve())));
  });
});
