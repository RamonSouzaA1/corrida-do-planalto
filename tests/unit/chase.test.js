import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import {
  afterCoin,
  afterHit,
  closeIn,
  fleeSpeed,
  proximity,
  runSpeed,
} from '../../src/core/chase.js';

describe('distância até Caio (FR-009)', () => {
  it('diminui em ritmo constante com o tempo', () => {
    const start = 100;
    const afterOne = closeIn(start, 1, balance);
    const afterTwo = closeIn(afterOne, 1, balance);
    expect(start - afterOne).toBeCloseTo(balance.distanceCloseRatePerSecond);
    expect(afterOne - afterTwo).toBeCloseTo(balance.distanceCloseRatePerSecond);
  });

  it('diminui ao coletar moeda e aumenta a cada colisão', () => {
    expect(afterCoin(100, balance)).toBe(100 - balance.coinDistanceBonus);
    expect(afterHit(100, balance)).toBe(100 + balance.collisionDistancePenalty);
  });

  it('nunca fica negativa', () => {
    expect(closeIn(0.5, 10, balance)).toBe(0);
    expect(afterCoin(0, balance)).toBe(0);
  });

  it('a proximidade vai de 0 (distância inicial ou mais) a 1 (distância zero)', () => {
    expect(proximity(balance.initialDistance, balance)).toBe(0);
    expect(proximity(balance.initialDistance * 2, balance)).toBe(0);
    expect(proximity(0, balance)).toBe(1);
    expect(proximity(balance.initialDistance / 2, balance)).toBeCloseTo(0.5);
  });

  it('quanto mais perto Chico chega, mais rápido Caio foge', () => {
    const far = fleeSpeed(6, 300, balance);
    const near = fleeSpeed(6, 50, balance);
    const touching = fleeSpeed(6, 0, balance);
    expect(far).toBeGreaterThanOrEqual(6);
    expect(near).toBeGreaterThan(far);
    expect(touching).toBeGreaterThan(near);
  });

  it('a velocidade da corrida acompanha a proximidade, sem passar do máximo', () => {
    const base = balance.initialSpeed;
    expect(runSpeed(base, balance.initialDistance, balance)).toBe(base);
    expect(runSpeed(base, 0, balance)).toBeGreaterThan(base);
    expect(runSpeed(balance.maxSpeed, 0, balance)).toBe(balance.maxSpeed);
  });
});
