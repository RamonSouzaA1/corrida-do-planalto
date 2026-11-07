import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import { BOSS_RESULTS, bossResult, runwayStartMeters } from '../../src/core/chase.js';

const brasilia = { lengthMeters: 1000, catchable: false };
const washington = { lengthMeters: 1000, catchable: true };

describe('confronto do avião (FR-010)', () => {
  it('a pista de embarque são os últimos metros da cidade', () => {
    expect(runwayStartMeters(brasilia, balance)).toBe(1000 - balance.bossRunwayMeters);
  });

  describe('cidade em que Caio sempre foge (catchable: false)', () => {
    it('vence com Caio fugindo se a distância está dentro do limite ao fim da pista', () => {
      const result = bossResult(
        { city: brasilia, distance: balance.minVictoryDistance, runwayOver: true },
        balance,
      );
      expect(result).toBe(BOSS_RESULTS.ESCAPED_BY_LITTLE);
    });

    it('perde se a distância está acima do limite ao fim da pista', () => {
      const result = bossResult(
        { city: brasilia, distance: balance.minVictoryDistance + 0.1, runwayOver: true },
        balance,
      );
      expect(result).toBe(BOSS_RESULTS.TOO_FAR);
    });

    it('chegar a zero antes do fim da pista não prende Caio', () => {
      expect(bossResult({ city: brasilia, distance: 0, runwayOver: false }, balance)).toBeNull();
    });
  });

  describe('cidade em que Caio pode ser preso (catchable: true)', () => {
    it('vence prendendo Caio quando a distância chega a zero antes do fim da pista', () => {
      expect(bossResult({ city: washington, distance: 0, runwayOver: false }, balance)).toBe(
        BOSS_RESULTS.CAUGHT,
      );
    });

    it('perde se a pista acaba com a distância acima de zero, mesmo dentro do limite', () => {
      const result = bossResult(
        { city: washington, distance: balance.minVictoryDistance / 2, runwayOver: true },
        balance,
      );
      expect(result).toBe(BOSS_RESULTS.TOO_FAR);
    });

    it('com distância acima de zero e pista em andamento, o confronto continua', () => {
      expect(bossResult({ city: washington, distance: 5, runwayOver: false }, balance)).toBeNull();
    });
  });
});
