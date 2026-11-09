// Gera a arte provisória (sprites, fundos das cidades e fonte pixelada) em src/assets/, em PNG,
// usando só as paletas de 16 cores de src/config/cities.json. Toda a arte é original, desenhada
// aqui pixel a pixel. Uso: npm run art
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'src', 'assets');

const cities = JSON.parse(readFileSync(join(ROOT, 'src', 'config', 'cities.json'), 'utf8'));
const PALETTES = Object.fromEntries(cities.map((city) => [city.id, city.palette]));

// Uma letra por cor da paleta, na mesma ordem de cities.json; '.' é transparente. A mesma letra
// pode ter outra cor em outra cidade (o céu S de Washington é noturno, por exemplo).
const KEYS = 'KWNBSLGgAMCYORPH';
// Cores iguais em todas as cidades. Personagens e itens que aparecem em mais de uma cidade só usam
// estas, para que cada cenário continue com no máximo 16 cores na tela.
const SHARED_KEYS = 'KWNBgMYRPH';
const colorsOf = (palette) => Object.fromEntries([...KEYS].map((key, i) => [key, palette[i]]));

// ---------- PNG ----------

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

function encodePng(image, palette) {
  const { width, height, pixels } = image;
  const COLOR = colorsOf(palette);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0; // sem filtro
    for (let x = 0; x < width; x += 1) {
      const key = pixels[y * width + x];
      if (key === '.') continue;
      const hex = COLOR[key];
      const offset = row + 1 + x * 4;
      raw[offset] = parseInt(hex.slice(1, 3), 16);
      raw[offset + 1] = parseInt(hex.slice(3, 5), 16);
      raw[offset + 2] = parseInt(hex.slice(5, 7), 16);
      raw[offset + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function save(relativePath, image, cityId = 'brasilia') {
  const file = join(ASSETS, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(image, PALETTES[cityId]));
  return relativePath.replaceAll('\\', '/');
}

// ---------- Desenho ----------

function createImage(width, height) {
  const pixels = new Array(width * height).fill('.');
  const set = (x, y, key) => {
    if (x >= 0 && y >= 0 && x < width && y < height) pixels[y * width + x] = key;
  };
  return {
    width,
    height,
    pixels,
    set,
    rect(x, y, w, h, key) {
      for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) set(i, j, key);
    },
    // Meio disco: half = 'top' (cúpula) ou 'bottom' (tigela).
    halfDisc(cx, cy, r, key, half) {
      for (let j = -r; j <= r; j += 1) {
        if ((half === 'top' && j > 0) || (half === 'bottom' && j < 0)) continue;
        for (let i = -r; i <= r; i += 1) if (i * i + j * j <= r * r) set(cx + i, cy + j, key);
      }
    },
    ellipse(cx, cy, rx, ry, key) {
      for (let j = -ry; j <= ry; j += 1) {
        for (let i = -rx; i <= rx; i += 1) {
          if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1) set(cx + i, cy + j, key);
        }
      }
    },
    // Desenha um mapa de caracteres; subst troca letras-modelo por cores.
    map(x, y, rows, subst = {}) {
      rows.forEach((row, j) =>
        [...row].forEach((ch, i) => {
          const key = subst[ch] ?? ch;
          if (key !== '.') set(x + i, y + j, key);
        }),
      );
    },
    points(x, y, list) {
      for (const [i, j, key] of list) set(x + i, y + j, key);
    },
  };
}

// Folha de quadros lado a lado.
function sheet(frameWidth, frameHeight, frames) {
  const image = createImage(frameWidth * frames.length, frameHeight);
  frames.forEach((draw, i) => draw(image, i * frameWidth));
  return image;
}

// Gerador pseudoaleatório simples e fixo, para texturas repetíveis.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Retângulo com contorno preto.
function box(image, x, y, w, h, key) {
  image.rect(x, y, w, h, 'K');
  image.rect(x + 1, y + 1, w - 2, h - 2, key);
}

// Desenha em tamanho menor e amplia 2x (itens pequenos, que a perspectiva ainda reduz).
const twice = (width, height, draw) => (image, x) => {
  const small = createImage(width, height);
  draw(small, 0);
  small.pixels.forEach((key, index) => {
    if (key === '.') return;
    image.rect(x + (index % width) * 2, Math.floor(index / width) * 2, 2, 2, key);
  });
};

// ---------- Personagens ----------

// A câmera fica atrás de Chico (estilo Subway Surfers): Chico e Caio aparecem de costas na
// corrida e de frente na tela de título; a guarda e o jornalista ficam de frente, na pista.
// Todos em quadros de 40 x 48, com os pés na última linha e o corpo centrado em x + 20.
const PERSON = { width: 40, height: 48 };

// Bandeira de campanha fictícia: xadrez vermelho e dourado, sem lembrar a de nenhum país.
function handFlag(image, poleX, handY, wave = 0) {
  const top = Math.max(0, handY - 20);
  image.rect(poleX, top, 1, handY - top + 1, 'H');
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 6; j += 1) {
      const checker = (Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0;
      image.set(poleX + 1 + i, top + j + (i >= 4 ? wave : 0), checker ? 'R' : 'Y');
    }
  }
}

// Mala de dinheiro na mão, com notas escapando.
function handCase(image, x, y) {
  image.rect(x + 3, y - 1, 3, 1, 'K');
  box(image, x, y, 9, 8, 'H');
  image.points(x, y, [
    [4, 3, 'Y'],
    [1, -1, 'g'],
    [2, -2, 'W'],
    [7, -1, 'g'],
  ]);
}

function head(image, cx, c, { front = false, eyeY = 8 } = {}) {
  image.ellipse(cx, 8, 7, 8, 'K');
  image.ellipse(cx, 8, 6, 7, front ? c.skin : c.hair);
  if (front) {
    // Cabelo no alto da cabeça e nas têmporas; olhos e boca.
    for (let j = -7; j <= -3; j += 1) {
      for (let i = -6; i <= 6; i += 1) {
        if ((i * i) / 36 + (j * j) / 49 <= 1) image.set(cx + i, 8 + j, c.hair);
      }
    }
    image.rect(cx - 6, 6, 1, 3, c.hair);
    image.rect(cx + 6, 6, 1, 3, c.hair);
    image.rect(cx - 3, eyeY, 1, 2, 'K');
    image.rect(cx + 3, eyeY, 1, 2, 'K');
    image.rect(cx - 1, 12, 3, 1, 'H');
  } else {
    image.rect(cx - 4, 12, 9, 2, c.hairShade);
    image.rect(cx - 3, 14, 7, 1, c.hairShade);
    image.rect(cx - 7, 7, 1, 3, c.skin);
    image.rect(cx + 7, 7, 1, 3, c.skin);
  }
  image.rect(cx - 2, 16, 5, 1, c.skin);
}

