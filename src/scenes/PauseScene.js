import * as Phaser from 'phaser';
import { t } from '../i18n.js';
import { MUTE_BUTTON, addMuteControls, controlsHint, onConfirm, pixelText } from './ui.js';

// Sobreposta à corrida pausada (FR-018). Esc e P são tratados pela RunScene, que continua
// ouvindo o teclado; aqui também se retoma com Enter, Espaço, clique ou toque.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create() {
    this.add.rectangle(0, 0, 320, 180, 0x0b0b14, 0.6).setOrigin(0, 0);
    pixelText(this, 160, 60, t('pause.title'), { scale: 2, originX: 0.5 });
    const resume = pixelText(this, 160, 100, t('pause.resume'), { originX: 0.5 });
    pixelText(this, 160, 140, controlsHint(this), { originX: 0.5 }).setCenterAlign();
    this.tweens.add({ targets: resume, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    // Sobre o botão da corrida; a tecla M continua com a RunScene.
    addMuteControls(this, { ...MUTE_BUTTON, key: false });
    onConfirm(this, () => this.scene.get('RunScene').resumeRun(), 150);
  }
}
