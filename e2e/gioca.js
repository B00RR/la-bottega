import fs from 'node:fs';
import path from 'node:path';

const CARTELLA = path.resolve('e2e/artefatti');
const EXPORT = '/opt/cursor/artifacts';

export async function prepara(page, query = '') {
  const errori = [];
  page.on('pageerror', (errore) => errori.push(errore.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /Battuta mancante|TypeError|is not a function/.test(msg.text())) {
      errori.push(msg.text());
    }
  });
  await page.goto(`/la-bottega/${query}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#saracinesca', { state: 'attached', timeout: 20000 });
  await page.waitForSelector('#app[data-pronto="1"]', { timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('#app').dataset.glb === 'torcia', null, { timeout: 20000 });
  return errori;
}

export async function leggi(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app');
    return {
      id: app.dataset.passo,
      fermo: app.dataset.fermo,
      gesto: app.dataset.gesto,
      progresso: Number(app.dataset.progresso || 0),
      bolla: app.dataset.bolla || '',
      strumento: app.dataset.strumento || '',
      fine: app.dataset.fine,
      glb: app.dataset.glb,
      nodi: app.dataset.nodi || '',
      inquadratura: app.dataset.inquadratura || '',
      aiuto: app.dataset.aiuto,
      parziali: app.dataset.parziali || '',
      dpr: Number(app.dataset.dpr || 0),
      fps: Number(app.dataset.fps || 0),
      tris: Number(app.dataset.tris || 0),
      draw: Number(app.dataset.draw || 0),
      tappoY: Number(app.dataset.tappoY || 0),
      punti: JSON.parse(app.dataset.punti || '{}'),
    };
  });
}

export async function shot(page, nome) {
  fs.mkdirSync(CARTELLA, { recursive: true });
  fs.mkdirSync(EXPORT, { recursive: true });
  const file = path.join(CARTELLA, `${nome}.png`);
  await page.screenshot({ path: file });
  fs.copyFileSync(file, path.join(EXPORT, `${nome}.png`));
}

async function sessione(page) {
  if (page._cdp) return page._cdp;
  page._cdp = await page.context().newCDPSession(page);
  page.once('framenavigated', () => { page._cdp = null; });
  return page._cdp;
}

function schermo(page) {
  const box = page.viewportSize();
  return { w: box.width, h: box.height };
}

export function visibile(p, w, h, nome) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
    throw new Error(`bersaglio assente: ${nome}`);
  }
  if (p.x < 2 || p.y < 2 || p.x > w - 2 || p.y > h - 2) {
    throw new Error(`bersaglio fuori schermo (${nome} ${Math.round(p.x)},${Math.round(p.y)} in ${w}x${h})`);
  }
  return p;
}

export async function inZonaCalda(page, nome) {
  const p = await punto(page, nome);
  const { w, h } = schermo(page);
  const x0 = w * 0.15;
  const x1 = w * 0.85;
  const y0 = h * 0.32;
  const y1 = h * 0.68;
  if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) {
    throw new Error(`${nome} fuori zona calda (${Math.round(p.x)},${Math.round(p.y)} in ${w}x${h})`);
  }
  return p;
}

async function expectPina(page) {
  await page.waitForFunction(() => {
    const nodo = document.querySelector('#taccuino .pina');
    const taccuino = document.querySelector('#taccuino');
    return nodo && taccuino && !taccuino.hidden && nodo.textContent.includes('Pina');
  });
}

export async function punto(page, nome) {
  const { w, h } = schermo(page);
  const p = await page.evaluate((id) => {
    const punti = JSON.parse(document.querySelector('#app').dataset.punti || '{}');
    return punti[id] || null;
  }, nome);
  return visibile(p, w, h, nome);
}

export async function attendiPasso(page, id) {
  await page.waitForFunction((atteso) => document.querySelector('#app').dataset.passo === atteso, id, { timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('#app').dataset.fermo === '1', null, { timeout: 20000 });
}

export async function puntatore(page, punti, mouse) {
  const { w, h } = schermo(page);
  for (const p of punti) visibile(p, w, h, 'traccia');
  if (mouse) {
    await page.mouse.move(punti[0].x, punti[0].y);
    await page.mouse.down();
    for (let i = 1; i < punti.length; i += 1) await page.mouse.move(punti[i].x, punti[i].y);
    await page.mouse.up();
    return;
  }
  const client = await sessione(page);
  const tocco = (p) => ({ x: Math.round(p.x), y: Math.round(p.y), id: 1, radiusX: 2, radiusY: 2, force: 1 });
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tocco(punti[0])] });
  for (let i = 1; i < punti.length; i += 1) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [tocco(punti[i])] });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

export async function tieni(page, p, ms, mouse) {
  const { w, h } = schermo(page);
  visibile(p, w, h, 'lente');
  if (mouse) {
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
    return;
  }
  const client = await sessione(page);
  const tocco = { x: Math.round(p.x), y: Math.round(p.y), id: 1, radiusX: 2, radiusY: 2, force: 1 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tocco] });
  await page.waitForTimeout(ms);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

export async function strumento(page, id, mouse) {
  const slot = page.locator(`[data-strumento="${id}"]`);
  await slot.waitFor({ state: 'visible', timeout: 8000 });
  const box = await slot.boundingBox();
  const { w, h } = schermo(page);
  visibile({ x: box.x + box.width / 2, y: box.y + box.height / 2 }, w, h, id);
  await puntatore(page, [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }], mouse);
  await page.waitForFunction((atteso) => document.querySelector('#app').dataset.strumento === atteso, id, { timeout: 5000 });
}

function cerchio(cx, cy, r, senso, giri) {
  const punti = [];
  const passi = Math.ceil(giri * 50);
  const verso = senso === 'orario' ? -1 : 1;
  for (let i = 0; i <= passi; i += 1) {
    const a = (i / passi) * giri * Math.PI * 2 * verso;
    punti.push({ x: cx + Math.cos(a) * r, y: cy - Math.sin(a) * r });
  }
  return punti;
}

async function finche(page, id, mouse, gesto) {
  for (let i = 0; i < 6; i += 1) {
    const stato = await leggi(page);
    if (stato.id !== id) return;
    await gesto();
    await page.waitForTimeout(200);
  }
  const rimasto = await leggi(page);
  if (rimasto.id === id) throw new Error(`ancora su ${id} (progresso ${rimasto.progresso})`);
}

export async function giocaTutorial(page, { mouse, prefisso }) {
  const { w, h } = schermo(page);
  await puntatore(page, [{ x: w / 2, y: h * 0.72 }], mouse);
  await attendiPasso(page, 'b4-bottone');
  await shot(page, `${prefisso}-bottone`);
  await puntatore(page, [await punto(page, 'bottone')], mouse);
  await attendiPasso(page, 'b5-gira');
  await finche(page, 'b5-gira', mouse, async () => {
    const c = await punto(page, 'centro_torcia');
    const meta = Math.min(w - 8, c.x + 170);
    await puntatore(page, [c, { x: meta, y: c.y }], mouse);
  });
  await attendiPasso(page, 'b6-lente');
  await shot(page, `${prefisso}-coda`);
  await strumento(page, 'lente', mouse);
  const macchia = await punto(page, 'macchia');
  await tieni(page, { x: macchia.x, y: macchia.y + 70 }, 700, mouse);
  await attendiPasso(page, 'b7-svita');
  await strumento(page, 'cacciavite', mouse);
  await shot(page, `${prefisso}-vite`);
  await finche(page, 'b7-svita', mouse, async () => {
    const c = await punto(page, 'vite');
    await puntatore(page, cerchio(c.x, c.y, 72, 'antiorario', 1.7), mouse);
  });
  await attendiPasso(page, 'b8-pennello');
  await strumento(page, 'pennello', mouse);
  await finche(page, 'b8-pennello', mouse, async () => {
    const c = await punto(page, 'contatto');
    const tratti = [];
    for (let i = 0; i < 8; i += 1) {
      tratti.push({ x: c.x - 70, y: c.y }, { x: c.x + 70, y: c.y });
    }
    await puntatore(page, tratti, mouse);
  });
  await attendiPasso(page, 'b9-pile-fuori');
  await inZonaCalda(page, 'pila_a');
  await inZonaCalda(page, 'pila_b');
  for (const nome of ['pila_a', 'pila_b']) {
    const p = await punto(page, nome);
    await puntatore(page, [p, { x: p.x, y: Math.max(8, p.y - 120) }], mouse);
    await page.waitForTimeout(250);
  }
  await attendiPasso(page, 'b10-pile-dentro');
  await shot(page, `${prefisso}-cassetto`);
  const prima = await punto(page, 'pila_a');
  if (!prima) throw new Error('la pila tolta non è più visibile');
  for (const nome of ['pila_nuova_a', 'pila_nuova_b']) {
    const da = await punto(page, nome);
    const sede = await punto(page, nome.endsWith('a') ? 'sede_a' : 'sede_b');
    await puntatore(page, [da, sede], mouse);
    await page.waitForTimeout(250);
  }
  await attendiPasso(page, 'b11-chiudi');
  await strumento(page, 'cacciavite', mouse);
  await finche(page, 'b11-chiudi', mouse, async () => {
    const c = await punto(page, 'vite');
    await puntatore(page, cerchio(c.x, c.y, 72, 'orario', 1.3), mouse);
  });
  await attendiPasso(page, 'b12-prova');
  await puntatore(page, [await punto(page, 'bottone')], mouse);
  await page.waitForTimeout(400);
  await shot(page, `${prefisso}-luce`);
  await attendiPasso(page, 'r1-on');
  await shot(page, `${prefisso}-telecomando`);
  await puntatore(page, [await punto(page, 'tasto_on')], mouse);
  await attendiPasso(page, 'r2-gira');
  await finche(page, 'r2-gira', mouse, async () => {
    const c = await punto(page, 'centro_telecomando');
    const meta = Math.min(w - 8, c.x + 170);
    await puntatore(page, [c, { x: meta, y: c.y }], mouse);
  });
  await attendiPasso(page, 'r3-leva');
  await inZonaCalda(page, 'fessura_a');
  await inZonaCalda(page, 'fessura_b');
  await strumento(page, 'leva', mouse);
  await finche(page, 'r3-leva', mouse, async () => {
    const a = await punto(page, 'fessura_a');
    const b = await punto(page, 'fessura_b');
    await puntatore(page, [a, b], mouse);
  });
  await attendiPasso(page, 'r4-lente');
  await strumento(page, 'lente', mouse);
  for (const nome of ['rame', 'molla']) {
    for (let i = 0; i < 3; i += 1) {
      const stato = await leggi(page);
      if (stato.id !== 'r4-lente' || (stato.parziali || '').includes(nome)) break;
      const p = await punto(page, nome);
      const ly = Math.min(h - 8, Math.max(8, p.y + 70));
      await tieni(page, { x: p.x, y: ly }, 1400, mouse);
      await page.waitForTimeout(200);
    }
  }
  await attendiPasso(page, 'r5-pinze');
  await inZonaCalda(page, 'molla');
  await inZonaCalda(page, 'sede_molla');
  await strumento(page, 'pinzette', mouse);
  await finche(page, 'r5-pinze', mouse, async () => {
    const a = await punto(page, 'molla');
    const b = await punto(page, 'sede_molla');
    await puntatore(page, [a, b], mouse);
  });
  await attendiPasso(page, 'r6-nastro');
  await strumento(page, 'nastro', mouse);
  await finche(page, 'r6-nastro', mouse, async () => {
    const c = await punto(page, 'filo');
    await puntatore(page, cerchio(c.x, c.y, 64, 'antiorario', 2.2), mouse);
  });
  await attendiPasso(page, 'r7-guscio');
  await finche(page, 'r7-guscio', mouse, async () => {
    const a = await punto(page, 'guscio');
    const b = await punto(page, 'sede_guscio');
    await puntatore(page, [a, b], mouse);
  });
  await attendiPasso(page, 'r8-tv');
  await puntatore(page, [await punto(page, 'tasto_on')], mouse);
  await page.waitForTimeout(500);
  await shot(page, `${prefisso}-tv`);
  await attendiPasso(page, 'chiusura');
  await page.waitForFunction(() => document.querySelector('#cartello')?.textContent === 'Domani');
  await page.waitForFunction(() => {
    const n = document.querySelector('#cartello');
    const r = n.getBoundingClientRect();
    return r.height > 8 && r.top >= 0 && r.bottom <= window.innerHeight;
  });
  await expectPina(page);
  await shot(page, `${prefisso}-domani`);
  const testo = await page.locator('body').innerText();
  if (testo.includes('Fine del tutorial')) throw new Error('compare Fine del tutorial');
  return leggi(page);
}
