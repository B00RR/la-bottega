import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { pittura } from './modelli.js';

/** Nodi del GLB approvato. Il tappo ha il pivot in (0, 0.03, 0) e si svita su Y. */
export const NODI_TORCIA = [
  'corpo', 'vetro', 'bottone', 'tappo', 'vite', 'macchia', 'contatto',
  'pila_a', 'pila_b', 'sede_a', 'sede_b', 'centro_torcia',
];

const BASE_TAPPO_Y = 0.03;
const CENTRO_Y = 0.12;
const SCALA = 1.35;

function annoTexture() {
  const tela = document.createElement('canvas');
  tela.width = 128;
  tela.height = 64;
  const ctx = tela.getContext('2d');
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = '#fff6ea';
  ctx.fillRect(8, 8, 112, 48);
  ctx.fillStyle = '#3c291c';
  ctx.font = '700 40px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('2019', 64, 34);
  const texture = new THREE.CanvasTexture(tela);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const anno = annoTexture();

function etichetta(nome) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.022, 0.012),
    pittura('#fff6ea', { unico: true, mappa: anno, emissive: '#fff6ea' }),
  );
  mesh.name = `${nome}_anno`;
  mesh.position.set(0, 0, 0.014);
  mesh.material.emissiveIntensity = 0.4;
  return mesh;
}

function aggiungiAiuti(radice, procedurale) {
  let bottone = radice.getObjectByName('bottone');
  if (!bottone) {
    bottone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.012, 8),
      pittura('#f0b86e', { unico: true }),
    );
    bottone.name = 'bottone';
    bottone.rotation.x = Math.PI / 2;
    bottone.position.set(0, 0.12, 0.044);
    radice.add(bottone);
  }
  bottone.userData.baseZ = bottone.position.z;

  const vite = radice.getObjectByName('vite');
  if (vite) {
    const anello = new THREE.Mesh(
      new THREE.RingGeometry(0.014, 0.018, 20, 1, 0, 0.02),
      pittura('#f0b86e', { unico: true }),
    );
    anello.name = 'anello';
    anello.material.side = THREE.DoubleSide;
    anello.rotation.x = Math.PI / 2;
    anello.visible = false;
    vite.add(anello);
    const freccia = new THREE.Mesh(
      new THREE.TorusGeometry(0.016, 0.0016, 4, 12, Math.PI * 0.9),
      pittura('#3c291c', { unico: true }),
    );
    freccia.name = 'freccia';
    freccia.rotation.x = Math.PI / 2;
    freccia.visible = false;
    const angolo = Math.PI * 0.9;
    const punta = new THREE.Mesh(
      new THREE.ConeGeometry(0.0032, 0.007, 5),
      pittura('#3c291c', { unico: true }),
    );
    punta.position.set(Math.cos(angolo) * 0.016, Math.sin(angolo) * 0.016, 0);
    punta.rotation.z = angolo - Math.PI / 2;
    freccia.add(punta);
    vite.add(freccia);
    vite.userData.baseY = vite.position.y;
  }

  const tappo = radice.getObjectByName('tappo');
  if (tappo) tappo.userData.baseY = tappo.position.y || BASE_TAPPO_Y;

  for (const nome of ['pila_a', 'pila_b', 'sede_a', 'sede_b']) {
    const nodo = radice.getObjectByName(nome);
    if (!nodo) continue;
    nodo.userData.basePos = nodo.position.clone();
    nodo.userData.baseQuat = nodo.quaternion.clone();
  }
  for (const nome of ['sede_a', 'sede_b']) {
    const sede = radice.getObjectByName(nome);
    if (!sede || sede.getObjectByName(`${nome}_segno`)) continue;
    const segno = new THREE.Mesh(
      new THREE.RingGeometry(0.009, 0.013, 18),
      pittura('#f0b86e', { unico: true }),
    );
    segno.name = `${nome}_segno`;
    segno.rotation.x = Math.PI / 2;
    sede.add(segno);
  }
  if (procedurale) {
    for (const nome of ['pila_a', 'pila_b']) {
      const pila = radice.getObjectByName(nome);
      if (pila && !pila.getObjectByName(`${nome}_anno`)) pila.add(etichetta(nome));
    }
  }
}

