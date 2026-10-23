import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';

const CARTELLA = path.resolve('e2e/artefatti');
const EXPORT = '/opt/cursor/artifacts';

export async function prepara(page) {
  const errori = [];
  page.on('pageerror', (errore) => errori.push(errore.message));
  await page.goto('/la-bottega/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#app[data-pronto="1"]');
  return errori;
}

export async function leggi(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app');
    return {
      id: app.dataset.passo,
      tipo: app.dataset.tipo,
      gesto: app.dataset.gesto,
      direzione: Number(app.dataset.direzione || 1),
      stato: JSON.parse(app.dataset.stato || '{}'),
      indizi: app.dataset.indizi || '',
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
  page.once('framenavigated', () => {
    page._cdp = null;
  });
  return page._cdp;
}

export async function puntatore(page, punti, mouse) {
  if (!punti.length) throw new Error('gesto senza punti');
  if (mouse) {
    await page.mouse.move(punti[0].x, punti[0].y);
    await page.mouse.down();
    for (let i = 1; i < punti.length; i += 1) {
      await page.mouse.move(punti[i].x, punti[i].y);
    }
    await page.mouse.up();
    return;
  }
  const client = await sessione(page);
  const punto = (p) => ({ x: Math.round(p.x), y: Math.round(p.y), id: 1, radiusX: 2, radiusY: 2, force: 1 });
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [punto(punti[0])] });
  for (let i = 1; i < punti.length; i += 1) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [punto(punti[i])] });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

