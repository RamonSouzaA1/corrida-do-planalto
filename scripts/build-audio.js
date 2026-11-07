// Gera a trilha sonora chiptune e os efeitos sonoros em src/assets/audio/, em WAV (mono, 16 bits,
// 22050 Hz). Tudo é sintetizado aqui, com ondas quadradas, triangulares e ruído, como nos
// consoles de 8 e 16 bits, e a composição é original. Uso: npm run audio
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'audio');
const RATE = 22050;

// ---------- Ondas ----------

const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const square = (phase, duty) => (phase % 1 < duty ? 1 : -1);
const triangle = (phase) => 1 - 4 * Math.abs((phase % 1) - 0.5);

// Ruído repetível: a mesma semente gera sempre o mesmo arquivo.
function createNoise(seed = 12345) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 31 - 1;
  };
}

// Soma o som de uma voz em buffer, a partir de startSeconds. voice(t, progress) devolve a amostra
// no instante t da nota (em segundos) e progress de 0 a 1; a nota tem entrada e saída curtas
// para não estalar.
function addVoice(buffer, startSeconds, durationSeconds, gain, voice) {
  const start = Math.round(startSeconds * RATE);
  const length = Math.round(durationSeconds * RATE);
  const fade = Math.min(length / 2, Math.round(0.004 * RATE));
  for (let i = 0; i < length && start + i < buffer.length; i += 1) {
    const edge = Math.min(1, i / fade, (length - i) / fade);
    buffer[start + i] += gain * edge * voice(i / RATE, i / length);
  }
}

const tone = (hz, wave) => (t, progress) => wave(hz * t, progress);

// Escreve um WAV PCM mono de 16 bits, limitando as amostras para evitar distorção.
function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, i) => {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), Buffer.concat([header, data]));
}

// ---------- Trilha: loop de 8 compassos em lá menor ----------

const BPM = 150;
const STEP = 60 / BPM / 4; // semicolcheia
const STEPS_PER_BAR = 16;

// Raiz (nota MIDI da região grave) e tipo de cada compasso: Am F C G | Am F G Am.
const BARS = [
  [45, 'min'],
  [41, 'maj'],
  [48, 'maj'],
  [43, 'maj'],
  [45, 'min'],
  [41, 'maj'],
  [43, 'maj'],
  [45, 'min'],
];
const CHORDS = { min: [0, 3, 7], maj: [0, 4, 7] };
// Arpejo da melodia: índice do acorde (3 = a oitava acima) em cada semicolcheia do compasso.
const ARP = [0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 1, 3, 2];
// Na segunda metade do loop, o arpejo sobe uma oitava nos tempos fortes.
const ACCENT = [0, 4, 8, 12];

function buildMusic() {
  const total = BARS.length * STEPS_PER_BAR;
  const buffer = new Float32Array(Math.round(total * STEP * RATE));
  const noise = createNoise();

  BARS.forEach(([root, kind], bar) => {
    const tones = CHORDS[kind];
    for (let step = 0; step < STEPS_PER_BAR; step += 1) {
      const t0 = (bar * STEPS_PER_BAR + step) * STEP;

      // Melodia: onda quadrada de 25%, decaindo a cada nota.
      const index = ARP[step];
      let midi = root + 24 + (index === 3 ? 12 : tones[index]);
      if (bar >= 4 && ACCENT.includes(step)) midi += 12;
      addVoice(
        buffer,
        t0,
        STEP * 0.9,
        0.16,
        (t, p) => tone(midiToHz(midi), (ph) => square(ph, 0.25))(t, p) * (1 - p * 0.6),
      );

      // Baixo: onda triangular em colcheias, alternando a raiz e a oitava.
      if (step % 2 === 0) {
        const bass = root + (step % 4 === 2 ? 12 : 0);
        addVoice(
          buffer,
          t0,
          STEP * 1.9,
          0.3,
          tone(midiToHz(bass), (ph) => triangle(ph)),
        );
      }

      // Bateria: bumbo nos tempos 1 e 3, caixa nos 2 e 4, chimbal nos contratempos.
      if (step % 8 === 0) {
        addVoice(buffer, t0, 0.12, 0.35, (t) => triangle(t * (140 - 900 * t)));
      } else if (step % 8 === 4) {
        addVoice(buffer, t0, 0.1, 0.2, (t, p) => noise() * (1 - p));
      } else if (step % 4 === 2) {
        addVoice(buffer, t0, 0.03, 0.08, (t, p) => noise() * (1 - p));
      }
    }
  });
  return buffer;
}

// ---------- Efeitos ----------

// Varredura de frequência de fromHz a toHz em onda quadrada, com decaimento.
function sweep(seconds, fromHz, toHz, gain) {
  const buffer = new Float32Array(Math.round(seconds * RATE));
  let phase = 0;
  addVoice(buffer, 0, seconds, gain, (t, p) => {
    phase += (fromHz + (toHz - fromHz) * p) / RATE;
    return square(phase, 0.5) * (1 - p);
  });
  return buffer;
}

// Sequência de notas, uma depois da outra.
function arpeggio(midis, noteSeconds, gain) {
  const buffer = new Float32Array(Math.round(midis.length * noteSeconds * RATE));
  midis.forEach((midi, i) => {
    addVoice(
      buffer,
      i * noteSeconds,
      noteSeconds,
      gain,
      (t, p) => tone(midiToHz(midi), (ph) => square(ph, 0.5))(t, p) * (1 - p * 0.5),
    );
  });
  return buffer;
}

function hit() {
  const buffer = new Float32Array(Math.round(0.3 * RATE));
  const noise = createNoise(7);
  let held = 0;
  addVoice(buffer, 0, 0.3, 0.55, (t, p) => {
    // Ruído com a taxa de renovação caindo: o estrondo vai ficando grave.
    if (
      Math.floor(t * (9000 * (1 - p) + 600)) !== Math.floor((t - 1 / RATE) * (9000 * (1 - p) + 600))
    ) {
      held = noise();
    }
    return held * (1 - p) ** 1.5;
  });
  return buffer;
}

mkdirSync(OUT, { recursive: true });
writeWav('music.wav', buildMusic());
writeWav('sfx-jump.wav', sweep(0.16, 320, 760, 0.35));
writeWav('sfx-coin.wav', arpeggio([83, 88], 0.07, 0.3));
writeWav('sfx-hit.wav', hit());
writeWav('sfx-powerup.wav', arpeggio([72, 76, 79, 84], 0.06, 0.3));
writeWav('sfx-extralife.wav', arpeggio([67, 72, 76, 79, 84, 88], 0.08, 0.3));
console.log('Áudio gerado em src/assets/audio/.');