// Braço: side -1 (esquerdo de quem olha) ou 1; pose 'down' (com o comprimento), 'up' ou 'out'.
function arm(image, cx, c, side, pose, length = 12) {
  const inner = side < 0 ? cx - 11 : cx + 10;
  const outline = side < 0 ? cx - 12 : cx + 12;
  if (pose === 'up') {
    image.rect(Math.min(inner, outline), 5, 3, 14, 'K');
    image.rect(inner, 6, 2, 13, c.suit);
    image.rect(inner, 4, 2, 2, c.skin);
  } else if (pose === 'out') {
    const x = side < 0 ? cx - 19 : cx + 10;
    box(image, x, 18, 10, 5, c.suit);
    image.rect(side < 0 ? x : x + 8, 19, 2, 3, c.skin);
  } else {
    image.rect(Math.min(inner, outline), 18, 3, length + 3, 'K');
    image.rect(inner, 18, 2, length, c.suit);
    image.rect(inner, 18 + length, 2, 2, c.skin);
  }
}

// Perna de 6 px de largura a partir da cintura; a perna levantada mostra a sola.
function leg(image, x, c, length) {
  image.rect(x - 1, 35, 8, length + 3, 'K');
  image.rect(x, 35, 6, length, c.pants);
  if (length < 10) image.rect(x, 35 + length + 1, 6, 1, 'M');
}

function torso(image, cx, c, front) {
  box(image, cx - 9, 17, 19, 18, c.suit);
  if (front) {
    for (let y = 18; y < 24; y += 1) {
      const half = 3 - Math.floor((y - 18) / 2);
      image.rect(cx - half, y, half * 2 + 1, 1, 'W');
    }
  } else {
    image.rect(cx - 3, 17, 7, 1, 'W');
    image.rect(cx, 20, 1, 14, c.shade);
  }
}

// Passos da corrida: comprimento das pernas e dos braços (esquerda, direita) em cada quadro.
const STEPS = [
  { legs: [10, 5], arms: [8, 13] },
  { legs: [10, 8], arms: [11, 11] },
  { legs: [5, 10], arms: [13, 8] },
  { legs: [8, 10], arms: [11, 11] },
];

function backPerson(image, x, c, { legs, arms }, { armsUp = false } = {}) {
  const cx = x + 20;
  leg(image, cx - 7, c, legs[0]);
  leg(image, cx + 2, c, legs[1]);
  arm(image, cx, c, -1, armsUp ? 'up' : 'down', arms[0]);
  arm(image, cx, c, 1, armsUp ? 'up' : 'down', arms[1]);
  torso(image, cx, c, false);
  head(image, cx, c);
  return cx;
}

function frontPerson(image, x, c, { left = 'down', right = 'down', eyeY } = {}) {
  const cx = x + 20;
  leg(image, cx - 7, c, 10);
  leg(image, cx + 2, c, 10);
  if (left) arm(image, cx, c, -1, left);
  if (right) arm(image, cx, c, 1, right);
  torso(image, cx, c, true);
  head(image, cx, c, { front: true, eyeY });
  return cx;
}

// Chico do Planalto: grisalho, terno cinza, gravata torta (voando sobre o ombro quando visto de
// costas) e bandeira na mão.
const CHICO = { hair: 'W', hairShade: 'M', skin: 'P', suit: 'M', shade: 'N', pants: 'M' };
const tieOverShoulder = (image, cx, flutter) => {
  for (let i = 0; i < 5; i += 1) image.rect(cx - 3 - i, 17 + i + (i > 2 ? flutter : 0), 2, 1, 'R');
};
const chicoRun = (step) => (image, x) => {
  const cx = backPerson(image, x, CHICO, { ...STEPS[step], arms: [STEPS[step].arms[0], 11] });
  tieOverShoulder(image, cx, step % 2);
  handFlag(image, cx + 13, 29, step % 2);
};
const chicoJump = (image, x) => {
  const cx = backPerson(image, x, CHICO, { legs: [5, 6], arms: [0, 0] }, { armsUp: true });
  tieOverShoulder(image, cx, 1);
  handFlag(image, cx + 13, 5);
};
// Deslize: agachado, rente ao chão.
const chicoSlide = (image, x) => {
  const cx = x + 20;
  box(image, cx - 15, 43, 7, 5, 'K');
  box(image, cx + 9, 43, 7, 5, 'K');
  box(image, cx - 11, 35, 23, 12, 'M');
  image.rect(cx, 38, 1, 8, 'N');
  image.ellipse(cx, 29, 7, 7, 'K');
  image.ellipse(cx, 29, 6, 6, 'W');
  image.rect(cx - 4, 32, 9, 2, 'M');
  image.rect(cx - 3, 35, 7, 1, 'W');
  for (let i = 0; i < 4; i += 1) image.rect(cx - 3 - i, 36 + i, 2, 1, 'R');
  for (let i = 0; i < 8; i += 1) image.set(cx + 12 + i, 40 - i, 'H');
  for (let i = 0; i < 6; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      image.set(cx + 13 + i, 27 + j, (Math.floor(i / 2) + Math.floor(j / 2)) % 2 ? 'Y' : 'R');
    }
  }
};
const chicoFront = (image, x) => {
  const cx = frontPerson(image, x, CHICO);
  // Gravata torta.
  for (let i = 0; i < 8; i += 1) image.rect(cx + Math.floor(i / 2), 18 + i, 2, 1, 'R');
  handFlag(image, cx + 13, 30);
};

// Caio Herdeiro: terno azul, cabelo impecável, óculos escuros e a mala de dinheiro.
const CAIO = { hair: 'H', hairShade: 'K', skin: 'P', suit: 'B', shade: 'N', pants: 'B' };
const slickHair = (image, cx) => {
  image.rect(cx + 2, 1, 1, 5, 'K');
  image.points(cx, 0, [
    [-3, 3, 'W'],
    [-2, 2, 'W'],
    [-4, 4, 'W'],
  ]);
};
const caioRun = (step) => (image, x) => {
  const cx = backPerson(image, x, CAIO, { ...STEPS[step], arms: [12, STEPS[step].arms[1]] });
  slickHair(image, cx);
  // Hastes dos óculos escuros.
  image.set(cx - 7, 7, 'K');
  image.set(cx + 7, 7, 'K');
  handCase(image, cx - 17, 31 + (step % 2));
};
// Caído depois de tropeçar (mala de dinheiro): pernas para o ar, mala aberta e notas voando.
const caioFall = (image, x) => {
  const cx = x + 20;
  box(image, cx - 14, 23, 7, 4, 'K');
  box(image, cx - 13, 26, 5, 12, 'B');
  box(image, cx - 7, 26, 7, 4, 'K');
  box(image, cx - 6, 29, 5, 9, 'B');
  box(image, cx - 13, 37, 22, 10, 'B');
  image.ellipse(cx + 13, 40, 6, 6, 'K');
  image.ellipse(cx + 13, 40, 5, 5, 'P');
  image.halfDisc(cx + 13, 38, 5, 'H', 'top');
  image.rect(cx + 9, 40, 9, 2, 'K');
  image.rect(cx + 12, 44, 3, 1, 'H');
  box(image, cx + 1, 22, 10, 7, 'H');
  for (const [i, j] of [
    [3, 18],
    [8, 15],
    [13, 20],
    [-2, 16],
    [16, 13],
  ]) {
    image.rect(cx + i, j, 3, 2, 'g');
    image.set(cx + i + 1, j, 'W');
  }
};
const caioFront = (image, x) => {
  const cx = frontPerson(image, x, CAIO);
  slickHair(image, cx);
  image.rect(cx - 5, 8, 11, 2, 'K');
  image.set(cx - 4, 8, 'W');
  image.set(cx + 2, 8, 'W');
  image.rect(cx, 18, 1, 8, 'R');
  handCase(image, cx - 17, 32);
};

