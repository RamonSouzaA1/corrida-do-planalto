// Gera os ícones do aplicativo (PWA e Capacitor) em public/icons/, em PNG, com a paleta de
// Brasília de src/config/cities.json. O desenho é original: sol, pista de três faixas e uma moeda,
// com tudo importante no centro para servir de ícone mascarável. Uso: npm run icons
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');
const SIZES = [192, 512];
const GRID = 32;

const [brasilia] = JSON.parse(readFileSync(join(ROOT, 'src', 'config', 'cities.json'), 'utf8'));
const [, WHITE, NAVY, , , , , , ASPHALT, , , GOLD, ORANGE] = brasilia.palette;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Desenho na grade de 32 x 32: a cor de cada ponto.
function pixelAt(x, y) {
  const inCircle = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  if (inCircle(16, 24, 3.2)) return inCircle(16, 24, 1.5) ? ORANGE : GOLD; // moeda na pista
  if (inCircle(16, 10, 4.6)) return GOLD; // sol
  if (y < 15) return NAVY; // céu
  // Pista em perspectiva: as divisórias das faixas saem do ponto de fuga e abrem para baixo.
  const spread = (y - 15) * 0.55;
  for (const side of [-1, 1]) {
    const lineX = 16 + side * (1 + spread);
    if (Math.abs(x - lineX) < 0.8 && (y - 15) % 4 < 3) return WHITE;
  }
  return ASPHALT;
}

function encodePng(size) {
  const scale = size / GRID;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 2; // RGB, sem transparência: o fundo vai até a borda
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = rgb(pixelAt(Math.floor(x / scale), Math.floor(y / scale)));
      raw.set(color, y * stride + 1 + x * 3);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const size of SIZES) writeFileSync(join(OUT, `icon-${size}.png`), encodePng(size));
console.log(`Ícones gerados em public/icons/ (${SIZES.join(', ')} px).`);
