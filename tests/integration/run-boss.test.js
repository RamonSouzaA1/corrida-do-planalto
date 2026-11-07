import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import { OBSTACLE_TYPES } from '../../src/core/collision.js';
import { createRun, tick } from '../../src/core/run.js';
import { DT, autopilot, runToEnd } from './autopilot.js';

describe('Brasília inteira até o fim da pista de embarque', () => {
  it('a distância começa no valor inicial e diminui com o tempo', () => {
    const run = createRun({ track: { obstacles: [], coins: [] } });
    expect(run.distanceToTarget).toBe(balance.initialDistance);
    for (let step = 0; step < 1 / DT; step += 1) tick(run, DT);
    expect(run.distanceToTarget).toBeCloseTo(
      balance.initialDistance - balance.distanceCloseRatePerSecond,
      1,
    );
  });

  it('moedas aproximam Chico de Caio e a colisão o afasta', () => {
    const coins = [{ meters: 2, lane: 1 }];
    const obstacles = [{ meters: 4, lane: 1, type: OBSTACLE_TYPES.BLOCKER, sprite: 'guarda' }];
    const withCoin = createRun({ track: { obstacles: [], coins } });
    const without = createRun({ track: { obstacles: [], coins: [] } });
    for (let step = 0; step < 1 / DT; step += 1) {
      tick(withCoin, DT);
      tick(without, DT);
    }
    expect(withCoin.distanceToTarget).toBeCloseTo(
      without.distanceToTarget - balance.coinDistanceBonus,
    );

    // Modo do MVP: a colisão encerra a corrida logo depois de afastar Caio.
    const hit = createRun({
      balance: { ...balance, maxEnergy: 1 },
      track: { obstacles, coins: [] },
    });
    const before = hit.distanceToTarget;
    runToEnd(hit);
    expect(hit.state).toBe('lost');
    expect(hit.distanceToTarget).toBeGreaterThan(
      before + balance.collisionDistancePenalty - balance.distanceCloseRatePerSecond,
    );
  });

  it('entra na pista de embarque nos últimos metros, em velocidade máxima', () => {
    const run = createRun({ track: { obstacles: [], coins: [] } });
    const events = runToEnd(run, (current) => {
      if (current.inBossRunway) expect(current.speed).toBe(balance.maxSpeed);
    });
    const runway = events.find((event) => event.type === 'runway');
    expect(runway).toBeDefined();
    expect(events.filter((event) => event.type === 'runway')).toHaveLength(1);
    expect(run.inBossRunway).toBe(true);
  });

  it('coletando moedas, chega perto e vence a fase com Caio fugindo', () => {
    const run = createRun({ seed: 99 });
    const events = runToEnd(run, autopilot({ coinHunter: true }));
    expect(run.metersRun).toBe(run.city.lengthMeters);
    expect(run.distanceToTarget).toBeLessThanOrEqual(balance.minVictoryDistance);
    expect(run.state).toBe('won');
    expect(events.at(-1)).toMatchObject({ type: 'won', caught: false });
  });

  it('sem coletar moedas, não chega perto e perde no fim da pista', () => {
    const run = createRun({ seed: 99 });
    const events = runToEnd(run, autopilot({ coinHunter: false }));
    expect(events.some((event) => event.type === 'hit')).toBe(false);
    expect(run.metersRun).toBe(run.city.lengthMeters);
    expect(run.distanceToTarget).toBeGreaterThan(balance.minVictoryDistance);
    expect(run.state).toBe('lost');
    expect(events.at(-1)).toMatchObject({ type: 'lost', reason: 'escaped' });
  });
});