// Guarda de segurança: capacete branco, apito na boca e cassetete. No segundo quadro, ergue o
// cassetete.
const GUARD = { hair: 'K', skin: 'P', suit: 'N', shade: 'K', pants: 'N' };
const guard = (raised) => (image, x) => {
  const cx = frontPerson(image, x, GUARD, { right: raised ? 'out' : 'down', eyeY: 9 });
  image.halfDisc(cx, 7, 8, 'K', 'top');
  image.halfDisc(cx, 7, 7, 'W', 'top');
  image.rect(cx - 8, 6, 17, 2, 'K');
  image.rect(cx - 7, 6, 15, 1, 'M');
  image.rect(cx - 1, 12, 3, 2, 'Y');
  image.set(cx + 2, 12, 'K');
  image.rect(cx, 18, 1, 8, 'K');
  image.rect(cx - 8, 31, 17, 2, 'K');
  image.rect(cx, 31, 2, 2, 'Y');
  if (raised) {
    image.rect(cx + 17, 4, 3, 16, 'K');
    image.rect(cx + 18, 5, 1, 3, 'M');
  } else {
    image.rect(cx + 10, 31, 3, 13, 'K');
    image.rect(cx + 11, 41, 1, 2, 'M');
  }
};

// Jornalista: câmera grande no ombro e microfone apontado para a frente (maior no segundo
// quadro, quando ele avança o microfone).
const REPORTER = { hair: 'H', skin: 'P', suit: 'W', shade: 'M', pants: 'N' };
const reporter = (thrust) => (image, x) => {
  const cx = frontPerson(image, x, REPORTER, { left: null, right: null });
  // Colete de imprensa.
  image.rect(cx - 8, 18, 5, 16, 'H');
  image.rect(cx + 4, 18, 5, 16, 'H');
  // Braço que apoia a câmera no ombro.
  box(image, cx + 9, 12, 4, 10, 'W');
  box(image, cx + 2, 1, 16, 12, 'M');
  image.ellipse(cx + 9, 7, 4, 4, 'K');
  image.ellipse(cx + 9, 7, 3, 3, 'B');
  image.set(cx + 8, 6, 'W');
  image.set(cx + 16, 2, 'R');
  // Braço dobrado com o microfone.
  box(image, cx - 13, 20, 5, 9, 'W');
  const radius = thrust ? 5 : 3;
  const micY = thrust ? 18 : 21;
  image.rect(cx - 12, micY, 3, 8, 'K');
  image.ellipse(cx - 11, micY, radius, radius, 'K');
  image.ellipse(cx - 11, micY, radius - 1, radius - 1, 'R');
  image.set(cx - 12, micY - 1, 'W');
  if (thrust) image.rect(cx - 13, micY + 5, 5, 2, 'W');
};

// Avião visto por trás, parado no fim da pista, com a porta traseira aberta e a escada no chão.
const plane = (image) => {
  image.rect(0, 46, 160, 5, 'K');
  image.rect(1, 47, 158, 3, 'M');
  image.rect(40, 44, 80, 9, 'K');
  image.rect(41, 45, 78, 7, 'M');
  for (const cx of [34, 126]) {
    image.ellipse(cx, 55, 7, 7, 'K');
    image.ellipse(cx, 55, 5, 5, 'M');
    image.ellipse(cx, 55, 2, 2, 'K');
  }
  for (let j = 0; j < 22; j += 1) {
    const half = 3 + Math.floor(j / 5);
    image.rect(80 - half, j, half * 2, 1, 'K');
    if (j > 0) image.rect(81 - half, j, half * 2 - 2, 1, 'B');
  }
  image.rect(50, 14, 60, 4, 'K');
  image.rect(51, 15, 58, 2, 'M');
  image.rect(52, 58, 3, 22, 'M');
  image.rect(105, 58, 3, 22, 'M');
  box(image, 49, 78, 9, 10, 'M');
  box(image, 102, 78, 9, 10, 'M');
  image.ellipse(80, 42, 24, 24, 'K');
  image.ellipse(80, 42, 23, 23, 'W');
  for (let y = 46; y < 50; y += 1) {
    const half = Math.floor(Math.sqrt(23 * 23 - (y - 42) * (y - 42)));
    image.rect(80 - half, y, half * 2 + 1, 1, 'B');
  }
  image.rect(71, 34, 18, 28, 'K');
  image.rect(73, 36, 14, 26, 'N');
  for (let step = 0; step < 6; step += 1) {
    const half = 8 + step;
    image.rect(80 - half, 62 + step * 4, half * 2, 2, 'W');
    image.rect(80 - half, 64 + step * 4, half * 2, 2, 'M');
  }
  image.rect(62, 86, 36, 2, 'K');
};
// Altura da soleira da porta acima do chão, usada pela cena para Caio subir a escada.
const PLANE_DOOR_HEIGHT = 26;

// ---------- Obstáculos ----------

// Vistos de frente, vindo na direção de Chico. Baixos (pular): 44 x 26. Altos (deslizar por
// baixo): 48 x 56, com 32 px livres embaixo. Bloqueios (trocar de faixa): tamanho próprio.
const LOW = { frameWidth: 44, frameHeight: 26 };
const HIGH = { frameWidth: 48, frameHeight: 56 };

function highPosts(image, key = 'M') {
  box(image, 0, 0, 3, 56, key);
  box(image, 45, 0, 3, 56, key);
}

// Listras na horizontal, de cores alternadas.
function stripes(image, x, y, w, h, keys, every = 4) {
  for (let i = 0; i < w; i += 1) image.rect(x + i, y, 1, h, keys[Math.floor(i / every) % 2]);
}

