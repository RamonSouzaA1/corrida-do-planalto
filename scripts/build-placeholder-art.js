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

const mirror = (rows) => rows.map((row) => [...row].reverse().join(''));

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

// ---------- Sprites ----------

// Chico de perfil, correndo para a direita. Cabeça e tronco fixos; pernas e braços por quadro.
const CHICO_HEAD = [
  '......KKKK......',
  '.....KHHHHK.....',
  '....KHHHHHHK....',
  '....KHHPPPPK....',
  '....KHPPPKPK....',
  '....KPPPPPPK....',
  '.....KPPPPK.....',
  '......KPPK......',
  '.....KggggK.....',
  '....KggggggK....',
  '....KggggggK....',
  '....KggggggK....',
  '....KggggggK....',
  '....KBBBBBBK....',
  '....KBBBBBBK....',
];
const CHICO_LEGS = [
  [
    '...KBBK..KBBK...',
    '...KBK....KBK...',
    '..KBK......KBK..',
    '..KBK......KBK..',
    '.KBK........KBK.',
    '.KBK........KBK.',
    '.KBK........KBKK',
    'KKKK........KKKK',
    '................',
  ],
  [
    '....KBBBBBBK....',
    '....KBBKKBBK....',
    '....KBK.KBBK....',
    '....KBK..KBBK...',
    '....KBK...KBK...',
    '....KBK..KKK....',
    '....KBK.........',
    '...KKKK.........',
    '................',
  ],
  [
    '...KBBK..KBBK...',
    '..KBBK....KBK...',
    '..KBK.....KBK...',
    '.KBK.......KBK..',
    '.KBK.......KBK..',
    'KBK.........KBK.',
    'KK..........KBKK',
    '............KKKK',
    '................',
  ],
  [
    '....KBBBBBBK....',
    '....KBBKKBBK....',
    '...KBBK.KBK.....',
    '..KBBK..KBK.....',
    '..KBK...KBK.....',
    '...KKK..KBK.....',
    '........KBK.....',
    '........KKKK....',
    '................',
  ],
];
const ARM_FORWARD = [
  [11, 9, 'g'],
  [12, 10, 'P'],
  [13, 10, 'P'],
];
const ARM_BACK = [
  [4, 9, 'g'],
  [3, 10, 'P'],
  [3, 11, 'P'],
];
const ARMS_UP = [
  [11, 8, 'g'],
  [12, 7, 'P'],
  [12, 6, 'P'],
  [4, 8, 'g'],
  [3, 7, 'P'],
  [3, 6, 'P'],
];
// As pernas ocupam as linhas 16 a 23; o pé fica na última linha do quadro.
const chicoRun = (legs, arm) => (image, x) => {
  image.map(x, 0, [...CHICO_HEAD, '....KBBBBBBK....']);
  image.map(x, 16, legs.slice(0, 8));
  image.points(x, 0, arm);
};
const chicoJump = (image, x) => {
  image.map(x, 0, CHICO_HEAD);
  image.map(x, 15, [
    '...KBBBBBBBBK...',
    '..KBBK...KBBK...',
    '..KBK.....KBBK..',
    '...KKK.....KKK..',
  ]);
  image.points(x, 0, ARMS_UP);
};
const chicoSlide = (image, x) => {
  image.map(x, 15, [
    '..KKKK..........',
    '.KHHHHK.........',
    'KHHPPPPK........',
    'KHPPPKPK..KKKK..',
    '.KPPPPKKggggBBKK',
    '..KKKKgggggBBBBK',
    '....KggggKBBBBBK',
    '.....KKKKKKKBBBK',
    '...........KKKKK',
    '................',
    '................',
  ]);
};

// Pessoa parada, de frente para Chico (olhando para a esquerda). h cabelo, f pele, s camisa,
// p calça.
const PERSON = mirror([
  '......KKKK......',
  '.....KhhhhK.....',
  '....KhhhhhhK....',
  '....KhhffffK....',
  '....KffffKfK....',
  '....KffffffK....',
  '.....KffffK.....',
  '......KffK......',
  '.....KssssK.....',
  '....KssssssK....',
  '...KsKssssKsK...',
  '...KsKssssKsK...',
  '...KfKssssKfK...',
  '....KppppppK....',
  '....KppppppK....',
  '....KppKKppK....',
  '....KpK..KpK....',
  '....KpK..KpK....',
  '....KpK..KpK....',
  '....KpK..KpK....',
  '....KpK..KpK....',
  '....KpK..KpK....',
  '....KKK..KKK....',
  '...KKKK..KKKK...',
]);
const person = (colors, extra) => (image, x) => {
  image.map(x, 0, PERSON, colors);
  image.points(x, 0, extra);
};
// Jornalista com microfone: abaixado e levantado.
const MIC_DOWN = [
  [2, 12, 'K'],
  [2, 11, 'K'],
  [2, 10, 'R'],
  [1, 10, 'R'],
];
const MIC_UP = [
  [2, 12, 'P'],
  [2, 11, '.'],
  [2, 10, 'K'],
  [2, 9, 'K'],
  [2, 8, 'R'],
  [1, 8, 'R'],
];
// Guarda de óculos escuros, com o braço aberto no segundo quadro.
const SUNGLASSES = [
  [4, 4, 'K'],
  [5, 4, 'K'],
  [6, 4, 'K'],
];
const ARM_OUT = [
  [3, 10, '.'],
  [3, 11, '.'],
  [3, 12, '.'],
  [2, 10, 'N'],
  [1, 10, 'N'],
  [0, 10, 'P'],
  [2, 9, 'K'],
  [1, 9, 'K'],
  [2, 11, 'K'],
  [1, 11, 'K'],
];

