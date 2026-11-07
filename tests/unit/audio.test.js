import { describe, expect, it, vi } from 'vitest';
import { MUSIC_KEY, createAudio, unlockOnFirstGesture } from '../../src/platform/audio.js';
import { DEFAULT_SAVE } from '../../src/platform/storage.js';

// Gerenciador de som falso, com o que createAudio usa do Phaser.
function fakeSound() {
  const music = { play: vi.fn() };
  return {
    mute: false,
    music,
    add: vi.fn(() => music),
    play: vi.fn(),
  };
}

function fakeSave(initial = {}) {
  let data = { ...DEFAULT_SAVE, ...initial };
  return {
    load: () => ({ ...data }),
    save: vi.fn((next) => {
      data = { ...next };
      return true;
    }),
    get data() {
      return data;
    },
  };
}

describe('createAudio', () => {
  it('não toca nada antes do primeiro toque ou tecla', () => {
    const sound = fakeSound();
    const audio = createAudio(sound, fakeSave());
    audio.playMusic();
    audio.play('sfx-coin');
    expect(sound.add).not.toHaveBeenCalled();
    expect(sound.play).not.toHaveBeenCalled();
  });

  it('começa a trilha em loop ao liberar o áudio, quando ela já foi pedida', () => {
    const sound = fakeSound();
    const audio = createAudio(sound, fakeSave());
    audio.playMusic();
    audio.unlock();
    expect(sound.add).toHaveBeenCalledWith(MUSIC_KEY, expect.objectContaining({ loop: true }));
    expect(sound.music.play).toHaveBeenCalledTimes(1);
  });

  it('começa a trilha quando ela é pedida depois de liberar o áudio, sem repetir', () => {
    const sound = fakeSound();
    const audio = createAudio(sound, fakeSave());
    audio.unlock();
    audio.playMusic();
    audio.playMusic();
    audio.unlock();
    expect(sound.music.play).toHaveBeenCalledTimes(1);
  });

  it('toca os efeitos só depois de liberar o áudio', () => {
    const sound = fakeSound();
    const audio = createAudio(sound, fakeSave());
    audio.unlock();
    audio.play('sfx-coin');
    expect(sound.play).toHaveBeenCalledWith('sfx-coin');
  });

  it('lê a preferência guardada: som desligado silencia tudo', () => {
    const sound = fakeSound();
    const audio = createAudio(sound, fakeSave({ soundOn: false }));
    expect(audio.isOn).toBe(false);
    expect(sound.mute).toBe(true);
    audio.unlock();
    audio.play('sfx-coin');
    expect(sound.play).not.toHaveBeenCalled();
  });

  it('o botão de silenciar alterna o som e guarda a preferência', () => {
    const sound = fakeSound();
    const store = fakeSave();
    const audio = createAudio(sound, store);
    expect(audio.isOn).toBe(true);
    expect(sound.mute).toBe(false);

    expect(audio.toggle()).toBe(false);
    expect(sound.mute).toBe(true);
    expect(store.data.soundOn).toBe(false);

    expect(audio.toggle()).toBe(true);
    expect(sound.mute).toBe(false);
    expect(store.data.soundOn).toBe(true);
  });

  it('mantém os outros dados do progresso ao guardar a preferência', () => {
    const store = fakeSave({ bestScore: 900, cityReached: 'assuncao', lives: 2 });
    createAudio(fakeSound(), store).toggle();
    expect(store.data).toEqual({
      ...DEFAULT_SAVE,
      bestScore: 900,
      cityReached: 'assuncao',
      lives: 2,
      soundOn: false,
    });
  });

  it('segue sem som se a trilha não estiver carregada', () => {
    const sound = fakeSound();
    sound.add = vi.fn(() => {
      throw new Error('Audio key "music" missing from cache');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const audio = createAudio(sound, fakeSave());
    audio.playMusic();
    expect(() => audio.unlock()).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('unlockOnFirstGesture', () => {
  it('libera o áudio no primeiro toque ou tecla e para de ouvir', () => {
    const target = new EventTarget();
    const audio = { unlock: vi.fn() };
    unlockOnFirstGesture(audio, target);

    target.dispatchEvent(new Event('keydown'));
    target.dispatchEvent(new Event('pointerdown'));
    expect(audio.unlock).toHaveBeenCalledTimes(1);
  });

  it('pode ser desligada antes de qualquer gesto', () => {
    const target = new EventTarget();
    const audio = { unlock: vi.fn() };
    const stop = unlockOnFirstGesture(audio, target);
    stop();
    target.dispatchEvent(new Event('keydown'));
    expect(audio.unlock).not.toHaveBeenCalled();
  });
});
