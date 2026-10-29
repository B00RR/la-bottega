import { devices, expect, test } from '@playwright/test';

const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'];

test.use({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 3.5,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['Pixel 5'].userAgent,
  serviceWorkers: 'block',
  launchOptions: { args: gl },
});

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'telefono', 'chromium, profilo alto');
});

async function rettangoli(page) {
  return page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el || el.hidden) return null;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return null;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };
    const tocca = (a, b) => a && b
      && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
    const chi = box('#chi-parla');
    const bolla = box('#bolla');
    const ingranaggio = box('#ingranaggio');
    return {
      chi,
      bolla,
      sovrapposti: tocca(chi, bolla) || tocca(bolla, ingranaggio) || tocca(chi, ingranaggio),
      errore: Boolean(document.querySelector('#errore-webgl')),
      vetrina: Boolean(document.querySelector('#vetrina')),
      immaginiRotte: [...document.querySelectorAll('img')].filter((img) => img.complete && img.naturalWidth === 0).length,
      medaglione: document.querySelector('#medaglione')?.querySelector('img') ? 'img' : 'svg',
    };
  });
}

test('il Pixel alto entra in bottega senza il falso errore', async ({ page }) => {
  await page.goto('/la-bottega/?safeTop=47&safeBottom=34');
  await expect(page.locator('#maniglia')).toHaveText('Alza', { timeout: 20_000 });
  await expect(page.locator('#vetrina')).toHaveCount(0);
  await page.locator('#maniglia').tap();
  await page.waitForFunction(() => {
    const bolla = document.querySelector('#bolla');
    return bolla && !bolla.hidden && (bolla.textContent || '').trim().length > 4;
  }, null, { timeout: 20_000 });
  const stato = await rettangoli(page);
  expect(stato.errore).toBe(false);
  expect(stato.vetrina).toBe(false);
  expect(stato.sovrapposti).toBe(false);
  expect(stato.immaginiRotte).toBe(0);
  expect(stato.medaglione).toBe('svg');
  expect(stato.chi.top).toBeGreaterThanOrEqual(47);
  expect(stato.bolla.top).toBeGreaterThanOrEqual(stato.chi.bottom - 1);
  await page.evaluate(() => {
    document.querySelector('#vista').dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await expect(page.locator('#errore-webgl')).toHaveCount(0);
});

test('un contesto rifiutato al primo colpo non è un telefono senza 3D', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    let visti = 0;
    HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
      if (String(tipo).includes('webgl')) {
        visti += 1;
        if (visti === 1) return null;
      }
      return orig.call(this, tipo, ...resto);
    };
  });
  await page.goto('/la-bottega/?debug=1');
  await expect(page.locator('#maniglia')).toHaveText('Alza', { timeout: 20_000 });
  await expect(page.locator('#errore-webgl')).toHaveCount(0);
  await expect(page.locator('#app')).toHaveAttribute('data-passo', 'b1-saracinesca');
});

test('senza alcun contesto resta il messaggio, con la causa nel debug', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
      if (String(tipo).includes('webgl')) return null;
      return orig.call(this, tipo, ...resto);
    };
  });
  await page.goto('/la-bottega/?debug=1');
  await expect(page.locator('#errore-webgl')).toContainText('non riesce ad aprire la bottega', { timeout: 20_000 });
  await expect(page.locator('#debug-carico')).toContainText('WebGL');
  await expect(page.locator('#maniglia')).toBeHidden();
  await expect(page.locator('#bolla')).toBeHidden();
});
