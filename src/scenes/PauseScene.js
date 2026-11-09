import * as Phaser from 'phaser';
import { t } from '../i18n.js';
import { VIEW } from './road.js';
import { MUTE_BUTTON, addMuteControls, controlsHint, onConfirm, pixelText } from './ui.js';

const CENTER_X = VIEW.width / 2;

// Sobreposta à corrida pausada (FR-018). Esc e P são tratados pela RunScene, que continua
// ouvindo o teclado; aqui também se retoma com Enter, Espaço, clique ou toque.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create() {
    this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x0b0b14, 0.6).setOrigin(0, 0);
    pixelText(this, CENTER_X, 110, t('pause.title'), { scale: 2, originX: 0.5 });
    const resume = pixelText(this, CENTER_X, 160, t('pause.resume'), { originX: 0.5 });
    pixelText(this, CENTER_X, 230, controlsHint(this), { originX: 0.5 }).setCenterAlign();
    this.tweens.add({ targets: resume, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    // Sobre o botão da corrida; a tecla M continua com a RunScene.
    addMuteControls(this, { ...MUTE_BUTTON, key: false });
    onConfirm(this, () => this.scene.get('RunScene').resumeRun(), 150);
  }
}
