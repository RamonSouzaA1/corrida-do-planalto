import { expect, test } from '@playwright/test';

const GAME_WIDTH = 320;
const GAME_HEIGHT = 180;
const KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowLeft'];

// Registra erros de console e exceções da página para conferir no fim.
function watchErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openGame(page) {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  // Espera os ativos carregarem e a tela de título aceitar o comando de iniciar.
  await page.waitForTimeout(1500);
  return canvas;
}

// Gesto de arrastar disparado por eventos de ponteiro, que é o que src/input/touch.js ouve.
async function swipe(page, from, to) {
  await page.evaluate(
    ({ from, to }) => {
      const fire = (type, point) =>
        window.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 7,
            clientX: point.x,
            clientY: point.y,
            bubbles: true,
          }),
        );
      fire('pointerdown', from);
      fire('pointermove', to);
      fire('pointerup', to);
    },
    { from, to },
  );
}

test('abre, inicia a corrida e joga alguns segundos sem erros de console', async ({
  page,
  isMobile,
}) => {
  const errors = watchErrors(page);
  const canvas = await openGame(page);
  const title = await canvas.screenshot();

  if (isMobile) await canvas.tap();
  else await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const started = await canvas.screenshot();
  expect(started.equals(title)).toBe(false);

  const box = await canvas.boundingBox();
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  for (const [index, key] of KEYS.entries()) {
    await page.keyboard.press(key);
    if (isMobile) {
      const dx = [-1, 0, 1, 0, 0, -1][index] * 60;
      const dy = [0, -1, 0, 1, -1, 0][index] * 60;
      await swipe(page, center, { x: center.x + dx, y: center.y + dy });
    }
    await page.waitForTimeout(500);
  }

  expect(errors).toEqual([]);
});

test('o botão de pausa na tela pausa e retoma a corrida no celular', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'O botão de pausa só aparece em aparelhos de toque.');
  const errors = watchErrors(page);
  const canvas = await openGame(page);
  await canvas.tap();
  await page.waitForTimeout(500);

  const box = await canvas.boundingBox();
  const scale = box.width / GAME_WIDTH;
  // A pista rola sem parar durante a corrida e fica parada na pausa; compara dois quadros da
  // região inferior esquerda, onde não há texto piscando.
  const clip = {
    x: box.x,
    y: box.y + box.height * 0.65,
    width: box.width * 0.2,
    height: box.height * 0.2,
  };
  const moving = async () => {
    const first = await page.screenshot({ clip });
    await page.waitForTimeout(400);
    return !first.equals(await page.screenshot({ clip }));
  };

  expect(await moving()).toBe(true);
  await canvas.tap({ position: { x: 308 * scale, y: 10 * scale } });
  await page.waitForTimeout(300);
  expect(await moving()).toBe(false);

  await canvas.tap();
  await page.waitForTimeout(300);
  expect(await moving()).toBe(true);
  expect(errors).toEqual([]);
});

const VIEWPORTS = [
  { name: 'computador', width: 1280, height: 720 },
  { name: 'celular em paisagem', width: 844, height: 390 },
  { name: 'celular em retrato', width: 390, height: 844 },
];

test('a área de jogo cabe na tela e mantém 16:9 em retrato e paisagem', async ({ page }) => {
  const errors = watchErrors(page);
  const canvas = await openGame(page);
  await page.keyboard.press('Enter');

  for (const viewport of VIEWPORTS) {
    // Mudar o tamanho com a corrida em andamento é o caso de girar a tela (spec, casos-limite).
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500);
    const box = await canvas.boundingBox();
    const label = `${viewport.name} (${viewport.width}x${viewport.height})`;
    expect(box.x, label).toBeGreaterThanOrEqual(-0.5);
    expect(box.y, label).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, label).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y + box.height, label).toBeLessThanOrEqual(viewport.height + 0.5);
    expect(box.width / box.height, label).toBeCloseTo(GAME_WIDTH / GAME_HEIGHT, 1);
    // Ocupa a largura ou a altura toda: nenhuma folga além do que a proporção exige.
    const fillsWidth = box.width >= viewport.width - 1;
    const fillsHeight = box.height >= viewport.height - 1;
    expect(fillsWidth || fillsHeight, label).toBe(true);
  }

  expect(errors).toEqual([]);
});

test('o manifesto do aplicativo e os ícones são servidos', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBe('Corrida do Planalto');
  for (const icon of manifest.icons) {
    expect((await request.get(`/${icon.src}`)).ok(), icon.src).toBe(true);
  }
});

test('a tecla M silencia o som e a preferência fica guardada no aparelho', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'A tecla M é do teclado; o botão na tela é coberto pelo teste de pausa.');
  const errors = watchErrors(page);
  await openGame(page);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  const soundOn = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('corrida-do-planalto:save:v1'))?.soundOn);
  await page.keyboard.press('m');
  await expect.poll(soundOn).toBe(false);
  await page.keyboard.press('m');
  await expect.poll(soundOn).toBe(true);
  expect(errors).toEqual([]);
});
