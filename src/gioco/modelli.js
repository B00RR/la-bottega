import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Contratto per i GLB (un file in /modelli/<id>.glb).
 * Ogni parte animata è un Object3D con questi nomi: l'origine del nodo è il perno.
 * Se il file non c'è, restano le mesh procedurali. `import.meta.glob` non fa richieste a vuoto.
 */
export const PARTI = {
  torcia: ['Corpo', 'Testa', 'Vetro', 'Bottone', 'Tappo', 'Macchia', 'Vite', 'Contatto', 'PilaA', 'PilaB', 'PilaNuovaA', 'PilaNuovaB'],
  telecomando: ['Corpo', 'Guscio', 'TastoOn', 'FessuraA', 'FessuraB', 'Filo', 'Rame', 'Molla', 'SedeMolla', 'Nastro'],
  ettore: ['Corpo', 'Testa', 'Giornale', 'Cappello', 'Mano'],
};

const disponibili = import.meta.glob('../../modelli/*.glb', { query: '?url', import: 'default' });
const cache = new Map();

export function pittura(colore, extra = {}) {
  const chiave = JSON.stringify([colore, extra.emissive || '', extra.opacita ?? 1, extra.additivo ? 1 : 0, extra.lato || 0]);
  if (!extra.unico && cache.has(chiave)) return cache.get(chiave);
  const materiale = new THREE.MeshLambertMaterial({
    color: colore,
    flatShading: true,
    emissive: new THREE.Color(extra.emissive || '#000000'),
    emissiveIntensity: extra.emissive ? 0.6 : 0,
  });
  if (extra.opacita != null && extra.opacita < 1) {
    materiale.transparent = true;
    materiale.opacity = extra.opacita;
    materiale.depthWrite = false;
  }
  if (extra.additivo) {
    materiale.transparent = true;
    materiale.blending = THREE.AdditiveBlending;
    materiale.depthWrite = false;
  }
  if (extra.mappa) {
    materiale.map = extra.mappa;
    materiale.emissiveMap = extra.mappa;
  }
  if (!extra.unico) cache.set(chiave, materiale);
  return materiale;
}

function mesh(forma, args, colore, extra = {}) {
  let geometria;
  if (forma === 'cilindro') geometria = new THREE.CylinderGeometry(...args);
  else if (forma === 'sfera') geometria = new THREE.SphereGeometry(...args);
  else if (forma === 'anello') geometria = new THREE.RingGeometry(...args);
  else geometria = new THREE.BoxGeometry(...args);
  const nodo = new THREE.Mesh(geometria, pittura(colore, extra));
  nodo.castShadow = false;
  nodo.receiveShadow = false;
  return nodo;
}

function nominato(nome, nodo) {
  nodo.name = nome;
  return nodo;
}

function unisci(meshes) {
  const gruppi = new Map();
  for (const pezzo of meshes) {
    pezzo.updateMatrix();
    const geometria = pezzo.geometry.clone();
    geometria.applyMatrix4(pezzo.matrix);
    const chiave = pezzo.material.uuid;
    if (!gruppi.has(chiave)) gruppi.set(chiave, { materiale: pezzo.material, geometrie: [] });
    gruppi.get(chiave).geometrie.push(geometria);
  }
  const radice = new THREE.Group();
  radice.name = 'BottegaStatica';
  for (const { materiale, geometrie } of gruppi.values()) {
    const geometria = mergeGeometries(geometrie, false);
    if (!geometria) continue;
    radice.add(new THREE.Mesh(geometria, materiale));
  }
  return radice;
}

