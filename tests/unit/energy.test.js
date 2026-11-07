import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import { STEP_MS } from '../../src/core/clock.js';
import { OBSTACLE_TYPES, applyHit } from '../../src/core/collision.js';
import { createRun, tick } from '../../src/core/run.js';

const DT = STEP_MS / 1000;
const blocker = (meters) => ({ meters, lane: 1, type: OBSTACLE_TYPES.BLOCKER, sprite: 'guarda' });

function runFor(run, seconds) {
  const events = [];
  for (let step = 0; step < Math.round(seconds / DT) && run.state === 'running'; step += 1) {
    events.push(...tick(run, DT));
  }
  return events;
}

describe('applyHit com energia em dois níveis', () => {
  it('primeira colisão tira um nível e a segunda encerra a corrida', () => {
    expect(applyHit(2)).toEqual({ energy: 1, ended: false, shielded: false });
    expect(applyHit(1)).toEqual({ energy: 0, ended: true, shielded: false });
  });

  it('escudo ativo absorve a colisão sem tirar energia', () => {
    expect(applyHit(2, true)).toEqual({ energy: 2, ended: false, shielded: true });
    expect(applyHit(1, true)).toEqual({ energy: 1, ended: false, shielded: true });
  });
});

describe('energia na corrida', () => {
  it('a versão completa começa com 2 níveis de energia', () => {
    expect(balance.maxEnergy).toBe(2);
    expect(createRun({ track: { obstacles: [], coins: [] } }).energy).toBe(2);
  });

  it('a primeira colisão tira um nível e a corrida continua; a segunda a encerra', () => {
    const run = createRun({ track: { obstacles: [blocker(5), blocker(30)], coins: [] } });
    runFor(run, 3);
    expect(run.energy).toBe(1);
    expect(run.state).toBe('running');
    const events = runFor(run, 10);
    expect(run.energy).toBe(0);
    expect(run.state).toBe('lost');
    expect(events.at(-1)).toMatchObject({ type: 'lost', reason: 'hit' });
  });

  it('o modo do MVP (maxEnergy 1) continua selecionável: uma colisão encerra a corrida', () => {
    const mvp = { ...balance, maxEnergy: 1 };
    const run = createRun({ balance: mvp, track: { obstacles: [blocker(5)], coins: [] } });
    expect(run.energy).toBe(1);
    runFor(run, 3);
    expect(run.state).toBe('lost');
  });

  it('escudo ativo absorve a colisão, é consumido e não afasta Caio', () => {
    const run = createRun({ track: { obstacles: [blocker(5)], coins: [] } });
    const without = createRun({ track: { obstacles: [], coins: [] } });
    run.shield = balance.shieldSeconds;
    const events = runFor(run, 3);
    runFor(without, 3);
    expect(events.some((event) => event.type === 'shielded')).toBe(true);
    expect(events.some((event) => event.type === 'hit')).toBe(false);
    expect(run.energy).toBe(2);
    expect(run.shield).toBe(0);
    expect(run.distanceToTarget).toBeCloseTo(without.distanceToTarget);
  });

  it('vale o estado do escudo no instante da colisão', () => {
    // O escudo ainda tem um resto de tempo no passo em que Chico chega ao obstáculo.
    const run = createRun({ track: { obstacles: [blocker(0.01)], coins: [] } });
    run.shield = DT / 2;
    const events = tick(run, DT);
    expect(events.map((event) => event.type)).toContain('shielded');
    expect(run.energy).toBe(2);

    // Escudo já terminado no passo anterior: a colisão tira energia.
    const late = createRun({ track: { obstacles: [blocker(0.6)], coins: [] } });
    late.shield = DT / 2;
    tick(late, DT);
    expect(late.shield).toBe(0);
    runFor(late, 1);
    expect(late.energy).toBe(1);
  });
});
