import * as Phaser from 'phaser';
import spriteManifest from '../assets/sprites/sprites.json';
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
import { PARALLAX_LAYERS, SFX, backgroundKey } from './BootScene.js';
import {
  FARTHEST_Z,
  FEET_Y,
  HORIZON_Y,
  LANE_WIDTH,
  NEAREST_Z,
  VIEW,
  drawRoad,
  project,
} from './road.js';
import { MUTE_BUTTON, addMuteControls, pixelText, setPixelText, wrapText } from './ui.js';

// Visão de trás, em retrato (estilo Subway Surfers): Chico corre para o fundo da tela, de costas
// para a câmera; a faixa 0 fica à esquerda. Os itens da pista saem do horizonte e crescem até
// passar por ele. Toda a geometria da pista está em road.js.
const CENTER_X = VIEW.width / 2;
const JUMP_HEIGHT = 34;
const COIN_LIFT = 14;
const POWER_UP_LIFT = 6;
// Camadas do fundo acima do horizonte; deslocam-se um pouco quando Chico troca de faixa.
const PARALLAX = [0.04, 0.1, 0.2];
// Árvores e postes dos dois lados da pista, a cada tantos metros.
const SIDE_SPACING_METERS = 8;
const SIDE_LANE_OFFSET = 2.4;

// Profundidade de desenho: quem está mais longe fica atrás.
const depthAt = (z) => 500 - z;
const HUD_DEPTH = 1000;

// Botão de pausa no canto superior direito, só em aparelhos de toque.
const PAUSE_BUTTON = { x: 158, y: 2, width: 20, height: 16 };

