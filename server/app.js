import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hub } from './hub.js';
import { attachSockets } from './socket.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function createApp(mode = 'dev') {
  const app = express();
  app.disable('x-powered-by');
  const server = http.createServer(app);
  const hub = new Hub();
  const wss = attachSockets(server, hub);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, game: '井字過三關' });
  });

  if (mode === 'dev') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      root,
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
      logLevel: 'warn',
    });
    app.use(vite.middlewares);
  } else if (mode === 'prod') {
    const dist = path.join(root, 'dist');
    app.use(express.static(dist));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(dist, 'index.html'), (err) => err && next(err));
    });
  }

  return { app, server, hub, wss, root };
}
