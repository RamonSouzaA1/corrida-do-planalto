// Faixas, troca de faixa, pulo e deslize do corredor. O corredor é qualquer objeto com
// { lane, action, actionTimeLeft } (a própria corrida, em run.js).
import { COMMANDS } from '../input/commands.js';

export const LANE_COUNT = 3;

export const ACTIONS = Object.freeze({ RUN: 'run', JUMP: 'jump', SLIDE: 'slide' });

const DURATION_KEYS = { [ACTIONS.JUMP]: 'jumpSeconds', [ACTIONS.SLIDE]: 'slideSeconds' };

export function createRunner() {
  return { lane: 1, action: ACTIONS.RUN, actionTimeLeft: 0 };
}

// direction: -1 para a esquerda, +1 para a direita. Na faixa da extremidade não tem efeito.
export function changeLane(runner, direction) {
  const lane = runner.lane + direction;
  if (lane < 0 || lane >= LANE_COUNT) return false;
  runner.lane = lane;
  return true;
}

// Pulo e deslize são exclusivos: só começam quando o corredor está correndo.
export function startAction(runner, action, balance) {
  if (runner.action !== ACTIONS.RUN || !DURATION_KEYS[action]) return false;
  runner.action = action;
  runner.actionTimeLeft = balance[DURATION_KEYS[action]];
  return true;
}

export function updateAction(runner, dtSeconds) {
  if (runner.action === ACTIONS.RUN) return;
  runner.actionTimeLeft -= dtSeconds;
  // Tolerância para a soma de passos de tempo que não são exatos em ponto flutuante.
  if (runner.actionTimeLeft <= 1e-9) {
    runner.action = ACTIONS.RUN;
    runner.actionTimeLeft = 0;
  }
}

// Aplica LEFT, RIGHT, JUMP ou SLIDE; devolve false se o comando não teve efeito.
export function applyMove(runner, command, balance) {
  switch (command) {
    case COMMANDS.LEFT:
      return changeLane(runner, -1);
    case COMMANDS.RIGHT:
      return changeLane(runner, 1);
    case COMMANDS.JUMP:
      return startAction(runner, ACTIONS.JUMP, balance);
    case COMMANDS.SLIDE:
      return startAction(runner, ACTIONS.SLIDE, balance);
    default:
      return false;
  }
}
