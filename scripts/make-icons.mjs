/**
 * The app icon, splash (day and night) and notification glyph, drawn by hand.
 *
 * One stone on the studio ground: a dark disc, lit from the top left, seated
 * in a slot. It is the mark the whole design system is built around and it
 * reads at every size the stores need. Drawn in code rather than committed as
 * an opaque binary, so the colours come from the same tokens the app uses and
 * a change to them is a change here.
 *
 * Writes PNGs with nothing but zlib: no image library, no network, nothing to
 * install. Run once and commit the output; `app.json` points at it.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT = join(ROOT, 'apps', 'mobile', 'assets');
mkdirSync(OUT, { recursive: true });

// The studio's own colours (packages/ui/src/tokens.ts).
const GROUND = [0xf1, 0xf0, 0xec];
const NIGHT = [0x17, 0x18, 0x1c];
const CORAL = [0xea, 0x4b, 0x2e];

// ---- a minimal PNG encoder

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- the drawing

/**
 * Paint one image. `shade(x, y)` returns [r, g, b, a] for a pixel, or null for
 * the ground. Everything is drawn with distance fields and soft edges, so it
 * scales to any size without a raster in between.
 */
function paint(size, shade, ground) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 2x2 supersampling for clean edges.
      let r = 0, g = 0, b = 0, a = 0;
      for (const [dx, dy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const px = shade((x + dx) / size, (y + dy) / size) ?? ground;
        r += px[0]; g += px[1]; b += px[2]; a += px[3] ?? 255;
      }
      const i = (y * size + x) * 4;
      buf[i] = r / 4; buf[i + 1] = g / 4; buf[i + 2] = b / 4; buf[i + 3] = a / 4;
    }
  }
  return buf;
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * The stone, at a centre and radius given in unit coordinates.
 *
 * A disc with a highlight from the top-left, a darker rim, and a soft slot
 * beneath it on the ground — the same three things the on-screen Stone draws.
 */
function stone(u, v, cx, cy, r, dark, night = false) {
  const dx = u - cx;
  const dy = v - cy;
  const d = Math.sqrt(dx * dx + dy * dy);
  const aa = 0.004;
  // On the night ground the stone is the pale one — the same ink the night
  // studio's buttons wear — and its slot is a deeper dark rather than a grey.
  const ground = night ? NIGHT : GROUND;
  const slotInk = night ? [0x00, 0x00, 0x00] : NIGHT;
  // the slot: a soft shadow below and slightly larger than the stone
  const sd = Math.sqrt(dx * dx + (dy - r * 0.18) * (dy - r * 0.18));
  const slot = 1 - smooth(r * 1.02, r * 1.28, sd);
  if (d > r + aa) {
    return slot > 0 ? [...mix(ground, slotInk, slot * (night ? 0.35 : 0.18)), 255] : null;
  }
  // the disc, lit from the top left
  const nx = dx / r;
  const ny = dy / r;
  const light = Math.max(0, 1 - Math.sqrt((nx + 0.45) ** 2 + (ny + 0.5) ** 2) / 1.35);
  const rim = smooth(0.82, 1, d / r);
  let col = night
    ? mix([0xd9, 0xd8, 0xd3], [0xff, 0xff, 0xfd], light * light * 0.9)
    : mix(dark ? [0x3a, 0x3b, 0x40] : [0x2b, 0x2c, 0x31], [0x8c, 0x8d, 0x93], light * light * 0.9);
  col = mix(col, night ? [0xa8, 0xa7, 0xa2] : [0x0f, 0x10, 0x13], rim * 0.55);
  const edge = smooth(r + aa, r - aa, d);
  const under = slot > 0 ? mix(ground, slotInk, slot * (night ? 0.35 : 0.18)) : ground;
  return [...mix(under, col, edge), 255];
}

function icon(size) {
  return paint(size, (u, v) => stone(u, v, 0.5, 0.5, 0.29, false), GROUND);
}

// Android's adaptive icon: the same stone in the safe zone (inner 66%), with
// the ground as a separate background layer so the OS can mask it.
function adaptiveForeground(size) {
  return paint(size, (u, v) => {
    const px = stone(u, v, 0.5, 0.5, 0.21, false);
    return px ? px : [0, 0, 0, 0];
  }, [0, 0, 0, 0]);
}

// The splash: the stone, smaller, a little above centre, on the ground —
// and the night version for a phone in dark mode, so the first frame is not
// a flash of the day studio before the night one.
function splash(size, night = false) {
  return paint(size, (u, v) => stone(u, v, 0.5, 0.46, 0.09, false, night), night ? NIGHT : GROUND);
}

// The notification glyph: Android wants a white silhouette on transparent and
// tints it with `color`. A plain disc with a slot reads as the stone at 96 px.
function notificationGlyph(size) {
  return paint(size, (u, v) => {
    const d = Math.sqrt((u - 0.5) ** 2 + (v - 0.47) ** 2);
    const disc = smooth(0.31, 0.29, d);
    const slotD = Math.abs(v - 0.84);
    const slot = smooth(0.05, 0.03, slotD) * smooth(0.42, 0.36, Math.abs(u - 0.5));
    const a = Math.max(disc, slot * 0.85);
    return a > 0 ? [255, 255, 255, Math.round(a * 255)] : [0, 0, 0, 0];
  }, [0, 0, 0, 0]);
}

writeFileSync(join(OUT, 'icon.png'), png(1024, 1024, icon(1024)));
writeFileSync(join(OUT, 'adaptive-icon.png'), png(1024, 1024, adaptiveForeground(1024)));
writeFileSync(join(OUT, 'splash.png'), png(1284, 1284, splash(1284)));
writeFileSync(join(OUT, 'splash-dark.png'), png(1284, 1284, splash(1284, true)));
writeFileSync(join(OUT, 'notification-icon.png'), png(96, 96, notificationGlyph(96)));
writeFileSync(join(OUT, 'favicon.png'), png(48, 48, icon(48)));

console.log(`wrote icon, adaptive-icon, splash, splash-dark, notification-icon and favicon to ${OUT}`);
console.log(`coral for the notification tint: #${CORAL.map((c) => c.toString(16).padStart(2, '0')).join('')}`);
