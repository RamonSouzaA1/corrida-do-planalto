import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import { STEP_MS } from '../../src/core/clock.js';
import { OBSTACLE_TYPES } from '../../src/core/collision.js';
import { ACTIONS } from '../../src/core/lanes.js';
import { applyCommand, createRun, tick } from '../../src/core/run.js';
import { COMMANDS } from '../../src/input/commands.js';

const DT = STEP_MS / 1000;
// Modo do MVP: uma colisão encerra a corrida (a versão completa usa 2 níveis de energia).
const MVP = { ...balance, maxEnergy: 1 };

function runFor(run, seconds, onStep = () => {}) {
  const events = [];
  for (let step = 0; step < Math.round(seconds / DT) && run.state === 'running'; step += 1) {
    onStep(run);
    events.push(...tick(run, DT));
  }
  return events;
}

describe('corrida do MVP simulada sem renderização', () => {
  it('começa em Brasília, correndo, com energia 1 e pontuação zero', () => {
    const run = createRun({ seed: 1, balance: MVP });
    expect(run).toMatchObject({
      cityId: 'brasilia',
      state: 'running',
      speed: balance.initialSpeed,
      lane: 1,
      action: ACTIONS.RUN,
      energy: 1,
      score: 0,
      metersRun: 0,
    });
  });

  it('a velocidade aumenta com o tempo, até o máximo (FR-005)', () => {
    const run = createRun({ track: { obstacles: [], coins: [] } });
    const speeds = [];
    for (let second = 0; second < 5; second += 1) {
      runFor(run, 1);
      speeds.push(run.speed);
    }
    for (let i = 1; i < speeds.length; i += 1) expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
    runFor(run, 1000);
    expect(run.speed).toBeLessThanOrEqual(balance.maxSpeed);
  });

  it('moedas somam pontos', () => {
    const coins = [
      { meters: 5, lane: 1 },
      { meters: 6, lane: 1 },
      { meters: 7, lane: 0 },
    ];
    const run = createRun({ track: { obstacles: [], coins } });
    const events = runFor(run, 3);
    expect(events.filter((event) => event.type === 'coin')).toHaveLength(2);
    expect(run.score).toBe(2 * balance.coinPoints);
  });

  it('pular evita o obstáculo baixo e a colisão termina a corrida', () => {
    const obstacles = [
      { meters: 10, lane: 1, type: OBSTACLE_TYPES.LOW, sprite: 'cone' },
      { meters: 20, lane: 1, type: OBSTACLE_TYPES.BLOCKER, sprite: 'guarda' },
    ];
    const run = createRun({ balance: MVP, track: { obstacles, coins: [] } });
    const events = runFor(run, 30, (current) => {
      if (current.metersRun > 9 && current.metersRun < 10) applyCommand(current, COMMANDS.JUMP);
    });
    const hits = events.filter((event) => event.type === 'hit');
    expect(hits).toHaveLength(1);
    expect(hits[0].obstacle.meters).toBe(20);
    expect(run.state).toBe('lost');
    expect(run.energy).toBe(0);
    expect(run.metersRun).toBeGreaterThanOrEqual(20);
    expect(run.metersRun).toBeLessThan(21);
  });

  it('a corrida não avança depois de terminar', () => {
    const obstacles = [{ meters: 2, lane: 1, type: OBSTACLE_TYPES.BLOCKER, sprite: 'guarda' }];
    const run = createRun({ balance: MVP, track: { obstacles, coins: [] } });
    runFor(run, 2);
    const meters = run.metersRun;
    expect(tick(run, DT)).toEqual([]);
    expect(run.metersRun).toBe(meters);
    expect(applyCommand(run, COMMANDS.LEFT)).toBe(false);
  });

  it('sem comandos, a corrida gerada termina em colisão', () => {
    const run = createRun({ seed: 99 });
    runFor(run, 600);
    expect(run.state).toBe('lost');
  });

  it('desviando de tudo, Chico chega ao fim da pista de Brasília', () => {
    const run = createRun({ seed: 99 });
    // Piloto automático: antes de cada fileira, vai para uma faixa livre ou pula/desliza.
    const events = runFor(run, 600, (current) => {
      const ahead = current.track.obstacles.filter(
        (o) => o.meters > current.metersRun && o.meters - current.metersRun < 1,
      );
      const blocked = new Set(ahead.map((o) => o.lane));
      const mine = ahead.find((o) => o.lane === current.lane);
      if (!mine) return;
      if (mine.type === OBSTACLE_TYPES.LOW) applyCommand(current, COMMANDS.JUMP);
      else if (mine.type === OBSTACLE_TYPES.HIGH) applyCommand(current, COMMANDS.SLIDE);
      else {
        const free = [0, 1, 2].find((lane) => !blocked.has(lane));
        while (current.lane !== free) {
          applyCommand(current, current.lane < free ? COMMANDS.RIGHT : COMMANDS.LEFT);
        }
      }
    });
    // O desfecho no fim da pista é do confronto do avião (tests/integration/run-boss.test.js).
    expect(events.some((event) => event.type === 'hit')).toBe(false);
    expect(run.metersRun).toBe(run.city.lengthMeters);
  });
});
