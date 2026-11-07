import { describe, expect, it, vi } from 'vitest';
import { MAX_DELTA_MS, STEP_MS, createClock } from '../../src/core/clock.js';

describe('createClock', () => {
  it('usa 60 passos por segundo por padrão', () => {
    expect(STEP_MS).toBeCloseTo(1000 / 60);
    const clock = createClock();
    let steps = 0;
    for (let i = 0; i < 10; i += 1) steps += clock.advance(100, () => {});
    expect(steps).toBe(60);
  });

  it('acumula o tempo que sobra entre chamadas', () => {
    const clock = createClock(10);
    expect(clock.advance(6, () => {})).toBe(0);
    expect(clock.advance(6, () => {})).toBe(1);
    expect(clock.advance(8, () => {})).toBe(1);
  });

  it('chama onStep uma vez por passo, com o tamanho do passo', () => {
    const clock = createClock(10);
    const onStep = vi.fn();
    expect(clock.advance(35, onStep)).toBe(3);
    expect(onStep).toHaveBeenCalledTimes(3);
    expect(onStep).toHaveBeenCalledWith(10);
  });

  it('limita o tempo de uma chamada a MAX_DELTA_MS', () => {
    const clock = createClock(10);
    expect(clock.advance(5000, () => {})).toBe(MAX_DELTA_MS / 10);
  });

  it('ignora tempo zero, negativo ou inválido', () => {
    const clock = createClock(10);
    const onStep = vi.fn();
    expect(clock.advance(0, onStep)).toBe(0);
    expect(clock.advance(-50, onStep)).toBe(0);
    expect(clock.advance(Number.NaN, onStep)).toBe(0);
    expect(onStep).not.toHaveBeenCalled();
  });
});
