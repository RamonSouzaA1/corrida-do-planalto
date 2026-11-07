export const STEP_MS = 1000 / 60;

// Limite de tempo por chamada, para não disparar centenas de passos depois de um travamento longo.
export const MAX_DELTA_MS = 250;

// Tolerância para erros de arredondamento de STEP_MS (1000 / 60 não é exato).
const EPSILON = 1e-6;

export function createClock(step = STEP_MS) {
  let accumulator = 0;
  return {
    advance(deltaMs, onStep) {
      if (!(deltaMs > 0)) return 0;
      accumulator += Math.min(deltaMs, MAX_DELTA_MS);
      let steps = 0;
      while (accumulator + EPSILON >= step) {
        accumulator -= step;
        steps += 1;
        onStep(step);
      }
      return steps;
    },
  };
}
