import { describe, expect, it, vi } from 'vitest';
import { COMMANDS } from '../../src/input/commands.js';
import { watchPageFocus } from '../../src/platform/lifecycle.js';

function fakePage() {
  const document = new EventTarget();
  const window = new EventTarget();
  document.visibilityState = 'visible';
  const setVisibility = (state) => {
    document.visibilityState = state;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  return {
    document,
    window,
    hide: () => setVisibility('hidden'),
    show: () => setVisibility('visible'),
    blur: () => window.dispatchEvent(new Event('blur')),
    focus: () => window.dispatchEvent(new Event('focus')),
  };
}

describe('watchPageFocus', () => {
  it('emite PAUSE quando a página vai para segundo plano', () => {
    const page = fakePage();
    const emit = vi.fn();
    watchPageFocus(emit, page);
    page.hide();
    expect(emit).toHaveBeenCalledExactlyOnceWith(COMMANDS.PAUSE);
  });

  it('emite PAUSE quando a janela perde o foco', () => {
    const page = fakePage();
    const emit = vi.fn();
    watchPageFocus(emit, page);
    page.blur();
    expect(emit).toHaveBeenCalledExactlyOnceWith(COMMANDS.PAUSE);
  });

  it('emite um único PAUSE quando perde o foco e vai para segundo plano juntos', () => {
    const page = fakePage();
    const emit = vi.fn();
    watchPageFocus(emit, page);
    page.blur();
    page.hide();
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('não emite ao voltar, e emite de novo na próxima saída', () => {
    const page = fakePage();
    const emit = vi.fn();
    watchPageFocus(emit, page);
    page.hide();
    page.show();
    expect(emit).toHaveBeenCalledTimes(1);
    page.blur();
    expect(emit).toHaveBeenCalledTimes(2);
    page.focus();
    page.hide();
    expect(emit).toHaveBeenCalledTimes(3);
  });

  it('para de emitir depois de stop', () => {
    const page = fakePage();
    const emit = vi.fn();
    const stop = watchPageFocus(emit, page);
    stop();
    page.hide();
    page.blur();
    expect(emit).not.toHaveBeenCalled();
  });
});
