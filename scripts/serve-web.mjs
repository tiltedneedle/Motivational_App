/**
 * Serve the built web bundle for a demo.
 *
 * The same single-page server the e2e, the axe pass and the cold-open check
 * run against, so what is shown is exactly the build that passed them — not
 * the Expo dev server, which is slower, prints its own warnings, and is not
 * what anything verified.
 *
 *   pnpm build:web && pnpm demo          # http://localhost:8790
 *   PORT=3000 pnpm demo                  # another port
 *
 * Unknown paths fall back to index.html, the way a real host would, so a
 * reload on /present or /past opens that screen rather than a 404.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8790);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

try {
  await stat(join(DIST, 'index.html'));
} catch {
  console.error('No web build at apps/mobile/dist. Run `pnpm build:web` first.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  let file = join(DIST, decodeURIComponent(url.pathname));
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(DIST, 'index.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

server.listen(PORT, () => {
  // Every address this machine answers on: a laptop often has a virtual
  // adapter or two beside the Wi-Fi, and only the person can tell which is which.
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log(`Morrow web demo`);
  console.log(`  this machine   http://localhost:${PORT}`);
  for (const a of lan) console.log(`  a phone nearby http://${a}:${PORT}   (same Wi-Fi; open it in the phone's browser)`);
  console.log(`\nA fresh visitor starts at Welcome. To reset, clear the site's storage in the browser.`);
  console.log(`Ctrl+C to stop.`);
});
