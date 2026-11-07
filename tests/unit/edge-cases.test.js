// Casos-limite da spec: comandos simultâneos, ações sobrepostas, escudo acabando na colisão e
// configuração de personagens ausente ou inválida. Mudança de orientação é coberta pelo teste de
// fumaça (tests/smoke/game.spec.js).
import { describe, expect, it, vi } from 'vitest';
import balance from '../../src/config/balance.json';
import { DEFAULT_CHARACTERS, loadCharacters } from '../../src/config/characters.js';
import { STEP_MS } from '../../src/core/clock.js';
import { OBSTACLE_TYPES } from '../../src/core/collision.js';
import { ACTIONS } from '../../src/core/lanes.js';
import { applyCommand, createRun, setPaused, tick } from '../../src/core/run.js';
import { COMMANDS, createCommandQueue } from '../../src/input/commands.js';

const DT = STEP_MS / 1000;
const emptyRun = (extra = {}) => createRun({ track: { obstacles: [], coins: [], ...extra } });
const blockerAt = (meters, lane = 1) => ({
  meters,
  lane,
  type: OBSTACLE_TYPES.BLOCKER,
  sprite: 'guarda',
});

// Avança a corrida como a RunScene: a fila é processada a cada passo, antes do tique.
function step(run, queue, clockMs) {
  queue.process(clockMs, (command) => applyCommand(run, command));
  return tick(run, DT);
}

describe('comandos simultâneos', () => {
  it('troca de faixa e pulo no mesmo instante: os dois valem, na ordem de chegada', () => {
    const run = emptyRun();
    const queue = createCommandQueue();
    queue.push(COMMANDS.LEFT, 0);
    queue.push(COMMANDS.JUMP, 0);
    step(run, queue, 0);
    expect(run.lane).toBe(0);
    expect(run.action).toBe(ACTIONS.JUMP);
    expect(queue.size).toBe(0);
  });

  it('esquerda e direita juntas voltam à faixa de origem', () => {
    const run = emptyRun();
    const queue = createCommandQueue();
    queue.push(COMMANDS.LEFT, 0);
    queue.push(COMMANDS.RIGHT, 0);
    step(run, queue, 0);
    expect(run.lane).toBe(1);
  });

  it('pulo e deslize juntos: o pulo vale e o deslize vence na fila sem travar o jogo', () => {
    const run = emptyRun();
    const queue = createCommandQueue();
    queue.push(COMMANDS.JUMP, 0);
    queue.push(COMMANDS.SLIDE, 0);

    let clockMs = 0;
    step(run, queue, clockMs);
    expect(run.action).toBe(ACTIONS.JUMP);
    expect(queue.size).toBe(1);

    // O pulo dura mais que a fila: o deslize é descartado e o jogo segue.
    while (clockMs <= balance.commandQueueMs + STEP_MS) {
      clockMs += STEP_MS;
      step(run, queue, clockMs);
    }
    expect(queue.size).toBe(0);
    expect(run.action).toBe(ACTIONS.JUMP);
    expect(run.state).toBe('running');
  });
});

describe('ações sobrepostas', () => {
  it('um deslize pedido perto do fim do pulo entra na fila e começa quando o pulo acaba', () => {
    const run = emptyRun();
    const queue = createCommandQueue();
    let clockMs = 0;
    applyCommand(run, COMMANDS.JUMP);

    // Avança até faltar bem menos que a janela da fila para o pulo acabar.
    while (run.actionTimeLeft > balance.commandQueueMs / 2000) {
      clockMs += STEP_MS;
      step(run, queue, clockMs);
    }
    queue.push(COMMANDS.SLIDE, clockMs);
    while (run.action === ACTIONS.JUMP) {
      clockMs += STEP_MS;
      step(run, queue, clockMs);
    }
    clockMs += STEP_MS;
    step(run, queue, clockMs);
    expect(run.action).toBe(ACTIONS.SLIDE);
  });

  it('um pulo pedido no começo de um deslize é descartado se a fila vencer', () => {
    const run = emptyRun();
    const queue = createCommandQueue();
    applyCommand(run, COMMANDS.SLIDE);
    queue.push(COMMANDS.JUMP, 0);

    let clockMs = 0;
    while (run.action === ACTIONS.SLIDE) {
      clockMs += STEP_MS;
      step(run, queue, clockMs);
    }
    expect(queue.size).toBe(0);
    expect(run.action).toBe(ACTIONS.RUN);
  });

  it('trocar de faixa durante o pulo é aceito na hora', () => {
    const run = emptyRun();
    applyCommand(run, COMMANDS.JUMP);
    expect(applyCommand(run, COMMANDS.RIGHT)).toBe(true);
    expect(run.lane).toBe(2);
    expect(run.action).toBe(ACTIONS.JUMP);
  });

  it('comando com a corrida pausada ou encerrada não tem efeito', () => {
    const run = emptyRun();
    setPaused(run, true);
    expect(applyCommand(run, COMMANDS.LEFT)).toBe(false);
    expect(tick(run, DT)).toEqual([]);
    expect(run.metersRun).toBe(0);

    setPaused(run, false);
    run.state = 'lost';
    expect(applyCommand(run, COMMANDS.JUMP)).toBe(false);
  });
});

describe('colisão no instante em que o escudo termina', () => {
  const hitEvents = (shield) => {
    const run = emptyRun({ obstacles: [blockerAt(0.01)] });
    run.shield = shield;
    return { run, events: tick(run, DT) };
  };

  it('com escudo no instante do choque, ele absorve, mesmo que acabe neste passo', () => {
    const { run, events } = hitEvents(DT / 2);
    expect(events.some((event) => event.type === 'shielded')).toBe(true);
    expect(events.some((event) => event.type === 'hit')).toBe(false);
    expect(run.energy).toBe(balance.maxEnergy);
    expect(run.shield).toBe(0);
  });

  it('sem escudo no instante do choque, a energia cai', () => {
    const { run, events } = hitEvents(0);
    expect(events.some((event) => event.type === 'hit')).toBe(true);
    expect(run.energy).toBe(balance.maxEnergy - 1);
  });

  it('o escudo absorve um só choque: o seguinte tira energia', () => {
    const run = emptyRun({ obstacles: [blockerAt(0.01), blockerAt(0.02)] });
    run.shield = 5;
    const events = tick(run, DT);
    expect(events.filter((event) => event.type === 'shielded')).toHaveLength(1);
    expect(events.filter((event) => event.type === 'hit')).toHaveLength(1);
    expect(run.energy).toBe(balance.maxEnergy - 1);
  });
});

describe('personagem ausente ou inválido no arquivo de configuração', () => {
  const garbage = [null, undefined, 42, 'texto', [], { runner: 'chico' }, { runner: null }];

  it.each(garbage)('configuração %j: usa os padrões, avisa e não quebra', (config) => {
    const warn = vi.fn();
    const result = loadCharacters(config, warn);
    expect(result).toEqual(DEFAULT_CHARACTERS);
    expect(warn).toHaveBeenCalled();
  });

  it('atributos de tipo errado caem no padrão só naquele campo', () => {
    const warn = vi.fn();
    const result = loadCharacters(
      { ...DEFAULT_CHARACTERS, guard: { name: 7, sprite: 'guarda-nova' } },
      warn,
    );
    expect(result.guard).toEqual({ name: DEFAULT_CHARACTERS.guard.name, sprite: 'guarda-nova' });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
