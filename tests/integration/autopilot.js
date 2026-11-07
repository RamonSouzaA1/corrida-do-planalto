// Ajudantes das corridas simuladas: correr até o fim e um piloto automático que desvia de tudo.
import { STEP_MS } from '../../src/core/clock.js';
import { OBSTACLE_TYPES } from '../../src/core/collision.js';
import { applyCommand, tick } from '../../src/core/run.js';
import { COMMANDS } from '../../src/input/commands.js';

export const DT = STEP_MS / 1000;

export function runToEnd(run, onStep = () => {}) {
  const events = [];
  for (let step = 0; step < 600 / DT && run.state === 'running'; step += 1) {
    onStep(run);
    events.push(...tick(run, DT));
  }
  return events;
}

// Piloto automático: desvia de tudo e, se coinHunter, vai para a faixa da próxima moeda.
export function autopilot({ coinHunter }) {
  return (run) => {
    const ahead = run.track.obstacles.filter(
      (o) => o.meters > run.metersRun && o.meters - run.metersRun < 1,
    );
    const mine = ahead.find((o) => o.lane === run.lane);
    if (mine?.type === OBSTACLE_TYPES.LOW) return applyCommand(run, COMMANDS.JUMP);
    if (mine?.type === OBSTACLE_TYPES.HIGH) return applyCommand(run, COMMANDS.SLIDE);
    const blocked = new Set(ahead.map((o) => o.lane));
    let goal = run.lane;
    if (mine) goal = [0, 1, 2].find((lane) => !blocked.has(lane));
    else if (coinHunter) {
      const coin = run.track.coins.find((c) => c.meters > run.metersRun);
      const rowBetween = run.track.obstacles.some(
        (o) => o.meters > run.metersRun && coin && o.meters < coin.meters,
      );
      if (coin && !rowBetween) goal = coin.lane;
    }
    while (run.lane !== goal) applyCommand(run, run.lane < goal ? COMMANDS.RIGHT : COMMANDS.LEFT);
    return true;
  };
}
