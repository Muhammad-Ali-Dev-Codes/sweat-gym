/**
 * Generates PWA manifest icons (192/512 + maskable variants) without
 * external tooling. Art: dark tile + white barbell glyph.
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawIcon(size, { maskable }) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };

  // Background #171717
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) set(x, y, 23, 23, 23);

  // Glyph geometry (fractions of size)
  const s = maskable ? 0.52 : 0.66;      // overall glyph scale
  const cx = size / 2, cy = size / 2;
  const halfLen = s * 0.42 * size;       // half bar length
  const barH = Math.max(2, s * 0.09 * size);   // bar thickness
  const plateW = Math.max(3, s * 0.11 * size); // plate thickness
  const plateH = s * 0.34 * size;        // plate height
  const white = [255, 255, 255];

  const rect = (x0, y0, w, h) => {
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++)
      for (let x = Math.round(x0); x < Math.round(x0 + w); x++) set(x, y, ...white);
  };

  // Bar
  rect(cx - halfLen, cy - barH / 2, halfLen * 2, barH);
  // Plates
  rect(cx - halfLen, cy - plateH / 2, plateW, plateH);
  rect(cx + halfLen - plateW, cy - plateH / 2, plateW, plateH);
  // Inner plates (slightly shorter)
  const inset = plateW * 1.6;
  const innerH = plateH * 0.72;
  rect(cx - halfLen + inset, cy - innerH / 2, plateW * 0.7, innerH);
  rect(cx + halfLen - inset - plateW * 0.7, cy - innerH / 2, plateW * 0.7, innerH);

  return png(size, size, px);
}

const outDir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}x${size}.png`), drawIcon(size, { maskable: false }));
  fs.writeFileSync(path.join(outDir, `maskable-${size}x${size}.png`), drawIcon(size, { maskable: true }));
}
console.log("icons written:", fs.readdirSync(outDir).join(", "));
