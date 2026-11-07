import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import cities from '../../src/config/cities.json';
import { OBSTACLE_TYPES } from '../../src/core/collision.js';
import { LANE_COUNT } from '../../src/core/lanes.js';
import { POWER_UPS, POWER_UP_SPRITES } from '../../src/core/powerups.js';
import { generateTrack } from '../../src/core/spawner.js';

const brasilia = cities.find((city) => city.id === 'brasilia');
const SEEDS = [1, 2, 3, 42, 1234, 98765];

// Agrupa os obstáculos em fileiras (mesma posição na pista).
function rows(track) {
  const byMeters = new Map();
  for (const obstacle of track.obstacles) {
    if (!byMeters.has(obstacle.meters)) byMeters.set(obstacle.meters, []);
    byMeters.get(obstacle.meters).push(obstacle);
  }
  return [...byMeters.entries()].sort((a, b) => a[0] - b[0]);
}

describe('generateTrack', () => {
  it('a mesma semente gera a mesma sequência', () => {
    const a = generateTrack({ city: brasilia, seed: 42, balance });
    const b = generateTrack({ city: brasilia, seed: 42, balance });
    expect(a).toEqual(b);
    const c = generateTrack({ city: brasilia, seed: 43, balance });
    expect(c).not.toEqual(a);
  });

  it.each(SEEDS)('nunca bloqueia as três faixas ao mesmo tempo (semente %i)', (seed) => {
    const track = generateTrack({ city: brasilia, seed, balance });
    for (const [, row] of rows(track)) {
      const lanes = new Set(row.map((obstacle) => obstacle.lane));
      expect(lanes.size).toBe(row.length);
      expect(lanes.size).toBeLessThan(LANE_COUNT);
    }
  });

  it.each(SEEDS)('sempre há caminho: fileiras espaçadas e faixa livre (semente %i)', (seed) => {
    const track = generateTrack({ city: brasilia, seed, balance });
    const positions = rows(track).map(([meters]) => meters);
    expect(positions.length).toBeGreaterThan(10);
    expect(positions[0]).toBeGreaterThanOrEqual(balance.startClearMeters);
    expect(positions.at(-1)).toBeLessThan(brasilia.lengthMeters);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i] - positions[i - 1]).toBeGreaterThanOrEqual(balance.obstacleGapMinMeters);
    }
  });

  it('usa os obstáculos da cidade, incluindo guarda e jornalista como bloqueios', () => {
    const track = generateTrack({ city: brasilia, seed: 7, balance });
    const sprites = new Set(brasilia.obstacles.map((kind) => kind.sprite));
    for (const obstacle of track.obstacles) {
      expect(sprites.has(obstacle.sprite)).toBe(true);
      expect(Object.values(OBSTACLE_TYPES)).toContain(obstacle.type);
    }
    const characters = brasilia.obstacles
      .filter((kind) => kind.type === OBSTACLE_TYPES.BLOCKER)
      .map((kind) => kind.character);
    expect(characters).toContain('guard');
    expect(characters).toContain('reporter');
  });

  it('coloca moedas na pista, fora das posições dos obstáculos e em ordem', () => {
    const track = generateTrack({ city: brasilia, seed: 7, balance });
    expect(track.coins.length).toBeGreaterThan(0);
    const occupied = new Set(track.obstacles.map((o) => `${o.meters}:${o.lane}`));
    for (let i = 0; i < track.coins.length; i += 1) {
      const coin = track.coins[i];
      expect(coin.lane).toBeGreaterThanOrEqual(0);
      expect(coin.lane).toBeLessThan(LANE_COUNT);
      expect(occupied.has(`${coin.meters}:${coin.lane}`)).toBe(false);
      if (i > 0) expect(coin.meters).toBeGreaterThanOrEqual(track.coins[i - 1].meters);
    }
  });
});

