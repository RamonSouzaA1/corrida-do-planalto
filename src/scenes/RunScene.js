import * as Phaser from 'phaser';
import { DEFAULT_CHARACTERS, characters } from '../config/characters.js';
import cities from '../config/cities.json';
import { fleeSpeed, proximity } from '../core/chase.js';
import { createClock } from '../core/clock.js';
import { ACTIONS } from '../core/lanes.js';
import { POWER_UPS } from '../core/powerups.js';
import { FIRST_CITY, loadProgress } from '../core/progress.js';
import { RUN_STATES, applyCommand, createRun, setPaused, tick } from '../core/run.js';
import { t } from '../i18n.js';
import { COMMANDS, createCommandQueue } from '../input/commands.js';
import { bindKeyboard } from '../input/keyboard.js';
import { bindTouch } from '../input/touch.js';
import { watchPageFocus } from '../platform/lifecycle.js';
import { SFX, backgroundKey } from './BootScene.js';
import { MUTE_BUTTON, addMuteControls, pixelText, setPixelText } from './ui.js';

// Visão lateral: Chico corre para a direita; a faixa 0 é a mais distante (no alto da pista),
// que fica à esquerda de quem corre para a direita.
const WIDTH = 320;
const PIXELS_PER_METER = 20;
const RUNNER_X = 64;
const TRACK_TOP = 112;
const LANE_HEIGHT = 20;
const JUMP_HEIGHT = 22;
const COIN_LIFT = 10;
const PARALLAX = [
  ['far', 0.1],
  ['mid', 0.3],
  ['near', 0.6],
  ['track', 1],
];

// Botão de pausa no canto superior direito, só em aparelhos de toque.
const PAUSE_BUTTON = { x: 298, y: 2, width: 20, height: 16 };

// Caio aparece à frente de Chico, mais longe quanto maior a distância, até a borda da tela.
const CAIO_GAP = 24;
const CAIO_PIXELS_PER_METER = 0.5;
const CAIO_MAX_X = WIDTH - 10;
// Barra de distância até Caio no topo (FR-008): cheia quando Chico o alcança.
const BAR = { x: 88, y: 6, width: 120, height: 6 };
// O nome de Caio ao lado da barra tem até este tamanho, para não encostar nos botões do canto.
const BAR_LABEL_MAX_CHARS = 8;
// Porta do avião, em relação ao canto inferior esquerdo do sprite de 64 x 32. O avião fica à
// frente do fim da pista de Chico, onde Caio chega primeiro.
const PLANE_DOOR = { x: 17, y: -12 };
const PLANE_AHEAD = 120;
// HUD na parte inferior (FR-008): energia à esquerda, vidas à direita.
const HUD_BOTTOM_Y = 169;
const ENERGY_PIP = { x: 52, y: 170, width: 10, height: 6, gap: 2 };
const POWER_UP_LIFT = 4;
// O escudo pisca nos últimos segundos, para avisar que vai acabar.
const SHIELD_WARNING_SECONDS = 2;
// Efeitos e HUD usam só as cores iguais em todas as paletas (cities.json), para cada cenário
// continuar com no máximo 16 cores (FR-014).

const laneFeetY = (lane) => TRACK_TOP + LANE_HEIGHT * (lane + 1) - 2;

export class RunScene extends Phaser.Scene {
  constructor() {
    super('RunScene');
  }

