import * as Phaser from 'phaser';
import { characters } from '../config/characters.js';
import cities from '../config/cities.json';
import { t } from '../i18n.js';
import { loadSave } from '../platform/storage.js';
import { PARALLAX_LAYERS, backgroundKey } from './BootScene.js';
import { VIEW, drawRoad } from './road.js';
import { addMuteControls, controlsHint, onConfirm, pixelText, wrapText } from './ui.js';

const CENTER_X = VIEW.width / 2;
// O título usa letras em dobro; cabem 15 por linha.
const BIG_LINE_CHARS = 14;

// Tela de título: logotipo, iniciar e melhor pontuação (FR-001, FR-019), com Chico e Caio de
// frente sobre a pista de Brasília.
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const [city] = cities;
    for (const layer of PARALLAX_LAYERS) {
      this.add.image(0, 0, backgroundKey(city.background, layer)).setOrigin(0, 0);
    }
    drawRoad(this.add.graphics(), city, 0);
    this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x0b0b14, 0.45).setOrigin(0, 0);

    const name = wrapText(t('title.name'), BIG_LINE_CHARS);
    pixelText(this, CENTER_X, 26, name, { scale: 2, originX: 0.5 }).setCenterAlign();
    pixelText(this, CENTER_X, 84, t('title.bestScore', { score: loadSave().bestScore }), {
      originX: 0.5,
    });

    const start = pixelText(this, CENTER_X, 108, t('title.start'), { scale: 2, originX: 0.5 });
    this.tweens.add({ targets: start, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.addPortrait('runner', 48);
    this.addPortrait('target', 132);

    pixelText(this, CENTER_X, 262, controlsHint(this), { originX: 0.5 }).setCenterAlign();

    addMuteControls(this, { x: 146, y: 4 });
    onConfirm(this, () => this.scene.start('RunScene'));
  }

  // Personagem de frente, em dobro, se o sprite configurado tiver o quadro de frente.
  addPortrait(id, x) {
    const key = characters[id].sprite;
    if (!this.anims.exists(`${key}-front`)) return;
    this.add.sprite(x, 252, key).setOrigin(0.5, 1).setScale(2).play(`${key}-front`);
  }
}
