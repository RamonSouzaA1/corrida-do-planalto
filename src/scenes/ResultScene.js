import * as Phaser from 'phaser';
import { recordRunEnd } from '../core/progress.js';
import { bestScoreAfter } from '../core/score.js';
import { t } from '../i18n.js';
import { loadSave, writeSave } from '../platform/storage.js';
import { onConfirm, pixelText } from './ui.js';

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

    this.add.rectangle(0, 0, 320, 180, 0x1d2b53).setOrigin(0, 0);
    const heading = pixelText(this, 160, 20, title, { scale: 2, originX: 0.5 });
    if (end.completed) heading.setTint(0xffd23f);
    lines.forEach((line, i) => {
      pixelText(this, 160, 44 + i * 11, line, { originX: 0.5 }).setTint(0xc8ecff);
    });
    if (outcome === 'won' && !end.completed) {
      pixelText(this, 160, 66, t('hud.lives', { lives: end.progress.lives }), { originX: 0.5 });
    }
    pixelText(this, 160, 84, t('gameOver.finalScore', { score }), { originX: 0.5 });
    pixelText(this, 160, 96, t('gameOver.bestScore', { score: best }), { originX: 0.5 });
    if (newRecord) {
      pixelText(this, 160, 108, t('gameOver.newRecord'), { originX: 0.5 }).setTint(0xffd23f);
    }

    const again = pixelText(this, 160, 136, next, { originX: 0.5 });
    this.tweens.add({ targets: again, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    onConfirm(this, () => this.scene.start(end.gameOver ? 'TitleScene' : 'RunScene'), 500);
  }
}
