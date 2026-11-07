import { describe, expect, it } from 'vitest';
import { OBSTACLE_TYPES, applyHit, collides } from '../../src/core/collision.js';
import { ACTIONS } from '../../src/core/lanes.js';

const runner = (action, lane = 1) => ({ lane, action, actionTimeLeft: 0 });
const obstacle = (type, lane = 1) => ({ meters: 10, lane, type, sprite: 'x' });

describe('collides', () => {
  it('obstáculo baixo só é evitado pulando', () => {
    expect(collides(runner(ACTIONS.JUMP), obstacle(OBSTACLE_TYPES.LOW))).toBe(false);
    expect(collides(runner(ACTIONS.RUN), obstacle(OBSTACLE_TYPES.LOW))).toBe(true);
    expect(collides(runner(ACTIONS.SLIDE), obstacle(OBSTACLE_TYPES.LOW))).toBe(true);
  });

  it('barreira alta só é evitada deslizando', () => {
    expect(collides(runner(ACTIONS.SLIDE), obstacle(OBSTACLE_TYPES.HIGH))).toBe(false);
    expect(collides(runner(ACTIONS.RUN), obstacle(OBSTACLE_TYPES.HIGH))).toBe(true);
    expect(collides(runner(ACTIONS.JUMP), obstacle(OBSTACLE_TYPES.HIGH))).toBe(true);
  });

  it('bloqueio só é evitado trocando de faixa', () => {
    for (const action of Object.values(ACTIONS)) {
      expect(collides(runner(action), obstacle(OBSTACLE_TYPES.BLOCKER))).toBe(true);
    }
  });

  it('obstáculo de outra faixa não colide', () => {
    for (const type of Object.values(OBSTACLE_TYPES)) {
      expect(collides(runner(ACTIONS.RUN, 0), obstacle(type, 1))).toBe(false);
      expect(collides(runner(ACTIONS.RUN, 2), obstacle(type, 1))).toBe(false);
    }
  });
});

describe('applyHit', () => {
  it('uma colisão encerra a corrida no MVP (energia 1)', () => {
    expect(applyHit(1)).toEqual({ energy: 0, ended: true, shielded: false });
  });

  it('energia nunca fica negativa', () => {
    expect(applyHit(0)).toEqual({ energy: 0, ended: true, shielded: false });
  });
});
