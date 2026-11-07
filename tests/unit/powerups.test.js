import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import { STEP_MS } from '../../src/core/clock.js';
import {
  POWER_UPS,
  applyPowerUp,
  boostedSpeed,
  consumeShield,
  updatePowerUps,
} from '../../src/core/powerups.js';
import { createRun, tick } from '../../src/core/run.js';

const DT = STEP_MS / 1000;
const state = () => ({ shield: 0, boost: 0, distanceToTarget: 300, livesGained: 0 });

function elapse(target, seconds) {
  for (let step = 0; step < Math.round(seconds / DT); step += 1) updatePowerUps(target, DT);
}

describe('applyPowerUp', () => {
  it('bandeira dá escudo de 8 s', () => {
    const target = state();
    applyPowerUp(target, POWER_UPS.FLAG, balance);
    expect(target.shield).toBe(8);
    elapse(target, 7.9);
    expect(target.shield).toBeGreaterThan(0);
    elapse(target, 0.2);
    expect(target.shield).toBe(0);
  });

  it('cartaz dá velocidade extra de 5 s', () => {
    const target = state();
    applyPowerUp(target, POWER_UPS.POSTER, balance);
    expect(target.boost).toBe(5);
    expect(boostedSpeed(6, target, balance)).toBe(6 + balance.boostSpeedBonus);
    elapse(target, 5.1);
    expect(target.boost).toBe(0);
    expect(boostedSpeed(6, target, balance)).toBe(6);
  });

  it('mala de dinheiro reduz a distância em 50 m imediatamente, sem ficar negativa', () => {
    const target = state();
    applyPowerUp(target, POWER_UPS.MONEY_BAG, balance);
    expect(target.distanceToTarget).toBe(250);
    target.distanceToTarget = 20;
    applyPowerUp(target, POWER_UPS.MONEY_BAG, balance);
    expect(target.distanceToTarget).toBe(0);
  });

  it('faixa presidencial dá uma vida extra', () => {
    const target = state();
    applyPowerUp(target, POWER_UPS.SASH, balance);
    expect(target.livesGained).toBe(1);
  });

  it('item igual ativo renova a duração sem acumular', () => {
    const target = state();
    applyPowerUp(target, POWER_UPS.FLAG, balance);
    applyPowerUp(target, POWER_UPS.POSTER, balance);
    elapse(target, 3);
    applyPowerUp(target, POWER_UPS.FLAG, balance);
    applyPowerUp(target, POWER_UPS.POSTER, balance);
    expect(target.shield).toBe(balance.shieldSeconds);
    expect(target.boost).toBe(balance.boostSeconds);
    applyPowerUp(target, POWER_UPS.FLAG, balance);
    expect(target.shield).toBe(balance.shieldSeconds);
  });

  it('o escudo é consumido por uma colisão', () => {
    const target = state();
    expect(consumeShield(target)).toBe(false);
    applyPowerUp(target, POWER_UPS.FLAG, balance);
    expect(consumeShield(target)).toBe(true);
    expect(target.shield).toBe(0);
    expect(consumeShield(target)).toBe(false);
  });
});

describe('power-ups na corrida', () => {
  const track = (kind) => ({ obstacles: [], coins: [], powerUps: [{ meters: 2, lane: 1, kind }] });

  it('coletar um item na faixa de Chico aplica o efeito e avisa a cena', () => {
    const run = createRun({ track: track(POWER_UPS.FLAG) });
    const events = [];
    for (let step = 0; step < 1 / DT; step += 1) events.push(...tick(run, DT));
    expect(events.find((event) => event.type === 'powerUp')).toMatchObject({
      item: { kind: POWER_UPS.FLAG },
    });
    expect(run.shield).toBeGreaterThan(0);
  });

  it('item em outra faixa não é coletado', () => {
    const run = createRun({
      track: { obstacles: [], coins: [], powerUps: [{ meters: 2, lane: 0, kind: 'flag' }] },
    });
    for (let step = 0; step < 1 / DT; step += 1) tick(run, DT);
    expect(run.shield).toBe(0);
  });

  it('o cartaz acelera Chico e o aproxima de Caio mais rápido', () => {
    const boosted = createRun({ track: track(POWER_UPS.POSTER) });
    const normal = createRun({ track: { obstacles: [], coins: [] } });
    for (let step = 0; step < 2 / DT; step += 1) {
      tick(boosted, DT);
      tick(normal, DT);
    }
    expect(boosted.speed).toBeGreaterThan(normal.speed);
    expect(boosted.distanceToTarget).toBeLessThan(normal.distanceToTarget);
  });

  it('a mala de dinheiro derruba Caio: 50 m a menos', () => {
    const bag = createRun({ track: track(POWER_UPS.MONEY_BAG) });
    const normal = createRun({ track: { obstacles: [], coins: [] } });
    for (let step = 0; step < 1 / DT; step += 1) {
      tick(bag, DT);
      tick(normal, DT);
    }
    expect(bag.distanceToTarget).toBeCloseTo(normal.distanceToTarget - balance.moneyBagMeters);
  });
});