// Carro de frente, em 44 x 36.
function carFront(image, body, { round = false, bumper = 'M', extra } = {}) {
  image.rect(5, 9, 3, 3, 'K');
  image.rect(36, 9, 3, 3, 'K');
  box(image, 8, 2, 28, 13, body);
  box(image, 10, 4, 24, 9, 'L');
  image.rect(4, 29, 8, 7, 'K');
  image.rect(32, 29, 8, 7, 'K');
  box(image, 1, 13, 42, 16, body);
  for (const x of [3, 33]) {
    if (round) {
      image.ellipse(x + 4, 18, 4, 4, 'K');
      image.ellipse(x + 4, 18, 3, 3, 'Y');
    } else {
      box(image, x, 15, 8, 6, 'Y');
    }
  }
  box(image, 14, 15, 16, 8, 'K');
  image.rect(15, 17, 14, 1, 'M');
  image.rect(15, 20, 14, 1, 'M');
  image.rect(2, 25, 40, 3, bumper);
  image.rect(18, 24, 8, 3, 'W');
  extra?.(image);
}

// Brasília: cavalete entre dois cones de obra, faixa de protesto, tapume e carro oficial.
const cones = (image) => {
  box(image, 8, 9, 28, 6, 'Y');
  for (let x = 11; x < 34; x += 6) image.rect(x, 10, 3, 4, 'K');
  for (const cx of [8, 36]) {
    for (let j = 0; j < 18; j += 1) {
      const half = 1 + Math.floor(j / 4);
      image.rect(cx - half - 1, 5 + j, half * 2 + 2, 1, 'K');
      const band = (j >= 6 && j < 9) || (j >= 12 && j < 15);
      image.rect(cx - half, 5 + j, half * 2, 1, band ? 'W' : 'O');
    }
    box(image, cx - 8, 22, 16, 4, 'O');
  }
};

const banner = (image) => {
  highPosts(image);
  box(image, 2, 3, 44, 20, 'W');
  image.rect(6, 7, 36, 3, 'R');
  image.rect(6, 12, 26, 2, 'B');
  image.rect(6, 16, 32, 2, 'R');
};

const hoarding = (image) => {
  box(image, 3, 24, 3, 32, 'M');
  box(image, 42, 24, 3, 32, 'M');
  box(image, 0, 2, 48, 23, 'H');
  for (let y = 3; y < 24; y += 1) {
    for (let x = 1; x < 47; x += 1) if (Math.floor((x + y) / 4) % 2) image.set(x, y, 'O');
  }
  image.rect(1, 11, 46, 4, 'Y');
  for (let x = 3; x < 46; x += 8) image.rect(x, 11, 4, 4, 'K');
};

const officialCar = (image) =>
  carFront(image, 'N', {
    extra: () => {
      image.rect(2, 7, 1, 6, 'M');
      image.rect(3, 7, 4, 3, 'Y');
      image.rect(41, 7, 1, 6, 'M');
      image.rect(37, 7, 4, 3, 'R');
    },
  });

// Assunção: cerca de madeira, barraca de feira e moto.
const fence = (image) => {
  box(image, 0, 8, 44, 5, 'C');
  box(image, 0, 16, 44, 5, 'C');
  for (const x of [2, 20, 37]) box(image, x, 3, 5, 23, 'H');
};

const stall = (image) => {
  highPosts(image, 'H');
  box(image, 0, 2, 48, 16, 'W');
  stripes(image, 1, 3, 46, 14, ['O', 'W']);
  for (let k = 0; k < 6; k += 1) image.halfDisc(4 + k * 8, 18, 3, k % 2 ? 'W' : 'O', 'bottom');
  for (const [x, key] of [
    [10, 'Y'],
    [23, 'g'],
    [35, 'R'],
  ]) {
    image.rect(x + 1, 19, 1, 4, 'K');
    box(image, x, 23, 4, 5, key);
  }
};

const motorbike = (image) => {
  image.ellipse(12, 31, 4, 8, 'K');
  image.rect(11, 25, 2, 12, 'M');
  image.rect(8, 12, 2, 14, 'M');
  image.rect(14, 12, 2, 14, 'M');
  box(image, 7, 21, 10, 4, 'R');
  box(image, 8, 15, 8, 6, 'R');
  image.rect(1, 6, 22, 2, 'K');
  image.rect(0, 5, 3, 4, 'K');
  image.rect(21, 5, 3, 4, 'K');
  image.ellipse(3, 2, 2, 2, 'M');
  image.ellipse(20, 2, 2, 2, 'M');
  image.ellipse(12, 11, 5, 5, 'K');
  image.ellipse(12, 11, 4, 4, 'Y');
  image.set(11, 9, 'W');
};

// Buenos Aires: pacotes de jornais, letreiro da banca, bonde e carro dos anos 70.
const newspapers = (image) => {
  for (const [x, y, w] of [
    [0, 10, 15],
    [15, 5, 14],
    [29, 12, 15],
  ]) {
    box(image, x, y, w, 26 - y, 'W');
    for (let line = y + 2; line < 25; line += 2) image.rect(x + 1, line, w - 2, 1, 'M');
    image.rect(x + Math.floor(w / 2), y, 2, 26 - y, 'R');
  }
};

const kioskSign = (image) => {
  highPosts(image);
  box(image, 2, 2, 44, 15, 'G');
  image.rect(8, 5, 32, 2, 'Y');
  image.rect(12, 10, 24, 2, 'W');
  stripes(image, 3, 17, 42, 6, ['W', 'O']);
  image.rect(3, 23, 42, 1, 'K');
};

const tram = (image) => {
  image.rect(21, 0, 2, 6, 'K');
  image.rect(14, 0, 16, 1, 'K');
  image.rect(8, 56, 6, 4, 'K');
  image.rect(30, 56, 6, 4, 'K');
  box(image, 4, 5, 36, 5, 'C');
  box(image, 2, 9, 40, 43, 'O');
  box(image, 10, 11, 24, 6, 'K');
  image.rect(13, 13, 18, 2, 'Y');
  box(image, 5, 19, 34, 14, 'L');
  image.rect(21, 19, 2, 14, 'K');
  image.rect(3, 35, 38, 2, 'W');
  image.ellipse(22, 42, 4, 4, 'K');
  image.ellipse(22, 42, 3, 3, 'Y');
  image.rect(3, 47, 38, 4, 'C');
  box(image, 6, 51, 32, 5, 'M');
};

const seventiesCar = (image) => carFront(image, 'G', { round: true, bumper: 'C' });

// Washington: grade de metal, fita de isolamento e viatura.
const barricade = (image) => {
  for (let x = 3; x < 42; x += 5) image.rect(x, 5, 2, 14, 'M');
  box(image, 0, 2, 44, 4, 'C');
  box(image, 0, 18, 44, 3, 'C');
  image.rect(2, 21, 2, 4, 'M');
  image.rect(40, 21, 2, 4, 'M');
  image.rect(0, 25, 7, 1, 'K');
  image.rect(37, 25, 7, 1, 'K');
};

