import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import {
  FIRST_CITY,
  STARTING_LIVES,
  extraLivesForScore,
  finishRun,
  gainLives,
  loseLife,
  nextCity,
  progressFromSave,
} from '../../src/core/progress.js';
import { DEFAULT_SAVE } from '../../src/platform/storage.js';

describe('vidas', () => {
  it('começa com 3 vidas em Brasília', () => {
    expect(STARTING_LIVES).toBe(3);
    expect(FIRST_CITY).toBe('brasilia');
    expect(progressFromSave(DEFAULT_SAVE)).toEqual({ cityReached: 'brasilia', lives: 3 });
  });

  it('save sem vidas recomeça com 3 vidas em Brasília', () => {
    expect(progressFromSave({ ...DEFAULT_SAVE, cityReached: 'assuncao', lives: 0 })).toEqual({
      cityReached: 'brasilia',
      lives: 3,
    });
  });

  it('perder a corrida desconta uma vida e mantém a cidade', () => {
    expect(loseLife({ cityReached: 'assuncao', lives: 3 })).toEqual({
      progress: { cityReached: 'assuncao', lives: 2 },
      gameOver: false,
    });
  });

  it('perder na última vida volta a Brasília com 3 vidas', () => {
    expect(loseLife({ cityReached: 'buenos-aires', lives: 1 })).toEqual({
      progress: { cityReached: 'brasilia', lives: 3 },
      gameOver: true,
    });
  });

  it('a faixa presidencial (vida ganha na corrida) soma vidas', () => {
    expect(gainLives({ cityReached: 'brasilia', lives: 2 }, 1)).toEqual({
      cityReached: 'brasilia',
      lives: 3,
    });
  });

  it('extraLifeScore dá vida extra ao cruzar cada múltiplo', () => {
    const limit = balance.extraLifeScore;
    expect(extraLivesForScore(0, limit - 1, limit)).toBe(0);
    expect(extraLivesForScore(limit - 10, limit, limit)).toBe(1);
    expect(extraLivesForScore(limit, limit + 10, limit)).toBe(0);
    expect(extraLivesForScore(limit - 10, 2 * limit, limit)).toBe(2);
  });

  it('fim da corrida: vidas ganhas contam antes da perda', () => {
    const progress = { cityReached: 'brasilia', lives: 1 };
    expect(finishRun(progress, { outcome: 'lost', livesGained: 1 })).toEqual({
      progress: { cityReached: 'brasilia', lives: 1 },
      livesLost: 1,
      gameOver: false,
      completed: false,
    });
    expect(finishRun(progress, { outcome: 'won', livesGained: 2 })).toMatchObject({
      progress: { lives: 3 },
      livesLost: 0,
      gameOver: false,
    });
  });
});

describe('cidades', () => {
  it('segue a ordem Brasília, Assunção, Buenos Aires, Washington', () => {
    expect(nextCity('brasilia')).toBe('assuncao');
    expect(nextCity('assuncao')).toBe('buenos-aires');
    expect(nextCity('buenos-aires')).toBe('washington');
    expect(nextCity('washington')).toBeNull();
  });

  it('a ordem vem do campo order, não da posição no arquivo', () => {
    const cities = [
      { id: 'b', order: 2 },
      { id: 'c', order: 3 },
      { id: 'a', order: 1 },
    ];
    expect(nextCity('a', cities)).toBe('b');
    expect(nextCity('b', cities)).toBe('c');
    expect(nextCity('c', cities)).toBeNull();
  });

  it('vencer a fase leva à cidade seguinte, com as mesmas vidas', () => {
    expect(finishRun({ cityReached: 'assuncao', lives: 2 }, { outcome: 'won' })).toEqual({
      progress: { cityReached: 'buenos-aires', lives: 2 },
      livesLost: 0,
      gameOver: false,
      completed: false,
    });
  });

  it('vencer em Washington conclui o jogo e recomeça do início', () => {
    expect(finishRun({ cityReached: 'washington', lives: 1 }, { outcome: 'won' })).toEqual({
      progress: { cityReached: FIRST_CITY, lives: STARTING_LIVES },
      livesLost: 0,
      gameOver: false,
      completed: true,
    });
  });

  it('perder mantém a cidade atual', () => {
    const end = finishRun({ cityReached: 'washington', lives: 3 }, { outcome: 'lost' });
    expect(end).toMatchObject({
      progress: { cityReached: 'washington', lives: 2 },
      completed: false,
    });
  });
});
