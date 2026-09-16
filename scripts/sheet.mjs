/**
 * Tile screenshots into contact sheets, for reading a whole journey at once.
 *
 *   node scripts/sheet.mjs <dir> [cols] [scale] [perSheet]
 *
 * Writes <dir>/_sheet-1.png, _sheet-2.png, … each holding `perSheet` frames in
 * `cols` columns at `scale`, with the frame's file name under it so a defect
 * can be traced back to the step that produced it. Frames are taken in name
 * order, which is sequence order when they came from the e2e's JOURNEY mode.
 */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [dir, colsArg = '6', scaleArg = '0.32', perArg = '30'] = process.argv.slice(2);
const cols = Number(colsArg), scale = Number(scaleArg), per = Number(perArg);
const files = readdirSync(dir).filter((f) => f.endsWith('.png') && !f.startsWith('_sheet')).sort();

// A 5×7 pixel font is enough for a caption nobody has to like.
const GLYPHS = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'], '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
};
for (const [i, ch] of [...'abcdefghijklmnopqrstuvwxyz'].entries()) {
  GLYPHS[ch] = [
    ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], ['11110', '10001', '11110', '10001', '10001', '10001', '11110'], ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    ['11110', '10001', '10001', '10001', '10001', '10001', '11110'], ['11111', '10000', '11110', '10000', '10000', '10000', '11111'], ['11111', '10000', '11110', '10000', '10000', '10000', '10000'],
    ['01110', '10001', '10000', '10111', '10001', '10001', '01111'], ['10001', '10001', '11111', '10001', '10001', '10001', '10001'], ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
    ['00111', '00010', '00010', '00010', '10010', '10010', '01100'], ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    ['10001', '11011', '10101', '10101', '10001', '10001', '10001'], ['10001', '11001', '10101', '10011', '10001', '10001', '10001'], ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    ['11110', '10001', '10001', '11110', '10000', '10000', '10000'], ['01110', '10001', '10001', '10001', '10101', '10010', '01101'], ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    ['10001', '10001', '10001', '10001', '10001', '01010', '00100'], ['10001', '10001', '10001', '10101', '10101', '10101', '01010'], ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
    ['10001', '10001', '01010', '00100', '00100', '00100', '00100'], ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  ][i];
}
function caption(png, x, y, text) {
  for (const ch of text.toLowerCase()) {
    const g = GLYPHS[ch];
    if (g) for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') { const i = ((y + r) * png.width + x + c) * 4; png.data[i] = 20; png.data[i + 1] = 20; png.data[i + 2] = 20; png.data[i + 3] = 255; }
    x += 6;
    if (x > png.width - 6) break;
  }
}

let sheetNo = 0;
for (let start = 0; start < files.length; start += per) {
  const batch = files.slice(start, start + per).map((f) => ({ name: f.replace('.png', ''), png: PNG.sync.read(readFileSync(join(dir, f))) }));
  const cw = Math.round(batch[0].png.width * scale), ch = Math.round(Math.max(...batch.map((i) => i.png.height)) * scale);
  const rows = Math.ceil(batch.length / cols), pad = 8, cap = 12;
  const W = cols * (cw + pad) + pad, H = rows * (ch + pad + cap) + pad;
  const sheet = new PNG({ width: W, height: H });
  sheet.data.fill(228);
  batch.forEach((img, i) => {
    const ox = pad + (i % cols) * (cw + pad), oy = pad + Math.floor(i / cols) * (ch + pad + cap);
    caption(sheet, ox, oy + 2, img.name.slice(0, Math.floor(cw / 6)));
    const top = oy + cap;
    for (let y = 0; y < Math.round(img.png.height * scale); y++) for (let x = 0; x < cw; x++) {
      const sx = Math.min(img.png.width - 1, Math.floor(x / scale)), sy = Math.min(img.png.height - 1, Math.floor(y / scale));
      const si = (sy * img.png.width + sx) * 4, di = ((top + y) * W + ox + x) * 4;
      sheet.data[di] = img.png.data[si]; sheet.data[di + 1] = img.png.data[si + 1]; sheet.data[di + 2] = img.png.data[si + 2]; sheet.data[di + 3] = 255;
    }
  });
  sheetNo += 1;
  const out = join(dir, `_sheet-${sheetNo}.png`);
  writeFileSync(out, PNG.sync.write(sheet));
  console.log(`${out}  ${batch.length} frames (${batch[0].name} … ${batch[batch.length - 1].name})  ${W}×${H}`);
}
