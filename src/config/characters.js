// Nomes e sprites dos personagens (FR-017); contrato em
// specs/001-corrida-do-planalto/contracts/characters.schema.json.
import charactersConfig from './characters.json';

export const CHARACTER_IDS = ['runner', 'target', 'guard', 'reporter'];

const FIELDS = ['name', 'sprite'];

export const DEFAULT_CHARACTERS = Object.freeze({
  runner: Object.freeze({ name: 'Chico do Planalto', sprite: 'chico' }),
  target: Object.freeze({ name: 'Caio Herdeiro', sprite: 'caio' }),
  guard: Object.freeze({ name: 'Guarda de segurança', sprite: 'guarda' }),
  reporter: Object.freeze({ name: 'Jornalista', sprite: 'jornalista' }),
});

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

export function loadCharacters(config, warn = console.warn) {
  if (!isObject(config)) {
    warn('Configuração de personagens inválida; usando os valores padrão.');
    config = {};
  }
  for (const id of Object.keys(config)) {
    if (!CHARACTER_IDS.includes(id)) warn(`Personagem desconhecido "${id}" ignorado.`);
  }

  const result = {};
  for (const id of CHARACTER_IDS) {
    const entry = isObject(config[id]) ? config[id] : {};
    for (const field of Object.keys(entry)) {
      if (!FIELDS.includes(field)) warn(`Campo desconhecido "${field}" de "${id}" ignorado.`);
    }
    result[id] = {};
    for (const field of FIELDS) {
      if (isFilledString(entry[field])) {
        result[id][field] = entry[field];
      } else {
        result[id][field] = DEFAULT_CHARACTERS[id][field];
        warn(`Personagem "${id}" sem "${field}" válido; usando "${result[id][field]}".`);
      }
    }
  }
  return result;
}

// Nome curto para os textos do jogo (barra de distância, mensagens): a primeira palavra do nome.
export const shortName = (name) => name.trim().split(/\s+/)[0];

export const characters = loadCharacters(charactersConfig);
