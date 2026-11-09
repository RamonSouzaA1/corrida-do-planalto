// Pista vista de trás do corredor, em retrato (estilo Subway Surfers): as três faixas saem do
// horizonte e abrem até a base da tela. z é a distância em metros à frente de Chico.
export const VIEW = { width: 180, height: 320 };
export const HORIZON_Y = 118;
// Linha dos pés de Chico; é onde os sprites aparecem no tamanho original.
export const FEET_Y = 268;
export const LANE_WIDTH = 50;
// Trecho da pista que aparece: de pouco atrás de Chico (base da tela) até sumir no horizonte.
export const NEAREST_Z = -1.6;
export const FARTHEST_Z = 70;

const CENTER_X = VIEW.width / 2;
const CAMERA_METERS = 6;
const ROAD_HALF_WIDTH = LANE_WIDTH * 1.5 + 4;
const CURB_WIDTH = 5;
const LINE_HALF_WIDTH = 1;
// Faixas do chão e traços da pista, que dão a sensação de velocidade.
const BAND_METERS = 2;

export const depthScale = (z) => CAMERA_METERS / (CAMERA_METERS + z);

// Posição na tela e escala de um ponto do chão; laneOffset é -1, 0 ou 1 nas três faixas (valores
// maiores ficam fora da pista).
export function project(laneOffset, z) {
  const scale = depthScale(z);
  return {
    x: CENTER_X + laneOffset * LANE_WIDTH * scale,
    y: HORIZON_Y + (FEET_Y - HORIZON_Y) * scale,
    scale,
  };
}

// Cor da paleta da cidade pela posição (cities.json).
export const paletteColor = (city, slot) => parseInt(city.palette[slot].slice(1), 16);

// Trecho da pista entre duas distâncias, de x = centro + from até centro + to (em pixels na linha
// dos pés).
function quad(graphics, near, far, from, to) {
  graphics.fillPoints(
    [
      { x: CENTER_X + from * near.scale, y: near.y },
      { x: CENTER_X + to * near.scale, y: near.y },
      { x: CENTER_X + to * far.scale, y: far.y },
      { x: CENTER_X + from * far.scale, y: far.y },
    ],
    true,
  );
}

// Desenha o chão, a pista, o meio-fio e as divisórias das faixas. Só usa cores da paleta da
// cidade (city.road), para o cenário continuar com no máximo 16 cores (FR-014).
export function drawRoad(graphics, city, metersRun, { line = city.road.line } = {}) {
  const { ground, surface, curb } = city.road;
  const row = (z) => {
    const point = project(0, z);
    return { scale: point.scale, y: Math.round(point.y) };
  };
  const bands = [];
  for (let k = Math.floor((metersRun + NEAREST_Z) / BAND_METERS); ; k += 1) {
    const from = Math.max(k * BAND_METERS - metersRun, NEAREST_Z);
    if (from >= FARTHEST_Z) break;
    bands.push({ even: k % 2 === 0, near: row(from), far: row((k + 1) * BAND_METERS - metersRun) });
  }

  graphics.clear();
  graphics.fillStyle(paletteColor(city, ground[0]));
  graphics.fillRect(0, HORIZON_Y, VIEW.width, VIEW.height - HORIZON_Y);
  graphics.fillStyle(paletteColor(city, ground[1]));
  for (const { even, near, far } of bands) {
    if (!even) graphics.fillRect(0, far.y, VIEW.width, near.y - far.y);
  }

  graphics.fillStyle(paletteColor(city, surface));
  quad(graphics, row(NEAREST_Z), { scale: 0, y: HORIZON_Y }, -ROAD_HALF_WIDTH, ROAD_HALF_WIDTH);

  for (const { even, near, far } of bands) {
    if (near.y === far.y) continue;
    graphics.fillStyle(paletteColor(city, curb[even ? 0 : 1]));
    quad(graphics, near, far, -ROAD_HALF_WIDTH - CURB_WIDTH, -ROAD_HALF_WIDTH);
    quad(graphics, near, far, ROAD_HALF_WIDTH, ROAD_HALF_WIDTH + CURB_WIDTH);
    if (!even) continue;
    graphics.fillStyle(paletteColor(city, line));
    for (const side of [-1, 1]) {
      const x = (side * LANE_WIDTH) / 2;
      quad(graphics, near, far, x - LINE_HALF_WIDTH, x + LINE_HALF_WIDTH);
    }
  }
}
