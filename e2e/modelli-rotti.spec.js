import { devices, expect, test } from '@playwright/test';

const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'];

test.use({
  ...devices['Pixel 5'],
  serviceWorkers: 'block',
  launchOptions: { args: gl },
});

/** Pixel 5, CPU ×4, Slow 3G, cache fredda. */
async function telefonoLento(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: 50_000,
    uploadThroughput: 50_000,
    connectionType: 'cellular3g',
  });
}

function glbSenzaDecoder() {
  const json = JSON.stringify({
    asset: { version: '2.0' },
    extensionsUsed: ['KHR_draco_mesh_compression'],
    extensionsRequired: ['KHR_draco_mesh_compression'],
  });
  const jsonBytes = Buffer.from(json);
  const pad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(pad, 0x20)]);
  const header = Buffer.alloc(12);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length, 8);
  const chunk = Buffer.alloc(8);
  chunk.writeUInt32LE(jsonChunk.length, 0);
  chunk.write('JSON', 4);
  return Buffer.concat([header, chunk, jsonChunk]);
}

async function alzaEBottega(page) {
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.passo === 'b1-saracinesca', null, { timeout: 90_000 });
  await expect(page.locator('#maniglia')).toHaveText('Alza', { timeout: 9_000 });
  await page.locator('#maniglia').tap();
  await expect.poll(() => page.locator('#app').getAttribute('data-passo'), { timeout: 20_000 }).toBe('b2-entrata');
  await expect.poll(() => page.locator('#app').getAttribute('data-inquadratura')).toBe('BANCO');
}

test.describe('modelli rotti', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'telefono', 'chromium android');
  });

  test('un GLB 404 non blocca Alza', async ({ page }) => {
    await telefonoLento(page);
    await page.route('**/ettore.glb*', (route) => route.fulfill({ status: 404, body: 'manca' }));
    await page.goto('/la-bottega/?debug=1', { waitUntil: 'domcontentloaded' });
    await alzaEBottega(page);
    const riga = page.locator('#debug-carico');
    await expect(riga).toContainText('ettore');
    await expect(riga).toContainText('fallito');
    await expect(riga).toContainText('maxTex');
    await expect(riga).toContainText('dpr');
  });

  test('un GLB che non risponde non blocca Alza', async ({ page }) => {
    await telefonoLento(page);
    await page.route('**/ettore.glb*', () => new Promise(() => {}));
    await page.goto('/la-bottega/?debug=1', { waitUntil: 'domcontentloaded' });
    await alzaEBottega(page);
    await expect(page.locator('#debug-carico')).toContainText('ettore');
    await expect(page.locator('#debug-carico')).toContainText('fallito');
  });

  test('un decoder assente non blocca Alza', async ({ page }) => {
    await telefonoLento(page);
    await page.route('**/torcia.glb*', (route) => route.fulfill({
      status: 200,
      contentType: 'model/gltf-binary',
      body: glbSenzaDecoder(),
    }));
    await page.goto('/la-bottega/?debug=1', { waitUntil: 'domcontentloaded' });
    await alzaEBottega(page);
    await expect(page.locator('#debug-carico')).toContainText('torcia');
    await expect(page.locator('#debug-carico')).toContainText('fallito');
  });

  test('senza WebGL il messaggio sostituisce i puntini', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
        if (String(tipo).includes('webgl')) return null;
        return orig.call(this, tipo, ...resto);
      };
    });
    await page.goto('/la-bottega/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#errore-webgl')).toContainText('non riesce ad aprire la bottega', { timeout: 30_000 });
    await expect(page.locator('#maniglia')).toBeHidden();
  });
});
