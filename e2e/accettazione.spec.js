import { expect, test } from '@playwright/test';
import { attendiPasso, leggi, prepara, punto, puntatore, shot, strumento, tieni, visibile } from './gioca.js';

test.describe('accettazione', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'telefono', 'ritratto touch');
  });

  test('T1 la saracinesca è il primo gesto e il bottone arriva entro 12 s', async ({ page }) => {
    const t0 = Date.now();
    await prepara(page);
    await expect(page.locator('#saracinesca')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(12000);
    const box = page.viewportSize();
    await puntatore(page, [{ x: box.width / 2, y: box.height * 0.7 }], false);
    await attendiPasso(page, 'b4-bottone');
    expect(Date.now() - t0).toBeLessThan(12000);
    const bottone = await punto(page, 'bottone');
    expect(bottone.y).toBeGreaterThan(box.height * 0.2);
    expect(bottone.y).toBeLessThan(box.height * 0.8);
  });

  test('T3 gli aiuti di B7 arrivano a 4, 6 e 12 secondi', async ({ page }) => {
    await prepara(page, '?debug=zone&passo=b7-svita');
    await attendiPasso(page, 'b7-svita');
    await strumento(page, 'cacciavite', false);
    await page.waitForFunction(() => Number(document.querySelector('#app').dataset.esitazione) > 3.2, null, { timeout: 20000 });
    expect(await page.locator('#app').getAttribute('data-aiuto')).toBe('0');
    await page.waitForFunction(() => document.querySelector('#app').dataset.ta1 !== '', null, { timeout: 20000 });
    const a1 = Number(await page.locator('#app').getAttribute('data-ta1'));
    expect(a1).toBeGreaterThan(3.7);
    expect(a1).toBeLessThan(4.4);
    await page.waitForFunction(() => document.querySelector('#app').dataset.ta2 !== '', null, { timeout: 20000 });
    const a2 = Number(await page.locator('#app').getAttribute('data-ta2'));
    expect(a2).toBeGreaterThan(5.7);
    expect(a2).toBeLessThan(6.4);
    await page.waitForFunction(() => document.querySelector('#app').dataset.bolla === 'Gira. Come per aprire un barattolo.', null, { timeout: 20000 });
    const a3 = Number(await page.locator('#app').getAttribute('data-ta3'));
    expect(a3).toBeGreaterThan(11.7);
    expect(a3).toBeLessThan(12.5);
  });

  test('T4 tre errori diversi, subito, senza perdere progresso', async ({ page }) => {
    await prepara(page, '?debug=zone&passo=b11-chiudi');
    await attendiPasso(page, 'b11-chiudi');
    const prima = (await leggi(page)).progresso;
    const vite = await punto(page, 'vite');
    await page.evaluate(() => {
      const nodo = document.querySelector('#bolla .riga');
      window.__downAt = 0;
      window.__corrAt = 0;
      window.__detto = '';
      const segna = () => { if (!window.__corrAt) window.__downAt = performance.now(); };
      document.addEventListener('pointerdown', segna, true);
      document.addEventListener('pointermove', segna, true);
      new MutationObserver(() => {
        const testo = nodo.textContent || '';
        if (!testo || testo === window.__detto) return;
        window.__detto = testo;
        window.__corrAt = performance.now();
      }).observe(nodo, { childList: true, characterData: true, subtree: true });
    });
    const detti = [];
    for (const id of ['lente', 'pennello']) {
      await strumento(page, id, false);
      await page.evaluate(() => { window.__downAt = 0; window.__corrAt = 0; });
      await puntatore(page, [vite], false);
      await expect(page.locator('#bolla')).toBeVisible();
      const ritardo = await page.evaluate(() => window.__corrAt - window.__downAt);
      expect(ritardo).toBeGreaterThanOrEqual(0);
      expect(ritardo).toBeLessThan(300);
      detti.push((await page.locator('#bolla .riga').innerText()).trim());
    }
    await strumento(page, 'cacciavite', false);
    const punti = [];
    for (let i = 0; i <= 24; i += 1) {
      const a = i * 0.2;
      punti.push({ x: vite.x + Math.cos(a) * 70, y: vite.y - Math.sin(a) * 70 });
    }
    await page.evaluate(() => { window.__downAt = 0; window.__corrAt = 0; });
    await puntatore(page, punti, false);
    await expect(page.locator('#bolla')).toBeVisible();
    const ritardo = await page.evaluate(() => window.__corrAt - window.__downAt);
    expect(ritardo).toBeGreaterThanOrEqual(0);
    expect(ritardo).toBeLessThan(300);
    detti.push((await page.locator('#bolla .riga').innerText()).trim());
    expect(new Set(detti).size).toBe(3);
    expect((await leggi(page)).progresso).toBeCloseTo(prima, 2);
    expect((await leggi(page)).id).toBe('b11-chiudi');
  });

  test('T5 il gesto durante la transizione parte al fermo e non si azzera', async ({ page }) => {
    await prepara(page, '?debug=zone&passo=b6-lente');
    await attendiPasso(page, 'b6-lente');
    await strumento(page, 'lente', false);
    const macchia = await punto(page, 'macchia');
    await tieni(page, { x: macchia.x, y: macchia.y + 70 }, 700, false);
    await page.waitForFunction(() => {
      const app = document.querySelector('#app');
      return app.dataset.passo === 'b7-svita' && app.dataset.fermo === '0';
    }, null, { timeout: 10000 });
    const box = page.viewportSize();
    const cx = box.width / 2;
    const cy = box.height / 2;
    const punti = [];
    for (let i = 0; i <= 40; i += 1) {
      const a = (i / 40) * Math.PI * 2 * 0.8;
      punti.push({ x: cx + Math.cos(a) * 64, y: cy - Math.sin(a) * 64 });
    }
    await strumento(page, 'cacciavite', false);
    await puntatore(page, punti, false);
    await attendiPasso(page, 'b7-svita');
    const prima = await leggi(page);
    expect(prima.progresso).toBeGreaterThan(0.15);
    await page.waitForTimeout(400);
    const dopo = await leggi(page);
    expect(dopo.progresso).toBeCloseTo(prima.progresso, 2);
    expect(dopo.id).toBe('b7-svita');
  });

  test('T6 il mezzo giro resta dopo il ricarico', async ({ page }) => {
    await prepara(page, '?debug=zone&passo=b7-svita');
    await attendiPasso(page, 'b7-svita');
    await strumento(page, 'cacciavite', false);
    const c = await punto(page, 'vite');
    const punti = [];
    for (let i = 0; i <= 36; i += 1) {
      const a = (i / 36) * Math.PI * 1.5;
      punti.push({ x: c.x + Math.cos(a) * 72, y: c.y - Math.sin(a) * 72 });
    }
    await puntatore(page, punti, false);
    await page.waitForTimeout(800);
    const prima = await leggi(page);
    expect(prima.progresso).toBeGreaterThan(0.35);
    expect(prima.progresso).toBeLessThan(0.85);
    await page.goto('/la-bottega/');
    await page.waitForSelector('#app[data-pronto="1"]');
    await page.waitForFunction(() => document.querySelector('#app').dataset.glb === 'torcia');
    await attendiPasso(page, 'b7-svita');
    const dopo = await leggi(page);
    expect(dopo.progresso).toBeGreaterThan(prima.progresso - 0.08);
    expect(dopo.inquadratura).toBe('DETTAGLIO-VITE');
    await expect.poll(async () => (await leggi(page)).bolla).toContain('Dov');
    expect(dopo.tappoY).toBeLessThan(0.03);
  });

  test('T8 le battute ci sono e le correzioni si vedono', async ({ page }) => {
    const errori = await prepara(page, '?debug=corr');
    expect(errori.filter((e) => e.includes('Battuta mancante'))).toEqual([]);
    await page.waitForFunction(() => document.querySelector('#app').dataset.corrOk === '1', null, { timeout: 15000 });
    const viste = await page.locator('#app').getAttribute('data-corr-viste');
    expect(viste).toContain('Con quello');
    expect(viste).toContain('Quello serve dopo');
    expect(viste).toContain('non c');
    expect(viste).toContain('A mani nude');
    expect(viste).toContain('Calma');
  });

  test('T13 il telefono girato mette in pausa e non perde il gesto', async ({ page }) => {
    await prepara(page, '?debug=zone&passo=b7-svita');
    await attendiPasso(page, 'b7-svita');
    await strumento(page, 'cacciavite', false);
    const c = await punto(page, 'vite');
    const punti = [];
    for (let i = 0; i <= 16; i += 1) {
      const a = (i / 16) * Math.PI * 0.7;
      punti.push({ x: c.x + Math.cos(a) * 72, y: c.y - Math.sin(a) * 72 });
    }
    await puntatore(page, punti, false);
    const prima = (await leggi(page)).progresso;
    expect(prima).toBeGreaterThan(0.05);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#paesaggio')).toBeVisible();
    expect((await leggi(page)).progresso).toBeCloseTo(prima, 2);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#paesaggio')).toBeHidden();
    expect((await leggi(page)).progresso).toBeCloseTo(prima, 2);
  });

  test('T15 niente occlusori sul soggetto e niente UI sovrapposta', async ({ page }) => {
    for (const id of ['b4-bottone', 'b6-lente', 'b8-pennello', 'b10-pile-dentro', 'r1-on', 'r3-leva', 'r5-pinze', 'r8-tv', 'chiusura']) {
      await prepara(page, `?debug=zone&passo=${id}`);
      await attendiPasso(page, id);
      if (id === 'b4-bottone') await expect(page.locator('#cartoncino')).toBeHidden();
      if (id === 'chiusura') {
        await page.waitForFunction(() => {
          const n = document.querySelector('#cartello');
          const r = n.getBoundingClientRect();
          return n.textContent === 'Domani' && r.height > 8 && r.top >= 0 && r.bottom <= window.innerHeight;
        });
        await page.waitForTimeout(900);
        const quadro = await page.locator('#app').getAttribute('data-quadro');
        expect(quadro, id).toBe('');
        const dentro = await page.evaluate(() => {
          const carta = document.querySelector('#taccuino').getBoundingClientRect();
          const chiudi = document.querySelector('#chiudi-taccuino').getBoundingClientRect();
          const timbro = document.querySelector('.timbro-pagina').getBoundingClientRect();
          const pina = document.querySelector('#taccuino .pina').getBoundingClientRect();
          const sta = (r) => r.width > 8 && r.height > 8
            && r.left >= carta.left - 1 && r.right <= carta.right + 1
            && r.top >= carta.top + 4 && r.bottom <= carta.bottom - 4;
          const tocca = (a, b) => a.left < b.right - 2 && a.right > b.left + 2
            && a.top < b.bottom - 2 && a.bottom > b.top + 2;
          return {
            chiudi: sta(chiudi),
            timbro: sta(timbro) && timbro.bottom <= pina.top + 2,
            pina: sta(pina) && pina.bottom <= chiudi.top - 2 && pina.textContent.includes('Pina'),
            stacco: !tocca(timbro, chiudi) && !tocca(pina, chiudi),
          };
        });
        expect(dentro.chiudi, 'chiudi').toBe(true);
        expect(dentro.timbro, 'timbro').toBe(true);
        expect(dentro.pina, 'pina').toBe(true);
        expect(dentro.stacco, 'stacco').toBe(true);
      }
    }
  });

  test('T16 la zona calda non si disegna senza debug', async ({ page }) => {
    await prepara(page);
    const nascosta = async (indice, id) => {
      await page.evaluate((i) => {
        localStorage.setItem('la-bottega:salvataggio', JSON.stringify({
          versione: 2,
          indice: i,
          linea: 0,
          saltato: false,
          progressoGesto: 0,
          parziali: [],
          strumento: null,
        }));
      }, indice);
      await page.reload();
      await page.waitForSelector('#app[data-pronto="1"]');
      await page.waitForFunction(() => document.querySelector('#app').dataset.glb === 'torcia');
      await attendiPasso(page, id);
      const stato = await page.evaluate(() => {
        const el = document.querySelector('#zone-debug');
        const r = el.getBoundingClientRect();
        return {
          hidden: el.hidden,
          attiva: el.classList.contains('attiva'),
          display: getComputedStyle(el).display,
          w: r.width,
          h: r.height,
        };
      });
      expect(stato.hidden, id).toBe(true);
      expect(stato.attiva, id).toBe(false);
      expect(stato.display, id).toBe('none');
      expect(stato.w, id).toBe(0);
      expect(stato.h, id).toBe(0);
    };
    await nascosta(2, 'b4-bottone');
    const volto = await page.evaluate(async () => {
      const raw = getComputedStyle(document.querySelector('#medaglione')).backgroundImage;
      const trovato = raw.match(/url\("?(data:image[^")]+)"?\)/);
      if (!trovato) return { n: 0 };
      const img = new Image();
      img.src = trovato[1];
      await img.decode();
      const tela = document.createElement('canvas');
      tela.width = img.width;
      tela.height = img.height;
      const ctx = tela.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, tela.width, tela.height).data;
      let n = 0;
      let sx = 0;
      let sy = 0;
      for (let y = 0; y < tela.height; y += 1) {
        for (let x = 0; x < tela.width; x += 1) {
          const i = (y * tela.width + x) * 4;
          const pesca = Math.abs(data[i] - 244) < 22 && Math.abs(data[i + 1] - 210) < 22 && Math.abs(data[i + 2] - 192) < 28;
          if (!pesca && data[i + 3] > 200) {
            n += 1;
            sx += x;
            sy += y;
          }
        }
      }
      if (!n) return { n };
      return { n, x: sx / n / tela.width, y: sy / n / tela.height };
    });
    expect(volto.n, 'medaglione').toBeGreaterThan(200);
    expect(volto.x).toBeGreaterThan(0.32);
    expect(volto.x).toBeLessThan(0.68);
    expect(volto.y).toBeGreaterThan(0.32);
    expect(volto.y).toBeLessThan(0.68);
    await nascosta(13, 'r3-leva');
    await page.goto('/la-bottega/?debug=zone&passo=b4-bottone');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#app').dataset.glb === 'torcia');
    await attendiPasso(page, 'b4-bottone');
    const accesa = await page.evaluate(() => {
      const el = document.querySelector('#zone-debug');
      return el.classList.contains('attiva') && getComputedStyle(el).display === 'block' && !el.hidden;
    });
    expect(accesa).toBe(true);
  });

  test('T9 dpr, triangoli e disegni restano nel budget', async ({ page }) => {
    await prepara(page);
    const box = page.viewportSize();
    await puntatore(page, [{ x: box.width / 2, y: box.height * 0.7 }], false);
    await page.waitForTimeout(400);
    const campione = await leggi(page);
    expect(campione.dpr).toBeLessThanOrEqual(1.5);
    expect(campione.dpr).toBeGreaterThan(0);
    expect(campione.tris).toBeLessThanOrEqual(40000);
    expect(campione.tris).toBeGreaterThan(100);
    expect(campione.draw).toBeLessThanOrEqual(50);
    expect(campione.draw).toBeGreaterThan(1);
    await page.waitForFunction(() => Number(document.querySelector('#app').dataset.fps) >= 20, null, { timeout: 8000 });
  });

  test('T7 il bersaglio sta nella zona calda', async ({ page }) => {
    const passi = ['b4-bottone', 'b5-gira', 'b6-lente', 'b7-svita', 'b8-pennello', 'b10-pile-dentro', 'r1-on', 'r3-leva', 'r5-pinze', 'r8-tv'];
    for (const [w, h] of [[360, 740], [390, 844], [430, 932]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const id of passi) {
        await prepara(page, `?debug=zone&passo=${id}&safeTop=47&safeBottom=34`);
        await attendiPasso(page, id);
        const stato = await leggi(page);
        const nome = stato.punti[id === 'r5-pinze' ? 'sede_molla' : Object.keys(stato.punti).find((n) => n === (
          id === 'b10-pile-dentro' ? 'pila_nuova_a' : null
        ))] ? null : null;
        const bersaglio = id === 'r5-pinze'
          ? 'sede_molla'
          : id === 'b10-pile-dentro'
            ? 'pila_nuova_a'
            : (await page.locator('#app').getAttribute('data-bersaglio'));
        const p = stato.punti[bersaglio];
        visibile(p, w, h, bersaglio);
        const zona = await page.evaluate(() => {
          const stile = getComputedStyle(document.documentElement);
          const top = parseFloat(stile.getPropertyValue('--safe-top')) || 0;
          const bottom = parseFloat(stile.getPropertyValue('--safe-bottom')) || 0;
          const h = window.innerHeight;
          const w = window.innerWidth;
          const alto = h - bottom;
          return {
            x0: w * 0.15, x1: w * 0.85,
            y0: top + (alto - top) * 0.32,
            y1: top + (alto - top) * 0.68,
          };
        });
        expect(p.x, id).toBeGreaterThan(zona.x0);
        expect(p.x, id).toBeLessThan(zona.x1);
        expect(p.y, id).toBeGreaterThan(zona.y0);
        expect(p.y, id).toBeLessThan(zona.y1);
        if (id === 'r3-leva') {
          const fb = stato.punti.fessura_b;
          visibile(fb, w, h, 'fessura_b');
          expect(fb.x, 'fessura_b').toBeGreaterThan(zona.x0);
          expect(fb.x, 'fessura_b').toBeLessThan(zona.x1);
          expect(fb.y, 'fessura_b').toBeGreaterThan(zona.y0);
          expect(fb.y, 'fessura_b').toBeLessThan(zona.y1);
        }
        if (w === 390) await shot(page, `zona-${id}`);
      }
    }
  });
});