const cone = (image) => {
  image.map(0, 0, [
    '................',
    '................',
    '.......KK.......',
    '......KOOK......',
    '......KOOK......',
    '.....KOOOOK.....',
    '.....KWWWWK.....',
    '....KWWWWWWK....',
    '....KOOOOOOK....',
    '...KOOOOOOOOK...',
    '...KOOOOOOOOK...',
    '..KWWWWWWWWWWK..',
    '..KOOOOOOOOOOK..',
    '.KKKKKKKKKKKKKK.',
    '.KMMMMMMMMMMMMK.',
    '.KKKKKKKKKKKKKK.',
  ]);
};

// Faixa de protesto entre dois postes; Chico passa por baixo deslizando.
const banner = (image) => {
  image.rect(0, 0, 2, 32, 'K');
  image.rect(14, 0, 2, 32, 'K');
  image.rect(0, 0, 1, 32, 'M');
  image.rect(15, 0, 1, 32, 'M');
  image.rect(2, 6, 12, 14, 'W');
  image.rect(2, 6, 12, 1, 'K');
  image.rect(2, 19, 12, 1, 'K');
  image.rect(3, 9, 10, 2, 'R');
  image.rect(3, 13, 7, 2, 'B');
  image.rect(3, 16, 9, 1, 'R');
};

// Tapume de obra suspenso sobre cavaletes.
const hoarding = (image) => {
  image.rect(1, 18, 2, 14, 'M');
  image.rect(13, 18, 2, 14, 'M');
  image.rect(0, 4, 16, 16, 'K');
  image.rect(1, 5, 14, 14, 'H');
  for (let i = 0; i < 14; i += 4) image.rect(1 + i, 5, 2, 14, 'O');
  image.rect(1, 11, 14, 2, 'Y');
};

const officialCar = (image) => {
  image.map(0, 0, [
    '................................',
    '.........KKKKKKKKKKKK...........',
    '........KNLLLLKNLLLLLK..........',
    '.......KNLLLLLKNLLLLLLK.........',
    '......KNNLLLLLKNLLLLLLLK........',
    '...KKKNNNNNNNNNNNNNNNNNNKKKKK...',
    '..KNNNNNNNNNNNNNNNNNNNNNNNNNNK..',
    '.KYNNNNNNNNNNNNNNNNNNNNNNNNNNRK.',
    '.KNNNNNNNNNNNNNNNNNNNNNNNNNNNNK.',
    '.KNNNNNNNNNNNNNNNNNNNNNNNNNNNNK.',
    '.KMMMMMMMMMMMMMMMMMMMMMMMMMMMMK.',
    '..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..',
    '....KKKK..............KKKK......',
    '...KKMMKK............KKMMKK.....',
    '....KKKK..............KKKK......',
    '................................',
  ]);
};

const coinFrames = [
  (image, x) =>
    image.map(x, 0, [
      '..KKKK..',
      '.KYYYYK.',
      'KYWYYYYK',
      'KYWYYHYK',
      'KYYYYHYK',
      'KYYYYHYK',
      '.KYHHYK.',
      '..KKKK..',
    ]),
  (image, x) =>
    image.map(x, 0, [
      '...KK...',
      '..KYYK..',
      '..KWYK..',
      '..KWYK..',
      '..KYHK..',
      '..KYHK..',
      '..KYHK..',
      '...KK...',
    ]),
];

// ---------- Power-ups ----------

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

// Caio Herdeiro: mesmo corpo de Chico, com cabelo loiro, terno cinza e calça preta.
const CAIO_COLORS = { H: 'Y', g: 'M', B: 'K' };
const recolor = (list) => list.map(([i, j, key]) => [i, j, CAIO_COLORS[key] ?? key]);
const caioRun = (legs, arm) => (image, x) => {
  image.map(x, 0, [...CHICO_HEAD, '....KBBBBBBK....'], CAIO_COLORS);
  image.map(x, 16, legs.slice(0, 8), CAIO_COLORS);
  image.points(x, 0, [...recolor(arm), [7, 9, 'R'], [7, 10, 'R']]);
};
// Caído de costas, depois de tropeçar (usado pela mala de dinheiro).
const caioFall = (image, x) => {
  image.map(x, 14, [
    '..........KKKK..',
    '.........KYYYYK.',
    '..KKKKKKKYYPPPK.',
    '.KKKMMMMMKPPKPK.',
    'KKKKMMRMMKPPPPK.',
    '.KKKMMMMMKKPPK..',
    '..KKKKKKKK.KK...',
    '................',
    '..P.......P.....',
    '................',
  ]);
};
// De costas, subindo a escada do avião.
const caioBoard = (image, x) => {
  image.map(x, 0, [
    '......KKKK......',
    '.....KYYYYK.....',
    '....KYYYYYYK....',
    '....KYYYYYYK....',
    '....KYYYYYYK....',
    '....KYYYYYYK....',
    '.....KYYYYK.....',
    '......KPPK......',
    '.....KMMMMK.....',
    '...KKMMMMMMKK...',
    '..KPKMMMMMMKPK..',
    '..KPKMMMMMMKPK..',
    '....KMMMMMMK....',
    '....KKKKKKKK....',
    '....KKKKKKKK....',
    '....KKKKKKKK....',
    '....KKK..KKK....',
    '....KKK..KKK....',
    '....KKK..KKK....',
    '....KKK.KKK.....',
    '....KKK.KKK.....',
    '...KKKK.KKKK....',
    '................',
    '................',
  ]);
};

