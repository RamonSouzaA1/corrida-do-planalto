// Gera os obstáculos e as moedas de uma cidade ao longo da pista. A mesma semente gera a mesma
// pista. Os obstáculos vêm em fileiras; cada fileira bloqueia no máximo duas das três faixas e as
// fileiras ficam a pelo menos obstacleGapMinMeters umas das outras, então sempre há caminho.
// Obstáculos, coletáveis e comprimento vêm da cidade (cities.json).
import { LANE_COUNT } from './lanes.js';
import { POWER_UPS, POWER_UP_SPRITES, RANDOM_POWER_UPS } from './powerups.js';
import { createRng } from './rng.js';

// Power-ups e coletáveis usam outros geradores, para não mudar obstáculos e moedas de uma semente.
const POWER_UP_SEED_OFFSET = 0x9e3779b9;
const COLLECTIBLE_SEED_OFFSET = 0x85ebca6b;

const pick = (rng, list) => list[Math.floor(rng.next() * list.length)];

function shuffledLanes(rng) {
  const lanes = [...Array(LANE_COUNT).keys()];
  for (let i = lanes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  return lanes;
}

export function generateTrack({ city, seed = 1, balance, endMeters = city.lengthMeters }) {
  const rng = createRng(seed);
  const rows = [];
  let meters = balance.startClearMeters;
  while (meters < endMeters) {
    const count = rng.next() < balance.doubleObstacleChance ? 2 : 1;
    const lanes = shuffledLanes(rng).slice(0, count);
    rows.push({
      meters,
      obstacles: lanes.map((lane) => {
        const kind = pick(rng, city.obstacles);
        const obstacle = { meters, lane, type: kind.type, sprite: kind.sprite };
        if (kind.character) obstacle.character = kind.character;
        return obstacle;
      }),
    });
    const gap =
      balance.obstacleGapMinMeters +
      rng.next() * (balance.obstacleGapMaxMeters - balance.obstacleGapMinMeters);
    meters = Math.round((meters + gap) * 2) / 2;
  }

  // Uma linha de moedas no meio de cada intervalo, numa faixa livre na fileira seguinte, para
  // guiar o jogador pelo caminho. Cada linha é de um coletável da cidade.
  const collectibleRng = createRng(seed + COLLECTIBLE_SEED_OFFSET);
  const coins = [];
  const coinLanes = [];
  const lineLength = (balance.coinLineLength - 1) * balance.coinSpacingMeters;
  for (let i = 0; i < rows.length - 1; i += 1) {
    const blocked = new Set(rows[i + 1].obstacles.map((obstacle) => obstacle.lane));
    const lane = pick(
      rng,
      [...Array(LANE_COUNT).keys()].filter((l) => !blocked.has(l)),
    );
    coinLanes.push(lane);
    const { sprite } = pick(collectibleRng, city.collectibles);
    const start = (rows[i].meters + rows[i + 1].meters - lineLength) / 2;
    for (let c = 0; c < balance.coinLineLength; c += 1) {
      coins.push({ meters: start + c * balance.coinSpacingMeters, lane, sprite });
    }
  }

  const powerUps = placePowerUps({ rows, coinLanes, seed, balance });
  return { obstacles: rows.flatMap((row) => row.obstacles), coins, powerUps };
}

// Um power-up sorteado a cada powerUpGapMinMeters a powerUpGapMaxMeters e a faixa presidencial a
// cada presidentialSashEveryMeters, no meio de um intervalo entre fileiras e numa faixa livre na
// fileira seguinte. Prefere uma faixa sem moedas; se só a faixa das moedas está livre, o item vem
// logo depois da linha de moedas.
function placePowerUps({ rows, coinLanes, seed, balance }) {
  const rng = createRng(seed + POWER_UP_SEED_OFFSET);
  const gap = () =>
    balance.powerUpGapMinMeters +
    rng.next() * (balance.powerUpGapMaxMeters - balance.powerUpGapMinMeters);
  const lineLength = (balance.coinLineLength - 1) * balance.coinSpacingMeters;
  const powerUps = [];
  let nextRandom = gap();
  let nextSash = balance.presidentialSashEveryMeters;

  for (let i = 0; i < rows.length - 1; i += 1) {
    const middle = (rows[i].meters + rows[i + 1].meters) / 2;
    let kind = null;
    if (middle >= nextSash) {
      kind = POWER_UPS.SASH;
      nextSash += balance.presidentialSashEveryMeters;
    } else if (middle >= nextRandom) {
      kind = pick(rng, RANDOM_POWER_UPS);
      nextRandom = middle + gap();
    }
    if (!kind) continue;

    const blocked = new Set(rows[i + 1].obstacles.map((obstacle) => obstacle.lane));
    const lanes = [...Array(LANE_COUNT).keys()].filter(
      (lane) => !blocked.has(lane) && lane !== coinLanes[i],
    );
    const item = lanes.length
      ? { meters: middle, lane: pick(rng, lanes) }
      : { meters: middle + lineLength / 2 + balance.coinSpacingMeters, lane: coinLanes[i] };
    powerUps.push({ ...item, kind, sprite: POWER_UP_SPRITES[kind] });
  }
  return powerUps;
}
