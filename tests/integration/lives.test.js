import { describe, expect, it } from 'vitest';
import { STEP_MS } from '../../src/core/clock.js';
import { OBSTACLE_TYPES } from '../../src/core/collision.js';
import { POWER_UPS } from '../../src/core/powerups.js';
import { loadProgress, recordRunEnd } from '../../src/core/progress.js';
import { createRun, tick } from '../../src/core/run.js';
import { DEFAULT_SAVE, SAVE_KEY, loadSave, writeSave } from '../../src/platform/storage.js';

const DT = STEP_MS / 1000;

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

// Corrida curta que termina em derrota: dois bloqueios seguidos na faixa de Chico.
function losingRun(extraTrack = {}) {
  const obstacles = [5, 15].map((meters) => ({
    meters,
    lane: 1,
    type: OBSTACLE_TYPES.BLOCKER,
    sprite: 'guarda',
  }));
  const run = createRun({ track: { obstacles, coins: [], ...extraTrack } });
  for (let step = 0; step < 30 / DT && run.state === 'running'; step += 1) tick(run, DT);
  return run;
}

describe('sequência de derrotas até o fim das vidas', () => {
  it('cada derrota desconta uma vida e a última volta a Brasília com 3 vidas', () => {
    const storage = memoryStorage();
    writeSave({ ...DEFAULT_SAVE, cityReached: 'assuncao', bestScore: 120 }, storage);

    const results = [];
    for (let i = 0; i < 3; i += 1) {
      const run = losingRun();
      expect(run.state).toBe('lost');
      results.push(recordRunEnd({ outcome: run.state, livesGained: run.livesGained }, storage));
    }

    expect(results.map((result) => result.progress.lives)).toEqual([2, 1, 3]);
    expect(results.map((result) => result.gameOver)).toEqual([false, false, true]);
    expect(results[0].progress.cityReached).toBe('assuncao');
    expect(results[1].progress.cityReached).toBe('assuncao');
    expect(loadSave(storage)).toEqual({
      ...DEFAULT_SAVE,
      bestScore: 120,
      cityReached: 'brasilia',
      lives: 3,
    });
  });

  it('cidade e vidas sobrevivem a recarregar a página', () => {
    const storage = memoryStorage();
    recordRunEnd({ outcome: 'lost', livesGained: 0 }, storage);
    expect(JSON.parse(storage.data.get(SAVE_KEY))).toMatchObject({ lives: 2 });
    expect(loadProgress(storage)).toEqual({ cityReached: 'brasilia', lives: 2 });
  });

  it('a faixa presidencial coletada na corrida compensa a derrota', () => {
    const storage = memoryStorage();
    const run = losingRun({ powerUps: [{ meters: 2, lane: 1, kind: POWER_UPS.SASH }] });
    expect(run.livesGained).toBe(1);
    const result = recordRunEnd({ outcome: run.state, livesGained: run.livesGained }, storage);
    expect(result.progress.lives).toBe(3);
  });

  it('armazenamento bloqueado não quebra o fluxo de vidas', () => {
    const blocked = {
      getItem() {
        throw new Error('SecurityError');
      },
      setItem() {
        throw new Error('SecurityError');
      },
    };
    expect(recordRunEnd({ outcome: 'lost', livesGained: 0 }, blocked).progress.lives).toBe(2);
  });
});
