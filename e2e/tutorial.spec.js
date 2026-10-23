import { expect, test } from '@playwright/test';
import { giocaTutorial, leggi, prepara, puntatore, shot } from './gioca.js';

test('il telefono arriva a Domani, torcia e telecomando', async ({ page }, info) => {
  test.skip(info.project.name !== 'telefono', 'solo sul ritratto, col dito');
  const errori = await prepara(page);
  await shot(page, 'telefono-saracinesca');
  const fine = await giocaTutorial(page, { mouse: false, prefisso: 'telefono' });
  expect(errori, errori.join('\n')).toEqual([]);
  expect(fine.id).toBe('chiusura');
  expect(fine.fine).toBe('1');
  expect(fine.glb).toBe('torcia');
  for (const nome of ['tappo', 'vite', 'contatto', 'pila_a', 'pila_b', 'vetro', 'macchia', 'sede_a', 'sede_b', 'centro_torcia']) {
    expect(fine.nodi).toContain(nome);
  }
  await expect(page.locator('#continua')).toBeVisible();
  await expect(page.locator('#rigioca')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('Fine del tutorial');
});

test('dalle impostazioni si salta e si resta nella bottega', async ({ page }, info) => {
  const mouse = info.project.name !== 'telefono';
  await prepara(page);
  const ingranaggio = await page.locator('#ingranaggio').boundingBox();
  await puntatore(page, [{ x: ingranaggio.x + ingranaggio.width / 2, y: ingranaggio.y + ingranaggio.height / 2 }], mouse);
  await page.waitForSelector('#impostazioni:not([hidden])');
  const salta = await page.locator('#salta').boundingBox();
  await puntatore(page, [{ x: salta.x + salta.width / 2, y: salta.y + salta.height / 2 }], mouse);
  await page.waitForFunction(() => document.querySelector('#app').dataset.passo === 'chiusura');
  await page.waitForFunction(() => {
    const n = document.querySelector('#cartello');
    const r = n.getBoundingClientRect();
    return n.textContent === 'Domani' && r.height > 8 && r.top >= 0 && r.bottom <= window.innerHeight;
  });
  await expect(page.locator('#taccuino .pina')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('Fine del tutorial');
  await shot(page, `${info.project.name}-salta`);
  await page.reload();
  await page.waitForSelector('#app[data-pronto="1"]');
  expect((await leggi(page)).id).toBe('chiusura');
});
