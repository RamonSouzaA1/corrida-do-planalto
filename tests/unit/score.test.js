import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import { addCoin, bestScoreAfter } from '../../src/core/score.js';

describe('addCoin', () => {
  it('cada moeda soma os pontos de balance.json', () => {
    expect(addCoin(0)).toBe(balance.coinPoints);
    expect(addCoin(addCoin(0))).toBe(2 * balance.coinPoints);
  });

  it('aceita outro valor de pontos por moeda', () => {
    expect(addCoin(5, 7)).toBe(12);
  });
});

describe('bestScoreAfter', () => {
  it('a melhor pontuação sobe quando o recorde é quebrado', () => {
    expect(bestScoreAfter(100, 150)).toBe(150);
  });

  it('a melhor pontuação nunca desce', () => {
    expect(bestScoreAfter(100, 40)).toBe(100);
    expect(bestScoreAfter(100, 100)).toBe(100);
  });
});
