import { describe, expect, it } from 'vitest';
import balance from '../../src/config/balance.json';
import { COMMANDS } from '../../src/input/commands.js';
import {
  ACTIONS,
  LANE_COUNT,
  applyMove,
  changeLane,
  createRunner,
  startAction,
  updateAction,
} from '../../src/core/lanes.js';

describe('createRunner', () => {
  it('começa correndo na faixa do meio', () => {
    expect(LANE_COUNT).toBe(3);
    expect(createRunner()).toEqual({ lane: 1, action: ACTIONS.RUN, actionTimeLeft: 0 });
  });
});

describe('changeLane', () => {
  it('troca de faixa para os dois lados', () => {
    const runner = createRunner();
    expect(changeLane(runner, -1)).toBe(true);
    expect(runner.lane).toBe(0);
    expect(changeLane(runner, 1)).toBe(true);
    expect(changeLane(runner, 1)).toBe(true);
    expect(runner.lane).toBe(2);
  });

  it('não sai da pista nas faixas das extremidades', () => {
    const runner = createRunner();
    runner.lane = 0;
    expect(changeLane(runner, -1)).toBe(false);
    expect(runner.lane).toBe(0);
    runner.lane = 2;
    expect(changeLane(runner, 1)).toBe(false);
    expect(runner.lane).toBe(2);
  });

  it('permite trocar de faixa durante o pulo ou o deslize', () => {
    const runner = createRunner();
    startAction(runner, ACTIONS.JUMP, balance);
    expect(changeLane(runner, 1)).toBe(true);
    expect(runner.action).toBe(ACTIONS.JUMP);
  });
});

describe('startAction', () => {
  it('pula e desliza com a duração de balance.json', () => {
    const runner = createRunner();
    expect(startAction(runner, ACTIONS.JUMP, balance)).toBe(true);
    expect(runner.action).toBe(ACTIONS.JUMP);
    expect(runner.actionTimeLeft).toBe(balance.jumpSeconds);

    const other = createRunner();
    expect(startAction(other, ACTIONS.SLIDE, balance)).toBe(true);
    expect(other.actionTimeLeft).toBe(balance.slideSeconds);
  });

  it('só aceita pulo ou deslize quando o personagem está correndo', () => {
    const runner = createRunner();
    startAction(runner, ACTIONS.JUMP, balance);
    expect(startAction(runner, ACTIONS.SLIDE, balance)).toBe(false);
    expect(startAction(runner, ACTIONS.JUMP, balance)).toBe(false);
    expect(runner.action).toBe(ACTIONS.JUMP);
  });
});

describe('updateAction', () => {
  it('a ação termina depois da duração e o personagem volta a correr', () => {
    const runner = createRunner();
    startAction(runner, ACTIONS.SLIDE, balance);
    updateAction(runner, balance.slideSeconds / 2);
    expect(runner.action).toBe(ACTIONS.SLIDE);
    updateAction(runner, balance.slideSeconds / 2);
    expect(runner.action).toBe(ACTIONS.RUN);
    expect(runner.actionTimeLeft).toBe(0);
    expect(startAction(runner, ACTIONS.JUMP, balance)).toBe(true);
  });

  it('não muda nada enquanto o personagem corre', () => {
    const runner = createRunner();
    updateAction(runner, 1);
    expect(runner).toEqual(createRunner());
  });
});

describe('applyMove', () => {
  it('converte os comandos de movimento em ações', () => {
    const runner = createRunner();
    expect(applyMove(runner, COMMANDS.LEFT, balance)).toBe(true);
    expect(runner.lane).toBe(0);
    expect(applyMove(runner, COMMANDS.RIGHT, balance)).toBe(true);
    expect(runner.lane).toBe(1);
    expect(applyMove(runner, COMMANDS.SLIDE, balance)).toBe(true);
    expect(runner.action).toBe(ACTIONS.SLIDE);
    expect(applyMove(runner, COMMANDS.JUMP, balance)).toBe(false);
  });

  it('ignora comandos que não são de movimento', () => {
    const runner = createRunner();
    expect(applyMove(runner, COMMANDS.PAUSE, balance)).toBe(false);
    expect(applyMove(runner, 'FLY', balance)).toBe(false);
    expect(runner).toEqual(createRunner());
  });
});