const tape = (image) => {
  highPosts(image);
  image.rect(0, 0, 3, 2, 'Y');
  image.rect(45, 0, 3, 2, 'Y');
  for (const y of [5, 15]) {
    image.rect(3, y - 1, 42, 8, 'K');
    stripes(image, 3, y, 42, 6, ['Y', 'K']);
  }
};

const patrolCar = (image) =>
  carFront(image, 'W', {
    extra: () => {
      image.rect(14, 0, 16, 3, 'K');
      image.rect(15, 0, 7, 2, 'R');
      image.rect(22, 0, 7, 2, 'B');
      image.rect(2, 22, 12, 2, 'N');
      image.rect(30, 22, 12, 2, 'N');
    },
  });

// ---------- Coletáveis e power-ups ----------

const coinFrame = (radius) => (image, x) => {
  image.ellipse(x + 8, 8, radius, 7, 'K');
  if (radius < 3) {
    image.rect(x + 7, 2, 2, 12, 'Y');
    return;
  }
  image.ellipse(x + 8, 8, radius - 1, 6, 'Y');
  image.rect(x + 8 - radius + 2, 5, 1, 5, 'W');
  image.rect(x + 7, 5, 2, 6, 'H');
  image.rect(x + 8 + radius - 3, 6, 1, 5, 'H');
};

// Flâmula fictícia num palito: dourada com listra preta, sem as cores de nenhum país.
const pennant = (image) =>
  image.map(0, 0, [
    '.Y......',
    '.HYYYYYK',
    '.HYKKYK.',
    '.HYYYYK.',
    '.HKKYK..',
    '.HYK....',
    '.HK.....',
    '.H......',
  ]);

// Garrafa térmica de tereré com a erva por cima.
const terere = (image) =>
  image.map(0, 0, [
    '..KKKK..',
    '..KggK..',
    '.KCCCCK.',
    '.KGGGGK.',
    '.KGCCGK.',
    '.KGGGGK.',
    '.KGGGGK.',
    '..KKKK..',
  ]);

// Disco de vinil.
const vinyl = (image) =>
  image.map(0, 0, [
    '..KKKK..',
    '.KKAAKK.',
    'KKARRAKK',
    'KARWRRAK',
    'KARRRRAK',
    'KKARRAKK',
    '.KKAAKK.',
    '..KKKK..',
  ]);

// Nota de dinheiro fictícia.
const banknote = (image) =>
  image.map(0, 0, [
    '........',
    'KKKKKKKK',
    'KgggggGK',
    'KgGWWGgK',
    'KgGWWGgK',
    'KGgggggK',
    'KKKKKKKK',
    '........',
  ]);

// Bandeirola fictícia: verde-escura e preta em diagonal, com um ponto dourado.
const starPennant = (image) =>
  image.map(0, 0, [
    '.Y......',
    '.HKKKKYK',
    '.HgKKK..',
    '.HggKK..',
    '.HgggK..',
    '.HgK....',
    '.HK.....',
    '.H......',
  ]);

// Bandeira de campanha fictícia: xadrez vermelho e dourado com um disco preto, num mastro,
// tremulando. De propósito não lembra a bandeira de nenhum país.
const flagFrames = [0, 1].map((frame) => (image, x) => {
  image.rect(x + 2, 1, 1, 15, 'H');
  image.rect(x + 2, 0, 1, 1, 'Y');
  const wave = (i) => Math.round(frame === 0 ? Math.sin(i / 2) : Math.cos(i / 2));
  for (let i = 0; i < 11; i += 1) {
    const top = 2 + wave(i);
    for (let j = 0; j < 8; j += 1) {
      const checker = (Math.floor(i / 3) + Math.floor(j / 3)) % 2 === 0;
      image.set(x + 3 + i, top + j, checker ? 'R' : 'Y');
    }
  }
  // Disco preto no centro do pano.
  for (const [i, j] of [
    [7, 3],
    [8, 3],
    [6, 4],
    [7, 4],
    [8, 4],
    [9, 4],
    [6, 5],
    [7, 5],
    [8, 5],
    [9, 5],
    [7, 6],
    [8, 6],
  ]) {
    image.set(x + i, wave(i - 3) + 2 + j, 'K');
  }
});

// Cartaz de campanha fictício numa estaca: um "+" e linhas de texto.
const poster = (image) => {
  image.rect(7, 14, 2, 10, 'H');
  image.rect(1, 0, 14, 15, 'K');
  image.rect(2, 1, 12, 13, 'Y');
  image.rect(2, 1, 12, 3, 'R');
  image.rect(6, 5, 4, 1, 'R');
  image.rect(7, 4, 2, 3, 'R');
  image.rect(4, 8, 8, 1, 'N');
  image.rect(4, 10, 6, 1, 'N');
  image.rect(4, 12, 7, 1, 'N');
};

// Mala de dinheiro entreaberta, com notas para fora.
const moneyBag = (image) => {
  image.map(0, 0, [
    '................',
    '................',
    '......KKKK......',
    '.....KK..KK.....',
    '..KKKKKKKKKKKK..',
    '.KgWgWgWgWgWgK..',
    '.KWgKKKKKKKKKKK.',
    '.KKHHHHHHHHHHHK.',
    '.KHHHHHHHHHHHHK.',
    '.KHHHHHYYHHHHHK.',
    '.KHHHHHYYHHHHHK.',
    '.KHHHHHHHHHHHHK.',
    '.KHHHHHHHHHHHHK.',
    '.KKKKKKKKKKKKKK.',
    '..KK........KK..',
    '................',
  ]);
};

// Faixa presidencial fictícia (verde e amarela, com medalha), dobrada em diagonal.
const sash = (image) => {
  for (let i = 0; i < 12; i += 1) {
    image.rect(2 + i, 1 + i, 3, 1, 'K');
    image.points(0, 0, [
      [3 + i, 1 + i, 'g'],
      [4 + i, 1 + i, 'Y'],
    ]);
  }
  image.rect(2, 1, 1, 1, 'g');
  image.ellipse(7, 7, 2, 2, 'K');
  image.ellipse(7, 7, 1, 1, 'R');
  image.points(0, 0, [[7, 7, 'Y']]);
};

// ---------- Margens da pista ----------

// Árvores, palmeiras e postes que passam ao lado da pista, em quadros de 32 x 64.
function tree(image, x, canopy, light) {
  image.rect(x + 14, 36, 4, 28, 'K');
  image.rect(x + 15, 36, 2, 28, 'H');
  image.ellipse(x + 16, 22, 14, 18, 'K');
  image.ellipse(x + 16, 22, 13, 17, canopy);
  image.ellipse(x + 11, 15, 6, 7, light);
}

function lamp(image, x, pole) {
  image.rect(x + 15, 6, 2, 58, pole);
  image.rect(x + 7, 6, 18, 2, pole);
  box(image, x + 5, 8, 7, 4, 'Y');
  box(image, x + 20, 8, 7, 4, 'Y');
  image.rect(x + 13, 61, 6, 3, pole);
}

