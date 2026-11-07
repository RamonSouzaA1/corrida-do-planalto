import { describe, expect, it, vi } from 'vitest';
import balance from '../../src/config/balance.json';
import { COMMANDS } from '../../src/input/commands.js';
import { bindTouch, swipeCommand } from '../../src/input/touch.js';

const MIN = balance.swipeMinPixels;

const pointer = (type, x, y, extra = {}) =>
  Object.assign(new Event(type, { cancelable: true }), {
    pointerId: 1,
    clientX: x,
    clientY: y,
    ...extra,
  });

describe('swipeCommand', () => {
  it('converte o eixo dominante do gesto em comando', () => {
    expect(swipeCommand(-MIN, 0)).toBe(COMMANDS.LEFT);
    expect(swipeCommand(MIN, 0)).toBe(COMMANDS.RIGHT);
    expect(swipeCommand(0, -MIN)).toBe(COMMANDS.JUMP);
    expect(swipeCommand(0, MIN)).toBe(COMMANDS.SLIDE);
    expect(swipeCommand(MIN * 2, -MIN)).toBe(COMMANDS.RIGHT);
    expect(swipeCommand(MIN, -MIN * 2)).toBe(COMMANDS.JUMP);
  });

  it('ignora movimentos menores que swipeMinPixels', () => {
    expect(swipeCommand(MIN - 1, 0)).toBeNull();
    expect(swipeCommand(0, -(MIN - 1))).toBeNull();
    expect(swipeCommand(0, 0)).toBeNull();
    expect(swipeCommand(MIN - 1, MIN - 1)).toBeNull();
  });

  it('aceita outra distância mínima', () => {
    expect(swipeCommand(10, 0, 10)).toBe(COMMANDS.RIGHT);
    expect(swipeCommand(9, 0, 10)).toBeNull();
  });
});

describe('bindTouch', () => {
  it('emite o comando ao passar da distância mínima, uma vez por gesto', () => {
    const target = new EventTarget();
    const emit = vi.fn();
    bindTouch(emit, target);

    target.dispatchEvent(pointer('pointerdown', 100, 100));
    target.dispatchEvent(pointer('pointermove', 100 - MIN / 2, 100));
    expect(emit).not.toHaveBeenCalled();
    target.dispatchEvent(pointer('pointermove', 100 - MIN, 100));
    expect(emit).toHaveBeenCalledWith(COMMANDS.LEFT);
    target.dispatchEvent(pointer('pointermove', 100 - MIN - 5, 100));
    target.dispatchEvent(pointer('pointerup', 100 - MIN - 5, 100));
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('permite arrastar de uma faixa para outra no mesmo gesto', () => {
    const target = new EventTarget();
    const emit = vi.fn();
    bindTouch(emit, target);

    target.dispatchEvent(pointer('pointerdown', 100, 100));
    target.dispatchEvent(pointer('pointermove', 100 + MIN, 100));
    target.dispatchEvent(pointer('pointermove', 100 + MIN * 2, 100));
    expect(emit.mock.calls).toEqual([[COMMANDS.RIGHT], [COMMANDS.RIGHT]]);
  });

  it('gera pulo e deslize nos gestos verticais', () => {
    const target = new EventTarget();
    const emit = vi.fn();
    bindTouch(emit, target);

    target.dispatchEvent(pointer('pointerdown', 100, 100));
    target.dispatchEvent(pointer('pointermove', 100, 100 - MIN));
    target.dispatchEvent(pointer('pointerup', 100, 100 - MIN));
    target.dispatchEvent(pointer('pointerdown', 100, 100));
    target.dispatchEvent(pointer('pointermove', 100, 100 + MIN));
    expect(emit.mock.calls).toEqual([[COMMANDS.JUMP], [COMMANDS.SLIDE]]);
  });

  it('ignora toque simples, movimento sem toque e outro dedo', () => {
    const target = new EventTarget();
    const emit = vi.fn();
    bindTouch(emit, target);

    target.dispatchEvent(pointer('pointermove', 300, 300));
    target.dispatchEvent(pointer('pointerdown', 100, 100));
    target.dispatchEvent(pointer('pointermove', 100 + MIN * 2, 100, { pointerId: 2 }));
    target.dispatchEvent(pointer('pointerup', 102, 101));
    target.dispatchEvent(pointer('pointermove', 100 + MIN * 2, 100));
    expect(emit).not.toHaveBeenCalled();
  });

  it('cancela o gesto com pointercancel e para de ouvir', () => {
    const target = new EventTarget();
    const emit = vi.fn();
    const stop = bindTouch(emit, target);

    target.dispatchEvent(pointer('pointerdown', 100, 100));
    target.dispatchEvent(pointer('pointercancel', 100, 100));
    target.dispatchEvent(pointer('pointermove', 100 + MIN, 100));
    expect(emit).not.toHaveBeenCalled();

    stop();
    target.dispatchEvent(pointer('pointerdown', 100, 100));
    target.dispatchEvent(pointer('pointermove', 100 + MIN, 100));
    expect(emit).not.toHaveBeenCalled();
  });
});