  create() {
    // Recomeça do início da cidade alcançada (FR-023); cidade ainda sem fase volta a Brasília.
    this.progress = loadProgress();
    const { cityReached } = this.progress;
    const cityId = cities.some((city) => city.id === cityReached) ? cityReached : FIRST_CITY;
    this.run = createRun({ cityId, seed: Date.now() >>> 0 });
    this.clock = createClock();
    this.queue = createCommandQueue();
    this.logicalMs = 0;
    this.finished = false;

    const { background } = this.run.city;
    this.layers = PARALLAX.map(([layer, factor]) => {
      const isTrack = layer === 'track';
      const sprite = this.add
        .tileSprite(
          0,
          isTrack ? TRACK_TOP : 0,
          WIDTH,
          isTrack ? 68 : TRACK_TOP,
          backgroundKey(background, layer),
        )
        .setOrigin(0, 0)
        .setDepth(-100);
      return { sprite, factor };
    });

    this.runnerKey = this.characterSprite('runner');
    this.runnerY = laneFeetY(this.run.lane);
    this.runner = this.add.sprite(RUNNER_X, this.runnerY, this.runnerKey).setOrigin(0.5, 1);
    this.playRunnerAnimation();

    this.obstacleSprites = new Map();
    this.coinSprites = new Map();
    this.powerUpSprites = new Map();
    this.collected = new Set();
    // Efeitos do escudo (bolha ao redor de Chico) e do cartaz (linhas de velocidade).
    this.effects = this.add.graphics();

    this.caioKey = this.characterSprite('target');
    this.caioX = this.caioTargetX();
    this.caio = this.add.sprite(this.caioX, laneFeetY(1), this.caioKey).setOrigin(0.5, 1);
    this.caio.setDepth(laneFeetY(1) - 0.5);
    if (this.anims.exists(`${this.caioKey}-run`)) this.caio.play(`${this.caioKey}-run`);
    this.plane = null;
    this.boarding = false;

    this.scoreText = pixelText(this, 4, 4, t('hud.score', { score: 0 })).setDepth(1000);
    this.shownScore = 0;
    this.distanceBar = this.add.graphics().setDepth(1000);
    pixelText(
      this,
      BAR.x + BAR.width + 4,
      2,
      t('hud.distance').slice(0, BAR_LABEL_MAX_CHARS),
    ).setDepth(1000);

    pixelText(this, 4, HUD_BOTTOM_Y, t('hud.energy')).setDepth(1000);
    this.energyBar = this.add.graphics().setDepth(1000);
    this.livesText = pixelText(this, WIDTH - 4, HUD_BOTTOM_Y, '', { originX: 1 }).setDepth(1000);
    this.shownLives = null;

    // Os textos da cidade (chegada, pista de embarque, prisão) vêm no idioma dela (FR-020).
    this.language = this.run.city.language;
    this.showCityIntro();

    this.stopKeyboard = bindKeyboard((command) => this.onCommand(command));
    this.stopTouch = bindTouch((command) => this.onCommand(command));
    this.stopFocus = watchPageFocus(() => this.pauseRun());
    this.audio = this.registry.get('audio');
    this.audio?.playMusic();
    addMuteControls(this, MUTE_BUTTON);
    if (this.sys.game.device.input.touch) this.addPauseButton();
    this.events.once('shutdown', () => {
      this.stopKeyboard();
      this.stopTouch();
      this.stopFocus();
    });
  }

