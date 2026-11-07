// Vidas e cidade alcançada (FR-013, FR-023, FR-024, FR-025). Funções puras sobre
// { cityReached, lives }; loadProgress e recordRunEnd leem e gravam o progresso via storage.js.
import defaultCities from '../config/cities.json';
import { DEFAULT_SAVE, loadSave, writeSave } from '../platform/storage.js';

export const STARTING_LIVES = DEFAULT_SAVE.lives;
export const FIRST_CITY = DEFAULT_SAVE.cityReached;

const freshStart = () => ({ cityReached: FIRST_CITY, lives: STARTING_LIVES });

// Um save sem vidas (gravado no fim de um jogo) recomeça do início.
export function progressFromSave({ cityReached, lives }) {
  return lives > 0 ? { cityReached, lives } : freshStart();
}

// Perder uma corrida custa uma vida e mantém a cidade; sem vidas, o jogo volta a Brasília com 3.
export function loseLife(progress) {
  if (progress.lives > 1) {
    return { progress: { ...progress, lives: progress.lives - 1 }, gameOver: false };
  }
  return { progress: freshStart(), gameOver: true };
}

export function gainLives(progress, count = 1) {
  return { ...progress, lives: progress.lives + count };
}

// Quantas vezes a pontuação cruzou um múltiplo de extraLifeScore ao ir de before para after.
export function extraLivesForScore(before, after, extraLifeScore) {
  return Math.floor(after / extraLifeScore) - Math.floor(before / extraLifeScore);
}

// Cidade seguinte pelo campo order, ou null depois da última.
export function nextCity(cityId, cities = defaultCities) {
  const sorted = [...cities].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((city) => city.id === cityId);
  return sorted[index + 1]?.id ?? null;
}

// As vidas ganhas na corrida contam antes da perda. Vencer leva à cidade seguinte; vencer a última
// (Caio preso em Washington) conclui o jogo, e o próximo começa do início.
export function finishRun(progress, { outcome, livesGained = 0 }) {
  const withGains = gainLives(progress, livesGained);
  if (outcome === 'lost') return { ...loseLife(withGains), livesLost: 1, completed: false };
  const next = nextCity(progress.cityReached);
  return {
    progress: next ? { ...withGains, cityReached: next } : freshStart(),
    livesLost: 0,
    gameOver: false,
    completed: !next,
  };
}

export function loadProgress(storage) {
  return progressFromSave(loadSave(storage));
}

export function recordRunEnd(result, storage) {
  const save = loadSave(storage);
  const end = finishRun(progressFromSave(save), result);
  writeSave({ ...save, ...end.progress }, storage);
  return end;
}
