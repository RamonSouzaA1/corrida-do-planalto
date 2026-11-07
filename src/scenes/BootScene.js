import * as Phaser from 'phaser';
import fontConfig from '../assets/fonts/pixel-font.json';
import spriteManifest from '../assets/sprites/sprites.json';
import cities from '../config/cities.json';
import { MUSIC_KEY, createAudio, unlockOnFirstGesture } from '../platform/audio.js';
import { FONT_KEY } from './ui.js';

export const BACKGROUND_LAYERS = ['far', 'mid', 'near', 'track'];

export const backgroundKey = (background, layer) => `bg-${background}-${layer}`;

const ASSET_URLS = import.meta.glob('../assets/**/*.{png,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
});

// Efeitos sonoros: chave usada nas cenas → arquivo em src/assets/audio/.
export const SFX = Object.freeze({
  JUMP: 'sfx-jump',
  COIN: 'sfx-coin',
  HIT: 'sfx-hit',
  POWER_UP: 'sfx-powerup',
  EXTRA_LIFE: 'sfx-extralife',
});
const assetUrl = (file) => ASSET_URLS[`../assets/${file}`];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    for (const [key, sprite] of Object.entries(spriteManifest)) {
      this.load.spritesheet(key, assetUrl(sprite.file), {
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight,
      });
    }
    for (const { background } of cities) {
      for (const layer of BACKGROUND_LAYERS) {
        const url = assetUrl(`backgrounds/${background}/${layer}.png`);
        if (url) this.load.image(backgroundKey(background, layer), url);
      }
    }
    this.load.image('pixel-font', assetUrl(fontConfig.file));
    this.load.audio(MUSIC_KEY, assetUrl('audio/music.wav'));
    for (const key of Object.values(SFX)) this.load.audio(key, assetUrl(`audio/${key}.wav`));
  }

  create() {
    this.cache.bitmapFont.add(
      FONT_KEY,
      Phaser.GameObjects.RetroFont.Parse(this, {
        image: 'pixel-font',
        width: fontConfig.width,
        height: fontConfig.height,
        chars: fontConfig.chars,
        charsPerRow: fontConfig.charsPerRow,
        lineSpacing: 2,
      }),
    );

    // Animações "<sprite>-<nome>", por exemplo "chico-run".
    for (const [key, sprite] of Object.entries(spriteManifest)) {
      for (const [name, animation] of Object.entries(sprite.animations ?? {})) {
        this.anims.create({
          key: `${key}-${name}`,
          frames: this.anims.generateFrameNumbers(key, { frames: animation.frames }),
          frameRate: animation.frameRate,
          repeat: animation.repeat,
        });
      }
    }

    // O som é compartilhado por todas as cenas e só começa no primeiro toque ou tecla (FR-015).
    const audio = createAudio(this.sound);
    this.registry.set('audio', audio);
    unlockOnFirstGesture(audio);

    this.scene.start('TitleScene');
  }
}
