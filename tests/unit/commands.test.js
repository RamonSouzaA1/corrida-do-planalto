import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import { COMMANDS, createCommandQueue, isCommand } from '../../src/input/commands.js';

const applyAll = (applied) => (command) => {
  applied.push(command);
  return true;
};

describe('COMMANDS', () => {
  it('define os cinco comandos do contrato', () => {
    expect(Object.values(COMMANDS).sort()).toEqual(['JUMP', 'LEFT', 'PAUSE', 'RIGHT', 'SLIDE']);
    expect(Object.isFrozen(COMMANDS)).toBe(true);
  });

  it('reconhece só comandos válidos', () => {
    expect(isCommand('LEFT')).toBe(true);
    expect(isCommand('FLY')).toBe(false);
    expect(isCommand(undefined)).toBe(false);
  });
});

describe('createCommandQueue', () => {
  it('recusa comandos desconhecidos', () => {
    const queue = createCommandQueue(100);
    expect(queue.push('FLY', 0)).toBe(false);
    expect(queue.size).toBe(0);
  });

  it('processa os comandos na ordem de chegada', () => {
    const queue = createCommandQueue(100);
    queue.push(COMMANDS.LEFT, 0);
    queue.push(COMMANDS.JUMP, 1);
    queue.push(COMMANDS.RIGHT, 2);
    const applied = [];
    queue.process(5, applyAll(applied));
    expect(applied).toEqual(['LEFT', 'JUMP', 'RIGHT']);
    expect(queue.size).toBe(0);
  });

  it('mantém na fila o comando que ainda não pode ser aplicado', () => {
    const queue = createCommandQueue(100);
    queue.push(COMMANDS.JUMP, 0);
    queue.process(50, () => false);
    expect(queue.size).toBe(1);
    const applied = [];
    queue.process(100, applyAll(applied));
    expect(applied).toEqual(['JUMP']);
  });

  it('descarta o comando quando o intervalo da fila vence', () => {
    const queue = createCommandQueue(100);
    queue.push(COMMANDS.SLIDE, 0);
    queue.process(50, () => false);
    const applied = [];
    queue.process(101, applyAll(applied));
    expect(applied).toEqual([]);
    expect(queue.size).toBe(0);
  });

  it('usa commandQueueMs de balance.json por padrão', () => {
    const queue = createCommandQueue();
    queue.push(COMMANDS.JUMP, 0);
    queue.process(balance.commandQueueMs, () => false);
    expect(queue.size).toBe(1);
    queue.process(balance.commandQueueMs + 1, () => false);
    expect(queue.size).toBe(0);
  });

  it('esvazia a fila com clear', () => {
    const queue = createCommandQueue(100);
    queue.push(COMMANDS.LEFT, 0);
    queue.clear();
    expect(queue.size).toBe(0);
  });
});
