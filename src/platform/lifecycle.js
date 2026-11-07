import { COMMANDS } from '../input/commands.js';

// Emite PAUSE uma vez quando a página perde o foco ou vai para segundo plano (FR-018). Perder o foco
// e ir para segundo plano costumam acontecer juntos; só a primeira saída emite, até a página voltar.
// Devolve uma função que para de observar.
export function watchPageFocus(
  emit,
  { document = globalThis.document, window = globalThis.window } = {},
) {
  let away = false;
  const leave = () => {
    if (away) return;
    away = true;
    emit(COMMANDS.PAUSE);
  };
  const back = () => {
    away = false;
  };
  const onVisibilityChange = () => (document.visibilityState === 'hidden' ? leave() : back());

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', leave);
  window.addEventListener('focus', back);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', leave);
    window.removeEventListener('focus', back);
  };
}
