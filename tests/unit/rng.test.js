import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng.js';

const sample = (rng, count) => Array.from({ length: count }, () => rng.next());

describe('createRng', () => {
  it('gera a mesma sequência para a mesma semente', () => {
    expect(sample(createRng(42), 50)).toEqual(sample(createRng(42), 50));
  });

  it('gera sequências diferentes para sementes diferentes', () => {
    expect(sample(createRng(1), 10)).not.toEqual(sample(createRng(2), 10));
  });

  it('devolve valores em [0, 1)', () => {
    const values = sample(createRng(7), 10000);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it('distribui os valores ao longo do intervalo', () => {
    const values = sample(createRng(123), 10000);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeCloseTo(0.5, 1);
  });
});
