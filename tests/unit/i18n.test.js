import { afterEach, describe, expect, it } from 'vitest';
import cities from '../../src/config/cities.json';
import en from '../../src/config/i18n/en.json';
import es from '../../src/config/i18n/es.json';
import pt from '../../src/config/i18n/pt.json';
import { LANGUAGES, getLanguage, setLanguage, setTextParams, t } from '../../src/i18n.js';

// Todas as chaves de texto, como 'hud.score'.
const keys = (node, prefix = '') =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('t', () => {
  it('devolve o texto em português por padrão', () => {
    expect(t('title.name')).toBe(pt.title.name);
  });

  it.each([
    'title',
    'pause',
    'gameOver',
    'levelWon',
    'lifeLost',
    'victory',
    'cities',
    'city',
    'hud',
  ])('tem as chaves de %s', (section) => {
    expect(Object.keys(pt[section]).length).toBeGreaterThan(0);
  });

  it('substitui parâmetros no texto', () => {
    expect(t('hud.score', { score: 120 })).toBe(pt.hud.score.replace('{score}', '120'));
  });

  it('mantém parâmetros que não foram informados', () => {
    expect(t('hud.score')).toBe(pt.hud.score);
  });

  it('devolve a própria chave quando ela não existe ou não é texto', () => {
    expect(t('nada.aqui')).toBe('nada.aqui');
    expect(t('hud')).toBe('hud');
  });
});

describe('idiomas (FR-020)', () => {
  afterEach(() => setLanguage('pt'));

  it('tem português, espanhol e inglês', () => {
    expect([...LANGUAGES].sort()).toEqual(['en', 'es', 'pt']);
  });

  it.each([
    ['es', es],
    ['en', en],
  ])('%s tem as mesmas chaves e parâmetros do português', (language, messages) => {
    expect(keys(messages).sort()).toEqual(keys(pt).sort());
    for (const key of keys(pt)) {
      expect(params(t(key, {}, language)), key).toEqual(params(t(key)));
    }
  });

  it('escolhe o idioma por chamada sem mudar o padrão', () => {
    expect(t('hud.runway', {}, 'es')).toBe(es.hud.runway);
    expect(t('hud.runway', {}, 'en')).toBe(en.hud.runway);
    expect(getLanguage()).toBe('pt');
    expect(t('hud.runway')).toBe(pt.hud.runway);
  });

  it('setLanguage muda o idioma padrão e ignora idiomas desconhecidos', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('title.start')).toBe(en.title.start);
    setLanguage('xx');
    expect(getLanguage()).toBe('en');
  });

  it('idioma desconhecido usa o português', () => {
    expect(t('title.start', {}, 'xx')).toBe(pt.title.start);
  });

  it('cada cidade tem textos no seu idioma', () => {
    for (const city of cities) {
      expect(LANGUAGES).toContain(city.language);
      expect(t(`cities.${city.id}`, {}, city.language)).not.toBe(`cities.${city.id}`);
      expect(t('city.welcome', {}, city.language)).not.toBe('city.welcome');
    }
    expect(t('cities.assuncao', {}, 'es')).toBe('Asunción');
  });
});

describe('textos com o nome dos personagens (FR-017, SC-006)', () => {
  afterEach(() => setTextParams({ target: undefined }));

  it('preenche {target} com o nome registrado, sem repetir a cada chamada', () => {
    setTextParams({ target: 'Zeca' });
    expect(t('city.goal')).toBe('Alcance Zeca!');
    expect(t('victory.caught', { city: 'Washington' })).toBe('Zeca foi preso em Washington!');
    expect(t('hud.distance', {}, 'es')).toBe('Zeca');
  });

  it('o parâmetro da chamada vale mais que o registrado', () => {
    setTextParams({ target: 'Zeca' });
    expect(t('hud.distance', { target: 'Ana' })).toBe('Ana');
  });

  it('nenhum texto fixa o nome padrão do alvo', () => {
    for (const messages of [pt, es, en]) {
      expect(JSON.stringify(messages)).not.toMatch(/Caio|Chico/);
    }
  });
});
