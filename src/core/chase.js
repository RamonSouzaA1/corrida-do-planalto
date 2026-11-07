// Distância até Caio (FR-009) e confronto do avião (FR-010). Funções puras sobre números; run.js
// guarda o estado.

export const BOSS_RESULTS = Object.freeze({
  ESCAPED_BY_LITTLE: 'escapedByLittle',
  CAUGHT: 'caught',
  TOO_FAR: 'tooFar',
});

// A distância diminui sozinha em ritmo constante e nunca fica negativa.
export function closeIn(distance, dtSeconds, balance) {
  return Math.max(0, distance - balance.distanceCloseRatePerSecond * dtSeconds);
}

export function afterCoin(distance, balance) {
  return Math.max(0, distance - balance.coinDistanceBonus);
}

export function afterHit(distance, balance) {
  return distance + balance.collisionDistancePenalty;
}

// 0 na distância inicial (ou mais longe), 1 colado em Caio.
export function proximity(distance, balance) {
  return Math.min(1, Math.max(0, 1 - distance / balance.initialDistance));
}

// Quanto mais perto Chico chega, mais rápido Caio foge.
export function fleeSpeed(runnerSpeed, distance, balance) {
  return runnerSpeed + balance.proximitySpeedBonus * (1 + proximity(distance, balance));
}

// A velocidade da corrida acompanha a proximidade, até o máximo.
export function runSpeed(baseSpeed, distance, balance) {
  return Math.min(
    balance.maxSpeed,
    baseSpeed + balance.proximitySpeedBonus * proximity(distance, balance),
  );
}

export function runwayStartMeters(city, balance) {
  return Math.max(0, city.lengthMeters - balance.bossRunwayMeters);
}

// Desfecho do confronto, ou null enquanto ele continua. Onde Caio pode ser preso, só a distância
// zero vence, a qualquer momento da pista de embarque; nas outras cidades, vale a distância ao fim
// da pista, e Caio sempre foge.
export function bossResult({ city, distance, runwayOver }, balance) {
  if (city.catchable) {
    if (distance <= 0) return BOSS_RESULTS.CAUGHT;
    return runwayOver ? BOSS_RESULTS.TOO_FAR : null;
  }
  if (!runwayOver) return null;
  return distance <= balance.minVictoryDistance
    ? BOSS_RESULTS.ESCAPED_BY_LITTLE
    : BOSS_RESULTS.TOO_FAR;
}
