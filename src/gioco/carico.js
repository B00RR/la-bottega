import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TEMPO_ASSET = 4000;
const righe = [];

function debugAttivo() {
  try {
    return (new URLSearchParams(location.search).get('debug') || '').split(',').includes('1');
  } catch {
    return false;
  }
}

function disegna() {
  if (!debugAttivo()) return;
  let nodo = document.querySelector('#debug-carico');
  if (!nodo) {
    nodo = document.createElement('p');
    nodo.id = 'debug-carico';
    (document.querySelector('#app') || document.body).append(nodo);
  }
  nodo.hidden = false;
  nodo.textContent = righe.join('\n');
}

/** Una riga visibile con ?debug=1, e in console. */
export function registraCarico(nome, esito, ms) {
  const riga = `${nome} ${esito} ${Math.max(0, Math.round(ms))}ms`;
  righe.push(riga);
  if (esito === 'ok') console.info(riga);
  else console.error(riga);
  disegna();
}

export function registraScheda(testo) {
  righe.unshift(testo);
  console.info(testo);
  disegna();
}

function conTempo(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('tempo scaduto')), ms);
    promise.then((valore) => {
      clearTimeout(timer);
      resolve(valore);
    }, (errore) => {
      clearTimeout(timer);
      reject(errore instanceof Error ? errore : new Error(String(errore || 'caricamento')));
    });
  });
}

/** Il file deve finire o fallire. Una richiesta muta non tiene ferma la promessa. */
export function gltfEntro(url, ms = TEMPO_ASSET) {
  const t0 = performance.now();
  const nome = url.split('/').pop() || url;
  const carico = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => resolve(gltf), undefined, (err) => {
      reject(err instanceof Error ? err : new Error(String(err || url)));
    });
  });
  return conTempo(carico, ms).then((gltf) => {
    registraCarico(nome, 'ok', performance.now() - t0);
    return gltf;
  }, (errore) => {
    registraCarico(nome, 'fallito', performance.now() - t0);
    throw errore;
  });
}

/** Il font non blocca l'avvio: se non arriva, si va comunque. */
export function avviaFont() {
  const pronto = document.fonts?.ready;
  if (!pronto) return;
  const t0 = performance.now();
  conTempo(pronto, 3000).then(() => {
    registraCarico('font', 'ok', performance.now() - t0);
  }, () => {
    registraCarico('font', 'fallito', performance.now() - t0);
  });
}

const TETTO = 2048;

/** Una mappa più grande del tetto mobile (e del GPU) si riduce. */
export function limitaTexture(radice, maxGpu) {
  const tetto = Math.min(TETTO, maxGpu || TETTO);
  const visita = (texture, nome) => {
    const img = texture?.image;
    const w = img?.width || 0;
    const h = img?.height || 0;
    if (!w || !h || (w <= tetto && h <= tetto)) return;
    const t0 = performance.now();
    try {
      const scala = tetto / Math.max(w, h);
      const tela = document.createElement('canvas');
      tela.width = Math.max(1, Math.round(w * scala));
      tela.height = Math.max(1, Math.round(h * scala));
      tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);
      texture.image = tela;
      texture.needsUpdate = true;
      registraCarico(`${nome} ${w}x${h}`, 'ok', performance.now() - t0);
    } catch (errore) {
      registraCarico(`${nome} ${w}x${h}`, 'fallito', performance.now() - t0);
      console.error(errore);
    }
  };
  const materiali = (nodo) => {
    if (!nodo?.material) return;
    const lista = Array.isArray(nodo.material) ? nodo.material : [nodo.material];
    for (const mat of lista) {
      for (const chiave of Object.keys(mat)) {
        if (mat[chiave]?.isTexture) visita(mat[chiave], chiave);
      }
    }
  };
  if (radice?.traverse) radice.traverse(materiali);
  else materiali(radice);
}