test('attrezzo e verso sbagliati non avanzano, e Rigioca riparte', async ({ page }, info) => {
  test.skip(info.project.name !== 'telefono', 'ritratto touch');
  await prepara(page, '?debug=zone&passo=b11-chiudi');
  await attendiPasso(page, 'b11-chiudi');
  const vite = await punto(page, 'vite');
  const giro = (verso) => {
    const punti = [];
    for (let i = 0; i <= 32; i += 1) {
      const a = (i / 32) * Math.PI * 2 * verso;
      punti.push({ x: vite.x + Math.cos(a) * 72, y: vite.y - Math.sin(a) * 72 });
    }
    return punti;
  };
  const prima = (await leggi(page)).progresso;
  await puntatore(page, giro(-1), false);
  expect((await leggi(page)).progresso).toBeCloseTo(prima, 2);
  await expect.poll(async () => (await page.locator('#bolla').innerText()).toLowerCase()).toContain('mani');
  expect(await page.locator('#correzione').count()).toBe(0);

  await strumento(page, 'pennello', false);
  await puntatore(page, giro(-1), false);
  expect((await leggi(page)).progresso).toBeCloseTo(prima, 2);
  expect((await leggi(page)).id).toBe('b11-chiudi');

  await strumento(page, 'cacciavite', false);
  await puntatore(page, giro(1), false);
  const dopo = await leggi(page);
  expect(dopo.progresso).toBeCloseTo(prima, 2);
  expect(dopo.id).toBe('b11-chiudi');
  await expect.poll(async () => page.locator('#bolla').innerText()).toContain('destra');
  const verso = (await page.locator('#bolla').innerText()).trim();
  expect(verso.toLowerCase()).not.toContain('quello');

  await page.goto('/la-bottega/?debug=zone&passo=chiusura');
  await page.waitForSelector('#app[data-pronto="1"]');
  await page.waitForFunction(() => document.querySelector('#app').dataset.glb === 'torcia');
  await page.waitForFunction(() => document.querySelector('#app').dataset.passo === 'chiusura');
  await expect(page.locator('#rigioca')).toBeVisible();
  await page.locator('#rigioca').click();
  await page.waitForSelector('#saracinesca', { state: 'attached' });
  await page.waitForFunction(() => document.querySelector('#app').dataset.passo === 'b1-saracinesca', null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const indice = await page.evaluate(() => {
    const grezzo = localStorage.getItem('la-bottega:salvataggio');
    return grezzo ? JSON.parse(grezzo).indice : 0;
  });
  expect(indice).toBe(0);
  expect((await leggi(page)).id).toBe('b1-saracinesca');
});

test('T14 le parole del copione restano nel limite', async () => {
  const { spawnSync } = await import('node:child_process');
  const esito = spawnSync('node', ['scripts/conta-parole.mjs'], { encoding: 'utf8' });
  expect(esito.stdout).toContain('158');
  expect(esito.status).toBe(0);
});