function etichettaAnno() {
  const tela = document.createElement('canvas');
  tela.width = 128;
  tela.height = 64;
  const ctx = tela.getContext('2d');
  ctx.fillStyle = '#5d6a3e';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#1c2410';
  ctx.font = '700 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('2019', 64, 34);
  const texture = new THREE.CanvasTexture(tela);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const anno = etichettaAnno();

function pila(colore, nome, conAnno) {
  const g = nominato(nome, new THREE.Group());
  const corpo = mesh('cilindro', [0.013, 0.013, 0.046, 6], colore);
  corpo.rotation.z = Math.PI / 2;
  const polo = mesh('cilindro', [0.006, 0.006, 0.008, 6], '#d5d8dc');
  polo.rotation.z = Math.PI / 2;
  polo.position.x = 0.026;
  g.add(corpo, polo);
  if (conAnno) {
    const etichetta = new THREE.Mesh(
      new THREE.PlaneGeometry(0.03, 0.016),
      pittura('#5d6a3e', { unico: true, mappa: anno, emissive: '#5d6a3e' }),
    );
    etichetta.rotation.y = -Math.PI / 2;
    etichetta.position.set(-0.008, 0.012, 0);
    etichetta.name = `${nome}Anno`;
    g.add(etichetta);
  }
  return g;
}

export function creaTorcia() {
  const g = nominato('Torcia', new THREE.Group());
  const corpo = nominato('Corpo', mesh('cilindro', [0.03, 0.03, 0.15, 6], '#c4623a'));
  corpo.rotation.z = Math.PI / 2;
  const testa = nominato('Testa', mesh('cilindro', [0.038, 0.036, 0.042, 6], '#8d929a'));
  testa.rotation.z = Math.PI / 2;
  testa.position.x = 0.09;
  const vetro = nominato('Vetro', mesh('cilindro', [0.026, 0.026, 0.012, 6], '#ffe7b0', { unico: true, emissive: '#ffd59a' }));
  vetro.rotation.z = Math.PI / 2;
  vetro.position.x = 0.116;
  vetro.material.emissiveIntensity = 0;

  const bottone = nominato('Bottone', new THREE.Group());
  bottone.position.set(0.015, 0, 0.034);
  const tasto = mesh('cilindro', [0.012, 0.012, 0.01, 6], '#f4efe4');
  tasto.rotation.x = Math.PI / 2;
  bottone.add(tasto);

  const tappo = nominato('Tappo', new THREE.Group());
  tappo.position.set(-0.078, 0, 0);
  const tappoMesh = mesh('cilindro', [0.032, 0.032, 0.028, 6], '#a87848');
  tappoMesh.rotation.z = Math.PI / 2;
  tappoMesh.position.x = -0.012;
  const macchia = nominato('Macchia', mesh('sfera', [0.01, 6, 5], '#6e8b4e', { unico: true, emissive: '#9bb86a' }));
  macchia.position.set(-0.028, 0.016, 0.012);
  macchia.material.emissiveIntensity = 0.15;

  const vite = nominato('Vite', new THREE.Group());
  vite.position.set(-0.03, 0, 0);
  const testaVite = mesh('cilindro', [0.012, 0.012, 0.006, 6], '#e4e7eb');
  testaVite.rotation.z = Math.PI / 2;
  const croceA = mesh('scatola', [0.004, 0.016, 0.003], '#f7f8f8');
  const croceB = mesh('scatola', [0.004, 0.003, 0.016], '#f7f8f8');
  croceA.position.x = -0.004;
  croceB.position.x = -0.004;
  const anello = nominato('Anello', new THREE.Mesh(
    new THREE.RingGeometry(0.016, 0.02, 20, 1, 0, 0.02),
    pittura('#e7b15a', { unico: true, lato: 2 }),
  ));
  anello.material.side = THREE.DoubleSide;
  anello.rotation.y = -Math.PI / 2;
  anello.position.x = -0.006;
  anello.visible = false;
  vite.add(testaVite, croceA, croceB, anello);

  tappo.add(tappoMesh, macchia, vite);

  const contatto = nominato('Contatto', mesh('cilindro', [0.012, 0.016, 0.02, 6], '#6e8b4e', { unico: true, emissive: '#9bb86a' }));
  contatto.rotation.z = Math.PI / 2;
  contatto.position.set(-0.05, 0, 0);
  contatto.visible = false;

  const pilaA = pila('#5d6a3e', 'PilaA', true);
  const pilaB = pila('#6a7348', 'PilaB', true);
  pilaA.position.set(-0.02, 0.015, 0);
  pilaB.position.set(-0.02, -0.015, 0);
  pilaA.visible = false;
  pilaB.visible = false;

  const nuovaA = pila('#7dbe6e', 'PilaNuovaA', false);
  const nuovaB = pila('#8bcf78', 'PilaNuovaB', false);
  nuovaA.position.set(-0.02, 0.015, 0);
  nuovaB.position.set(-0.02, -0.015, 0);
  nuovaA.visible = false;
  nuovaB.visible = false;

  const sedeA = nominato('SedeA', new THREE.Object3D());
  const sedeB = nominato('SedeB', new THREE.Object3D());
  sedeA.position.set(-0.02, 0.015, 0);
  sedeB.position.set(-0.02, -0.015, 0);
  const centro = nominato('CentroTorcia', new THREE.Object3D());

  g.add(corpo, testa, vetro, bottone, tappo, contatto, pilaA, pilaB, nuovaA, nuovaB, sedeA, sedeB, centro);
  g.position.set(0, 0.055, 0.04);
  return g;
}

export function creaTelecomando() {
  const g = nominato('Telecomando', new THREE.Group());
  const corpo = nominato('corpo_tc', mesh('scatola', [0.072, 0.15, 0.018], '#fff6ea'));
  const guscio = nominato('guscio', mesh('scatola', [0.076, 0.154, 0.008], '#f4d2c0'));
  guscio.position.z = -0.012;
  const acceso = nominato('tasto_on', mesh('cilindro', [0.012, 0.012, 0.006, 6], '#e8977c'));
  acceso.rotation.x = Math.PI / 2;
  acceso.position.set(0, 0.04, 0.012);
  const altri = ['#7eae96', '#e7d27a', '#8d929a', '#c4844e'];
  altri.forEach((colore, i) => {
    const tasto = mesh('scatola', [0.016, 0.012, 0.006], colore);
    tasto.position.set(-0.016 + (i % 2) * 0.032, -0.01 - Math.floor(i / 2) * 0.028, 0.012);
    g.add(tasto);
  });
  const fa = nominato('fessura_a', new THREE.Object3D());
  const fb = nominato('fessura_b', new THREE.Object3D());
  fa.position.set(0.034, 0.05, -0.012);
  fb.position.set(0.034, -0.05, -0.012);
  const solco = mesh('scatola', [0.006, 0.1, 0.004], '#3c291c');
  solco.position.set(0.034, 0, -0.014);
  const filo = nominato('filo', mesh('cilindro', [0.004, 0.004, 0.05, 5], '#e8977c', { unico: true, emissive: '#e8977c' }));
  filo.position.set(-0.012, 0.01, -0.004);
  filo.material.emissiveIntensity = 0;
  const rame = nominato('rame', new THREE.Object3D());
  rame.position.set(-0.012, 0.01, 0.002);
  const molla = nominato('molla', mesh('cilindro', [0.01, 0.01, 0.02, 6], '#d9dde2', { unico: true, emissive: '#ffd59a' }));
  molla.position.set(0.016, -0.03, -0.002);
  molla.material.emissiveIntensity = 0;
  const sede = nominato('sede_molla', new THREE.Object3D());
  sede.position.set(0.016, 0.03, -0.002);
  const nastro = nominato('nastro', mesh('cilindro', [0.012, 0.012, 0.02, 6], '#f0b86e'));
  nastro.position.copy(filo.position);
  nastro.visible = false;
  const centro = nominato('centro_telecomando', new THREE.Object3D());
  const sedeGuscio = nominato('sede_guscio', new THREE.Object3D());
  sedeGuscio.position.set(0, 0, -0.012);
  filo.visible = false;
  molla.visible = false;
  g.add(corpo, guscio, acceso, solco, fa, fb, filo, rame, molla, sede, nastro, centro, sedeGuscio);
  g.position.set(0, 0.09, 0.05);
  g.visible = false;
  return g;
}

export function creaEttore() {
  const g = nominato('Ettore', new THREE.Group());
  g.position.set(0, 0, -0.34);
  const corpo = nominato('corpo_ettore', mesh('scatola', [0.18, 0.2, 0.1], '#e8977c'));
  corpo.position.y = 0.22;
  const grembiule = mesh('scatola', [0.14, 0.12, 0.02], '#8fbfa8');
  grembiule.position.set(0, 0.18, 0.06);
  const testa = nominato('testa_ettore', mesh('sfera', [0.07, 8, 6], '#f4d2c0'));
  testa.position.y = 0.42;
  testa.scale.set(1, 1.05, 0.92);
  const capelli = mesh('sfera', [0.072, 8, 6], '#d5d5d5');
  capelli.scale.set(1.02, 0.48, 1);
  capelli.position.y = 0.47;
  const baffo = mesh('scatola', [0.06, 0.012, 0.02], '#b9b9b9');
  baffo.position.set(0, 0.39, 0.06);
  const occhio = (nome, x) => {
    const m = nominato(nome === 'OcchioSx' ? 'occhio_sx' : 'occhio_dx', mesh('sfera', [0.009, 6, 4], '#3c291c'));
    m.position.set(x, 0.43, 0.058);
    return m;
  };
  const giornale = nominato('giornale', mesh('scatola', [0.12, 0.09, 0.004], '#fff6ea'));
  giornale.position.set(0, 0.4, 0.1);
  const mano = nominato('mano', mesh('sfera', [0.02, 6, 5], '#f4d2c0'));
  mano.position.set(0.1, 0.3, 0.08);
  const cappello = nominato('cappello', mesh('cilindro', [0.05, 0.07, 0.05, 6], '#3c291c'));
  cappello.position.y = 0.54;
  cappello.visible = false;
  g.add(corpo, grembiule, testa, capelli, baffo, occhio('OcchioSx', -0.025), occhio('OcchioDx', 0.025), giornale, mano, cappello);
  return g;
}

export function creaBottega() {
  const statici = [];
  const aggiungi = (pezzo) => {
    statici.push(pezzo);
    return pezzo;
  };
  aggiungi(mesh('scatola', [1.15, 0.06, 0.7], '#c4844e')).position.set(0, 0.02, 0.02);
  const panno = aggiungi(mesh('scatola', [0.42, 0.012, 0.28], '#8fbfa8'));
  panno.position.set(0, 0.052, 0.04);
  aggiungi(mesh('scatola', [1.8, 1.15, 0.06], '#f4d2c0')).position.set(0, 0.62, -0.55);
  aggiungi(mesh('scatola', [2.4, 0.04, 2.2], '#e7cbb8')).position.set(0, -0.02, 0.4);
  const finestra = aggiungi(mesh('scatola', [0.36, 0.42, 0.02], '#fff6ea', { emissive: '#ffd59a' }));
  finestra.position.set(-0.55, 0.78, -0.51);
  const stipiteS = aggiungi(mesh('scatola', [0.06, 0.7, 0.06], '#a86b3a'));
  stipiteS.position.set(-0.28, 0.4, 0.72);
  const stipiteD = stipiteS.clone();
  stipiteD.position.x = 0.28;
  statici.push(stipiteD);
  const architrave = aggiungi(mesh('scatola', [0.62, 0.06, 0.06], '#a86b3a'));
  architrave.position.set(0, 0.76, 0.72);
  const vaso = aggiungi(mesh('cilindro', [0.03, 0.024, 0.05, 6], '#c4623a'));
  vaso.position.set(0.42, 0.08, -0.02);
  const foglia = aggiungi(mesh('sfera', [0.04, 6, 5], '#7eae96'));
  foglia.position.set(0.42, 0.14, -0.02);
  foglia.scale.y = 0.7;

  const vassoio = nominato('Vassoio', new THREE.Group());
  vassoio.position.set(-0.28, 0.06, 0.08);
  vassoio.add(mesh('scatola', [0.12, 0.012, 0.08], '#a86b3a'));
  const cassetto = nominato('Cassetto', new THREE.Group());
  cassetto.position.set(0.3, 0.02, 0.12);
  cassetto.add(mesh('scatola', [0.14, 0.03, 0.1], '#c4844e'));
  const soglia = nominato('Soglia', new THREE.Object3D());
  soglia.position.set(0, 0.2, 0.85);

  const tv = nominato('Tv', new THREE.Group());
  tv.position.set(0.34, 0.72, -0.42);
  const scocca = mesh('scatola', [0.22, 0.16, 0.04], '#c4844e');
  const tela = document.createElement('canvas');
  tela.width = 64;
  tela.height = 40;
  const texture = new THREE.CanvasTexture(tela);
  texture.colorSpace = THREE.SRGBColorSpace;
  const schermo = nominato('Schermo', new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.12),
    pittura('#3c291c', { unico: true, mappa: texture, emissive: '#3c291c' }),
  ));
  schermo.position.z = 0.022;
  schermo.userData.tela = tela;
  schermo.userData.texture = texture;
  const antenna = mesh('cilindro', [0.003, 0.003, 0.08, 4], '#8d929a');
  antenna.position.set(0.06, 0.1, 0);
  antenna.rotation.z = 0.5;
  tv.add(scocca, schermo, antenna);

  const ombra = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 10),
    pittura('#000000', { opacita: 0.12 }),
  );
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.set(0, 0.056, 0.04);
  ombra.name = 'Ombra';

  return {
    statica: unisci(statici),
    vassoio,
    cassetto,
    soglia,
    tv,
    ombra,
  };
}

export function indicizza(radice, mappa) {
  radice.traverse((nodo) => {
    if (nodo.name) mappa.set(nodo.name, nodo);
  });
}

export async function provaGlb(id, radice) {
  const chiave = Object.keys(disponibili).find((percorso) => percorso.endsWith(`/${id}.glb`));
  if (!chiave) return 0;
  const url = await disponibili[chiave]();
  const gltf = await new GLTFLoader().loadAsync(url);
  let innestate = 0;
  for (const nome of PARTI[id] || []) {
    const sorgente = gltf.scene.getObjectByName(nome);
    const destino = radice.getObjectByName(nome);
    if (!sorgente || !destino) continue;
    while (destino.children.length) destino.remove(destino.children[0]);
    destino.add(sorgente);
    innestate += 1;
  }
  return innestate;
}
