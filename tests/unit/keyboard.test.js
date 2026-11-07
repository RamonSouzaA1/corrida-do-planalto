import { describe, expect, it, vi } from 'vitest';
import { COMMANDS } from '../../src/input/commands.js';
import { bindKeyboard, keyToCommand } from '../../src/input/keyboard.js';

const keydown = (key, repeat = false) =>
  Object.assign(new Event('keydown', { cancelable: true }), { key, repeat });

describe('keyToCommand', () => {
  it('converte setas, Esc e P conforme o contrato', () => {
    expect(keyToCommand('ArrowLeft')).toBe(COMMANDS.LEFT);
    expect(keyToCommand('ArrowRight')).toBe(COMMANDS.RIGHT);
    expect(keyToCommand('ArrowUp')).toBe(COMMANDS.JUMP);
    expect(keyToCommand('ArrowDown')).toBe(COMMANDS.SLIDE);
    expect(keyToCommand('Escape')).toBe(COMMANDS.PAUSE);
    expect(keyToCommand('p')).toBe(COMMANDS.PAUSE);
    expect(keyToCommand('P')).toBe(COMMANDS.PAUSE);
    expect(keyToCommand('a')).toBeNull();
  });
});

describe('bindKeyboard', () => {
  it('emite o comando, ignora repetição e para de ouvir', () => {
    const target = new EventTarget();
    const emit = vi.fn();
    const stop = bindKeyboard(emit, target);

    const event = keydown('ArrowUp');
    target.dispatchEvent(event);
    expect(emit).toHaveBeenCalledWith(COMMANDS.JUMP);
    expect(event.defaultPrevented).toBe(true);

    target.dispatchEvent(keydown('ArrowUp', true));
    target.dispatchEvent(keydown('x'));
    expect(emit).toHaveBeenCalledTimes(1);

    stop();
    target.dispatchEvent(keydown('ArrowLeft'));
    expect(emit).toHaveBeenCalledTimes(1);
  });
});