describe('cidades', () => {
  it.each(cities.map((city) => city.id))('%s usa os próprios obstáculos e coletáveis', (id) => {
    const city = cities.find((entry) => entry.id === id);
    const track = generateTrack({ city, seed: 11, balance });
    const obstacleSprites = new Set(city.obstacles.map((kind) => kind.sprite));
    const coinSprites = new Set(city.collectibles.map((kind) => kind.sprite));
    expect(track.obstacles.every((o) => obstacleSprites.has(o.sprite))).toBe(true);
    expect(track.coins.every((c) => coinSprites.has(c.sprite))).toBe(true);
    expect(new Set(track.coins.map((c) => c.sprite)).size).toBe(coinSprites.size);
    expect(track.obstacles.at(-1).meters).toBeLessThan(city.lengthMeters);
  });

  it('cada linha de moedas usa um único coletável', () => {
    const city = cities.find((entry) => entry.collectibles.length > 1);
    const track = generateTrack({ city, seed: 3, balance });
    for (let i = 0; i < track.coins.length; i += balance.coinLineLength) {
      const line = track.coins.slice(i, i + balance.coinLineLength);
      expect(new Set(line.map((c) => c.sprite)).size).toBe(1);
    }
  });

  it('o coletável sorteado não muda a pista da mesma semente', () => {
    const single = { ...brasilia, collectibles: [{ id: 'moeda', type: 'coin', sprite: 'moeda' }] };
    const many = {
      ...brasilia,
      collectibles: [
        { id: 'moeda', type: 'coin', sprite: 'moeda' },
        { id: 'disco', type: 'coin', sprite: 'disco' },
      ],
    };
    const a = generateTrack({ city: single, seed: 42, balance });
    const b = generateTrack({ city: many, seed: 42, balance });
    const position = ({ meters, lane }) => ({ meters, lane });
    expect(b.obstacles).toEqual(a.obstacles);
    expect(b.coins.map(position)).toEqual(a.coins.map(position));
    expect(b.powerUps).toEqual(a.powerUps);
  });

  it('o comprimento da pista vem da cidade', () => {
    const short = { ...brasilia, lengthMeters: 300 };
    const track = generateTrack({ city: short, seed: 2, balance });
    expect(track.obstacles.at(-1).meters).toBeLessThan(300);
    expect(track.obstacles.at(-1).meters).toBeGreaterThan(300 - balance.obstacleGapMaxMeters - 1);
  });
});

describe('power-ups na pista', () => {
  it.each(SEEDS)('bandeiras, cartazes e malas em faixas livres, em ordem (semente %i)', (seed) => {
    const track = generateTrack({ city: brasilia, seed, balance });
    const occupied = new Set(track.obstacles.map((o) => `${o.meters}:${o.lane}`));
    const coinsAt = new Set(track.coins.map((c) => `${c.meters}:${c.lane}`));
    const random = track.powerUps.filter((item) => item.kind !== POWER_UPS.SASH);
    expect(random.length).toBeGreaterThan(0);
    for (let i = 0; i < track.powerUps.length; i += 1) {
      const item = track.powerUps[i];
      expect(Object.values(POWER_UPS)).toContain(item.kind);
      expect(item.sprite).toBe(POWER_UP_SPRITES[item.kind]);
      expect(occupied.has(`${item.meters}:${item.lane}`)).toBe(false);
      expect(coinsAt.has(`${item.meters}:${item.lane}`)).toBe(false);
      // Nenhum obstáculo na faixa do item até 1 m depois dele.
      const blocking = track.obstacles.some(
        (o) => o.lane === item.lane && Math.abs(o.meters - item.meters) < 1,
      );
      expect(blocking).toBe(false);
      if (i > 0) expect(item.meters).toBeGreaterThan(track.powerUps[i - 1].meters);
    }
    for (let i = 1; i < random.length; i += 1) {
      expect(random[i].meters - random[i - 1].meters).toBeGreaterThanOrEqual(
        balance.powerUpGapMinMeters,
      );
    }
  });

  it('faixa presidencial a cada presidentialSashEveryMeters', () => {
    const city = { ...brasilia, lengthMeters: 3000 };
    const track = generateTrack({ city, seed: 5, balance });
    const sashes = track.powerUps.filter((item) => item.kind === POWER_UPS.SASH);
    const expected = Math.floor(3000 / balance.presidentialSashEveryMeters);
    expect(sashes.length).toBeGreaterThanOrEqual(expected - 1);
    expect(sashes.length).toBeLessThanOrEqual(expected);
    sashes.forEach((sash, i) => {
      expect(sash.meters).toBeGreaterThanOrEqual((i + 1) * balance.presidentialSashEveryMeters);
      expect(sash.meters).toBeLessThan(
        (i + 1) * balance.presidentialSashEveryMeters + balance.obstacleGapMaxMeters,
      );
    });
  });

  it('os power-ups não mudam obstáculos e moedas da mesma semente', () => {
    const track = generateTrack({ city: brasilia, seed: 42, balance });
    const noItems = generateTrack({
      city: brasilia,
      seed: 42,
      balance: { ...balance, powerUpGapMinMeters: 1e9, powerUpGapMaxMeters: 1e9 },
    });
    expect(track.obstacles).toEqual(noItems.obstacles);
    expect(track.coins).toEqual(noItems.coins);
  });
});
