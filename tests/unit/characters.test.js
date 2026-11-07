import { describe, expect, it, vi } from 'vitest';
import schema from '../../specs/001-corrida-do-planalto/contracts/characters.schema.json';
import charactersConfig from '../../src/config/characters.json';
import {
  CHARACTER_IDS,
  DEFAULT_CHARACTERS,
  characters,
  loadCharacters,
  shortName,
} from '../../src/config/characters.js';

describe('characters', () => {
  it('segue o contrato characters.schema.json', () => {
    expect(CHARACTER_IDS).toEqual(schema.required);
  });

  it('carrega characters.json sem avisos', () => {
    const warn = vi.fn();
    expect(loadCharacters(charactersConfig, warn)).toEqual(charactersConfig);
    expect(warn).not.toHaveBeenCalled();
    expect(characters).toEqual(charactersConfig);
  });

  it('usa nome e sprite padrão para personagem ausente e avisa', () => {
    const warn = vi.fn();
    const { guard, ...withoutGuard } = charactersConfig;
    const result = loadCharacters(withoutGuard, warn);
    expect(result.guard).toEqual(DEFAULT_CHARACTERS.guard);
    expect(result.runner).toEqual(charactersConfig.runner);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('guard'));
    expect(guard).toBeDefined();
  });

  it('usa o nome padrão quando o nome é vazio, mantendo o sprite', () => {
    const warn = vi.fn();
    const result = loadCharacters(
      { ...charactersConfig, target: { name: '  ', sprite: 'caio-alt' } },
      warn,
    );
    expect(result.target).toEqual({ name: DEFAULT_CHARACTERS.target.name, sprite: 'caio-alt' });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('usa o sprite padrão quando o sprite falta, mantendo o nome', () => {
    const warn = vi.fn();
    const result = loadCharacters({ ...charactersConfig, runner: { name: 'Zé' } }, warn);
    expect(result.runner).toEqual({ name: 'Zé', sprite: DEFAULT_CHARACTERS.runner.sprite });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each([null, 'personagens', 42, []])('usa todos os padrões para configuração %j', (config) => {
    const warn = vi.fn();
    expect(loadCharacters(config, warn)).toEqual(DEFAULT_CHARACTERS);
    expect(warn).toHaveBeenCalled();
  });

  it('ignora personagens e campos desconhecidos e avisa', () => {
    const warn = vi.fn();
    const result = loadCharacters(
      {
        ...charactersConfig,
        reporter: { ...charactersConfig.reporter, color: 'red' },
        pilot: { name: 'Piloto', sprite: 'piloto' },
      },
      warn,
    );
    expect(result).toEqual(charactersConfig);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('pilot'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('color'));
  });
});

describe('shortName', () => {
  it('usa a primeira palavra do nome, para caber nos textos do jogo', () => {
    expect(shortName('Caio Herdeiro')).toBe('Caio');
    expect(shortName('  Zeca   da Silva ')).toBe('Zeca');
    expect(shortName('Bia')).toBe('Bia');
  });

  it('com o nome de personagem padrão devolve o primeiro nome', () => {
    expect(shortName(DEFAULT_CHARACTERS.target.name)).toBe('Caio');
    expect(shortName(DEFAULT_CHARACTERS.runner.name)).toBe('Chico');
  });
});
