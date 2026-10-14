import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const htmlName = fs.readdirSync(dist).find((name) => name.endsWith('.html'));
if (!htmlName) throw new Error('Build HTML was not found.');
const html = fs.readFileSync(path.join(dist, htmlName), 'utf8');
const assets = path.join(dist, 'assets');
const files = fs.readdirSync(assets);
const cssName = files.find((name) => name.endsWith('.css'));
const jsName = files.find((name) => name.endsWith('.js'));
if (!cssName || !jsName) {
  throw new Error('Build assets were not found.');
}
const css = fs.readFileSync(path.join(assets, cssName), 'utf8');
const js = fs.readFileSync(path.join(assets, jsName), 'utf8').replace(/<\/script/gi, '<\\/script');
const page = html
  .replace(/<link rel="icon"[^>]*>/, '')
  .replace(
    /<link rel="stylesheet"[^>]*href="[^"]+\.css"[^>]*>/,
    () => `<style>${css}</style>`,
  )
  .replace(/<script type="module"[^>]*src="[^"]+\.js"><\/script>/, '')
  .replace('</body>', () => `<script>${js}</script>\n  </body>`);
if (page.includes('./assets/') || page.includes('type="module"')) {
  throw new Error('The playable page still points at build assets.');
}
fs.writeFileSync('index.html', page);
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync(path.join('docs', 'index.html'), page);
console.log(`playable page ${page.length} bytes`);
