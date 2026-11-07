import { t } from '../i18n.js';

// Texto com a fonte pixelada gerada em src/assets/fonts. A fonte só tem maiúsculas.
export const FONT_KEY = 'pixel';

export function pixelText(scene, x, y, text, { scale = 1, originX = 0, originY = 0 } = {}) {
  return scene.add
    .bitmapText(x, y, FONT_KEY, String(text).toUpperCase())
    .setScale(scale)
    .setOrigin(originX, originY);
}

// Dicas de controle conforme o aparelho (FR-016): gestos e botão de pausa no toque, teclas no
// computador. Aparecem na tela de título e na de pausa, para o jogador não depender só de memória.
export function controlsHint(scene) {
  const keys = scene.sys.game.device.input.touch
    ? ['title.controlsTouch', 'title.pauseHintTouch']
    : ['title.controls', 'title.pauseHint'];
  return keys.map((key) => t(key)).join('\n');
}

export function setPixelText(bitmapText, text) {
  return bitmapText.setText(String(text).toUpperCase());
}

// Começa a ação com Enter, Espaço, clique ou toque, uma única vez. A espera evita que uma tecla
// pressionada na tela anterior dispare a ação sem querer.
export function onConfirm(scene, action, delayMs = 300) {
  scene.time.delayedCall(delayMs, () => {
    let done = false;
    const confirm = () => {
      if (done) return;
      done = true;
      action();
    };
    scene.input.keyboard.once('keydown-ENTER', confirm);
    scene.input.keyboard.once('keydown-SPACE', confirm);
    // Tocar em um botão da tela (silenciar, por exemplo) não conta como confirmar.
    scene.input.on('pointerdown', (pointer, over) => {
      if (over.length === 0) confirm();
    });
  });
}

// Posição do botão de silenciar na corrida e na pausa (a pausa o cobre no mesmo lugar).
export const MUTE_BUTTON = { x: 262, y: 2 };

// Botão de silenciar no canto da tela, que também responde à tecla M (FR-015; key: false só
// com o botão). O estado aparece
// em texto (SOM ou MUDO), sem depender só de cor.
export function addMuteControls(scene, { x, y, key = true }) {
  const audio = scene.registry.get('audio');
  if (!audio) return;
  const width = 30;
  const height = 12;
  scene.add
    .rectangle(x, y, width, height, 0x0b0b14, 0.7)
    .setOrigin(0, 0)
    .setStrokeStyle(1, 0xffffff)
    .setDepth(1000);
  const label = pixelText(scene, x + width / 2, y + 1, '', { originX: 0.5 }).setDepth(1001);
  const refresh = () => setPixelText(label, t(audio.isOn ? 'hud.sound' : 'hud.muted'));
  const toggle = () => {
    audio.toggle();
    refresh();
  };
  refresh();
  scene.add
    .zone(x - 3, y - 3, width + 6, height + 6)
    .setOrigin(0, 0)
    .setDepth(1002)
    .setInteractive()
    .on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      toggle();
    });
  // O teclado do Phaser segue ativo com a cena pausada; por isso só uma cena por vez liga a tecla.
  if (key) scene.input.keyboard.on('keydown-M', toggle);
}