// Avião de perfil, virado para a direita, com a porta e a escada de embarque atrás da asa.
const plane = (image) => {
  // Leme: triângulo em degraus que sai do topo da fuselagem.
  for (let j = 0; j < 10; j += 1)
    image.rect(3 + Math.floor(j / 2), 3 + j, 9 - Math.floor(j / 2), 1, 'B');
  image.rect(3, 2, 6, 1, 'K');
  // Fuselagem: cauda afinando à esquerda, corpo reto e nariz arredondado à direita.
  image.rect(4, 12, 54, 9, 'K');
  image.rect(5, 13, 53, 7, 'W');
  image.ellipse(57, 16, 6, 4, 'K');
  image.ellipse(57, 16, 5, 3, 'W');
  image.rect(5, 18, 58, 1, 'B'); // faixa azul
  image.rect(5, 19, 58, 1, 'N');
  for (let x = 24; x < 52; x += 4) image.rect(x, 14, 2, 2, 'N'); // janelas
  image.rect(56, 14, 4, 2, 'N'); // cabine
  image.rect(15, 13, 4, 7, 'K'); // porta aberta
  image.rect(16, 14, 2, 6, 'N');
  image.rect(30, 20, 18, 2, 'M'); // asa
  image.rect(30, 22, 18, 1, 'K');
  image.rect(26, 21, 2, 8, 'M'); // trem de pouso
  image.rect(50, 21, 2, 8, 'M');
  image.rect(25, 28, 4, 4, 'K');
  image.rect(49, 28, 4, 4, 'K');
  // Escada de embarque, do chão até a porta.
  for (let step = 0; step < 6; step += 1) image.rect(4 + step * 2, 31 - step * 2, 4, 1, 'W');
  image.rect(3, 31, 1, 1, 'M');
};

// ---------- Obstáculos e coletáveis de Assunção, Buenos Aires e Washington ----------

// Carro de perfil, virado para a direita, com as rodas na última linha do quadro de 16 px.
function car(image, x, y, body, extra = []) {
  image.rect(x + 8, y, 15, 4, 'K');
  image.rect(x + 9, y + 1, 6, 2, 'L');
  image.rect(x + 16, y + 1, 6, 2, 'L');
  image.rect(x + 1, y + 4, 30, 5, 'K');
  image.rect(x + 2, y + 5, 28, 3, body);
  for (const wheel of [7, 24]) {
    image.ellipse(x + wheel, y + 9, 2, 2, 'K');
    image.set(x + wheel, y + 9, 'M');
  }
  image.points(x, y, extra);
}

// Dois postes com algo pendurado no alto; Chico passa por baixo deslizando.
function posts(image, key = 'M') {
  image.rect(0, 0, 2, 32, 'K');
  image.rect(14, 0, 2, 32, 'K');
  image.rect(0, 0, 1, 32, key);
  image.rect(15, 0, 1, 32, key);
}

// Assunção: cerca de madeira (pular), barraca de feira (deslizar sob o toldo), moto (desviar).
const fence = (image) => {
  for (const x of [1, 12]) {
    image.rect(x, 3, 3, 13, 'K');
    image.rect(x + 1, 3, 1, 12, 'H');
  }
  for (const y of [5, 10]) {
    image.rect(0, y, 16, 3, 'K');
    image.rect(0, y + 1, 16, 1, 'C');
  }
};

const stall = (image) => {
  image.rect(1, 8, 1, 24, 'K');
  image.rect(14, 8, 1, 24, 'K');
  image.rect(0, 7, 16, 10, 'K');
  for (let x = 1; x < 15; x += 1) {
    const key = Math.floor((x - 1) / 2) % 2 ? 'W' : 'O';
    image.rect(x, 8, 1, 8, key);
    if (x % 2) image.set(x, 17, key);
  }
  image.points(0, 0, [
    [4, 17, 'K'],
    [4, 18, 'Y'],
    [4, 19, 'Y'],
    [8, 17, 'K'],
    [8, 18, 'g'],
    [8, 19, 'g'],
    [11, 17, 'K'],
    [11, 18, 'R'],
    [11, 19, 'R'],
  ]);
};

