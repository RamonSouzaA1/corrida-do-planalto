import en from './config/i18n/en.json';
import es from './config/i18n/es.json';
import pt from './config/i18n/pt.json';

const DEFAULT_LANGUAGE = 'pt';
const messages = { pt, es, en };

// Português por padrão; espanhol e inglês para os textos das cidades estrangeiras (FR-020).
export const LANGUAGES = Object.freeze(Object.keys(messages));

let currentLanguage = DEFAULT_LANGUAGE;

export const getLanguage = () => currentLanguage;

// Muda o idioma padrão de t(); idioma desconhecido é ignorado.
export function setLanguage(language) {
  if (Object.hasOwn(messages, language)) currentLanguage = language;
}

const lookup = (language, key) =>
  key
    .split('.')
    .reduce(
      (node, part) => (node && typeof node === 'object' ? node[part] : undefined),
      messages[language],
    );

// Parâmetros presentes em todos os textos, como {target} (nome do alvo, vindo de characters.json),
// para as cenas não repetirem o nome a cada chamada.
const textParams = {};

export function setTextParams(params) {
  Object.assign(textParams, params);
}

// t('hud.score', { score: 10 }) → "Pontos: 10"; t('hud.runway', {}, 'es') → texto em espanhol.
// Chave ausente no idioma usa o português; ausente em todos devolve a própria chave.
export function t(key, params = {}, language = currentLanguage) {
  let text = Object.hasOwn(messages, language) ? lookup(language, key) : undefined;
  if (typeof text !== 'string') text = lookup(DEFAULT_LANGUAGE, key);
  if (typeof text !== 'string') return key;
  const values = { ...textParams, ...params };
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    values[name] === undefined ? match : String(values[name]),
  );
}
