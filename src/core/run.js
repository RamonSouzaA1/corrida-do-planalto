// Estado e atualização da corrida. tick() avança um passo de tempo fixo e devolve os eventos do
// passo ({ type: 'coin' | 'powerUp' | 'extraLife' | 'hit' | 'shielded' | 'runway' | 'lost' |
// 'won', ... }) para as cenas desenharem.
import defaultBalance from '../config/balance.json';
import defaultCities from '../config/cities.json';
import { COMMANDS } from '../input/commands.js';
import {
  BOSS_RESULTS,
  afterCoin,
  afterHit,
  bossResult,
  closeIn,
  runSpeed,
  runwayStartMeters,
} from './chase.js';
import { applyHit, collides } from './collision.js';
import { ACTIONS, applyMove, updateAction } from './lanes.js';
import {
  POWER_UPS,
  applyPowerUp,
  boostCloseIn,
  boostedSpeed,
  consumeShield,
  updatePowerUps,
} from './powerups.js';
import { extraLivesForScore } from './progress.js';
import { addCoin } from './score.js';
import { generateTrack } from './spawner.js';

export const RUN_STATES = Object.freeze({
  RUNNING: 'running',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
});

export function speedAt(elapsedSeconds, balance = defaultBalance) {
  return Math.min(
    balance.maxSpeed,
    balance.initialSpeed + balance.speedAcceleration * elapsedSeconds,
  );
}

export function createRun({
  cityId = 'brasilia',
  seed = 1,
  track,
  balance = defaultBalance,
  cities = defaultCities,
} = {}) {
  const city = cities.find((entry) => entry.id === cityId);
  if (!city) throw new Error(`Cidade desconhecida: ${cityId}`);
  return {
    cityId,
    city,
    balance,
    track: { powerUps: [], ...(track ?? generateTrack({ city, seed, balance })) },
    state: RUN_STATES.RUNNING,
    elapsed: 0,
    speed: speedAt(0, balance),
    lane: 1,
    action: ACTIONS.RUN,
    actionTimeLeft: 0,
    energy: balance.maxEnergy,
    shield: 0,
    boost: 0,
    livesGained: 0,
    score: 0,
    metersRun: 0,
    distanceToTarget: balance.initialDistance,
    inBossRunway: false,
    // Só no avião de Washington (catchable) Chico prende Caio e o jogo termina.
    caught: false,
    nextObstacle: 0,
    nextCoin: 0,
    nextPowerUp: 0,
  };
}

// Aplica um comando de movimento; devolve false se ele não pôde ser aplicado agora (a fila de
// comandos decide se tenta de novo). PAUSE é tratado por setPaused.
export function applyCommand(run, command) {
  if (run.state !== RUN_STATES.RUNNING || command === COMMANDS.PAUSE) return false;
  return applyMove(run, command, run.balance);
}

export function setPaused(run, paused) {
  if (paused && run.state === RUN_STATES.RUNNING) run.state = RUN_STATES.PAUSED;
  else if (!paused && run.state === RUN_STATES.PAUSED) run.state = RUN_STATES.RUNNING;
}

export function tick(run, dtSeconds) {
  if (run.state !== RUN_STATES.RUNNING) return [];
  const events = [];
  const { obstacles, coins, powerUps } = run.track;

  run.elapsed += dtSeconds;
  const baseSpeed = run.inBossRunway
    ? run.balance.maxSpeed
    : runSpeed(speedAt(run.elapsed, run.balance), run.distanceToTarget, run.balance);
  run.speed = boostedSpeed(baseSpeed, run, run.balance);
  run.metersRun = Math.min(run.metersRun + run.speed * dtSeconds, run.city.lengthMeters);
  run.distanceToTarget = boostCloseIn(
    closeIn(run.distanceToTarget, dtSeconds, run.balance),
    run,
    dtSeconds,
    run.balance,
  );

  if (!run.inBossRunway && run.metersRun >= runwayStartMeters(run.city, run.balance)) {
    run.inBossRunway = true;
    events.push({ type: 'runway' });
  }

  // Coleta e colisão valem no instante em que Chico passa pela posição do item.
  while (run.nextCoin < coins.length && coins[run.nextCoin].meters <= run.metersRun) {
    const coin = coins[run.nextCoin];
    run.nextCoin += 1;
    if (coin.lane !== run.lane) continue;
    const before = run.score;
    run.score = addCoin(run.score, run.balance.coinPoints);
    run.distanceToTarget = afterCoin(run.distanceToTarget, run.balance);
    events.push({ type: 'coin', coin });
    // Vida extra ao atingir o valor de pontos (FR-024).
    const lives = extraLivesForScore(before, run.score, run.balance.extraLifeScore);
    if (lives > 0) {
      run.livesGained += lives;
      events.push({ type: 'extraLife', source: 'score' });
    }
  }

  while (run.nextPowerUp < powerUps.length && powerUps[run.nextPowerUp].meters <= run.metersRun) {
    const item = powerUps[run.nextPowerUp];
    run.nextPowerUp += 1;
    if (item.lane !== run.lane) continue;
    applyPowerUp(run, item.kind, run.balance);
    events.push({ type: 'powerUp', item });
    if (item.kind === POWER_UPS.SASH) events.push({ type: 'extraLife', source: 'sash' });
  }

  while (
    run.nextObstacle < obstacles.length &&
    obstacles[run.nextObstacle].meters <= run.metersRun
  ) {
    const obstacle = obstacles[run.nextObstacle];
    run.nextObstacle += 1;
    if (!collides(run, obstacle)) continue;
    // O escudo absorve o choque inteiro: sem perda de energia e sem afastar Caio.
    const hit = applyHit(run.energy, consumeShield(run));
    if (hit.shielded) {
      events.push({ type: 'shielded', obstacle });
      continue;
    }
    run.energy = hit.energy;
    run.distanceToTarget = afterHit(run.distanceToTarget, run.balance);
    events.push({ type: 'hit', obstacle });
    if (hit.ended) {
      run.state = RUN_STATES.LOST;
      events.push({ type: 'lost', reason: 'hit' });
      return events;
    }
  }

  updateAction(run, dtSeconds);
  updatePowerUps(run, dtSeconds);

  // Confronto do avião: decide vitória ou derrota na pista de embarque.
  if (run.inBossRunway) {
    const result = bossResult(
      {
        city: run.city,
        distance: run.distanceToTarget,
        runwayOver: run.metersRun >= run.city.lengthMeters,
      },
      run.balance,
    );
    if (result === BOSS_RESULTS.TOO_FAR) {
      run.state = RUN_STATES.LOST;
      events.push({ type: 'lost', reason: 'escaped' });
    } else if (result) {
      run.state = RUN_STATES.WON;
      run.caught = result === BOSS_RESULTS.CAUGHT;
      events.push({ type: 'won', caught: run.caught });
    }
  }
  return events;
}
