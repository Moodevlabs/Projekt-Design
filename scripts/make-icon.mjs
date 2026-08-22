/**
 * Generuje źródłową ikonę 1024×1024 (czarne kółko z białą literą „A") do `pnpm tauri icon`.
 * Bez zależności — ręczny enkoder PNG (RGBA, zlib z Node).
 * Uruchom: node scripts/make-icon.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const S = 1024;
const px = Buffer.alloc(S * S * 4, 0);

const INK = [0x15, 0x16, 0x1a];
const WHITE = [0xff, 0xff, 0xff];

const set = (x, y, [r, g, b], a) => {
  const i = (y * S + x) * 4;
  const na = a + (px[i + 3] / 255) * (1 - a);
  if (na <= 0) return;
  const blend = (c, o) => Math.round((c * a + o * (px[i + 3] / 255) * (1 - a)) / na);
  px[i] = blend(r, px[i]);
  px[i + 1] = blend(g, px[i + 1]);
  px[i + 2] = blend(b, px[i + 2]);
  px[i + 3] = Math.round(na * 255);
};

// antyaliasing przez supersampling 3×3
const SS = 3;
const coverage = (x, y, inside) => {
  let hits = 0;
  for (let sy = 0; sy < SS; sy++)
    for (let sx = 0; sx < SS; sx++)
      if (inside(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)) hits++;
  return hits / (SS * SS);
};

const cx = S / 2;
const cy = S / 2;
const R = S * 0.47;

// Litera „A": dwie ukośne belki + poprzeczka.
const strokeW = S * 0.085;
const apexY = cy - S * 0.235;
const baseY = cy + S * 0.235;
const halfSpan = S * 0.185;

const distToSeg = (px_, py_, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px_ - x1) * dx + (py_ - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px_ - qx, py_ - qy);
};

const inLetter = (x, y) => {
  const half = strokeW / 2;
  if (distToSeg(x, y, cx, apexY, cx - halfSpan, baseY) <= half) return true;
  if (distToSeg(x, y, cx, apexY, cx + halfSpan, baseY) <= half) return true;
  const barY = cy + S * 0.085;
  const barHalf = halfSpan * 0.62;
  if (distToSeg(x, y, cx - barHalf, barY, cx + barHalf, barY) <= half * 0.85) return true;
  return false;
};

const inCircle = (x, y) => Math.hypot(x - cx, y - cy) <= R;

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const c = coverage(x, y, inCircle);
    if (c > 0) set(x, y, INK, c);
    const l = coverage(x, y, inLetter);
    if (l > 0) set(x, y, WHITE, l);
  }
}

// --- PNG ---
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0; // filter: none
  px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync('src-tauri/icons', { recursive: true });
writeFileSync('src-tauri/icons/source.png', png);
console.log(`OK: src-tauri/icons/source.png (${png.length} B)`);