function procedurale() {
  const g = new THREE.Group();
  g.name = 'torcia';
  const corpo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.043, 0.043, 0.2, 10),
    pittura('#e8977c'),
  );
  corpo.name = 'corpo';
  corpo.position.y = 0.14;
  const vetro = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 8),
    pittura('#ffe7b0', { unico: true, emissive: '#ffd59a' }),
  );
  vetro.name = 'vetro';
  vetro.scale.y = 0.45;
  vetro.position.y = 0.25;
  vetro.material.emissiveIntensity = 0;
  corpo.add(vetro);

  const tappo = new THREE.Group();
  tappo.name = 'tappo';
  tappo.position.y = BASE_TAPPO_Y;
  const tappoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.042, 0.03, 10),
    pittura('#8fbfa8'),
  );
  tappoMesh.position.y = -0.012;
  const macchia = new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 8, 6),
    pittura('#6e8b4e', { unico: true, emissive: '#9bb86a' }),
  );
  macchia.name = 'macchia';
  macchia.position.set(0.024, -0.03, 0.01);
  macchia.scale.set(1, 0.35, 0.8);
  const vite = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.008, 0.012, 8),
    pittura('#d9dde2'),
  );
  vite.name = 'vite';
  vite.position.y = -0.0315;
  tappo.add(tappoMesh, macchia, vite);

  const contatto = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.006, 10),
    pittura('#6e8b4e', { unico: true, emissive: '#9bb86a' }),
  );
  contatto.name = 'contatto';
  contatto.position.y = 0.036;
  tappo.add(contatto);

  const pila = (nome, x) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.046, 8),
      pittura('#8a9a5b', { unico: true }),
    );
    mesh.name = nome;
    mesh.position.set(x, 0.0655, 0);
    return mesh;
  };
  const sede = (nome, x) => {
    const nodo = new THREE.Object3D();
    nodo.name = nome;
    nodo.position.set(x, 0.0655, 0);
    return nodo;
  };
  const centro = new THREE.Object3D();
  centro.name = 'centro_torcia';
  centro.position.y = CENTRO_Y;
  g.add(corpo, tappo, pila('pila_a', -0.016), pila('pila_b', 0.016), sede('sede_a', -0.016), sede('sede_b', 0.016), centro);
  return g;
}

/**
 * Metti la torcia nel gruppo. Il GLB, se c'è, sostituisce le mesh.
 * Il gruppo restituito è già ruotato sul banco: coda verso −X, bottone verso +Z.
 */
export async function montaTorcia(modello) {
  modello.clear();
  modello.rotation.set(0, 0, -Math.PI / 2);
  modello.scale.setScalar(SCALA);
  const url = `${import.meta.env.BASE_URL}modelli/torcia.glb`;
  let glb = false;
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    const radice = gltf.scene;
    radice.position.y = -CENTRO_Y;
    modello.add(radice);
    glb = NODI_TORCIA.every((nome) => radice.getObjectByName(nome));
    if (!glb) {
      modello.remove(radice);
      modello.add(procedurale());
      modello.children[0].position.y = -CENTRO_Y;
    }
  } catch {
    const mesh = procedurale();
    mesh.position.y = -CENTRO_Y;
    modello.add(mesh);
  }
  const radice = modello.children[0];
  aggiungiAiuti(radice, !glb);
  return { glb, nodi: NODI_TORCIA.filter((nome) => radice.getObjectByName(nome)).concat(['anello']) };
}

export function posaTappo(tappo, vite, aperto, giri, parcheggiato) {
  if (!tappo) return;
  const base = tappo.userData.baseY ?? BASE_TAPPO_Y;
  const corsa = THREE.MathUtils.clamp(aperto || 0, 0, 1);
  // Svita sull'asse. Solo a lavoro finito il tappo si parcheggia di lato,
  // altrimenti la vite esce dal primo piano mentre si gira.
  tappo.position.x = parcheggiato ? 0.1 : 0;
  tappo.position.z = 0;
  tappo.position.y = base - corsa * 0.05;
  tappo.rotation.x = 0;
  tappo.rotation.z = 0;
  // Dal codolo (guardando lungo +Y) il senso antiorario è una rotazione Y negativa.
  tappo.rotation.y = -(giri || 0) * Math.PI * 2;
  if (vite) {
    const baseVite = vite.userData.baseY ?? vite.position.y;
    vite.position.y = baseVite - Math.min(Math.abs(giri || 0), 2) * 0.001;
  }
}
