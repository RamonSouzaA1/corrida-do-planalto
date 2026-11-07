import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';

const REQUIRED_KEYS = [
  'initialSpeed',
  'speedAcceleration',
  'maxSpeed',
  'initialDistance',
  'distanceCloseRatePerSecond',
  'proximitySpeedBonus',
  'bossRunwayMeters',
  'coinDistanceBonus',
  'collisionDistancePenalty',
  'minVictoryDistance',
  'coinPoints',
  'extraLifeScore',
  'presidentialSashEveryMeters',
  'commandQueueMs',
  'swipeMinPixels',
  'shieldSeconds',
  'boostSeconds',
  'moneyBagMeters',
  'maxEnergy',
  'boostSpeedBonus',
  'boostCloseRatePerSecond',
  'powerUpGapMinMeters',
  'powerUpGapMaxMeters',
];

describe('balance.json', () => {
  it.each(REQUIRED_KEYS)('define %s como número positivo', (key) => {
    expect(typeof balance[key]).toBe('number');
    expect(balance[key]).toBeGreaterThan(0);
  });

  it('usa as durações e valores fixados na spec', () => {
    expect(balance.shieldSeconds).toBe(8);
    expect(balance.boostSeconds).toBe(5);
    expect(balance.moneyBagMeters).toBe(50);
  });

  it('tem velocidade máxima acima da inicial', () => {
    expect(balance.maxSpeed).toBeGreaterThan(balance.initialSpeed);
  });
});
