// Power-ups da versão completa (FR-012) e a faixa presidencial (FR-024). As funções alteram o
// objeto da corrida ({ shield, boost, distanceToTarget, livesGained }), como lanes.js faz.

export const POWER_UPS = Object.freeze({
  FLAG: 'flag',
  POSTER: 'poster',
  MONEY_BAG: 'moneyBag',
  SASH: 'sash',
});

export const POWER_UP_SPRITES = Object.freeze({
  [POWER_UPS.FLAG]: 'bandeira',
  [POWER_UPS.POSTER]: 'cartaz',
  [POWER_UPS.MONEY_BAG]: 'mala',
  [POWER_UPS.SASH]: 'faixa-presidencial',
});

// Itens sorteados ao longo da pista; a faixa presidencial tem distância própria.
export const RANDOM_POWER_UPS = Object.freeze([
  POWER_UPS.FLAG,
  POWER_UPS.POSTER,
  POWER_UPS.MONEY_BAG,
]);

// Pegar um item já ativo renova a duração; os efeitos não acumulam.
export function applyPowerUp(run, kind, balance) {
  switch (kind) {
    case POWER_UPS.FLAG:
      run.shield = balance.shieldSeconds;
      return true;
    case POWER_UPS.POSTER:
      run.boost = balance.boostSeconds;
      return true;
    case POWER_UPS.MONEY_BAG:
      run.distanceToTarget = Math.max(0, run.distanceToTarget - balance.moneyBagMeters);
      return true;
    case POWER_UPS.SASH:
      run.livesGained += 1;
      return true;
    default:
      return false;
  }
}

export function updatePowerUps(run, dtSeconds) {
  run.shield = Math.max(0, run.shield - dtSeconds);
  run.boost = Math.max(0, run.boost - dtSeconds);
}

// Vale o estado do escudo no instante da colisão; uma colisão o consome.
export function consumeShield(run) {
  if (run.shield <= 0) return false;
  run.shield = 0;
  return true;
}

export function boostedSpeed(speed, run, balance) {
  return run.boost > 0 ? speed + balance.boostSpeedBonus : speed;
}

// Com o cartaz, Chico também se aproxima de Caio mais rápido.
export function boostCloseIn(distance, run, dtSeconds, balance) {
  if (run.boost <= 0) return distance;
  return Math.max(0, distance - balance.boostCloseRatePerSecond * dtSeconds);
}