  // Botão de pausa na tela para quem joga por toque (FR-016, FR-018).
  addPauseButton() {
    const { x, y, width, height } = PAUSE_BUTTON;
    this.add
      .rectangle(x, y, width, height, 0x0b0b14, 0.7)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff)
      .setDepth(1000);
    pixelText(this, x + width / 2, y + 3, 'II', { originX: 0.5 }).setDepth(1001);
    this.add
      .zone(x - 4, y, width + 8, height + 8)
      .setOrigin(0, 0)
      .setDepth(1002)
      .setInteractive()
      .on('pointerdown', () => this.onCommand(COMMANDS.PAUSE));
  }

  // Sprite configurado para o personagem (FR-017), ou o padrão se ele não existir.
  characterSprite(id) {
    const key = characters[id].sprite;
    if (this.textures.exists(key)) return key;
    console.warn(
      `Sprite "${key}" de "${id}" não existe; usando "${DEFAULT_CHARACTERS[id].sprite}".`,
    );
    return DEFAULT_CHARACTERS[id].sprite;
  }

  onCommand(command) {
    if (command === COMMANDS.PAUSE) {
      if (this.run.state === RUN_STATES.PAUSED) this.resumeRun();
      else this.pauseRun();
      return;
    }
    if (this.run.state === RUN_STATES.RUNNING) this.queue.push(command, this.logicalMs);
  }

  pauseRun() {
    if (this.run.state !== RUN_STATES.RUNNING) return;
    setPaused(this.run, true);
    this.scene.launch('PauseScene');
    this.scene.pause();
  }

  resumeRun() {
    if (this.run.state !== RUN_STATES.PAUSED) return;
    setPaused(this.run, false);
    this.queue.clear();
    this.scene.stop('PauseScene');
    this.scene.resume();
  }

  update(time, delta) {
    if (this.run.state === RUN_STATES.RUNNING) {
      this.clock.advance(delta, (stepMs) => {
        if (this.run.state !== RUN_STATES.RUNNING) return;
        this.logicalMs += stepMs;
        this.queue.process(this.logicalMs, (command) => {
          const applied = applyCommand(this.run, command);
          if (applied && command === COMMANDS.JUMP) this.audio?.play(SFX.JUMP);
          return applied;
        });
        for (const event of tick(this.run, stepMs / 1000)) this.onRunEvent(event);
      });
    }
    this.draw(delta);
  }

  onRunEvent(event) {
    if (event.type === 'coin') {
      this.audio?.play(SFX.COIN);
      this.collected.add(event.coin);
      this.coinSprites.get(event.coin)?.destroy();
      this.coinSprites.delete(event.coin);
    } else if (event.type === 'powerUp') {
      this.onPowerUp(event.item);
    } else if (event.type === 'extraLife') {
      this.audio?.play(SFX.EXTRA_LIFE);
      this.popup(t('hud.extraLife'), 0x5bb33b);
    } else if (event.type === 'shielded') {
      this.audio?.play(SFX.HIT);
      this.cameras.main.flash(120, 255, 255, 255);
      this.popup(t('hud.shielded'), 0xffffff);
    } else if (event.type === 'hit') {
      this.audio?.play(SFX.HIT);
      this.cameras.main.shake(200, 0.01);
      this.runner.setTint(0xd62828);
      // Com energia de sobra a corrida continua; o tom vermelho some logo depois.
      this.time.delayedCall(400, () => {
        if (!this.finished) this.runner.clearTint();
      });
    } else if (event.type === 'runway') {
      this.showRunway();
    } else if (event.type === 'lost' || event.type === 'won') {
      this.finish(event);
    }
  }

  onPowerUp(item) {
    // A faixa presidencial toca o som de vida extra, não o de power-up.
    if (item.kind !== POWER_UPS.SASH) this.audio?.play(SFX.POWER_UP);
    this.collected.add(item);
    this.powerUpSprites.get(item)?.destroy();
    this.powerUpSprites.delete(item);
    // A faixa presidencial já é anunciada pelo evento de vida extra.
    if (item.kind !== POWER_UPS.SASH) this.popup(t(`hud.powerUp.${item.kind}`), 0xffd23f);
    // Mala de dinheiro: Caio tropeça e cai por um instante.
    if (item.kind === POWER_UPS.MONEY_BAG && this.anims.exists(`${this.caioKey}-fall`)) {
      this.caio.play(`${this.caioKey}-fall`);
      this.time.delayedCall(600, () => {
        if (!this.finished && !this.boarding) this.caio.play(`${this.caioKey}-run`);
      });
    }
  }

  // Texto curto que sobe acima de Chico e some.
  popup(text, tint) {
    const label = pixelText(this, RUNNER_X, this.runner.y - 34, text, { originX: 0.5 });
    label.setDepth(1000).setTint(tint);
    this.tweens.add({
      targets: label,
      y: label.y - 14,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  // Chegada à cidade: nome e objetivo por alguns segundos.
  showCityIntro() {
    const cityName = t(`cities.${this.run.cityId}`, {}, this.language);
    const text = [
      t('city.welcome', { city: cityName }, this.language),
      t('city.goal', {}, this.language),
    ].join('\n');
    const intro = pixelText(this, WIDTH / 2, 40, text, { originX: 0.5 }).setCenterAlign();
    intro.setDepth(1000).setTint(0xffd23f);
    this.tweens.add({
      targets: intro,
      alpha: 0,
      delay: 2000,
      duration: 600,
      onComplete: () => intro.destroy(),
    });
  }

  // Confronto do avião: aviso na tela e o avião parado no fim da pista de embarque.
  showRunway() {
    const banner = pixelText(this, WIDTH / 2, 24, t('hud.runway', {}, this.language), {
      originX: 0.5,
    });
    banner.setDepth(1000).setTint(0xffd23f);
    this.tweens.add({
      targets: banner,
      alpha: 0,
      duration: 300,
      yoyo: true,
      repeat: 4,
      onComplete: () => banner.destroy(),
    });
    this.plane = this.add.sprite(0, laneFeetY(0), 'aviao').setOrigin(0, 1);
    this.plane.setDepth(laneFeetY(0) - 1);
  }

  planeX() {
    const metersLeft = this.run.city.lengthMeters - this.run.metersRun;
    return Math.round(RUNNER_X + PLANE_AHEAD + metersLeft * PIXELS_PER_METER);
  }

  finish(event) {
    if (this.finished) return;
    this.finished = true;
    this.runner.anims.stop();
    const result = {
      outcome: this.run.state,
      score: this.run.score,
      reason: event.reason ?? null,
      caught: this.run.caught,
      livesGained: this.run.livesGained,
      cityId: this.run.cityId,
    };
    const escapes = this.plane && !result.caught;
    if (escapes) this.boardPlane();
    else if (result.caught) this.arrestCaio();
    const delay = escapes ? 2400 : result.caught ? 1500 : 700;
    this.time.delayedCall(delay, () => this.scene.start('ResultScene', result));
  }

  // Washington: Chico alcança Caio antes do avião; Caio cai e é preso (FR-010).
  arrestCaio() {
    if (this.anims.exists(`${this.caioKey}-fall`)) this.caio.play(`${this.caioKey}-fall`);
    this.cameras.main.flash(200, 255, 210, 63);
    this.popup(t('hud.caught', {}, this.language), 0xffd23f);
  }

  // Caio sobe a escada, entra no avião e o avião decola (FR-010: nas cidades 1 a 3 ele sempre foge).
  boardPlane() {
    this.boarding = true;
    const door = {
      x: this.plane.x + PLANE_DOOR.x,
      y: this.plane.y + PLANE_DOOR.y,
    };
    if (this.anims.exists(`${this.caioKey}-board`)) this.caio.play(`${this.caioKey}-board`);
    this.caio.setDepth(this.plane.depth + 0.5);
    this.tweens.chain({
      targets: this.caio,
      tweens: [
        { x: door.x - 12, y: this.plane.y, duration: 250 },
        { x: door.x, y: door.y, duration: 450 },
        { alpha: 0, duration: 200 },
        {
          targets: this.plane,
          x: WIDTH + 40,
          y: this.plane.y - 50,
          duration: 1100,
          ease: 'Quad.easeIn',
        },
      ],
    });
  }

  caioTargetX() {
    const x = RUNNER_X + CAIO_GAP + this.run.distanceToTarget * CAIO_PIXELS_PER_METER;
    const limit = this.plane ? this.planeX() + PLANE_DOOR.x : CAIO_MAX_X;
    return Math.min(x, CAIO_MAX_X, limit);
  }

  draw(delta) {
    const { run } = this;
    const scrolled = run.metersRun * PIXELS_PER_METER;
    for (const { sprite, factor } of this.layers) sprite.tilePositionX = scrolled * factor;

    // Troca de faixa suave; o pulo é um arco ao longo da duração da ação.
    const targetY = laneFeetY(run.lane);
    this.runnerY += (targetY - this.runnerY) * Math.min(1, delta / 50);
    let lift = 0;
    if (run.action === ACTIONS.JUMP) {
      const progress = 1 - run.actionTimeLeft / run.balance.jumpSeconds;
      lift = Math.sin(progress * Math.PI) * JUMP_HEIGHT;
    }
    this.runner.setPosition(RUNNER_X, Math.round(this.runnerY - lift));
    this.runner.setDepth(this.runnerY + 0.5);
    if (!this.finished) this.playRunnerAnimation();

    this.drawItems(run.track.obstacles, this.obstacleSprites, (obstacle) => {
      const key = obstacle.character ? this.characterSprite(obstacle.character) : obstacle.sprite;
      const sprite = this.add.sprite(0, laneFeetY(obstacle.lane), key).setOrigin(0.5, 1);
      if (this.anims.exists(`${key}-idle`)) sprite.play(`${key}-idle`);
      return sprite.setDepth(laneFeetY(obstacle.lane));
    });
    // Moedas e coletáveis temáticos da cidade (FR-013).
    this.drawItems(run.track.coins, this.coinSprites, (coin) => {
      const key = coin.sprite ?? 'moeda';
      const sprite = this.add
        .sprite(0, laneFeetY(coin.lane) - COIN_LIFT, key)
        .setOrigin(0.5, 1)
        .setDepth(laneFeetY(coin.lane) - 1);
      if (this.anims.exists(`${key}-spin`)) sprite.play(`${key}-spin`);
      return sprite;
    });
    this.drawItems(run.track.powerUps, this.powerUpSprites, (item) => {
      const sprite = this.add
        .sprite(0, laneFeetY(item.lane) - POWER_UP_LIFT, item.sprite)
        .setOrigin(0.5, 1)
        .setDepth(laneFeetY(item.lane) - 1);
      if (this.anims.exists(`${item.sprite}-idle`)) sprite.play(`${item.sprite}-idle`);
      return sprite;
    });

    if (this.plane && !this.boarding) this.plane.x = this.planeX();
    this.drawCaio(delta);
    this.drawEffects();

    if (run.score !== this.shownScore) {
      this.shownScore = run.score;
      setPixelText(this.scoreText, t('hud.score', { score: run.score }));
    }
    this.drawDistanceBar();
    this.drawEnergy();
    this.drawLives();
  }

  drawEffects() {
    const { run } = this;
    const { x, y } = this.runner;
    this.effects.clear().setDepth(this.runner.depth + 0.1);
    const blinking = run.shield < SHIELD_WARNING_SECONDS && Math.floor(this.time.now / 120) % 2;
    if (run.shield > 0 && !blinking) {
      this.effects
        .lineStyle(1, 0xffffff, 0.9)
        .strokeEllipse(x, y - 12, 22, 30)
        .fillStyle(0x3b5dc9, 0.2)
        .fillEllipse(x, y - 12, 22, 30);
    }
    if (run.boost > 0) {
      // Linhas de velocidade atrás de Chico, deslocadas a cada quadro.
      const offset = Math.floor(this.time.now / 40) % 6;
      this.effects.fillStyle(0xffd23f, 0.8);
      for (const [dy, length] of [
        [-20, 10],
        [-13, 14],
        [-6, 8],
      ]) {
        this.effects.fillRect(x - 12 - length - offset, y + dy, length, 1);
      }
    }
  }

  // Um bloco por nível de energia; o nível perdido fica escuro (não depende só da cor).
  drawEnergy() {
    const { energy, balance } = this.run;
    const pip = ENERGY_PIP;
    this.energyBar.clear();
    for (let level = 0; level < balance.maxEnergy; level += 1) {
      const x = pip.x + level * (pip.width + pip.gap);
      this.energyBar.fillStyle(0x0b0b14).fillRect(x, pip.y, pip.width, pip.height);
      if (level < energy) {
        const color = energy === 1 && balance.maxEnergy > 1 ? 0xd62828 : 0x5bb33b;
        this.energyBar.fillStyle(color).fillRect(x + 1, pip.y + 1, pip.width - 2, pip.height - 2);
      }
    }
  }

  drawLives() {
    const lives = this.progress.lives + this.run.livesGained;
    if (lives === this.shownLives) return;
    this.shownLives = lives;
    setPixelText(this.livesText, t('hud.lives', { lives }));
  }

  drawCaio(delta) {
    if (this.boarding) return;
    this.caioX += (this.caioTargetX() - this.caioX) * Math.min(1, delta / 200);
    this.caio.x = Math.round(this.caioX);
    // A animação de Caio acelera conforme ele foge mais rápido.
    if (!this.finished) {
      const speed = fleeSpeed(this.run.speed, this.run.distanceToTarget, this.run.balance);
      this.caio.anims.timeScale = speed / this.run.balance.initialSpeed;
    }
  }

  drawDistanceBar() {
    const { balance, distanceToTarget, inBossRunway } = this.run;
    const filled = Math.round(proximity(distanceToTarget, balance) * (BAR.width - 2));
    const goal = Math.round(proximity(balance.minVictoryDistance, balance) * (BAR.width - 2));
    this.distanceBar
      .clear()
      .fillStyle(0x0b0b14)
      .fillRect(BAR.x, BAR.y, BAR.width, BAR.height)
      .fillStyle(0x1d2b53)
      .fillRect(BAR.x + 1, BAR.y + 1, BAR.width - 2, BAR.height - 2)
      .fillStyle(inBossRunway ? 0xd62828 : 0xffd23f)
      .fillRect(BAR.x + 1, BAR.y + 1, filled, BAR.height - 2)
      // Marca da distância mínima de vitória.
      .fillStyle(0xffffff)
      .fillRect(BAR.x + 1 + goal, BAR.y - 1, 1, BAR.height + 2);
  }

  // Cria os sprites dos itens que entram na tela e destrói os que saíram.
  drawItems(items, sprites, create) {
    const screenX = (item) => RUNNER_X + (item.meters - this.run.metersRun) * PIXELS_PER_METER;
    for (const [item, sprite] of sprites) {
      const x = screenX(item);
      if (x < -40) {
        sprite.destroy();
        sprites.delete(item);
      } else {
        sprite.x = Math.round(x);
      }
    }
    const aheadMeters = (WIDTH + 40 - RUNNER_X) / PIXELS_PER_METER;
    for (const item of items) {
      if (item.meters > this.run.metersRun + aheadMeters) break;
      if (sprites.has(item) || screenX(item) < -40 || this.collected.has(item)) continue;
      const sprite = create(item);
      sprite.x = Math.round(screenX(item));
      sprites.set(item, sprite);
    }
  }

  playRunnerAnimation() {
    const key = `${this.runnerKey}-${this.run.action}`;
    if (this.anims.exists(key)) this.runner.play(key, true);
  }
}
