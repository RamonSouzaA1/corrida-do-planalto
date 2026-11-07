// Comandos de entrada; contrato em specs/001-corrida-do-planalto/contracts/input-commands.md.
import balance from '../config/balance.json';

export const COMMANDS = Object.freeze({
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  JUMP: 'JUMP',
  SLIDE: 'SLIDE',
  PAUSE: 'PAUSE',
});

const VALID = new Set(Object.values(COMMANDS));

export const isCommand = (value) => VALID.has(value);

// Fila em ordem de chegada. Um comando que ainda não pode ser aplicado (JUMP durante outra ação,
// por exemplo) fica na fila até queueMs depois de chegar e então é descartado.
export function createCommandQueue(queueMs = balance.commandQueueMs) {
  let pending = [];
  return {
    push(command, timeMs) {
      if (!isCommand(command)) return false;
      pending.push({ command, timeMs });
      return true;
    },
    // apply(command) devolve true quando o comando foi aplicado e pode sair da fila.
    process(timeMs, apply) {
      const kept = [];
      for (const entry of pending) {
        if (timeMs - entry.timeMs > queueMs) continue;
        if (!apply(entry.command)) kept.push(entry);
      }
      pending = kept;
    },
    clear() {
      pending = [];
    },
    get size() {
      return pending.length;
    },
  };
}
