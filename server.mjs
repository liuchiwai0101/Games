import { createApp } from './server/app.js';

const mode = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const port = Number(process.env.PORT || 5173);
const { server } = await createApp(mode);

server.listen(port, '0.0.0.0', () => {
  console.log(`井字過三關  http://localhost:${port}`);
});
