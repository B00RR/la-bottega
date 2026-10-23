import * as THREE from 'three';
import './stile.css';
import { AudioBottega } from './gioco/audio.js';
import { Gioco } from './gioco/Gioco.js';
import { Interfaccia } from './gioco/interfaccia.js';
import { Scena } from './gioco/scena.js';

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function timbro(sha, iso) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return sha;
  return `${sha} · ${data.getUTCDate()} ${MESI[data.getUTCMonth()]} ${data.getUTCFullYear()}`;
}

if (globalThis.__laBottega) {
  throw new Error('La Bottega è già avviata.');
}
globalThis.__laBottega = true;

const app = document.querySelector('#app');
const canvas = document.querySelector('#vista');
document.querySelector('#timbro').textContent = timbro(__COMMIT_SHA__, __BUILD_DATE__);

let scena;
try {
  scena = new Scena(canvas);
} catch (errore) {
  app.dataset.pronto = '0';
  app.insertAdjacentHTML('beforeend', '<p id="errore-webgl"></p>');
  document.querySelector('#errore-webgl').textContent =
    'Questo telefono non riesce ad aprire la bottega in 3D.';
  throw errore;
}

const audio = new AudioBottega();
const gioco = new Gioco({
  app,
  scena,
  audio,
  ui: new Interfaccia(app),
});

const timer = new THREE.Timer();
timer.connect(document);
scena.renderer.setAnimationLoop((tempo) => {
  timer.update(tempo);
  const crudo = timer.getDelta();
  gioco.dtLente = Math.min(crudo, 0.45);
  const dt = Math.min(crudo, 0.1);
  let dirty = false;
  try {
    dirty = gioco.aggiorna(dt);
  } catch (errore) {
    console.error(errore);
    dirty = true;
  }
  if (dirty) {
    scena.renderer.render(scena.scene, scena.camera);
    scena.dopoRender(dt);
  }
});
window.addEventListener('resize', () => scena.ridimensiona());