function palm(image, x) {
  for (let y = 18; y < 64; y += 1) {
    const bend = Math.round(Math.sin((y - 18) / 14) * 3);
    image.rect(x + 13 + bend, y, 4, 1, y % 5 === 0 ? 'K' : 'H');
  }
  for (const [dx, dy, length] of [
    [-1, -1, 14],
    [1, -1, 14],
    [-1, 0, 15],
    [1, 0, 15],
    [-1, 1, 10],
    [1, 1, 10],
  ]) {
    for (let i = 0; i < length; i += 1) {
      const y = 16 + dy * Math.round(i / 3) + Math.round((i * i) / 30);
      image.rect(x + 15 + dx * i, y, 1, 3, i % 3 ? 'G' : 'g');
    }
  }
  image.ellipse(x + 15, 18, 2, 2, 'H');
}

const SIDE = { frameWidth: 32, frameHeight: 64 };

// Sprites sem city aparecem em várias cidades e só usam SHARED_KEYS; os outros usam a paleta da
// sua cidade.
const sprites = {
  chico: {
    frameWidth: PERSON.width,
    frameHeight: PERSON.height,
    frames: [chicoRun(0), chicoRun(1), chicoRun(2), chicoRun(3), chicoJump, chicoSlide, chicoFront],
    animations: {
      run: { frames: [0, 1, 2, 3], frameRate: 10, repeat: -1 },
      jump: { frames: [4], frameRate: 1, repeat: 0 },
      slide: { frames: [5], frameRate: 1, repeat: 0 },
      front: { frames: [6], frameRate: 1, repeat: 0 },
    },
  },
  caio: {
    frameWidth: PERSON.width,
    frameHeight: PERSON.height,
    frames: [caioRun(0), caioRun(1), caioRun(2), caioRun(3), caioFall, caioFront],
    animations: {
      run: { frames: [0, 1, 2, 3], frameRate: 12, repeat: -1 },
      fall: { frames: [4], frameRate: 1, repeat: 0 },
      board: { frames: [1, 3], frameRate: 6, repeat: -1 },
      front: { frames: [5], frameRate: 1, repeat: 0 },
    },
  },
  aviao: { frameWidth: 160, frameHeight: 88, frames: [plane], doorHeight: PLANE_DOOR_HEIGHT },
  jornalista: {
    frameWidth: PERSON.width,
    frameHeight: PERSON.height,
    frames: [reporter(false), reporter(true)],
    animations: { idle: { frames: [0, 1], frameRate: 3, repeat: -1 } },
  },
  guarda: {
    frameWidth: PERSON.width,
    frameHeight: PERSON.height,
    frames: [guard(false), guard(true)],
    animations: { idle: { frames: [0, 1], frameRate: 2, repeat: -1 } },
  },
  cone: { city: 'brasilia', ...LOW, frames: [cones] },
  faixa: { city: 'brasilia', ...HIGH, frames: [banner] },
  tapume: { city: 'brasilia', ...HIGH, frames: [hoarding] },
  'carro-oficial': { city: 'brasilia', frameWidth: 44, frameHeight: 36, frames: [officialCar] },
  'margem-brasilia': {
    city: 'brasilia',
    ...SIDE,
    frames: [(image, x) => tree(image, x, 'G', 'g'), (image, x) => lamp(image, x, 'M')],
  },
  cerca: { city: 'assuncao', ...LOW, frames: [fence] },
  barraca: { city: 'assuncao', ...HIGH, frames: [stall] },
  moto: { city: 'assuncao', frameWidth: 24, frameHeight: 40, frames: [motorbike] },
  flamula: { city: 'assuncao', frameWidth: 16, frameHeight: 16, frames: [twice(8, 8, pennant)] },
  terere: { city: 'assuncao', frameWidth: 16, frameHeight: 16, frames: [twice(8, 8, terere)] },
  'margem-assuncao': {
    city: 'assuncao',
    ...SIDE,
    frames: [palm, (image, x) => tree(image, x, 'G', 'g')],
  },
  jornais: { city: 'buenos-aires', ...LOW, frames: [newspapers] },
  banca: { city: 'buenos-aires', ...HIGH, frames: [kioskSign] },
  bonde: { city: 'buenos-aires', frameWidth: 44, frameHeight: 60, frames: [tram] },
  'carro-70': { city: 'buenos-aires', frameWidth: 44, frameHeight: 36, frames: [seventiesCar] },
  disco: { city: 'buenos-aires', frameWidth: 16, frameHeight: 16, frames: [twice(8, 8, vinyl)] },
  'margem-buenos-aires': {
    city: 'buenos-aires',
    ...SIDE,
    frames: [(image, x) => tree(image, x, 'G', 'S'), (image, x) => lamp(image, x, 'K')],
  },
  grade: { city: 'washington', ...LOW, frames: [barricade] },
  fita: { city: 'washington', ...HIGH, frames: [tape] },
  viatura: { city: 'washington', frameWidth: 44, frameHeight: 36, frames: [patrolCar] },
  nota: { city: 'washington', frameWidth: 16, frameHeight: 16, frames: [twice(8, 8, banknote)] },
  bandeirola: {
    city: 'washington',
    frameWidth: 16,
    frameHeight: 16,
    frames: [twice(8, 8, starPennant)],
  },
  'margem-washington': {
    city: 'washington',
    ...SIDE,
    frames: [(image, x) => tree(image, x, 'G', 'g'), (image, x) => lamp(image, x, 'K')],
  },
  moeda: {
    frameWidth: 16,
    frameHeight: 16,
    frames: [coinFrame(7), coinFrame(5), coinFrame(2), coinFrame(5)],
    animations: { spin: { frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 } },
  },
  bandeira: {
    frameWidth: 32,
    frameHeight: 32,
    frames: flagFrames.map((frame) => twice(16, 16, frame)),
    animations: { idle: { frames: [0, 1], frameRate: 4, repeat: -1 } },
  },
  cartaz: { frameWidth: 32, frameHeight: 48, frames: [twice(16, 24, poster)] },
  mala: { frameWidth: 32, frameHeight: 32, frames: [twice(16, 16, moneyBag)] },
  'faixa-presidencial': { frameWidth: 32, frameHeight: 32, frames: [twice(16, 16, sash)] },
};

// ---------- Fundos (180 x 118, do céu ao horizonte; repetem na horizontal) ----------

// A pista em perspectiva é desenhada pelo jogo (src/scenes/road.js); aqui ficam as três camadas
// de paralaxe acima do horizonte: céu e monumento (far), prédios (mid) e vegetação rente (near).
const BG = { width: 180, height: 118 };
const background = () => createImage(BG.width, BG.height);