// Caio corre à frente de Chico, mais longe quanto maior a distância, e oscila entre as faixas.
const CAIO_MIN_Z = 2.5;
const CAIO_METERS_PER_DISTANCE = 0.025;
const CAIO_SWAY_LANES = 0.6;
// Barra de distância até Caio no topo (FR-008): cheia quando Chico o alcança.
const BAR = { x: 6, y: 24, width: 110, height: 6 };
// O nome de Caio ao lado da barra tem até este tamanho, para caber na tela.
const BAR_LABEL_MAX_CHARS = 8;
// O avião espera além do fim da pista de Chico, onde Caio chega primeiro.
const PLANE_AHEAD_METERS = 5;
// HUD na parte inferior (FR-008): energia à esquerda, vidas à direita.
const HUD_BOTTOM_Y = 307;
const ENERGY_PIP = { x: 52, y: 308, width: 10, height: 6, gap: 2 };
// O escudo pisca nos últimos segundos, para avisar que vai acabar.
const SHIELD_WARNING_SECONDS = 2;
// Efeitos e HUD usam só as cores iguais em todas as paletas (cities.json), para cada cenário
// continuar com no máximo 16 cores (FR-014).

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
    this.layers = PARALLAX_LAYERS.map((layer, i) => ({
      sprite: this.add
        .tileSprite(0, 0, VIEW.width, HORIZON_Y, backgroundKey(background, layer))
        .setOrigin(0, 0)
        .setDepth(-100),
      factor: PARALLAX[i],
    }));
    this.road = this.add.graphics().setDepth(-50);
    this.roadLine = this.run.city.road.line;
    this.sideKey = `margem-${background}`;
    this.sideSprites = [];

    this.runnerKey = this.characterSprite('runner');
    // Posição de Chico entre as faixas (0 a 2), suavizada na troca de faixa.
    this.runnerLane = this.run.lane;
    this.shadow = this.add.ellipse(0, FEET_Y, 30, 8, 0x0b0b14, 0.35);
    this.runner = this.add.sprite(CENTER_X, FEET_Y, this.runnerKey).setOrigin(0.5, 1);
    this.playRunnerAnimation();

    this.obstacleSprites = new Map();
    this.coinSprites = new Map();
    this.powerUpSprites = new Map();
    this.collected = new Set();
    // Efeitos do escudo (bolha ao redor de Chico) e do cartaz (linhas de velocidade).
    this.effects = this.add.graphics();

    this.caioKey = this.characterSprite('target');
    this.caioZ = this.caioTargetZ();
    this.caio = this.add.sprite(CENTER_X, HORIZON_Y, this.caioKey).setOrigin(0.5, 1);
    if (this.anims.exists(`${this.caioKey}-run`)) this.caio.play(`${this.caioKey}-run`);
    this.plane = null;
    this.boarding = false;

    this.scoreText = pixelText(this, 4, 4, t('hud.score', { score: 0 })).setDepth(HUD_DEPTH);
    this.shownScore = 0;
    this.distanceBar = this.add.graphics().setDepth(HUD_DEPTH);
    pixelText(
      this,
      BAR.x + BAR.width + 4,
      BAR.y - 4,
      t('hud.distance').slice(0, BAR_LABEL_MAX_CHARS),
    ).setDepth(HUD_DEPTH);

    pixelText(this, 4, HUD_BOTTOM_Y, t('hud.energy')).setDepth(HUD_DEPTH);
    this.energyBar = this.add.graphics().setDepth(HUD_DEPTH);
    this.livesText = pixelText(this, VIEW.width - 4, HUD_BOTTOM_Y, '', { originX: 1 });
    this.livesText.setDepth(HUD_DEPTH);
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
      .setDepth(HUD_DEPTH);
    pixelText(this, x + width / 2, y + 3, 'II', { originX: 0.5 }).setDepth(HUD_DEPTH + 1);
    this.add
      .zone(x - 2, y, width + 4, height + 8)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH + 2)
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
    const label = pixelText(this, CENTER_X, this.runner.y - 62, wrapText(text), { originX: 0.5 });
    label.setCenterAlign().setDepth(HUD_DEPTH).setTint(tint);
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
    const intro = pixelText(this, CENTER_X, 50, wrapText(text), { originX: 0.5 }).setCenterAlign();
    intro.setDepth(HUD_DEPTH).setTint(0xffd23f);
    this.tweens.add({
      targets: intro,
      alpha: 0,
      delay: 2000,
      duration: 600,
      onComplete: () => intro.destroy(),
    });
  }

  // Confronto do avião: aviso na tela, divisórias da pista de embarque e o avião parado no fim.
  showRunway() {
    const text = wrapText(t('hud.runway', {}, this.language));
    const banner = pixelText(this, CENTER_X, 50, text, { originX: 0.5 }).setCenterAlign();
    banner.setDepth(HUD_DEPTH).setTint(0xffd23f);
    this.tweens.add({
      targets: banner,
      alpha: 0,
      duration: 300,
      yoyo: true,
      repeat: 4,
      onComplete: () => banner.destroy(),
    });
    this.roadLine = this.run.city.road.runwayLine;
    this.plane = this.add.sprite(CENTER_X, HORIZON_Y, 'aviao').setOrigin(0.5, 1);
  }

  planeZ() {
    return this.run.city.lengthMeters - this.run.metersRun + PLANE_AHEAD_METERS;
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
    const { plane } = this;
    const doorY = plane.y - spriteManifest.aviao.doorHeight * plane.scale;
    if (this.anims.exists(`${this.caioKey}-board`)) this.caio.play(`${this.caioKey}-board`);
    this.caio.setDepth(plane.depth + 0.5);
    this.tweens.chain({
      targets: this.caio,
      tweens: [
        { x: plane.x, y: plane.y, scale: plane.scale * 0.8, duration: 300 },
        { y: doorY, scale: plane.scale * 0.6, duration: 450 },
        { alpha: 0, duration: 200 },
        {
          targets: plane,
          y: HORIZON_Y - 40,
          scale: plane.scale * 0.3,
          duration: 1100,
          ease: 'Quad.easeIn',
        },
      ],
    });
  }

  caioTargetZ() {
    const z = CAIO_MIN_Z + this.run.distanceToTarget * CAIO_METERS_PER_DISTANCE;
    return this.plane ? Math.min(z, this.planeZ() - 1) : z;
  }

  draw(delta) {
    const { run } = this;
    drawRoad(this.road, run.city, run.metersRun, { line: this.roadLine });

    // Troca de faixa suave; o pulo é um arco ao longo da duração da ação.
    this.runnerLane += (run.lane - this.runnerLane) * Math.min(1, delta / 50);
    const runnerX = CENTER_X + (this.runnerLane - 1) * LANE_WIDTH;
    for (const { sprite, factor } of this.layers) {
      sprite.tilePositionX = (this.runnerLane - 1) * LANE_WIDTH * factor;
    }
    let lift = 0;
    if (run.action === ACTIONS.JUMP) {
      const progress = 1 - run.actionTimeLeft / run.balance.jumpSeconds;
      lift = Math.sin(progress * Math.PI) * JUMP_HEIGHT;
    }
    this.runner.setPosition(Math.round(runnerX), Math.round(FEET_Y - lift));
    this.runner.setDepth(depthAt(0) + 0.5);
    this.shadow.setPosition(Math.round(runnerX), FEET_Y).setDepth(depthAt(0) + 0.4);
    this.shadow.setScale(1 - lift / (JUMP_HEIGHT * 2));
    if (!this.finished) this.playRunnerAnimation();

    this.drawSides();
    this.drawItems(run.track.obstacles, this.obstacleSprites, 0, (obstacle) => {
      const key = obstacle.character ? this.characterSprite(obstacle.character) : obstacle.sprite;
      const sprite = this.add.sprite(0, 0, key);
      if (this.anims.exists(`${key}-idle`)) sprite.play(`${key}-idle`);
      return sprite;
    });
    // Moedas e coletáveis temáticos da cidade (FR-013).
    this.drawItems(run.track.coins, this.coinSprites, COIN_LIFT, (coin) => {
      const key = coin.sprite ?? 'moeda';
      const sprite = this.add.sprite(0, 0, key);
      if (this.anims.exists(`${key}-spin`)) sprite.play(`${key}-spin`);
      return sprite;
    });
    this.drawItems(run.track.powerUps, this.powerUpSprites, POWER_UP_LIFT, (item) => {
      const sprite = this.add.sprite(0, 0, item.sprite);
      if (this.anims.exists(`${item.sprite}-idle`)) sprite.play(`${item.sprite}-idle`);
      return sprite;
    });

    if (this.plane && !this.boarding) this.place(this.plane, 0, this.planeZ());
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

  // Põe um sprite no chão da pista, na faixa e na distância dadas, com o tamanho da perspectiva.
  place(sprite, laneOffset, z, lift = 0) {
    const { x, y, scale } = project(laneOffset, z);
    sprite
      .setOrigin(0.5, 1)
      .setPosition(Math.round(x), Math.round(y - lift * scale))
      .setScale(scale)
      .setDepth(depthAt(z));
  }

  // Árvores e postes das margens, reaproveitando os mesmos sprites a cada quadro.
  drawSides() {
    if (!this.textures.exists(this.sideKey)) return;
    const { metersRun } = this.run;
    let used = 0;
    const first = Math.ceil((metersRun + NEAREST_Z) / SIDE_SPACING_METERS);
    for (let n = first; n * SIDE_SPACING_METERS - metersRun < FARTHEST_Z; n += 1) {
      for (const side of [-1, 1]) {
        if (!this.sideSprites[used]) this.sideSprites.push(this.add.sprite(0, 0, this.sideKey));
        const sprite = this.sideSprites[used];
        used += 1;
        sprite.setVisible(true).setFrame((n + (side > 0 ? 1 : 0)) % 2);
        this.place(sprite, side * SIDE_LANE_OFFSET, n * SIDE_SPACING_METERS - metersRun);
      }
    }
    for (let i = used; i < this.sideSprites.length; i += 1) this.sideSprites[i].setVisible(false);
  }

  drawEffects() {
    const { run } = this;
    const { x, y } = this.runner;
    this.effects.clear().setDepth(this.runner.depth + 0.1);
    const blinking = run.shield < SHIELD_WARNING_SECONDS && Math.floor(this.time.now / 120) % 2;
    if (run.shield > 0 && !blinking) {
      this.effects
        .lineStyle(1, 0xffffff, 0.9)
        .strokeEllipse(x, y - 24, 44, 58)
        .fillStyle(0x3b5dc9, 0.2)
        .fillEllipse(x, y - 24, 44, 58);
    }
    if (run.boost > 0) {
      // Linhas de velocidade dos dois lados de Chico, deslocadas a cada quadro.
      const offset = Math.floor(this.time.now / 40) % 8;
      this.effects.fillStyle(0xffd23f, 0.8);
      for (const [dx, length] of [
        [-24, 14],
        [-18, 20],
        [18, 20],
        [24, 14],
      ]) {
        this.effects.fillRect(x + dx, y - 20 + offset, 1, length);
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
    this.caioZ += (this.caioTargetZ() - this.caioZ) * Math.min(1, delta / 200);
    const sway = Math.sin(this.run.elapsed * 0.9) * CAIO_SWAY_LANES;
    this.place(this.caio, sway, this.caioZ);
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

  // Cria os sprites dos itens que entram no trecho visível e destrói os que passaram por Chico.
  drawItems(items, sprites, lift, create) {
    const { metersRun } = this.run;
    for (const [item, sprite] of sprites) {
      const z = item.meters - metersRun;
      if (z < NEAREST_Z) {
        sprite.destroy();
        sprites.delete(item);
      } else {
        this.place(sprite, item.lane - 1, z, lift);
      }
    }
    for (const item of items) {
      const z = item.meters - metersRun;
      if (z > FARTHEST_Z) break;
      if (sprites.has(item) || z < NEAREST_Z || this.collected.has(item)) continue;
      const sprite = create(item);
      this.place(sprite, item.lane - 1, z, lift);
      sprites.set(item, sprite);
    }
  }

  playRunnerAnimation() {
    const key = `${this.runnerKey}-${this.run.action}`;
    if (this.anims.exists(key)) this.runner.play(key, true);
  }
}
