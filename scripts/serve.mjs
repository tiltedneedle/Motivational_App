/**
 * Serve the exported web build, for looking at the app by hand.
 *
 * The end-to-end suite stands up its own server on a random port; this one is
 * fixed so the browser pane can hold a tab open across rebuilds. Every unknown
 * path falls back to index.html, because expo-router owns the routing.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = 'apps/mobile/dist';
const PORT = Number(process.env.PORT ?? 8790);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let path = join(ROOT, url);
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
  } catch {
    path = join(ROOT, 'index.html');
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    const body = await readFile(join(ROOT, 'index.html'));
    res.writeHead(200, { 'content-type': TYPES['.html'] });
    res.end(body);
  }
});

server.listen(PORT, () => console.log(`Morrow on http://localhost:${PORT}`));