const motorbike = (image) => {
  for (const wheel of [7, 24]) {
    image.ellipse(wheel, 12, 3, 3, 'K');
    image.ellipse(wheel, 12, 1, 1, 'M');
  }
  image.rect(4, 10, 6, 1, 'M'); // escapamento
  image.rect(9, 8, 13, 3, 'R');
  image.rect(13, 5, 7, 3, 'R'); // tanque
  image.rect(8, 6, 6, 2, 'K'); // banco
  image.points(0, 0, [
    [23, 11, 'M'],
    [23, 10, 'M'],
    [22, 9, 'M'],
    [22, 8, 'M'],
    [21, 7, 'M'],
    [21, 6, 'M'],
    [21, 5, 'M'],
    [24, 6, 'Y'],
    [24, 7, 'Y'],
  ]);
  image.rect(19, 4, 4, 1, 'K'); // guidão
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

// Buenos Aires: pacotes de jornais (pular), letreiro da banca (deslizar), bonde e carro dos anos 70.
const newspapers = (image) => {
  image.rect(1, 9, 14, 6, 'K');
  image.rect(2, 10, 12, 4, 'W');
  image.rect(3, 11, 9, 1, 'M');
  image.rect(3, 13, 7, 1, 'M');
  image.rect(8, 9, 1, 6, 'R');
  image.rect(3, 4, 11, 6, 'K');
  image.rect(4, 5, 9, 4, 'C');
  image.rect(5, 6, 6, 1, 'M');
  image.rect(8, 4, 1, 6, 'R');
  image.rect(0, 15, 16, 1, 'K');
};

const kioskSign = (image) => {
  posts(image);
  image.rect(2, 5, 12, 9, 'K');
  image.rect(3, 6, 10, 7, 'G');
  image.rect(4, 7, 8, 1, 'Y');
  image.rect(4, 9, 6, 1, 'W');
  image.rect(4, 11, 7, 1, 'W');
  for (let x = 2; x < 14; x += 1) image.rect(x, 14, 1, 5, Math.floor(x / 2) % 2 ? 'W' : 'O');
  image.rect(2, 19, 12, 1, 'K');
};

const tram = (image) => {
  image.points(0, 0, [
    [13, 0, 'K'],
    [14, 1, 'K'],
  ]);
  image.rect(2, 1, 28, 2, 'K');
  image.rect(3, 2, 26, 1, 'C');
  image.rect(1, 3, 30, 10, 'K');
  image.rect(2, 4, 28, 8, 'O');
  for (let x = 4; x < 28; x += 6) image.rect(x, 5, 4, 3, 'L');
  image.rect(2, 9, 28, 1, 'W');
  image.rect(2, 10, 28, 2, 'C');
  for (const wheel of [8, 23]) image.ellipse(wheel, 13, 2, 2, 'K');
  image.rect(0, 15, 32, 1, 'M'); // trilho
};

const seventiesCar = (image) =>
  car(image, 0, 4, 'G', [
    [0, 5, 'C'],
    [0, 6, 'C'],
    [31, 5, 'C'],
    [31, 6, 'C'],
    [29, 5, 'Y'],
    [2, 5, 'R'],
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

// Washington: grade de metal (pular), fita de isolamento (deslizar), viatura (desviar).
const barricade = (image) => {
  image.rect(0, 3, 16, 2, 'K');
  image.rect(0, 3, 16, 1, 'C');
  for (let x = 1; x < 16; x += 3) image.rect(x, 5, 1, 7, 'M');
  image.rect(0, 11, 16, 1, 'C');
  image.rect(0, 12, 16, 1, 'K');
  image.rect(1, 12, 1, 3, 'M');
  image.rect(14, 12, 1, 3, 'M');
  image.rect(0, 15, 4, 1, 'K');
  image.rect(12, 15, 4, 1, 'K');
};

const tape = (image) => {
  posts(image);
  for (const y of [8, 15]) {
    for (let x = 2; x < 14; x += 1) image.rect(x, y, 1, 3, Math.floor(x / 2) % 2 ? 'K' : 'Y');
  }
};

const patrolCar = (image) =>
  car(image, 0, 4, 'W', [
    [13, -1, 'R'],
    [14, -1, 'R'],
    [16, -1, 'B'],
    [17, -1, 'B'],
    [2, 5, 'N'],
    [3, 5, 'N'],
    [2, 6, 'N'],
    [3, 6, 'N'],
    [28, 5, 'N'],
    [29, 5, 'N'],
    [28, 6, 'N'],
    [29, 6, 'N'],
    [15, 6, 'Y'],
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

// Sprites sem city aparecem em várias cidades e só usam SHARED_KEYS; os outros usam a paleta da
// sua cidade.
const sprites = {
  chico: {
    frameWidth: 16,
    frameHeight: 24,
    frames: [
      chicoRun(CHICO_LEGS[0], ARM_FORWARD),
      chicoRun(CHICO_LEGS[1], []),
      chicoRun(CHICO_LEGS[2], ARM_BACK),
      chicoRun(CHICO_LEGS[3], []),
      chicoJump,
      chicoSlide,
    ],
    animations: {
      run: { frames: [0, 1, 2, 3], frameRate: 10, repeat: -1 },
      jump: { frames: [4], frameRate: 1, repeat: 0 },
      slide: { frames: [5], frameRate: 1, repeat: 0 },
    },
  },
  caio: {
    frameWidth: 16,
    frameHeight: 24,
    frames: [
      caioRun(CHICO_LEGS[0], ARM_FORWARD),
      caioRun(CHICO_LEGS[1], []),
      caioRun(CHICO_LEGS[2], ARM_BACK),
      caioRun(CHICO_LEGS[3], []),
      caioFall,
      caioBoard,
    ],
    animations: {
      run: { frames: [0, 1, 2, 3], frameRate: 12, repeat: -1 },
      fall: { frames: [4], frameRate: 1, repeat: 0 },
      board: { frames: [5], frameRate: 1, repeat: 0 },
    },
  },
  aviao: { frameWidth: 64, frameHeight: 32, frames: [plane] },
  jornalista: {
    frameWidth: 16,
    frameHeight: 24,
    frames: [
      person({ h: 'H', f: 'P', s: 'B', p: 'N' }, MIC_DOWN),
      person({ h: 'H', f: 'P', s: 'B', p: 'N' }, MIC_UP),
    ],
    animations: { idle: { frames: [0, 1], frameRate: 3, repeat: -1 } },
  },
  guarda: {
    frameWidth: 16,
    frameHeight: 24,
    frames: [
      person({ h: 'K', f: 'P', s: 'N', p: 'K' }, SUNGLASSES),
      person({ h: 'K', f: 'P', s: 'N', p: 'K' }, [...SUNGLASSES, ...ARM_OUT]),
    ],
    animations: { idle: { frames: [0, 1], frameRate: 2, repeat: -1 } },
  },
  cone: { city: 'brasilia', frameWidth: 16, frameHeight: 16, frames: [cone] },
  faixa: { city: 'brasilia', frameWidth: 16, frameHeight: 32, frames: [banner] },
  tapume: { city: 'brasilia', frameWidth: 16, frameHeight: 32, frames: [hoarding] },
  'carro-oficial': { city: 'brasilia', frameWidth: 32, frameHeight: 16, frames: [officialCar] },
  cerca: { city: 'assuncao', frameWidth: 16, frameHeight: 16, frames: [fence] },
  barraca: { city: 'assuncao', frameWidth: 16, frameHeight: 32, frames: [stall] },
  moto: { city: 'assuncao', frameWidth: 32, frameHeight: 16, frames: [motorbike] },
  flamula: { city: 'assuncao', frameWidth: 8, frameHeight: 8, frames: [pennant] },
  terere: { city: 'assuncao', frameWidth: 8, frameHeight: 8, frames: [terere] },
  jornais: { city: 'buenos-aires', frameWidth: 16, frameHeight: 16, frames: [newspapers] },
  banca: { city: 'buenos-aires', frameWidth: 16, frameHeight: 32, frames: [kioskSign] },
  bonde: { city: 'buenos-aires', frameWidth: 32, frameHeight: 16, frames: [tram] },
  'carro-70': { city: 'buenos-aires', frameWidth: 32, frameHeight: 16, frames: [seventiesCar] },
  disco: { city: 'buenos-aires', frameWidth: 8, frameHeight: 8, frames: [vinyl] },
  grade: { city: 'washington', frameWidth: 16, frameHeight: 16, frames: [barricade] },
  fita: { city: 'washington', frameWidth: 16, frameHeight: 32, frames: [tape] },
  viatura: { city: 'washington', frameWidth: 32, frameHeight: 16, frames: [patrolCar] },
  nota: { city: 'washington', frameWidth: 8, frameHeight: 8, frames: [banknote] },
  bandeirola: { city: 'washington', frameWidth: 8, frameHeight: 8, frames: [starPennant] },
  moeda: {
    frameWidth: 8,
    frameHeight: 8,
    frames: coinFrames,
    animations: { spin: { frames: [0, 1], frameRate: 6, repeat: -1 } },
  },
  bandeira: {
    frameWidth: 16,
    frameHeight: 16,
    frames: flagFrames,
    animations: { idle: { frames: [0, 1], frameRate: 4, repeat: -1 } },
  },
  cartaz: { frameWidth: 16, frameHeight: 24, frames: [poster] },
  mala: { frameWidth: 16, frameHeight: 16, frames: [moneyBag] },
  'faixa-presidencial': { frameWidth: 16, frameHeight: 16, frames: [sash] },
};

// ---------- Fundos de Brasília (320 de largura, repetem na horizontal) ----------

function brasiliaFar() {
  const image = createImage(320, 112);
  image.rect(0, 0, 320, 40, 'S');
  image.rect(0, 40, 320, 72, 'L');
  image.ellipse(40, 20, 16, 4, 'W');
  image.ellipse(52, 17, 9, 4, 'W');
  image.ellipse(250, 28, 18, 4, 'W');
  image.ellipse(270, 25, 8, 3, 'W');
  // Congresso: plataforma, duas torres, cúpula e tigela invertida.
  image.rect(90, 90, 150, 6, 'C');
  image.rect(90, 95, 150, 1, 'M');
  image.rect(155, 34, 7, 56, 'C');
  image.rect(165, 34, 7, 56, 'C');
  image.rect(161, 34, 1, 56, 'M');
  image.rect(171, 34, 1, 56, 'M');
  image.rect(155, 50, 17, 3, 'C');
  image.halfDisc(122, 89, 14, 'C', 'top');
  image.rect(108, 89, 29, 1, 'M');
  image.halfDisc(210, 74, 18, 'C', 'bottom');
  image.rect(192, 74, 37, 1, 'W');
  image.rect(205, 88, 10, 2, 'M');
  image.rect(0, 96, 320, 16, 'G');
  return image;
}

function brasiliaMid() {
  const image = createImage(320, 112);
  // Blocos da Esplanada dos Ministérios, espaçados para repetir sem emenda.
  for (let x = 4; x < 320; x += 40) {
    image.rect(x, 70, 26, 28, 'C');
    image.rect(x, 70, 26, 1, 'W');
    image.rect(x + 25, 70, 1, 28, 'M');
    for (let y = 73; y < 96; y += 3) image.rect(x + 2, y, 22, 1, 'M');
  }
  image.rect(0, 98, 320, 14, 'G');
  return image;
}

function brasiliaNear() {
  const image = createImage(320, 112);
  image.rect(0, 102, 320, 10, 'g');
  image.rect(0, 102, 320, 1, 'G');
  // Árvores do Eixo Monumental.
  for (const x of [30, 190]) {
    image.rect(x - 1, 88, 3, 14, 'H');
    image.ellipse(x, 82, 10, 8, 'G');
    image.ellipse(x - 2, 80, 6, 4, 'g');
  }
  // Postes de luz.
  for (const x of [110, 270]) {
    image.rect(x, 72, 2, 30, 'M');
    image.rect(x - 4, 72, 8, 2, 'M');
    image.rect(x - 5, 74, 3, 2, 'Y');
    image.rect(x + 3, 74, 3, 2, 'Y');
  }
  return image;
}

// Pista de três faixas: 68 px de altura, do meio-fio de cima ao de baixo.
function brasiliaTrack() {
  const image = createImage(320, 68);
  image.rect(0, 0, 320, 68, 'A');
  image.rect(0, 0, 320, 2, 'C');
  image.rect(0, 2, 320, 1, 'M');
  image.rect(0, 65, 320, 1, 'M');
  image.rect(0, 66, 320, 2, 'C');
  const random = rng(7);
  for (let i = 0; i < 260; i += 1) {
    image.set(Math.floor(random() * 320), 3 + Math.floor(random() * 62), 'M');
  }
  for (let x = 0; x < 320; x += 20) {
    image.rect(x, 22, 12, 1, 'W');
    image.rect(x, 42, 12, 1, 'W');
  }
  return image;
}

// ---------- Fundos de Assunção, Buenos Aires e Washington ----------

// Pista de 68 px com meio-fio em cima e embaixo.
function trackBase(ground, edge = 'M') {
  const image = createImage(320, 68);
  image.rect(0, 0, 320, 68, ground);
  image.rect(0, 0, 320, 2, 'C');
  image.rect(0, 2, 320, 1, edge);
  image.rect(0, 65, 320, 1, edge);
  image.rect(0, 66, 320, 2, 'C');
  return image;
}

// Divisões tracejadas entre as três faixas.
function laneLines(image, key = 'W', dash = 12, every = 20) {
  for (let x = 0; x < 320; x += every) {
    image.rect(x, 22, dash, 1, key);
    image.rect(x, 42, dash, 1, key);
  }
  return image;
}

// Senoides com número inteiro de ciclos em 320 px, para o fundo repetir sem emenda.
const wave = (x, cycles) => Math.sin((x * cycles * 2 * Math.PI) / 320);

function assuncaoFar() {
  const image = createImage(320, 112);
  image.rect(0, 0, 320, 52, 'S');
  image.rect(0, 52, 320, 30, 'L');
  image.ellipse(250, 28, 10, 10, 'Y'); // sol da tarde
  image.ellipse(90, 18, 18, 3, 'L');
  image.ellipse(104, 15, 8, 3, 'L');
  // Morros do outro lado do rio.
  for (let x = 0; x < 320; x += 1) {
    const height = Math.round(7 + 4 * wave(x, 2) + 2 * wave(x, 5));
    image.rect(x, 82 - height, 1, height, 'G');
  }
  // Rio com reflexos e margem de areia.
  image.rect(0, 82, 320, 16, 'B');
  image.rect(0, 82, 320, 1, 'N');
  const random = rng(11);
  for (let i = 0; i < 40; i += 1) {
    image.rect(Math.floor(random() * 316), 84 + Math.floor(random() * 12), 4, 1, 'L');
  }
  image.rect(0, 98, 320, 14, 'C');
  return image;
}

// Casario colonial de paredes claras e telhado de barro.
function assuncaoMid() {
  const image = createImage(320, 112);
  for (let x = 6; x < 320; x += 64) {
    image.rect(x, 74, 46, 26, 'C');
    image.rect(x - 2, 69, 50, 1, 'H');
    image.rect(x - 2, 70, 50, 4, 'O');
    image.rect(x - 2, 74, 50, 1, 'H');
    for (const dx of [5, 19, 33]) {
      image.rect(x + dx, 79, 8, 12, 'H');
      image.rect(x + dx + 1, 80, 6, 10, 'N');
      image.rect(x + dx + 1, 85, 6, 1, 'H');
    }
  }
  image.rect(0, 100, 320, 12, 'A');
  image.rect(0, 100, 320, 1, 'H');
  return image;
}

// Palmeiras na calçada.
function assuncaoNear() {
  const image = createImage(320, 112);
  image.rect(0, 102, 320, 10, 'C');
  image.rect(0, 102, 320, 1, 'H');
  for (const x of [50, 210]) {
    for (let y = 66; y < 102; y += 1) {
      const bend = Math.round(Math.sin((y - 66) / 12) * 2);
      image.rect(x + bend, y, 3, 1, y % 4 === 0 ? 'K' : 'H');
    }
    for (const [dx, dy, length] of [
      [-1, -1, 14],
      [1, -1, 14],
      [-1, 0, 16],
      [1, 0, 16],
      [-1, 1, 10],
      [1, 1, 10],
    ]) {
      for (let i = 0; i < length; i += 1) {
        const y = 66 + dy * Math.round(i / 3) + Math.round((i * i) / 40);
        image.rect(x + 1 + dx * i, y, 1, 2, i % 3 ? 'G' : 'g');
      }
    }
    image.ellipse(x + 1, 67, 2, 2, 'H'); // cocos
  }
  return image;
}

// Paralelepípedos em fileiras desencontradas.
function assuncaoTrack() {
  const image = trackBase('A', 'H');
  const random = rng(13);
  for (let row = 0, y = 3; y < 65; row += 1, y += 4) {
    image.rect(0, y, 320, 1, 'H');
    for (let x = row % 2 ? 0 : 4; x < 320; x += 8) image.rect(x, y + 1, 1, 3, 'H');
  }
  for (let i = 0; i < 120; i += 1) {
    image.set(Math.floor(random() * 320), 4 + Math.floor(random() * 60), 'C');
  }
  return laneLines(image);
}

// Céu lilás, prédios ao longe e o obelisco no meio da avenida.
function buenosAiresFar() {
  const image = createImage(320, 112);
  image.rect(0, 0, 320, 56, 'S');
  image.rect(0, 56, 320, 40, 'L');
  image.ellipse(60, 22, 20, 3, 'L');
  image.ellipse(230, 14, 14, 3, 'L');
  const random = rng(23);
  for (let x = 0; x < 320; x += 10) {
    const height = 8 + Math.floor(random() * 14);
    image.rect(x, 96 - height, 9, height, 'M');
  }
  for (let j = 0; j < 5; j += 1) image.rect(160 - j, 21 + j, 1 + 2 * j, 1, 'C');
  image.rect(156, 26, 9, 70, 'C');
  image.rect(162, 22, 1, 74, 'M'); // lado na sombra
  image.rect(159, 30, 2, 3, 'K'); // janelinha
  image.rect(0, 96, 320, 16, 'g');
  return image;
}

// Prédios de estilo europeu, com mansardas e sacadas.
function buenosAiresMid() {
  const image = createImage(320, 112);
  for (let x = 8; x < 320; x += 80) {
    image.rect(x, 56, 60, 44, 'C');
    image.rect(x + 2, 44, 56, 8, 'N');
    image.halfDisc(x + 30, 44, 8, 'N', 'top');
    image.rect(x + 29, 33, 2, 4, 'K');
    image.rect(x - 2, 52, 64, 4, 'M');
    for (let wx = x + 6; wx < x + 56; wx += 9) image.rect(wx, 46, 3, 3, 'L');
    for (let wy = 60; wy < 96; wy += 9) {
      for (let wx = x + 5; wx < x + 56; wx += 9) {
        image.rect(wx, wy, 5, 6, 'B');
        image.rect(wx - 1, wy + 6, 7, 1, 'K'); // sacada
      }
    }
  }
  image.rect(0, 100, 320, 12, 'A');
  return image;
}

// Jacarandás floridos e postes de luz.
function buenosAiresNear() {
  const image = createImage(320, 112);
  image.rect(0, 102, 320, 10, 'g');
  image.rect(0, 102, 320, 1, 'H');
  for (const x of [40, 200]) {
    image.rect(x - 1, 86, 3, 16, 'H');
    image.ellipse(x, 78, 13, 9, 'G');
    image.ellipse(x - 4, 75, 6, 4, 'S');
    image.ellipse(x + 5, 80, 4, 3, 'L');
  }
  for (const x of [120, 280]) {
    image.rect(x, 70, 2, 32, 'K');
    image.rect(x - 1, 66, 4, 1, 'K');
    image.ellipse(x + 1, 68, 2, 2, 'Y');
  }
  return image;
}

// Avenida larga, com faixa de pedestres.
function buenosAiresTrack() {
  const image = trackBase('A');
  const random = rng(29);
  for (let i = 0; i < 200; i += 1) {
    image.set(Math.floor(random() * 320), 3 + Math.floor(random() * 62), 'M');
  }
  laneLines(image, 'W', 16, 32);
  for (let y = 5; y < 64; y += 4) image.rect(280, y, 24, 2, 'W');
  return image;
}

// Noite estrelada e a cúpula estilizada sobre um prédio de colunas.
function washingtonFar() {
  const image = createImage(320, 112);
  image.rect(0, 0, 320, 80, 'S');
  image.rect(0, 80, 320, 16, 'N');
  const random = rng(31);
  for (let i = 0; i < 60; i += 1) {
    image.set(Math.floor(random() * 320), Math.floor(random() * 70), random() < 0.3 ? 'Y' : 'W');
  }
  image.ellipse(270, 20, 7, 7, 'C'); // lua minguante
  image.ellipse(273, 18, 6, 6, 'S');
  image.rect(110, 78, 100, 18, 'C');
  for (let x = 114; x < 208; x += 6) image.rect(x, 81, 2, 13, 'L');
  for (let x = 117; x < 208; x += 12) image.rect(x, 85, 2, 3, 'O');
  image.rect(140, 62, 40, 16, 'C');
  for (let x = 142; x < 180; x += 4) image.rect(x, 64, 1, 12, 'L');
  image.halfDisc(160, 62, 18, 'C', 'top');
  for (const y of [50, 56]) image.rect(144, y, 32, 1, 'L');
  image.rect(157, 38, 6, 6, 'C');
  image.rect(159, 34, 2, 4, 'C');
  image.rect(0, 96, 320, 16, 'G');
  return image;
}

// Prédios do governo com frontão e colunas, janelas acesas e árvores entre eles.
function washingtonMid() {
  const image = createImage(320, 112);
  for (let x = 4; x < 320; x += 80) {
    for (let j = 0; j < 8; j += 1) image.rect(x + 26 - j * 3, 58 + j, 1 + j * 6, 1, 'L');
    image.rect(x, 66, 52, 28, 'L');
    for (let column = x + 3; column < x + 50; column += 7) {
      image.rect(column, 68, 2, 26, 'C');
      if (column + 3 < x + 50) image.rect(column + 3, 72, 2, 4, 'O');
    }
    image.rect(x - 2, 94, 56, 4, 'C');
    image.ellipse(x + 66, 90, 5, 6, 'G');
    image.rect(x + 66, 94, 1, 6, 'H');
  }
  image.rect(0, 98, 320, 14, 'A');
  return image;
}

// Calçada com postes, táxi amarelo, viatura com a sirene acesa e hidrante.
function washingtonNear() {
  const image = createImage(320, 112);
  image.rect(0, 102, 320, 10, 'M');
  image.rect(0, 102, 320, 1, 'C');
  for (const x of [30, 230]) {
    image.rect(x, 72, 2, 30, 'K');
    image.rect(x - 3, 70, 8, 2, 'K');
    image.rect(x - 2, 72, 6, 2, 'Y');
  }
  car(image, 70, 91, 'Y', [
    [14, -1, 'O'],
    [15, -1, 'O'],
  ]);
  car(image, 130, 91, 'W', [
    [13, -1, 'R'],
    [14, -1, 'R'],
    [16, -1, 'B'],
    [17, -1, 'B'],
  ]);
  image.rect(270, 95, 4, 7, 'R');
  image.rect(269, 97, 6, 1, 'R');
  image.rect(271, 94, 2, 1, 'K');
  return image;
}

// Asfalto escuro, faixas amarelas e tampas de bueiro.
function washingtonTrack() {
  const image = trackBase('A');
  const random = rng(37);
  for (let i = 0; i < 160; i += 1) {
    image.set(Math.floor(random() * 320), 3 + Math.floor(random() * 62), 'M');
  }
  for (const [x, y] of [
    [60, 12],
    [180, 54],
    [250, 32],
  ]) {
    image.ellipse(x, y, 4, 2, 'K');
    image.ellipse(x, y, 3, 1, 'M');
  }
  return laneLines(image, 'Y');
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
    ...(def.animations ? { animations: def.animations } : {}),
  };
}
writeFileSync(
  join(ASSETS, 'sprites', 'sprites.json'),
  `${JSON.stringify(spriteManifest, null, 2)}\n`,
);

const backgrounds = {
  brasilia: { far: brasiliaFar, mid: brasiliaMid, near: brasiliaNear, track: brasiliaTrack },
  assuncao: { far: assuncaoFar, mid: assuncaoMid, near: assuncaoNear, track: assuncaoTrack },
  'buenos-aires': {
    far: buenosAiresFar,
    mid: buenosAiresMid,
    near: buenosAiresNear,
    track: buenosAiresTrack,
  },
  washington: {
    far: washingtonFar,
    mid: washingtonMid,
    near: washingtonNear,
    track: washingtonTrack,
  },
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
