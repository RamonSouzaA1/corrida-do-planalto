// Teclado → comandos, conforme specs/001-corrida-do-planalto/contracts/input-commands.md.
import { COMMANDS } from './commands.js';

const KEY_COMMANDS = {
  ArrowLeft: COMMANDS.LEFT,
  ArrowRight: COMMANDS.RIGHT,
  ArrowUp: COMMANDS.JUMP,
  ArrowDown: COMMANDS.SLIDE,
  Escape: COMMANDS.PAUSE,
  p: COMMANDS.PAUSE,
  P: COMMANDS.PAUSE,
};

export const keyToCommand = (key) => KEY_COMMANDS[key] ?? null;

// Chama emit(command) a cada tecla de comando pressionada (sem repetição ao segurar a tecla).
// Devolve uma função que para de ouvir.
export function bindKeyboard(emit, target = globalThis.window) {
  const onKeyDown = (event) => {
    const command = keyToCommand(event.key);
    if (!command) return;
    // As setas rolariam a página.
    event.preventDefault();
    if (!event.repeat) emit(command);
  };
  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}
