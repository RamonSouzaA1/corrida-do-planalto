// Toque → comandos, conforme specs/001-corrida-do-planalto/contracts/input-commands.md.
import balance from '../config/balance.json';
import { COMMANDS } from './commands.js';

// Comando do gesto que andou (dx, dy) em pixels; null se não passou da distância mínima.
// O eixo com o maior deslocamento decide o comando.
export function swipeCommand(dx, dy, minPixels = balance.swipeMinPixels) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minPixels) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? COMMANDS.LEFT : COMMANDS.RIGHT;
  return dy < 0 ? COMMANDS.JUMP : COMMANDS.SLIDE;
}

// Chama emit(command) a cada gesto reconhecido. Um mesmo arraste pode gerar mais de um comando
// (arrastar por duas faixas): depois de cada comando, o ponto de partida passa para onde o dedo
// está. Toque simples não gera comando. Devolve uma função que para de ouvir.
export function bindTouch(emit, target = globalThis.window, minPixels = balance.swipeMinPixels) {
  let start = null;

  const onDown = (event) => {
    start = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onMove = (event) => {
    if (!start || event.pointerId !== start.id) return;
    const command = swipeCommand(event.clientX - start.x, event.clientY - start.y, minPixels);
    if (!command) return;
    start = { id: start.id, x: event.clientX, y: event.clientY };
    emit(command);
  };
  const onEnd = (event) => {
    if (start && event.pointerId === start.id) start = null;
  };

  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onEnd);
  target.addEventListener('pointercancel', onEnd);
  return () => {
    target.removeEventListener('pointerdown', onDown);
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onEnd);
    target.removeEventListener('pointercancel', onEnd);
  };
}
