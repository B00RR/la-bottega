import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * I GLB stanno in public/modelli/, nomi snake_case.
 * Scala di tutto il set: 1.35. Se un file manca, resta la mesh procedurale.
 */
export const SCALA = 1.35;

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
  aggiungi(mesh('scatola', [1.8, 1.15, 0.06], '#f4d2c0')).position.set(0, 0.62, -0.55);
  aggiungi(mesh('scatola', [2.4, 0.04, 2.2], '#e7cbb8')).position.set(0, -0.9, 0.4);
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
  ombra.position.set(0, 0.012, 0.04);
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

export function memorizzaPosa(nodo) {
  if (!nodo) return null;
  nodo.userData.basePos = nodo.position.clone();
  nodo.userData.baseQuat = nodo.quaternion.clone();
  nodo.userData.casaParent = nodo.parent;
  return nodo;
}

/** Un materiale condiviso (bottega_opaco, bottega_metallo) si clona prima di toccare colore o emissive. */
export function clonaMateriale(mesh) {
  if (!mesh?.material || mesh.userData.materialeProprio) {
    const attuale = mesh?.material;
    return Array.isArray(attuale) ? attuale[0] : attuale;
  }
  mesh.material = Array.isArray(mesh.material)
    ? mesh.material.map((m) => m.clone())
    : mesh.material.clone();
  mesh.userData.materialeProprio = true;
  return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
}

async function caricaGlb(nome) {
  const url = `${import.meta.env.BASE_URL}modelli/${nome}.glb`;
  const gltf = await new GLTFLoader().loadAsync(url);
  return gltf.scene;
}

function appoggia(nodo, scalaGenitore) {
  nodo.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(nodo);
  if (!Number.isFinite(box.min.y)) return;
  nodo.position.y -= box.min.y / scalaGenitore;
}

const FILE_ATTREZZO = {
  lente: 'lente',
  cacciavite: 'cacciavite',
  pennello: 'pennellino',
  leva: 'leva',
  pinzette: 'pinzette',
  nastro: 'nastro',
};

const POSA_ATTREZZO = {
  lente: [-0.28, -0.1],
  cacciavite: [-0.08, -0.16],
  pennello: [0.06, -0.15],
  leva: [0.16, -0.12],
  pinzette: [0.22, -0.05],
  nastro: [-0.16, 0.12],
};

async function caricaBanco() {
  const radice = await caricaGlb('banco');
  radice.name = 'banco';
  radice.scale.setScalar(SCALA);
  const cassetto = radice.getObjectByName('cassetto');
  const vassoio = radice.getObjectByName('vassoietto');
  if (!cassetto || !vassoio) return null;
  memorizzaPosa(cassetto);
  cassetto.userData.sulBanco = true;
  for (const nome of ['pila_nuova_a', 'pila_nuova_b']) memorizzaPosa(radice.getObjectByName(nome));
  vassoio.userData.sulBanco = true;
  return { radice, cassetto, vassoio };
}

async function caricaTelecomando() {
  const radice = await caricaGlb('telecomando');
  const guscio = radice.getObjectByName('guscio');
  const molla = radice.getObjectByName('molla');
  const tasto = radice.getObjectByName('tasto_on');
  const nastro = radice.getObjectByName('nastro_filo');
  if (!guscio || !molla || !tasto || !nastro) return null;
  nastro.name = 'nastro';
  nastro.userData.manica = true;
  memorizzaPosa(guscio);
  memorizzaPosa(molla);
  memorizzaPosa(tasto);
  tasto.userData.baseY = tasto.position.y;
  const sede = new THREE.Object3D();
  sede.name = 'sede_guscio';
  sede.position.set(0, 0.02, 0);
  radice.add(sede);
  const modello = new THREE.Group();
  modello.name = 'modello_telecomando';
  modello.scale.setScalar(SCALA);
  modello.add(radice);
  const g = new THREE.Group();
  g.name = 'Telecomando';
  g.add(modello);
  g.visible = false;
  g.position.set(0, 0.002, 0.04);
  g.userData.posato = true;
  return g;
}

async function caricaAttrezzi(banco) {
  for (const [id, file] of Object.entries(FILE_ATTREZZO)) {
    const radice = await caricaGlb(file);
    radice.name = `attrezzo_${id}`;
    const [x, z] = POSA_ATTREZZO[id];
    radice.position.set(x, 0.02, z);
    radice.rotation.x = Math.PI / 2;
    radice.rotation.z = id === 'leva' ? 0.4 : -0.3;
    banco.add(radice);
    appoggia(radice, SCALA);
    radice.position.y += 0.002;
  }
}

/** Banco, telecomando e attrezzi. Null se il file o un nodo obbligatorio manca. */
export async function caricaSet() {
  try {
    const banco = await caricaBanco();
    if (!banco) return { banco: null, telecomando: null };
    const [telecomando] = await Promise.all([
      caricaTelecomando().catch(() => null),
      caricaAttrezzi(banco.radice).catch(() => null),
    ]);
    return { banco, telecomando };
  } catch {
    return { banco: null, telecomando: null };
  }
}
