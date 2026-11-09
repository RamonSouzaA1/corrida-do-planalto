import * as Phaser from 'phaser';
import { recordRunEnd } from '../core/progress.js';
import { bestScoreAfter } from '../core/score.js';
import { t } from '../i18n.js';
import { loadSave, writeSave } from '../platform/storage.js';
import { VIEW } from './road.js';
import { onConfirm, pixelText, wrapText } from './ui.js';

const CENTER_X = VIEW.width / 2;
const LINE_CHARS = 28;
// Títulos usam letras em dobro.
const BIG_LINE_CHARS = 14;

const cityName = (id) => t(`cities.${id}`);

// Título, mensagens e opção de seguir conforme o desfecho. A fase vencida mostra Caio escapando
// por pouco e a próxima cidade (FR-010, FR-013); prender Caio em Washington conclui o jogo. Perder
// custa uma vida e recomeça na mesma cidade; sem vidas, o jogo volta ao início em Brasília
// (FR-023).
function screenText({ outcome, reason, cityId }, { progress, gameOver, completed }) {
  const escaped = reason === 'escaped' ? [t('gameOver.escaped')] : [];
  if (completed) {
    return {
      title: t('victory.title'),
      lines: [t('victory.caught', { city: cityName(cityId) }), t('victory.chaseOver')],
      next: t('victory.playAgain'),
    };
  }
  if (outcome === 'won') {
    return {
      title: t('levelWon.title'),
      lines: [
        t('levelWon.escapedByLittle'),
        t('levelWon.nextCity', { city: cityName(progress.cityReached) }),
      ],
      next: t('levelWon.next'),
    };
  }
  if (gameOver) {
    return {
      title: t('gameOver.title'),
      lines: [
        ...escaped,
        t('gameOver.noLives'),
        t('gameOver.backToStart', { city: cityName(progress.cityReached) }),
      ],
      next: t('gameOver.toTitle'),
    };
  }
  return {
    title: t('lifeLost.title'),
    lines: [
      ...escaped,
      t('lifeLost.livesLeft', { lives: progress.lives }),
      t('lifeLost.restartIn', { city: cityName(progress.cityReached) }),
    ],
    next: t('lifeLost.tryAgain'),
  };
}

// Fim da corrida: pontuação final, melhor pontuação, vidas e o que vem a seguir. Grava o recorde
// (FR-019), as vidas e a cidade alcançada (FR-025). Depois da vitória final, o jogo recomeça em
// Brasília com 3 vidas.
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create({ outcome = 'lost', score = 0, reason = null, livesGained = 0, cityId = null } = {}) {
    const save = loadSave();
    const best = bestScoreAfter(save.bestScore, score);
    const newRecord = best > save.bestScore;
    if (newRecord) writeSave({ ...save, bestScore: best });
    const end = recordRunEnd({ outcome, livesGained });
    const { title, lines, next } = screenText({ outcome, reason, cityId }, end);

    this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x1d2b53).setOrigin(0, 0);
    // Cada bloco de texto entra abaixo do anterior, com as linhas quebradas na largura da tela.
    let y = 48;
    const addText = (text, { scale = 1, tint = null, gap = 4 } = {}) => {
      const wrapped = wrapText(text, scale === 1 ? LINE_CHARS : BIG_LINE_CHARS);
      const label = pixelText(this, CENTER_X, y, wrapped, { scale, originX: 0.5 }).setCenterAlign();
      if (tint !== null) label.setTint(tint);
      y += label.height + gap;
      return label;
    };

    addText(title, { scale: 2, tint: end.completed ? 0xffd23f : null, gap: 14 });
    for (const line of lines) addText(line, { tint: 0xc8ecff });
    if (outcome === 'won' && !end.completed) {
      addText(t('hud.lives', { lives: end.progress.lives }));
    }
    y += 12;
    addText(t('gameOver.finalScore', { score }));
    addText(t('gameOver.bestScore', { score: best }));
    if (newRecord) addText(t('gameOver.newRecord'), { tint: 0xffd23f });

    y = Math.max(y + 20, 230);
    const again = addText(next);
    this.tweens.add({ targets: again, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    onConfirm(this, () => this.scene.start(end.gameOver ? 'TitleScene' : 'RunScene'), 500);
  }
}
