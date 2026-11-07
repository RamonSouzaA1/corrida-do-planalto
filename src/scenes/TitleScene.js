import * as Phaser from 'phaser';
import cities from '../config/cities.json';
import { t } from '../i18n.js';
import { loadSave } from '../platform/storage.js';
import { backgroundKey } from './BootScene.js';
import { addMuteControls, controlsHint, onConfirm, pixelText } from './ui.js';

// Tela de título: logotipo, iniciar e melhor pontuação (FR-001, FR-019).
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { background } = cities[0];
    for (const layer of ['far', 'mid', 'near']) {
      this.add.image(0, 0, backgroundKey(background, layer)).setOrigin(0, 0);
    }
    this.add.image(0, 112, backgroundKey(background, 'track')).setOrigin(0, 0);
    this.add.rectangle(0, 0, 320, 180, 0x0b0b14, 0.45).setOrigin(0, 0);

    pixelText(this, 160, 26, t('title.name'), { scale: 2, originX: 0.5 });
    pixelText(this, 160, 62, t('title.bestScore', { score: loadSave().bestScore }), {
      originX: 0.5,
    });

    const start = pixelText(this, 160, 96, t('title.start'), { scale: 2, originX: 0.5 });
    this.tweens.add({ targets: start, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    pixelText(this, 160, 140, controlsHint(this), { originX: 0.5 }).setCenterAlign();

    addMuteControls(this, { x: 286, y: 4 });
    onConfirm(this, () => this.scene.start('RunScene'));
  }
}
