import { expect, test } from '@playwright/test';

/** Slow 3G di DevTools: 400 kbps, 400 ms. Una visita, cache vuota. */
async function reteLenta(page) {
  const nome = page.context().browser().browserType().name();
  if (nome === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: 50_000,
      uploadThroughput: 50_000,
      connectionType: 'cellular3g',
    });
    return;
  }
  await page.route('**/*', async (route) => {
    const risposta = await route.fetch();
    const corpo = await risposta.body();
    const attesa = 400 + Math.min(20_000, (corpo.length / 50_000) * 1000);
    await new Promise((r) => setTimeout(r, attesa));
    await route.fulfill({ response: risposta, body: corpo });
  });
}

test('visita fredda: Alza apre la bottega', async ({ page }, info) => {
  test.skip(!['telefono', 'webkit-telefono'].includes(info.project.name), 'ritratto, dito');
  const errori = [];
  page.on('pageerror', (errore) => errori.push(errore.message));
  await reteLenta(page);
  await page.goto('/la-bottega/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#maniglia')).toHaveText('Alza', { timeout: 90_000 });
  await page.locator('#maniglia').tap();
  await expect.poll(() => page.locator('#app').getAttribute('data-passo'), { timeout: 20_000 }).toBe('b2-entrata');
  await expect.poll(() => page.locator('#app').getAttribute('data-inquadratura')).toBe('BANCO');
  expect(errori, errori.join('\n')).toEqual([]);
});
