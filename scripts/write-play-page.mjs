import fs from 'node:fs';
import path from 'node:path';

function resolveAsset(htmlPath, href) {
  return path.resolve(path.dirname(htmlPath), href);
}

function bundleJs(jsPath, seen = new Set()) {
  const absolute = path.resolve(jsPath);
  if (seen.has(absolute)) return '';
  seen.add(absolute);
  let source = fs.readFileSync(absolute, 'utf8');
  source = source.replace(/import\s*["']([^"']+)["'];?/g, (_, href) => {
    const dep = path.resolve(path.dirname(absolute), href);
    return `${bundleJs(dep, seen)}\n`;
  });
  return source.replace(/<\/script/gi, '<\\/script');
}

function inlinePage(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const cssMatch = html.match(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/);
  const jsMatch = html.match(/<script type="module"[^>]*src="([^"]+\.js)"><\/script>/);
  if (!cssMatch || !jsMatch) {
    throw new Error(`Missing assets in ${htmlPath}`);
  }
  const css = fs.readFileSync(resolveAsset(htmlPath, cssMatch[1]), 'utf8');
  const js = bundleJs(resolveAsset(htmlPath, jsMatch[1]));
  html = html
    .replace(/<link rel="icon"[^>]*>\s*/g, '')
    .replace(/<link rel="modulepreload"[^>]*>\s*/g, '')
    .replace(cssMatch[0], () => `<style>${css}</style>`)
    .replace(jsMatch[0], '')
    .replace('</body>', () => `<script type="module">${js}</script>\n  </body>`);
  if (/(\.\/|\.\.\/)assets\//.test(html)) {
    throw new Error(`The playable page still points at build assets: ${htmlPath}`);
  }
  return html;
}

function findHtmlFiles(root) {
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...findHtmlFiles(full));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

const dist = path.resolve('dist');
const pages = findHtmlFiles(dist);
if (!pages.length) throw new Error('Build HTML was not found.');

let jingziHtml = null;
let tansheHtml = null;
for (const file of pages) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('貪吃蛇')) tansheHtml = inlinePage(file);
  else if (text.includes('井字過三關')) jingziHtml = inlinePage(file);
}

if (!jingziHtml) throw new Error('井字過三關 page was not built.');
if (!tansheHtml) throw new Error('貪吃蛇 page was not built.');

fs.mkdirSync('jingzi', { recursive: true });
fs.mkdirSync('tanshe', { recursive: true });
fs.writeFileSync(path.join('jingzi', 'index.html'), jingziHtml);
fs.writeFileSync(path.join('tanshe', 'index.html'), tansheHtml);
fs.copyFileSync('home.html', 'index.html');
fs.copyFileSync('public/favicon.svg', 'favicon.svg');
console.log(`jingzi ${jingziHtml.length} bytes`);
console.log(`tanshe ${tansheHtml.length} bytes`);
