import { ACTIONS } from './lanes.js';

// low: superado pulando; high: superado deslizando; blocker: exige trocar de faixa.
export const OBSTACLE_TYPES = Object.freeze({ LOW: 'low', HIGH: 'high', BLOCKER: 'blocker' });

const EVADED_BY = {
  [OBSTACLE_TYPES.LOW]: ACTIONS.JUMP,
  [OBSTACLE_TYPES.HIGH]: ACTIONS.SLIDE,
};

export function collides(runner, obstacle) {
  if (runner.lane !== obstacle.lane) return false;
  return runner.action !== EVADED_BY[obstacle.type];
}

// Resultado do choque: um nível de energia a menos; sem energia, a corrida termina. Com escudo, o
// choque é absorvido e a energia fica como está. No MVP a energia começa em 1 (balance.maxEnergy).
export function applyHit(energy, shielded = false) {
  if (shielded) return { energy, ended: false, shielded: true };
  const remaining = Math.max(0, energy - 1);
  return { energy: remaining, ended: remaining === 0, shielded: false };
}
