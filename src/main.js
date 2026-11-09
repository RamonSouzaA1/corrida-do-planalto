import * as Phaser from 'phaser';
import { characters, shortName } from './config/characters.js';
import { setTextParams } from './i18n.js';
import { BootScene } from './scenes/BootScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { RunScene } from './scenes/RunScene.js';
import { VIEW } from './scenes/road.js';
import { TitleScene } from './scenes/TitleScene.js';

// Os textos falam dos personagens pelo nome configurado em characters.json (FR-017).
setTextParams({
  runner: shortName(characters.runner.name),
  target: shortName(characters.target.name),
});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  pixelArt: true,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, RunScene, PauseScene, ResultScene],
});

// Navegadores de celular costumam informar o tamanho novo da janela com atraso depois de girar a
// tela ou de mostrar e esconder as barras; reajusta a área de jogo mantendo a proporção 9:16 (retrato).
const refreshScale = () => setTimeout(() => game.scale.refresh(), 200);
window.addEventListener('orientationchange', refreshScale);
window.visualViewport?.addEventListener('resize', refreshScale);