// Senoides com número inteiro de ciclos na largura, para o fundo repetir sem emenda.
const wave = (x, cycles) => Math.sin((x * cycles * 2 * Math.PI) / BG.width);

function brasiliaFar() {
  const image = background();
  image.rect(0, 0, 180, 62, 'S');
  image.rect(0, 62, 180, 56, 'L');
  image.ellipse(30, 22, 14, 4, 'W');
  image.ellipse(40, 19, 8, 4, 'W');
  image.ellipse(146, 34, 15, 4, 'W');
  image.ellipse(158, 31, 7, 3, 'W');
  // Congresso no fim do Eixo: plataforma, duas torres, cúpula e tigela invertida.
  image.rect(40, 98, 100, 6, 'C');
  image.rect(40, 103, 100, 1, 'M');
  image.rect(83, 50, 6, 48, 'C');
  image.rect(91, 50, 6, 48, 'C');
  image.rect(88, 50, 1, 48, 'M');
  image.rect(96, 50, 1, 48, 'M');
  image.rect(83, 68, 14, 3, 'C');
  image.halfDisc(62, 97, 11, 'C', 'top');
  image.rect(51, 97, 23, 1, 'M');
  image.halfDisc(118, 86, 13, 'C', 'bottom');
  image.rect(105, 86, 27, 1, 'W');
  image.rect(115, 96, 6, 2, 'M');
  image.rect(0, 104, 180, 14, 'G');
  return image;
}

// Blocos da Esplanada dos Ministérios, dos dois lados do Eixo.
function brasiliaMid() {
  const image = background();
  for (const x of [2, 30, 128, 156]) {
    image.rect(x, 84, 22, 26, 'C');
    image.rect(x, 84, 22, 1, 'W');
    image.rect(x + 21, 84, 1, 26, 'M');
    for (let y = 87; y < 108; y += 3) image.rect(x + 2, y, 18, 1, 'M');
  }
  image.rect(0, 110, 180, 8, 'G');
  return image;
}

function brasiliaNear() {
  const image = background();
  image.rect(0, 113, 180, 5, 'g');
  for (const x of [14, 46, 134, 166]) {
    image.ellipse(x, 108, 7, 6, 'G');
    image.ellipse(x - 2, 106, 4, 3, 'g');
  }
  return image;
}

function assuncaoFar() {
  const image = background();
  image.rect(0, 0, 180, 56, 'S');
  image.rect(0, 56, 180, 34, 'L');
  image.ellipse(140, 32, 10, 10, 'Y'); // sol da tarde
  image.ellipse(50, 20, 18, 3, 'L');
  image.ellipse(64, 17, 8, 3, 'L');
  // Morros do outro lado do rio.
  for (let x = 0; x < 180; x += 1) {
    const height = Math.round(7 + 4 * wave(x, 2) + 2 * wave(x, 5));
    image.rect(x, 90 - height, 1, height, 'G');
  }
  // Rio com reflexos e margem de areia.
  image.rect(0, 90, 180, 14, 'B');
  image.rect(0, 90, 180, 1, 'N');
  const random = rng(11);
  for (let i = 0; i < 24; i += 1) {
    image.rect(Math.floor(random() * 176), 92 + Math.floor(random() * 10), 4, 1, 'L');
  }
  image.rect(0, 104, 180, 14, 'C');
  return image;
}

// Casario colonial de paredes claras e telhado de barro.
function assuncaoMid() {
  const image = background();
  for (const x of [4, 130]) {
    image.rect(x, 86, 46, 26, 'C');
    image.rect(x - 2, 81, 50, 1, 'H');
    image.rect(x - 2, 82, 50, 4, 'O');
    image.rect(x - 2, 86, 50, 1, 'H');
    for (const dx of [5, 19, 33]) {
      image.rect(x + dx, 91, 8, 12, 'H');
      image.rect(x + dx + 1, 92, 6, 10, 'N');
      image.rect(x + dx + 1, 97, 6, 1, 'H');
    }
  }
  image.rect(0, 112, 180, 6, 'A');
  image.rect(0, 112, 180, 1, 'H');
  return image;
}

function assuncaoNear() {
  const image = background();
  image.rect(0, 114, 180, 4, 'g');
  for (const x of [20, 58, 122, 160]) {
    image.ellipse(x, 110, 8, 5, 'G');
    image.ellipse(x + 2, 109, 4, 2, 'g');
  }
  return image;
}

// Céu lilás, prédios ao longe e o obelisco no fim da avenida.
function buenosAiresFar() {
  const image = background();
  image.rect(0, 0, 180, 60, 'S');
  image.rect(0, 60, 180, 44, 'L');
  image.ellipse(40, 24, 18, 3, 'L');
  image.ellipse(140, 16, 14, 3, 'L');
  const random = rng(23);
  for (let x = 0; x < 180; x += 10) {
    const height = 8 + Math.floor(random() * 14);
    image.rect(x, 104 - height, 9, height, 'M');
  }
  for (let j = 0; j < 5; j += 1) image.rect(90 - j, 29 + j, 1 + 2 * j, 1, 'C');
  image.rect(86, 34, 9, 70, 'C');
  image.rect(92, 30, 1, 74, 'M'); // lado na sombra
  image.rect(89, 38, 2, 3, 'K'); // janelinha
  image.rect(0, 104, 180, 14, 'g');
  return image;
}

// Prédios de estilo europeu, com mansardas e sacadas, dos dois lados da avenida.
function buenosAiresMid() {
  const image = background();
  for (const x of [-6, 126]) {
    image.rect(x, 68, 60, 44, 'C');
    image.rect(x + 2, 56, 56, 8, 'N');
    image.halfDisc(x + 30, 56, 8, 'N', 'top');
    image.rect(x + 29, 45, 2, 4, 'K');
    image.rect(x - 2, 64, 64, 4, 'M');
    for (let wx = x + 6; wx < x + 56; wx += 9) image.rect(wx, 58, 3, 3, 'L');
    for (let wy = 72; wy < 108; wy += 9) {
      for (let wx = x + 5; wx < x + 56; wx += 9) {
        image.rect(wx, wy, 5, 6, 'B');
        image.rect(wx - 1, wy + 6, 7, 1, 'K'); // sacada
      }
    }
  }
  image.rect(0, 112, 180, 6, 'A');
  return image;
}

// Copas de jacarandás floridos.
function buenosAiresNear() {
  const image = background();
  image.rect(0, 114, 180, 4, 'g');
  for (const x of [18, 52, 128, 162]) {
    image.ellipse(x, 108, 10, 7, 'G');
    image.ellipse(x - 3, 106, 5, 3, 'S');
    image.ellipse(x + 4, 110, 3, 2, 'L');
  }
  return image;
}

