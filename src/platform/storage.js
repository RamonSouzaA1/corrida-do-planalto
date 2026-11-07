// Progresso guardado no aparelho; contrato em specs/001-corrida-do-planalto/contracts/save-data.schema.json.
export const SAVE_VERSION = 1;
export const SAVE_KEY = `corrida-do-planalto:save:v${SAVE_VERSION}`;
export const CITY_IDS = ['brasilia', 'assuncao', 'buenos-aires', 'washington'];

export const DEFAULT_SAVE = Object.freeze({
  version: SAVE_VERSION,
  bestScore: 0,
  cityReached: 'brasilia',
  lives: 3,
  soundOn: true,
});

const SAVE_FIELDS = Object.keys(DEFAULT_SAVE);

// O simples acesso a localStorage pode lançar erro com o armazenamento bloqueado.
function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

export function isValidSave(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.length !== SAVE_FIELDS.length || !keys.every((key) => SAVE_FIELDS.includes(key))) {
    return false;
  }
  return (
    data.version === SAVE_VERSION &&
    isNonNegativeInteger(data.bestScore) &&
    CITY_IDS.includes(data.cityReached) &&
    isNonNegativeInteger(data.lives) &&
    typeof data.soundOn === 'boolean'
  );
}

export function loadSave(storage = browserStorage()) {
  if (storage) {
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw !== null) {
        const data = JSON.parse(raw);
        if (isValidSave(data)) return data;
      }
    } catch {
      // Armazenamento bloqueado ou dado corrompido: segue com os valores iniciais.
    }
  }
  return { ...DEFAULT_SAVE };
}

export function writeSave(data, storage = browserStorage()) {
  if (!storage || !isValidSave(data)) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