function linea(a, b, passi = 12) {
  const punti = [];
  for (let i = 0; i <= passi; i += 1) {
    const t = i / passi;
    punti.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return punti;
}

function cerchio(cx, cy, raggio, direzione, giri = 1) {
  const punti = [];
  const passi = Math.ceil(18 * giri);
  for (let i = 0; i <= passi; i += 1) {
    const a = direzione * (i / passi) * Math.PI * 2 * giri;
    punti.push({ x: cx + Math.cos(a) * raggio, y: cy + Math.sin(a) * raggio });
  }
  return punti;
}

function vicini(a, b) {
  const [ax, ay] = a.split(',').map(Number);
  const [bx, by] = b.split(',').map(Number);
  return Math.hypot(ax - bx, ay - by) < 3;
}

async function stabile(page) {
  let prima = null;
  let fermi = 0;
  for (let i = 0; i < 40; i += 1) {
    const ora = await page.evaluate(() => {
      const app = document.querySelector('#app');
      return { b: app.dataset.bersaglio || '', f: app.dataset.fotogrammi || '' };
    });
    const stessoFotogramma = prima && ora.f === prima.f;
    if (!stessoFotogramma && ora.b && prima && vicini(ora.b, prima.b)) {
      fermi += 1;
      if (fermi >= 2) return;
    } else if (!prima || !ora.b || !vicini(ora.b, prima.b)) {
      fermi = 0;
    }
    prima = ora;
    await page.waitForTimeout(50);
  }
}

function interseca(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export async function istruzioneLeggibile(page) {
  const frase = (await page.evaluate(() => {
    const el = document.querySelector('#istruzione .testo');
    if (!el || el.closest('[hidden]')) return '';
    return el.textContent || '';
  })).trim();
  expect(frase.length).toBeGreaterThan(8);
  const ok = await page.evaluate(() => {
    const el = document.querySelector('#istruzione .testo');
    const r = el.getBoundingClientRect();
    const colpito = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return Boolean(colpito && colpito.closest('#istruzione'));
  });
  expect(ok).toBeTruthy();
  const istr = await page.locator('#istruzione').boundingBox();
  const cassetta = await page.locator('#cassetta').boundingBox();
  const dialogo = await page.locator('#dialogo').boundingBox();
  if (cassetta) expect(interseca(istr, cassetta)).toBeFalsy();
  if (dialogo) expect(interseca(istr, dialogo)).toBeFalsy();
  return frase;
}

async function svuotaDialogo(page, mouse) {
  const id = await page.getAttribute('#app', 'data-passo');
  for (let i = 0; i < 8; i += 1) {
    if ((await page.getAttribute('#app', 'data-passo')) !== id) return;
    const dialogoNascosto = await page.evaluate(() => document.querySelector('#dialogo').hidden);
    if (dialogoNascosto) {
      await page.waitForFunction((prima) => document.querySelector('#app').dataset.passo !== prima, id, { timeout: 4000 });
      return;
    }
    const bolla = await page.locator('#dialogo .bolla').boundingBox();
    const cassetta = await page.locator('#cassetta').boundingBox();
    expect(bolla).toBeTruthy();
    if (cassetta) expect(interseca(bolla, cassetta)).toBeFalsy();
    const lineaAttuale = await page.getAttribute('#app', 'data-linea');
    await puntatore(page, [{ x: bolla.x + bolla.width / 2, y: bolla.y + bolla.height * 0.45 }], mouse);
    await page.waitForFunction(({ prima, idPasso }) => {
      const dlg = document.querySelector('#dialogo');
      const app = document.querySelector('#app');
      return dlg.hidden || app.dataset.linea !== prima || app.dataset.passo !== idPasso;
    }, { prima: lineaAttuale, idPasso: id });
    await page.waitForTimeout(450);
  }
  throw new Error(`il dialogo non finisce: ${id}`);
}

async function esegui(page, mouse) {
  const gesto = await page.getAttribute('#app', 'data-gesto');
  const bersaglio = await page.getAttribute('#app', 'data-bersaglio');
  const [cx, cy] = (bersaglio || '0,0').split(',').map(Number);
  if (gesto === 'ruota') {
    await puntatore(page, linea({ x: cx - 80, y: cy }, { x: cx + 90, y: cy }, 14), mouse);
  } else if (gesto === 'lente') {
    const punti = JSON.parse(await page.getAttribute('#app', 'data-bersagli') || '[]');
    for (const p of punti) {
      await puntatore(page, linea({ x: p.x - 24, y: p.y }, { x: p.x + 8, y: p.y }, 6), mouse);
      await page.waitForTimeout(80);
    }
  } else if (gesto === 'circolare' || gesto === 'avvolgi') {
    const direzione = gesto === 'avvolgi' ? 1 : Number(await page.getAttribute('#app', 'data-direzione') || 1);
    const giri = gesto === 'avvolgi' ? 1.3 : 1;
    await puntatore(page, cerchio(cx, cy, 56, direzione, giri), mouse);
  } else if (gesto === 'strofina') {
    const punti = [{ x: cx - 28, y: cy }];
    for (let i = 0; i < 8; i += 1) punti.push({ x: cx + (i % 2 === 0 ? 32 : -32), y: cy + (i % 2 ? 6 : -6) });
    await puntatore(page, punti, mouse);
  } else if (gesto === 'estrai') {
    const punti = JSON.parse(await page.getAttribute('#app', 'data-bersagli') || '[]');
    for (const p of punti) {
      await puntatore(page, linea(p, { x: p.x, y: p.y - 150 }, 12), mouse);
      await page.waitForTimeout(100);
    }
  } else if (gesto === 'inserisci' || gesto === 'pinza') {
    const coppie = JSON.parse(await page.getAttribute('#app', 'data-coppie') || '[]');
    for (const coppia of coppie) {
      await puntatore(page, linea(coppia.da, coppia.a, 14), mouse);
      await page.waitForTimeout(120);
    }
  } else if (gesto === 'scorri') {
    const s = JSON.parse(await page.getAttribute('#app', 'data-scorri') || '{}');
    const a = { x: s.ax, y: s.ay };
    const b = { x: s.bx, y: s.by };
    const oltre = { x: a.x + (b.x - a.x) * 1.15, y: a.y + (b.y - a.y) * 1.15 };
    await puntatore(page, linea(a, oltre, 14), mouse);
  } else {
    throw new Error(`gesto sconosciuto: ${gesto}`);
  }
}

async function fincheCambia(page, mouse) {
  const id = await page.getAttribute('#app', 'data-passo');
  let ultimo = '';
  for (let i = 0; i < 4; i += 1) {
    await stabile(page);
    ultimo = await page.getAttribute('#app', 'data-bersaglio');
    await esegui(page, mouse);
    try {
      await page.waitForFunction((prima) => document.querySelector('#app').dataset.passo !== prima, id, { timeout: 1200 });
      return;
    } catch {
      /* un altro giro, il gesto tiene il progresso già fatto */
    }
  }
  throw new Error(`gesto bloccato su ${id} (bersaglio ${ultimo})`);
}

async function toccaBottone(page, id, mouse) {
  const bottone = page.locator(`[data-strumento="${id}"]`);
  await bottone.scrollIntoViewIfNeeded();
  const box = await bottone.boundingBox();
  await puntatore(page, [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }], mouse);
  await page.waitForTimeout(200);
}

const FRASI = {
  'torcia-guarda': 'girare',
  'torcia-lente': 'lente',
  'torcia-svita': 'cerchio',
  'torcia-strofina': 'Strofina',
  'torcia-pile-fuori': 'vecchie',
  'torcia-pile-dentro': 'cassetto',
  'torcia-chiudi': 'contrario',
  'telecomando-guarda': 'telecomando',
  'telecomando-leva': 'fessura',
  'telecomando-lente': 'lente',
  'telecomando-molla': 'molla',
  'telecomando-nastro': 'avvolg',
  'telecomando-chiudi': 'scorrere',
};

export async function giocaTutorial(page, { mouse, prove, prefisso }) {
  const log = [];
  let ricaricato = false;
  let esitazione = false;
  let strumentoSbagliato = false;

  for (let n = 0; n < 45; n += 1) {
    const passo = await leggi(page);
    if (passo.id === 'fine') {
      const titolo = await page.evaluate(() => document.querySelector('#fine h1')?.textContent || '');
      expect(titolo).toBe('Fine del tutorial');
      await shot(page, `${prefisso}-fine`);
      log.push({ id: 'fine', esito: 'ok' });
      return log;
    }

    if (passo.tipo === 'posa') {
      await shot(page, `${prefisso}-${passo.id}`);
      await page.waitForFunction((id) => document.querySelector('#app').dataset.passo !== id, passo.id);
      log.push({ id: passo.id, esito: 'ok' });
      continue;
    }

    if (passo.tipo === 'dialogo' || passo.tipo === 'festa') {
      const rigaOra = await page.evaluate(() => document.querySelector('#dialogo .riga')?.textContent || '');
      expect(rigaOra.length).toBeGreaterThan(0);
      if (passo.id === 'intro-cacciavite') {
        expect(passo.indizi).toContain('contatto ossidato');
      }
      if (passo.id === 'intro-pinzette') {
        expect(passo.indizi).toContain('filo scoperto');
        expect(passo.indizi).toContain('molla spostata');
      }
      if (passo.id === 'festa-torcia') expect(passo.stato.torciaAccesa).toBe(1);
      if (passo.id === 'festa-telecomando') expect(passo.stato.tv).toBe(1);
      await shot(page, `${prefisso}-${passo.id}`);
      if (prove && passo.id === 'intro-pennello' && !ricaricato) {
        ricaricato = true;
        expect(passo.stato.tappo).toBeGreaterThan(0.5);
        await page.reload();
        await page.waitForSelector('#app[data-pronto="1"]');
        await page.waitForFunction(() => document.querySelector('#app').dataset.passo === 'intro-pennello');
        const dopo = await leggi(page);
        expect(dopo.stato.tappo).toBeGreaterThan(0.5);
        await shot(page, `${prefisso}-ricarico-svita`);
        log.push({ id: 'ricarico-dopo-svita', esito: 'ok' });
        continue;
      }
      await svuotaDialogo(page, mouse);
      log.push({ id: passo.id, esito: 'ok' });
      continue;
    }

    if (passo.tipo === 'gesto') {
      await stabile(page);
      const frase = await istruzioneLeggibile(page);
      expect(frase.toLowerCase()).toContain(FRASI[passo.id].toLowerCase());
      await shot(page, `${prefisso}-${passo.id}`);

      if (prove && passo.id === 'torcia-lente' && !esitazione) {
        esitazione = true;
        await page.waitForTimeout(5500);
        const aiuto = await page.evaluate(() => ({
          mano: !document.querySelector('#mano-aiuto').hidden,
          pulsa: document.querySelector('#cassetta [data-strumento="lente"]')?.classList.contains('pulsa'),
        }));
        expect(aiuto.mano).toBeTruthy();
        expect(aiuto.pulsa).toBeTruthy();
        const mano = await page.locator('#mano-aiuto').boundingBox();
        const istr = await page.locator('#istruzione').boundingBox();
        const cass = await page.locator('#cassetta').boundingBox();
        expect(interseca(mano, istr)).toBeFalsy();
        expect(interseca(mano, cass)).toBeFalsy();
        await shot(page, `${prefisso}-esitazione`);
        log.push({ id: 'esitazione', esito: 'ok' });
      }

      if (prove && passo.id === 'torcia-strofina' && !strumentoSbagliato) {
        strumentoSbagliato = true;
        await toccaBottone(page, 'cacciavite', mouse);
        await stabile(page);
        const bersaglio = await page.getAttribute('#app', 'data-bersaglio');
        const [cx, cy] = bersaglio.split(',').map(Number);
        const punti = [{ x: cx - 20, y: cy }];
        for (let i = 0; i < 6; i += 1) punti.push({ x: cx + (i % 2 ? 24 : -24), y: cy });
        await puntatore(page, punti, mouse);
        await page.waitForFunction(() => /ragazzo|cacciavite/i.test(document.querySelector('#correzione')?.textContent || ''), null, { timeout: 4000 });
        const dopoSbaglio = await leggi(page);
        expect(dopoSbaglio.id).toBe('torcia-strofina');
        expect(dopoSbaglio.stato.pulizia).toBe(0);
        await shot(page, `${prefisso}-strumento-sbagliato`);
        await toccaBottone(page, 'pennello', mouse);
        await puntatore(page, linea({ x: cx - 10, y: cy }, { x: cx + 16, y: cy }, 4), mouse);
        await page.reload();
        await page.waitForSelector('#app[data-pronto="1"]');
        await page.waitForFunction(() => document.querySelector('#app').dataset.passo === 'torcia-strofina');
        expect((await leggi(page)).stato.pulizia).toBe(0);
        await shot(page, `${prefisso}-ricarico-strofina`);
        log.push({ id: 'strumento-sbagliato', esito: 'ok' });
        log.push({ id: 'ricarico-durante-strofina', esito: 'ok' });
        continue;
      }

      await fincheCambia(page, mouse);
      log.push({ id: passo.id, esito: 'ok' });
      continue;
    }

    throw new Error(`passo sconosciuto ${passo.id}`);
  }
  throw new Error('il tutorial non arriva in fondo');
}

export function scriviEsito(nome, log) {
  fs.mkdirSync(CARTELLA, { recursive: true });
  fs.mkdirSync(EXPORT, { recursive: true });
  const json = JSON.stringify(log, null, 2);
  fs.writeFileSync(path.join(CARTELLA, nome), json);
  fs.writeFileSync(path.join(EXPORT, nome), json);
}
