import balance from '../config/balance.json';

export function addCoin(score, points = balance.coinPoints) {
  return score + points;
}

// A melhor pontuação só sobe, nunca desce.
export function bestScoreAfter(bestScore, score) {
  return Math.max(bestScore, score);
}
