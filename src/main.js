import * as THREE from 'three';
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
  ui: new Interfaccia(app, {
    seleziona: (id) => gioco.seleziona(id),
    salta: () => gioco.salta(),
    ricomincia: () => gioco.ricomincia(),
    alternaAudio: () => gioco.alternaAudio(),
  }),
});

const timer = new THREE.Timer();
timer.connect(document);
scena.renderer.setAnimationLoop((tempo) => {
  timer.update(tempo);
  const dt = Math.min(timer.getDelta(), 0.1);
  gioco.aggiorna(dt);
  scena.renderer.render(scena.scene, scena.camera);
});
