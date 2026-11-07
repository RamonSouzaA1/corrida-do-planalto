import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import cities from '../../src/config/cities.json';
import { loadProgress, recordRunEnd } from '../../src/core/progress.js';
import { createRun } from '../../src/core/run.js';
import { DEFAULT_SAVE, loadSave, writeSave } from '../../src/platform/storage.js';
import { autopilot, runToEnd } from './autopilot.js';

const ORDER = ['brasilia', 'assuncao', 'buenos-aires', 'washington'];

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

// Joga a cidade salva até o fim com o piloto automático e grava o desfecho.
function playCurrentCity(storage, seed) {
  const { cityReached } = loadProgress(storage);
  const run = createRun({ cityId: cityReached, seed });
  const events = runToEnd(run, autopilot({ coinHunter: true }));
  const end = recordRunEnd({ outcome: run.state, livesGained: run.livesGained }, storage);
  return { cityId: cityReached, run, last: events.at(-1), end };
}

// Pista vazia e Caio colado em Chico desde o início: o desfecho depende só da cidade.
function runNextToCaio(cityId) {
  const run = createRun({
    cityId,
    balance: { ...balance, initialDistance: 1 },
    track: { obstacles: [], coins: [] },
  });
  const events = runToEnd(run);
  return { run, last: events.at(-1) };
}

describe('campanha de Brasília a Washington', () => {
  it('vence cada cidade, avança para a seguinte e prende Caio só em Washington', () => {
    const storage = memoryStorage();
    const played = [];
    for (let i = 0; i < ORDER.length; i += 1) played.push(playCurrentCity(storage, 99));

    expect(played.map((step) => step.cityId)).toEqual(ORDER);
    for (const { run } of played) {
      expect(run.state).toBe('won');
      expect(run.metersRun).toBeLessThanOrEqual(run.city.lengthMeters);
    }
    expect(played.map((step) => step.last.caught)).toEqual([false, false, false, true]);
    expect(played.map((step) => step.end.progress.cityReached)).toEqual([
      'assuncao',
      'buenos-aires',
      'washington',
      'brasilia',
    ]);
    expect(played.map((step) => step.end.completed)).toEqual([false, false, false, true]);
  });

  it('cada corrida usa a pista, os obstáculos e os coletáveis da sua cidade', () => {
    for (const city of cities) {
      const run = createRun({ cityId: city.id, seed: 5 });
      const obstacleSprites = new Set(city.obstacles.map((kind) => kind.sprite));
      const coinSprites = new Set(city.collectibles.map((kind) => kind.sprite));
      expect(run.city).toBe(city);
      expect(run.track.obstacles.every((o) => obstacleSprites.has(o.sprite))).toBe(true);
      expect(run.track.coins.every((c) => coinSprites.has(c.sprite))).toBe(true);
      expect(run.track.obstacles.at(-1).meters).toBeLessThan(city.lengthMeters);
    }
  });

  it.each(['brasilia', 'assuncao', 'buenos-aires'])(
    'em %s Caio sempre foge, mesmo com Chico colado nele',
    (cityId) => {
      const { run, last } = runNextToCaio(cityId);
      expect(run.state).toBe('won');
      expect(run.caught).toBe(false);
      expect(run.metersRun).toBe(run.city.lengthMeters);
      expect(last).toMatchObject({ type: 'won', caught: false });
    },
  );

  it('em Washington Chico prende Caio antes do fim da pista de embarque', () => {
    const { run, last } = runNextToCaio('washington');
    expect(run.state).toBe('won');
    expect(run.caught).toBe(true);
    expect(run.inBossRunway).toBe(true);
    expect(run.metersRun).toBeLessThan(run.city.lengthMeters);
    expect(last).toMatchObject({ type: 'won', caught: true });
  });

  it('a vitória final termina o jogo e o próximo começa em Brasília com 3 vidas', () => {
    const storage = memoryStorage();
    writeSave({ ...DEFAULT_SAVE, cityReached: 'washington', lives: 1, bestScore: 300 }, storage);
    const end = recordRunEnd({ outcome: 'won', livesGained: 0 }, storage);
    expect(end).toMatchObject({ completed: true, gameOver: false, livesLost: 0 });
    expect(loadSave(storage)).toEqual({
      ...DEFAULT_SAVE,
      bestScore: 300,
      cityReached: 'brasilia',
      lives: 3,
    });
  });

  it('perder numa cidade avançada recomeça nela mesma', () => {
    const storage = memoryStorage();
    writeSave({ ...DEFAULT_SAVE, cityReached: 'buenos-aires' }, storage);
    const end = recordRunEnd({ outcome: 'lost', livesGained: 0 }, storage);
    expect(end.progress).toEqual({ cityReached: 'buenos-aires', lives: 2 });
    expect(loadProgress(storage).cityReached).toBe('buenos-aires');
  });
});
