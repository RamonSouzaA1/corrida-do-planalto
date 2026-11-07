// Som do jogo (FR-015): o áudio só começa depois do primeiro toque ou tecla, como os navegadores
// exigem, e a preferência de ligar ou silenciar fica guardada no aparelho (soundOn).
import { loadSave, writeSave } from './storage.js';

export const MUSIC_KEY = 'music';
const MUSIC_VOLUME = 0.5;

// sound é o gerenciador de som do Phaser (scene.sound).
export function createAudio(sound, { load = loadSave, save = writeSave } = {}) {
  let on = load().soundOn;
  let unlocked = false;
  let wantsMusic = false;
  let music = null;
  sound.mute = !on;

  const startMusic = () => {
    if (music || !wantsMusic || !unlocked) return;
    try {
      music = sound.add(MUSIC_KEY, { loop: true, volume: MUSIC_VOLUME });
      music.play();
    } catch (error) {
      // Sem a trilha o jogo continua, só sem música.
      console.warn(`Trilha sonora indisponível: ${error.message}`);
    }
  };

  return {
    get isOn() {
      return on;
    },
    // Chamado no primeiro toque ou tecla.
    unlock() {
      unlocked = true;
      startMusic();
    },
    // Pede a trilha; ela começa quando o áudio estiver liberado e não recomeça se já estiver tocando.
    playMusic() {
      wantsMusic = true;
      startMusic();
    },
    play(key) {
      if (unlocked && on) sound.play(key);
    },
    // Silenciado, nada toca; a trilha segue em silêncio e volta no ponto certo ao religar.
    toggle() {
      on = !on;
      sound.mute = !on;
      save({ ...load(), soundOn: on });
      return on;
    },
  };
}

// Libera o áudio no primeiro toque ou tecla. Devolve uma função que para de ouvir.
export function unlockOnFirstGesture(audio, target = globalThis.window) {
  const events = ['pointerdown', 'keydown'];
  const stop = () => events.forEach((type) => target.removeEventListener(type, onGesture));
  function onGesture() {
    stop();
    audio.unlock();
  }
  events.forEach((type) => target.addEventListener(type, onGesture));
  return stop;
}
