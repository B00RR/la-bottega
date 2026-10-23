import { expect, test } from '@playwright/test';
import { giocaTutorial, leggi, prepara, puntatore, scriviEsito, shot } from './gioca.js';

test('il telefono gioca tutto il tutorial', async ({ page }) => {
  const errori = await prepara(page);
  expect(await page.evaluate(() => document.querySelector('#dialogo .riga')?.textContent)).toBe('Ah, sei arrivato.');
  const log = await giocaTutorial(page, { mouse: false, prove: true, prefisso: 'telefono' });
  expect(errori).toEqual([]);
  scriviEsito('esito-telefono.json', log);
});

test('il mouse sul desktop gioca tutto il tutorial', async ({ page }) => {
  const errori = await prepara(page);
  const log = await giocaTutorial(page, { mouse: true, prove: false, prefisso: 'desktop' });
  expect(errori).toEqual([]);
  scriviEsito('esito-desktop.json', log);
});

test('il tutorial si salta solo dalle impostazioni', async ({ page }, info) => {
  await prepara(page);
  const mouse = info.project.name !== 'telefono';
  const ingranaggio = await page.locator('#impostazioni-btn').boundingBox();
  await puntatore(page, [{ x: ingranaggio.x + ingranaggio.width / 2, y: ingranaggio.y + ingranaggio.height / 2 }], mouse);
  await expect(page.locator('#impostazioni')).toBeVisible();
  await expect(page.locator('#salta')).toBeVisible();
  const salta = await page.locator('#salta').boundingBox();
  await puntatore(page, [{ x: salta.x + salta.width / 2, y: salta.y + salta.height / 2 }], mouse);
  await expect(page.locator('#fine h1')).toHaveText('Fine del tutorial');
  await shot(page, `${info.project.name}-salta`);
  await page.reload();
  await page.waitForSelector('#app[data-pronto="1"]');
  await expect(page.locator('#fine h1')).toHaveText('Fine del tutorial');
  expect((await leggi(page)).id).toBe('fine');
});
