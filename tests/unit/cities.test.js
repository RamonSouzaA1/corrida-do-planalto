import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import spriteManifest from '../../src/assets/sprites/sprites.json';
import cities from '../../src/config/cities.json';
import { OBSTACLE_TYPES } from '../../src/core/collision.js';

const ORDER = ['brasilia', 'assuncao', 'buenos-aires', 'washington'];
const LANGUAGES = { brasilia: 'pt', assuncao: 'es', 'buenos-aires': 'es', washington: 'en' };
// Posições da paleta usadas pelos personagens e itens que aparecem em todas as cidades (preto,
// branco, azul-marinho, azul, verde, cinza, amarelo, vermelho, pele e marrom). Elas são iguais em
// todas as cidades, para que cada cenário continue com no máximo 16 cores na tela.
const SHARED_SLOTS = [0, 1, 2, 3, 7, 9, 11, 13, 14, 15];
const BACKGROUND_LAYERS = ['far', 'mid', 'near', 'track'];

const byId = (id) => cities.find((city) => city.id === id);

describe('cities.json', () => {
  it('tem as quatro cidades, com order único de 1 a 4, na ordem da perseguição', () => {
    expect(cities.map((city) => city.id).sort()).toEqual([...ORDER].sort());
    const sorted = [...cities].sort((a, b) => a.order - b.order);
    expect(sorted.map((city) => city.order)).toEqual([1, 2, 3, 4]);
    expect(sorted.map((city) => city.id)).toEqual(ORDER);
  });

  it.each(ORDER)('%s tem paleta própria com no máximo 16 cores válidas', (id) => {
    const { palette } = byId(id);
    expect(palette.length).toBeGreaterThan(0);
    expect(palette.length).toBeLessThanOrEqual(16);
    for (const color of palette) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(palette).size).toBe(palette.length);
  });

  it('as paletas diferem entre as cidades, mas mantêm as cores compartilhadas', () => {
    const palettes = cities.map((city) => city.palette.join());
    expect(new Set(palettes).size).toBe(cities.length);
    const brasilia = byId('brasilia').palette;
    for (const city of cities) {
      for (const slot of SHARED_SLOTS) expect(city.palette[slot]).toBe(brasilia[slot]);
    }
  });

  it('catchable é verdadeiro só em Washington', () => {
    for (const city of cities) expect(city.catchable).toBe(city.id === 'washington');
  });

  it.each(ORDER)('%s tem o idioma dos seus textos (FR-020)', (id) => {
    expect(byId(id).language).toBe(LANGUAGES[id]);
  });

  it.each(ORDER)('%s tem 1.000 m e um fundo com as quatro camadas', (id) => {
    const city = byId(id);
    expect(city.lengthMeters).toBe(1000);
    for (const layer of BACKGROUND_LAYERS) {
      const url = new URL(
        `../../src/assets/backgrounds/${city.background}/${layer}.png`,
        import.meta.url,
      );
      expect(existsSync(url), `${city.background}/${layer}.png`).toBe(true);
    }
    const backgrounds = cities.map((entry) => entry.background);
    expect(new Set(backgrounds).size).toBe(cities.length);
  });

  it.each(ORDER)('%s tem obstáculos dos três tipos, com guarda e jornalista', (id) => {
    const { obstacles } = byId(id);
    const types = new Set(obstacles.map((kind) => kind.type));
    expect([...types].sort()).toEqual(Object.values(OBSTACLE_TYPES).sort());
    const characters = obstacles.map((kind) => kind.character).filter(Boolean);
    expect(characters).toContain('guard');
    expect(characters).toContain('reporter');
  });

  it.each(ORDER)('%s só usa sprites que existem', (id) => {
    const { obstacles, collectibles } = byId(id);
    expect(collectibles.length).toBeGreaterThan(0);
    for (const item of [...obstacles, ...collectibles]) {
      expect(spriteManifest, item.sprite).toHaveProperty([item.sprite]);
    }
    for (const item of collectibles) expect(item.type).toBe('coin');
  });

  it('cada cidade tem obstáculos e coletáveis próprios', () => {
    const own = (city) =>
      [...city.obstacles, ...city.collectibles]
        .filter((item) => !item.character)
        .map((item) => item.sprite);
    for (const city of cities) {
      const others = new Set(cities.filter((c) => c !== city).flatMap(own));
      expect(
        own(city).some((sprite) => !others.has(sprite)),
        city.id,
      ).toBe(true);
    }
  });
});
