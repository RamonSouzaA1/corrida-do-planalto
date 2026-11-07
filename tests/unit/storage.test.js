import { describe, expect, it } from 'vitest';
import schema from '../../specs/001-corrida-do-planalto/contracts/save-data.schema.json';
import {
  CITY_IDS,
  DEFAULT_SAVE,
  SAVE_KEY,
  SAVE_VERSION,
  isValidSave,
  loadSave,
  writeSave,
} from '../../src/platform/storage.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

const blockedStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

const validSave = {
  version: 1,
  bestScore: 1200,
  cityReached: 'assuncao',
  lives: 2,
  soundOn: false,
};

describe('storage', () => {
  it('segue o contrato save-data.schema.json', () => {
    expect(SAVE_VERSION).toBe(schema.properties.version.const);
    expect(CITY_IDS).toEqual(schema.properties.cityReached.enum);
    expect(Object.keys(DEFAULT_SAVE).sort()).toEqual([...schema.required].sort());
  });

  it('usa uma chave versionada', () => {
    expect(SAVE_KEY).toContain(`v${SAVE_VERSION}`);
  });

  it('devolve os valores iniciais quando não há dado guardado', () => {
    expect(loadSave(memoryStorage())).toEqual({
      version: 1,
      bestScore: 0,
      cityReached: 'brasilia',
      lives: 3,
      soundOn: true,
    });
  });

  it('grava e lê de volta o progresso', () => {
    const storage = memoryStorage();
    expect(writeSave(validSave, storage)).toBe(true);
    expect(loadSave(storage)).toEqual(validSave);
  });

  it('devolve uma cópia nova dos valores iniciais', () => {
    const save = loadSave(memoryStorage());
    save.bestScore = 99;
    expect(loadSave(memoryStorage()).bestScore).toBe(0);
  });

  it('descarta dado corrompido', () => {
    expect(loadSave(memoryStorage({ [SAVE_KEY]: '{not json' }))).toEqual(DEFAULT_SAVE);
  });

  it.each([
    ['versão desconhecida', { ...validSave, version: 2 }],
    ['bestScore negativo', { ...validSave, bestScore: -1 }],
    ['bestScore fracionado', { ...validSave, bestScore: 1.5 }],
    ['cidade desconhecida', { ...validSave, cityReached: 'rio' }],
    ['vidas negativas', { ...validSave, lives: -1 }],
    ['soundOn não booleano', { ...validSave, soundOn: 'yes' }],
    ['campo ausente', { version: 1, bestScore: 0, cityReached: 'brasilia', lives: 3 }],
    ['campo a mais', { ...validSave, cheat: true }],
    ['null', null],
    ['lista', [validSave]],
  ])('descarta dado inválido: %s', (_label, data) => {
    expect(isValidSave(data)).toBe(false);
    expect(loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify(data) }))).toEqual(DEFAULT_SAVE);
  });

  it('continua funcionando com o armazenamento bloqueado', () => {
    expect(loadSave(blockedStorage)).toEqual(DEFAULT_SAVE);
    expect(writeSave(validSave, blockedStorage)).toBe(false);
  });

  it('continua funcionando sem armazenamento disponível', () => {
    expect(loadSave(null)).toEqual(DEFAULT_SAVE);
    expect(writeSave(validSave, null)).toBe(false);
  });

  it('não grava dado inválido', () => {
    const storage = memoryStorage();
    expect(writeSave({ ...validSave, lives: -2 }, storage)).toBe(false);
    expect(storage.data.size).toBe(0);
  });
});