// Noite estrelada e a cúpula estilizada sobre um prédio de colunas.
function washingtonFar() {
  const image = background();
  image.rect(0, 0, 180, 88, 'S');
  image.rect(0, 88, 180, 16, 'N');
  const random = rng(31);
  for (let i = 0; i < 40; i += 1) {
    image.set(Math.floor(random() * 180), Math.floor(random() * 78), random() < 0.3 ? 'Y' : 'W');
  }
  image.ellipse(150, 22, 7, 7, 'C'); // lua minguante
  image.ellipse(153, 20, 6, 6, 'S');
  image.rect(40, 86, 100, 18, 'C');
  for (let x = 44; x < 138; x += 6) image.rect(x, 89, 2, 13, 'L');
  for (let x = 47; x < 138; x += 12) image.rect(x, 93, 2, 3, 'O');
  image.rect(70, 70, 40, 16, 'C');
  for (let x = 72; x < 110; x += 4) image.rect(x, 72, 1, 12, 'L');
  image.halfDisc(90, 70, 18, 'C', 'top');
  for (const y of [58, 64]) image.rect(74, y, 32, 1, 'L');
  image.rect(87, 46, 6, 6, 'C');
  image.rect(89, 42, 2, 4, 'C');
  image.rect(0, 104, 180, 14, 'G');
  return image;
}

// Prédios do governo com frontão e colunas e janelas acesas, dos dois lados da avenida.
function washingtonMid() {
  const image = background();
  for (const x of [-4, 132]) {
    for (let j = 0; j < 8; j += 1) image.rect(x + 26 - j * 3, 72 + j, 1 + j * 6, 1, 'L');
    image.rect(x, 80, 52, 28, 'L');
    for (let column = x + 3; column < x + 50; column += 7) {
      image.rect(column, 82, 2, 26, 'C');
      if (column + 3 < x + 50) image.rect(column + 3, 86, 2, 4, 'O');
    }
    image.rect(x - 2, 108, 56, 4, 'C');
  }
  image.rect(0, 112, 180, 6, 'A');
  return image;
}

// Sebes e um hidrante na calçada.
function washingtonNear() {
  const image = background();
  image.rect(0, 114, 180, 4, 'M');
  image.rect(0, 114, 180, 1, 'C');
  for (const x of [16, 50, 130, 164]) image.ellipse(x, 110, 9, 5, 'G');
  image.rect(70, 109, 4, 6, 'R');
  image.rect(69, 111, 6, 1, 'R');
  return image;
}

// ---------- Fonte pixelada (maiúsculas, com acentos do português e do espanhol) ----------

const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '^': ['..#..', '.#.#.', '#...#', '.....', '.....', '.....', '.....'],
  '¡': ['..#..', '.....', '..#..', '..#..', '..#..', '..#..', '..#..'],
  '¿': ['..#..', '.....', '..#..', '.#...', '#....', '#...#', '.###.'],
};
const ACCENTS = {
  acute: ['...#.', '..#..'],
  grave: ['.#...', '..#..'],
  circumflex: ['..#..', '.#.#.'],
  tilde: ['.##.#', '#.##.'],
};
const ACCENTED = {
  Á: ['A', 'acute'],
  À: ['A', 'grave'],
  Â: ['A', 'circumflex'],
  Ã: ['A', 'tilde'],
  É: ['E', 'acute'],
  Ê: ['E', 'circumflex'],
  Í: ['I', 'acute'],
  Ó: ['O', 'acute'],
  Ô: ['O', 'circumflex'],
  Õ: ['O', 'tilde'],
  Ú: ['U', 'acute'],
  Ñ: ['N', 'tilde'],
  Ç: ['C', 'cedilla'],
};

// Célula de 6 x 11: acento nas linhas 0-1, letra nas 2-8, cedilha na 9, sombra deslocada 1 px.
const FONT = { width: 6, height: 11, charsPerRow: 16 };

function glyphPixels(char) {
  if (GLYPHS[char]) return { accent: null, rows: GLYPHS[char] };
  const [base, mark] = ACCENTED[char];
  return { accent: mark, rows: GLYPHS[base] };
}

function buildFont() {
  const chars = [...Object.keys(GLYPHS), ...Object.keys(ACCENTED)].join('');
  const rowsOfCells = Math.ceil(chars.length / FONT.charsPerRow);
  const image = createImage(FONT.width * FONT.charsPerRow, FONT.height * rowsOfCells);
  [...chars].forEach((char, index) => {
    const x = (index % FONT.charsPerRow) * FONT.width;
    const y = Math.floor(index / FONT.charsPerRow) * FONT.height;
    const { accent, rows } = glyphPixels(char);
    const full = [
      ...(ACCENTS[accent] ?? ['.....', '.....']),
      ...rows,
      accent === 'cedilla' ? '..#..' : '.....',
    ];
    // Sombra primeiro, depois a letra por cima.
    image.map(x + 1, y + 1, full, { '#': 'K' });
    image.map(x, y, full, { '#': 'W' });
  });
  return { image, chars };
}

// ---------- Saída ----------

const spriteManifest = {};
for (const [key, def] of Object.entries(sprites)) {
  const image = sheet(def.frameWidth, def.frameHeight, def.frames);
  const outside = new Set(image.pixels.filter((pixel) => pixel !== '.'));
  for (const pixel of SHARED_KEYS) outside.delete(pixel);
  if (!def.city && outside.size) {
    throw new Error(`Sprite compartilhado "${key}" usa cores de cidade: ${[...outside].join('')}`);
  }
  const file = save(`sprites/${key}.png`, image, def.city);
  spriteManifest[key] = {
    file,
    frameWidth: def.frameWidth,
    frameHeight: def.frameHeight,
    frames: def.frames.length,
    ...(def.doorHeight ? { doorHeight: def.doorHeight } : {}),
    ...(def.animations ? { animations: def.animations } : {}),
  };
}
writeFileSync(
  join(ASSETS, 'sprites', 'sprites.json'),
  `${JSON.stringify(spriteManifest, null, 2)}\n`,
);

const backgrounds = {
  brasilia: { far: brasiliaFar, mid: brasiliaMid, near: brasiliaNear },
  assuncao: { far: assuncaoFar, mid: assuncaoMid, near: assuncaoNear },
  'buenos-aires': { far: buenosAiresFar, mid: buenosAiresMid, near: buenosAiresNear },
  washington: { far: washingtonFar, mid: washingtonMid, near: washingtonNear },
};
for (const [cityId, layers] of Object.entries(backgrounds)) {
  for (const [layer, draw] of Object.entries(layers)) {
    save(`backgrounds/${cityId}/${layer}.png`, draw(), cityId);
  }
}

const font = buildFont();
save('fonts/pixel-font.png', font.image);
writeFileSync(
  join(ASSETS, 'fonts', 'pixel-font.json'),
  `${JSON.stringify({ file: 'fonts/pixel-font.png', ...FONT, chars: font.chars }, null, 2)}\n`,
);

console.log('Arte provisória gerada em src/assets/.');
