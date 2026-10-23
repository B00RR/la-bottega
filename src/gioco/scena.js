import * as THREE from 'three';
import { clona } from './mondo.js';
import { creaBottega, creaEttore, creaTelecomando, indicizza, pittura } from './modelli.js';
import { montaTorcia, posaTappo } from './torcia.js';

const POSE_TORCIA = {
  banco: new THREE.Vector3(0, 0.12, 0.02),
  spinta: new THREE.Vector3(0, 0.12, 0.07),
  lato: new THREE.Vector3(0.32, 0.12, 0.06),
};

const INQUADRATURE = {
  PORTA: { nodo: 'Soglia', dist: 0.85, alza: 0.22 },
  BANCO: { nodo: 'bottone', dist: 1.45, alza: 0.46 },
  'DETTAGLIO-CODA': { nodo: 'macchia', dist: 0.42, alza: 0.06 },
  'DETTAGLIO-VITE': { nodo: 'vite', dist: 0.34, alza: 0.04 },
  'DETTAGLIO-TAPPO-APERTO': { nodo: 'contatto', dist: 0.48, alza: 0.08 },
  TELECOMANDO: { nodo: 'tasto_on', dist: 0.62, alza: 0.2 },
  'TC-RETRO': { nodo: 'fessura_a', dist: 0.5, alza: 0.06 },
  'TC-INTERNO': { nodo: 'filo', dist: 0.46, alza: 0.07 },
};

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function smussa(attuale, meta, dt, k) {
  if (Math.abs(meta - attuale) < 0.0008) return meta;
  return attuale + (meta - attuale) * (1 - Math.exp(-k * dt));
}

export class Scena {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor('#f4d2c0', 1);
    this.renderer.shadowMap.enabled = false;
    this.dprMassimo = Math.min(window.devicePixelRatio || 1, 1.5);
    this.dpr = this.dprMassimo;
    this.tempi = [];
    this.buoni = 0;
    this.fps = 60;
    this.tris = 0;
    this.draw = 0;
    this.sporco = true;
    this.riduci = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f4d2c0');
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.02, 20);
    this.hemi = new THREE.HemisphereLight('#fff6ea', '#c4844e', 1.15);
    this.sole = new THREE.DirectionalLight('#ffd59a', 1.85);
    this.sole.position.set(0.7, 1.5, 0.9);
    this.scene.add(this.hemi, this.sole);

    this.nodi = new Map();
    const bottega = creaBottega();
    this.scene.add(bottega.statica, bottega.vassoio, bottega.cassetto, bottega.soglia, bottega.tv, bottega.ombra);
    this.torcia = new THREE.Group();
    this.torcia.name = 'Torcia';
    this.modelloTorcia = new THREE.Group();
    this.modelloTorcia.name = 'modello_torcia';
    this.torcia.add(this.modelloTorcia);
    this.telecomando = creaTelecomando();
    this.ettore = creaEttore();
    this.scene.add(this.torcia, this.telecomando, this.ettore);
    this.glb = false;
    this.nodiTorcia = [];
    indicizza(this.scene, this.nodi);
    this.vassoio = bottega.vassoio;
    this.cassetto = bottega.cassetto;
    this.tv = bottega.tv;
    this.schermo = this.nodi.get('Schermo');
    this.anello = null;
    this.vetro = null;
    this.macchia = null;
    this.contatto = null;

    this.fascio = this.creaFascio();
    this.scene.add(this.fascio);
    this.particelle = this.creaParticelle();
    this.scene.add(this.particelle.points);
    this.lente = this.creaLente();

    this.visuale = null;
    this.meta = null;
    this.immediato = new Set();
    this.cameraDa = new THREE.Vector3(0, 0.42, 1.7);
    this.cameraA = this.cameraDa.clone();
    this.guardaDa = new THREE.Vector3(0, 0.2, 0.4);
    this.guardaA = this.guardaDa.clone();
    this.cameraT = 1;
    this.cameraDurata = 0.55;
    this.camera.position.copy(this.cameraDa);
    this.camera.lookAt(this.guardaDa);
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this.tempo = 0;
    this.trascinati = new Map();
    this.viteVolata = false;
    this.flashT = 0;
    this.zoomT = 0;
    this.squashT = 0;
    this.ultimoTv = 0;

    this.ridimensiona();
    this.prontaGlb = montaTorcia(this.modelloTorcia).then((info) => {
      this.glb = info.glb;
      this.nodiTorcia = info.nodi;
      this.nodi = new Map();
      indicizza(this.scene, this.nodi);
      this.anello = this.nodi.get('anello');
      this.vetro = this.nodi.get('vetro');
      this.macchia = this.nodi.get('macchia');
      this.contatto = this.nodi.get('contatto');
      this.sporco = true;
      return info;
    }).catch(() => ({ glb: false, nodi: [] }));
  }

  creaFascio() {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.42, 6, 1, true),
      pittura('#ffd59a', { unico: true, additivo: true, opacita: 0.28 }),
    );
    mesh.visible = false;
    mesh.name = 'Fascio';
    return mesh;
  }

  creaParticelle() {
    const posizioni = new Float32Array(64 * 3);
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(posizioni, 3));
    const points = new THREE.Points(geometria, new THREE.PointsMaterial({
      color: '#c6d48a',
      size: 0.012,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    }));
    const vite = Array.from({ length: 64 }, () => ({ vita: 0, vel: new THREE.Vector3() }));
    return { points, posizioni, vite, geometria };
  }

  creaLente() {
    const rt = new THREE.WebGLRenderTarget(256, 256);
    const camera = new THREE.PerspectiveCamera(18, 1, 0.01, 3);
    const buffer = new Uint8Array(256 * 256 * 4);
    return { rt, camera, buffer, attiva: false };
  }

  impostaDpr(valore) {
    const prossimo = Math.min(this.dprMassimo, Math.max(1, valore));
    if (prossimo === this.dpr) return;
    this.dpr = prossimo;
    this.ridimensiona();
    this.sporco = true;
  }

  ridimensiona() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.fov = 35;
    this.camera.updateProjectionMatrix();
    this.sporco = true;
  }

  adattaDpr(dt) {
    this.tempi.push(dt);
    let somma = 0;
    while (this.tempi.length && somma < 1) {
      somma += this.tempi[this.tempi.length - 1];
      if (somma < 1) break;
    }
    const finestra = [];
    let tot = 0;
    for (let i = this.tempi.length - 1; i >= 0; i -= 1) {
      finestra.push(this.tempi[i]);
      tot += this.tempi[i];
      if (tot >= 1) break;
    }
    this.tempi = finestra;
    if (tot <= 0) return;
    const media = finestra.reduce((a, b) => a + b, 0) / finestra.length;
    this.fps = 1 / media;
    if (media > 0.02 && this.dpr > 1) this.impostaDpr(1);
    if (media < 0.012) this.buoni += dt;
    else this.buoni = 0;
    if (this.buoni > 5 && this.dpr < this.dprMassimo) this.impostaDpr(this.dprMassimo);
  }

  nodo(nome) {
    return this.nodi.get(nome) || null;
  }

  /** Mette un oggetto davanti alla camera, dentro il ritratto. */
  ancora(gruppo, xNorm, yNorm, distanza = 0.55) {
    this._ancora = this._ancora || new THREE.Vector3();
    this._ancora.set(xNorm * 2 - 1, -(yNorm * 2 - 1), 0.5).unproject(this.camera);
    this._ancora.sub(this.camera.position).normalize();
    gruppo.position.copy(this.camera.position).addScaledVector(this._ancora, distanza);
    this.sporco = true;
  }

  scrivi(vista, dt = 1) {
    if (!vista) return;
    const torcia = this.torcia;
    const t = vista.torcia;
    torcia.visible = Boolean(t.visibile);
    const posa = POSE_TORCIA[t.posa] || POSE_TORCIA.banco;
    if (dt >= 1) torcia.position.copy(posa);
    else torcia.position.lerp(posa, 1 - Math.exp(-8 * dt));
    torcia.rotation.set(t.tilt || 0, t.yaw || 0, t.roll || 0);
    const tappo = this.nodo('tappo');
    const vite = this.nodo('vite');
    if (tappo) posaTappo(tappo, vite, t.tappo || 0, t.giri || 0);
    this.coloriOssido(t.pulizia || 0, t.macchia || 0);
    const bottone = this.nodo('bottone');
    if (bottone) bottone.position.z = (bottone.userData.baseZ || 0.049) - (t.bottone || 0) * 0.004;
    if (this.vetro?.material) {
      const materiale = Array.isArray(this.vetro.material) ? this.vetro.material[0] : this.vetro.material;
      materiale.emissive = materiale.emissive || new THREE.Color('#ffd59a');
      materiale.emissiveIntensity = t.accesa ? 1.15 : 0;
    }

    const telecomando = this.telecomando;
    const c = vista.telecomando;
    telecomando.visible = Boolean(c.visibile);
    telecomando.position.set(0, 0.1, 0.04);
    telecomando.rotation.set(c.tilt || 0, c.yaw || 0, 0);
    const guscio = this.nodo('guscio');
    const apertoGuscio = c.guscio || 0;
    if (guscio && !this.trascinati.has('guscio')) {
      guscio.position.z = -0.012 - apertoGuscio * 0.05;
      guscio.rotation.x = -apertoGuscio * 0.7;
    }
    const mostraDentro = apertoGuscio > 0.35;
    const filo = this.nodo('filo');
    const molla = this.nodo('molla');
    if (filo) filo.visible = mostraDentro;
    if (molla) molla.visible = mostraDentro || this.trascinati.has('molla');
    const nastro = this.nodo('nastro');
    if (nastro) {
      nastro.visible = mostraDentro && (c.nastro || 0) > 0.02;
      const fasi = Math.min(6, Math.ceil((c.nastro || 0) * 6));
      nastro.scale.setScalar(0.35 + fasi * 0.12);
    }
    if (molla && !this.trascinati.has('molla')) {
      const sede = c.molla > 0.5 ? this.nodo('sede_molla').position : new THREE.Vector3(0.016, -0.03, -0.002);
      molla.position.copy(sede);
    }
    if (filo?.material) filo.material.emissiveIntensity = c.filoVisto && (c.nastro || 0) < 0.7 ? 0.7 : 0;
    if (molla?.material) molla.material.emissiveIntensity = c.mollaVista && c.molla < 0.5 ? 0.45 : 0;

    if ((vista.cassetto || 0) > 0.45) this.ancora(this.cassetto, 0.78, 0.6, 0.5);
    if ((t.pileVecchie || 0) > 0) this.ancora(this.vassoio, 0.18, 0.62, 0.5);
    if ((vista.tv || 0) > 0) {
      this.ancora(this.tv, 0.62, 0.16, 1.15);
      this.tv.lookAt(this.camera.position);
    }

    const e = this.ettore;
    const posaEttore = vista.ettore.posa;
    e.position.y = posaEttore === 'alzato' ? 0.08 : 0;
    const giornale = this.nodo('giornale');
    if (giornale) {
      giornale.rotation.x = posaEttore === 'giornale' ? -0.9 : 0.6;
      giornale.position.z = posaEttore === 'giornale' ? 0.1 : 0.12;
    }
    const cappello = this.nodo('cappello');
    if (cappello) cappello.visible = (vista.ettore.cappello || 0) > 0.5;
    const mano = this.nodo('mano');
    if (mano) mano.position.y = 0.3 + (vista.ettore.mano || 0) * 0.12;
    const strizza = vista.ettore.strizza || 0;
    const sx = this.nodo('occhio_sx');
    const dx = this.nodo('occhio_dx');
    if (sx) sx.scale.y = 1 - strizza * 0.75;
    if (dx) dx.scale.y = 1 - strizza * 0.75;

    this.tv.visible = (vista.tv || 0) > 0;
    this.fascio.visible = Boolean(t.accesa && this.vetro);
    if (t.accesa && this.vetro) {
      const origine = this.vetro.getWorldPosition(this._v);
      const faccia = this.nodo('testa_ettore')?.getWorldPosition(this._v2) || this.ettore.position;
      this.fascio.position.copy(origine).lerp(faccia, 0.35);
      this.fascio.lookAt(faccia);
      this.fascio.rotateX(Math.PI / 2);
    }
  }

  coloriOssido(pulizia, macchia) {
    if (!this.contatto?.material || !this.macchia?.material) return;
    const t = pulizia >= 0.98 ? 1 : Math.min(0.72, pulizia * 0.72);
    const sporco = new THREE.Color('#6e8b4e');
    const pulito = new THREE.Color('#d9dde2');
    const contatto = Array.isArray(this.contatto.material) ? this.contatto.material[0] : this.contatto.material;
    const macchiaMat = Array.isArray(this.macchia.material) ? this.macchia.material[0] : this.macchia.material;
    contatto.color.copy(sporco).lerp(pulito, t);
    contatto.emissive = contatto.emissive || new THREE.Color('#9bb86a');
    contatto.emissiveIntensity = t > 0.9 ? 0.25 : 0.08;
    const viva = macchia && pulizia < 0.92;
    macchiaMat.color.copy(sporco).lerp(pulito, t * 0.85);
    macchiaMat.emissive = macchiaMat.emissive || new THREE.Color('#9bb86a');
    macchiaMat.emissiveIntensity = viva ? 0.7 : 0.05;
  }

  sistemaPile(vista) {
    const t = vista.torcia;
    const cassettoAperto = (vista.cassetto || 0) > 0.45;
    const sistema = (nome, fuori, casa, visibile) => {
      if (this.trascinati.has(nome)) return;
      const nodo = this.nodo(nome);
      if (!nodo) return;
      if (fuori) {
        this.posaNelVassoio(nodo, casa);
        return;
      }
      const radice = this.modelloTorcia.children[0];
      if (!radice) return;
      radice.attach(nodo);
      nodo.position.set(casa.x, casa.y, casa.z);
      nodo.rotation.set(0, 0, 0);
      nodo.visible = visibile;
    };
    const casa = (nome) => (nome === 'pila_a'
      ? { x: -0.016, y: 0.06, z: 0 }
      : { x: 0.016, y: 0.06, z: 0 });
    sistema('pila_a', (t.pileVecchie || 0) >= 1, (t.pileVecchie || 0) >= 1 ? -0.02 : casa('pila_a'), (t.pileVecchie || 0) < 1);
    sistema('pila_b', (t.pileVecchie || 0) >= 2, (t.pileVecchie || 0) >= 2 ? 0.02 : casa('pila_b'), (t.pileVecchie || 0) < 2);
    const nelCassetto = (nome, inserita) => {
      if (this.trascinati.has(nome)) return;
      const nodo = this.nodo(nome);
      if (!nodo) return;
      if (inserita) {
        const sede = nome.endsWith('a') ? casa('pila_a') : casa('pila_b');
        this.modelloTorcia.attach(nodo);
        const radice = this.modelloTorcia.children[0];
        if (radice) radice.attach(nodo);
        nodo.position.set(sede.x, sede.y, sede.z);
        nodo.rotation.set(0, 0, 0);
        nodo.visible = true;
        return;
      }
      this.cassetto.attach(nodo);
      nodo.position.set(nome.endsWith('a') ? -0.03 : 0.03, 0.04, 0.02);
      nodo.rotation.set(Math.PI / 2, 0, 0);
      nodo.visible = cassettoAperto;
    };
    nelCassetto('pila_nuova_a', (t.pileNuove || 0) >= 1);
    nelCassetto('pila_nuova_b', (t.pileNuove || 0) >= 2);
  }

  posaNelVassoio(nodo, x) {
    this.vassoio.attach(nodo);
    nodo.position.set(x, 0.02, 0);
    nodo.rotation.z = Math.PI / 2;
    nodo.visible = true;
  }

  aggiornaAnello(progresso, visibile) {
    if (!this.anello) return;
    this.anello.visible = visibile && progresso > 0.01;
    const freccia = this.nodo('freccia');
    if (freccia) freccia.visible = visibile;
    if (!this.anello.visible) return;
    const chiave = Math.round(progresso * 40);
    if (this.anello.userData.chiave === chiave) return;
    this.anello.userData.chiave = chiave;
    this.anello.geometry.dispose();
    this.anello.geometry = new THREE.RingGeometry(0.013, 0.017, 18, 1, Math.PI / 2, Math.max(0.05, progresso * Math.PI * 2));
    this.anello.rotation.x = Math.PI / 2;
    this.sporco = true;
  }

  schiaccia() {
    if (this.riduci) return;
    this.squashT = 0.12;
    this.sporco = true;
  }

  emetti(origine, colore, n = 4) {
    if (this.riduci) return;
    const punto = origine.isVector3 ? origine : this.nodo(origine)?.getWorldPosition(new THREE.Vector3());
    if (!punto) return;
    let fatti = 0;
    for (const p of this.particelle.vite) {
      if (p.vita > 0) continue;
      p.vita = 0.45 + Math.random() * 0.25;
      p.vel.set((Math.random() - 0.5) * 0.25, 0.15 + Math.random() * 0.2, (Math.random() - 0.5) * 0.25);
      const i = this.particelle.vite.indexOf(p);
      this.particelle.posizioni[i * 3] = punto.x;
      this.particelle.posizioni[i * 3 + 1] = punto.y;
      this.particelle.posizioni[i * 3 + 2] = punto.z;
      fatti += 1;
      if (fatti >= n) break;
    }
    if (colore) this.particelle.points.material.color.set(colore);
    this.particelle.geometria.attributes.position.needsUpdate = true;
    this.sporco = true;
  }

  aggiornaParticelle(dt) {
    let vive = 0;
    for (let i = 0; i < this.particelle.vite.length; i += 1) {
      const p = this.particelle.vite[i];
      if (p.vita <= 0) continue;
      p.vita -= dt;
      vive += 1;
      this.particelle.posizioni[i * 3] += p.vel.x * dt;
      this.particelle.posizioni[i * 3 + 1] += p.vel.y * dt;
      this.particelle.posizioni[i * 3 + 2] += p.vel.z * dt;
      p.vel.y -= dt * 0.4;
      if (p.vita <= 0) this.particelle.posizioni[i * 3 + 1] = -5;
    }
    if (vive) {
      this.particelle.geometria.attributes.position.needsUpdate = true;
      this.sporco = true;
    }
    return vive;
  }

  mondoDaSchermo(x, y, piano = 0.08) {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this._v.set((x / w) * 2 - 1, -(y / h) * 2 + 1, 0.5);
    this._v.unproject(this.camera);
    const dir = this._v.sub(this.camera.position).normalize();
    const dy = piano - this.camera.position.y;
    const t = dir.y === 0 ? 0 : dy / dir.y;
    return this.camera.position.clone().add(dir.multiplyScalar(t));
  }

  trascina(nome, x, y, sopra = 30) {
    const nodo = this.nodo(nome);
    if (!nodo) return;
    const punto = this.mondoDaSchermo(x, y - sopra, 0.1);
    this.scene.attach(nodo);
    nodo.position.copy(punto);
    nodo.visible = true;
    this.trascinati.set(nome, true);
    this.sporco = true;
  }

  rilasciaTrascinato(nome) {
    this.trascinati.delete(nome);
  }

  /** Misura il nodo com'è nella posa finale, poi lascia che l'oggetto ci arrivi. */
  inquadra(nome, vistaFinale, durata = 0.55) {
    const shot = INQUADRATURE[nome] || INQUADRATURE.BANCO;
    if (this.shot === nome && this.cameraFerma() && durata < 0.2) {
      this.meta = vistaFinale;
      this.sporco = true;
      return;
    }
    this.shot = nome;
    const prima = this.visuale;
    this.scrivi(vistaFinale, 1);
    this.sistemaPile(vistaFinale);
    this.scene.updateMatrixWorld(true);
    const nodo = this.nodo(shot.nodo) || this.torcia;
    nodo.getWorldPosition(this._v);
    const dest = new THREE.Vector3(this._v.x, this._v.y + shot.alza, this._v.z + shot.dist);
    const guarda = this._v.clone();
    if (!this.visuale) this.visuale = clona(vistaFinale);
    if (prima) {
      this.scrivi(prima, 1);
      this.sistemaPile(prima);
    }
    this.cameraDa.copy(this.camera.position);
    this.guardaDa.copy(this.guardaA);
    this.cameraA.copy(dest);
    this.guardaA.copy(guarda);
    this.cameraT = 0;
    this.cameraDurata = durata;
    this.meta = vistaFinale;
    this.sporco = true;
  }

  cameraFerma() {
    return this.cameraT >= 1;
  }

  pulsaLampadina() {
    this.zoomT = 0.18;
    this.sporco = true;
  }

  oggettiFermi() {
    if (!this.visuale || !this.meta) return true;
    const posa = POSE_TORCIA[this.meta.torcia.posa] || POSE_TORCIA.banco;
    if (this.torcia.position.distanceTo(posa) > 0.006) return false;
    const campi = [
      [this.visuale.torcia.yaw, this.meta.torcia.yaw],
      [this.visuale.torcia.tappo, this.meta.torcia.tappo],
      [this.visuale.torcia.giri, this.meta.torcia.giri],
      [this.visuale.telecomando.yaw, this.meta.telecomando.yaw],
      [this.visuale.telecomando.guscio, this.meta.telecomando.guscio],
      [this.visuale.cassetto, this.meta.cassetto],
      [this.visuale.ettore.mano, this.meta.ettore.mano],
      [this.visuale.ettore.strizza, this.meta.ettore.strizza],
    ];
    return campi.every(([a, b]) => Math.abs(a - b) < 0.02);
  }

  saltaPosa(vista) {
    this.visuale = vista;
    this.meta = vista;
    this.scrivi(vista);
    this.sistemaPile(vista);
    this.cameraT = 1;
    this.sporco = true;
  }

  aggiorna(dt, vista, immediato = new Set()) {
    this.tempo += dt;
    this.immediato = immediato;
    if (!this.visuale) this.visuale = clona(vista);
    this.meta = vista;
    const k = 14;
    const v = this.visuale;
    const m = this.meta;
    const subito = (campo) => immediato.has(campo);
    v.torcia.yaw = subito('torcia.yaw') ? m.torcia.yaw : smussa(v.torcia.yaw, m.torcia.yaw, dt, k);
    v.torcia.giri = subito('torcia.giri') ? m.torcia.giri : m.torcia.giri;
    v.torcia.tappo = subito('torcia.tappo') ? m.torcia.tappo : smussa(v.torcia.tappo, m.torcia.tappo, dt, 8);
    v.torcia.tilt = smussa(v.torcia.tilt, m.torcia.tilt, dt, 10);
    v.torcia.roll = smussa(v.torcia.roll, m.torcia.roll, dt, 10);
    v.torcia.bottone = smussa(v.torcia.bottone, m.torcia.bottone, dt, 18);
    v.torcia.pulizia = m.torcia.pulizia;
    v.torcia.macchia = m.torcia.macchia;
    v.torcia.pileVecchie = m.torcia.pileVecchie;
    v.torcia.pileNuove = m.torcia.pileNuove;
    v.torcia.accesa = m.torcia.accesa;
    v.torcia.visibile = m.torcia.visibile;
    v.torcia.posa = m.torcia.posa;
    v.telecomando.yaw = subito('telecomando.yaw') ? m.telecomando.yaw : smussa(v.telecomando.yaw, m.telecomando.yaw, dt, k);
    v.telecomando.tilt = smussa(v.telecomando.tilt || 0, m.telecomando.tilt || 0, dt, 10);
    v.telecomando.guscio = smussa(v.telecomando.guscio, m.telecomando.guscio, dt, 8);
    v.telecomando.fessura = m.telecomando.fessura;
    v.telecomando.nastro = m.telecomando.nastro;
    v.telecomando.molla = m.telecomando.molla;
    v.telecomando.visibile = m.telecomando.visibile;
    v.telecomando.filoVisto = m.telecomando.filoVisto;
    v.telecomando.mollaVista = m.telecomando.mollaVista;
    v.telecomando.pancia = m.telecomando.pancia;
    v.cassetto = smussa(v.cassetto, m.cassetto, dt, 8);
    v.tv = m.tv;
    v.ettore.posa = m.ettore.posa;
    v.ettore.cappello = m.ettore.cappello;
    v.ettore.mano = smussa(v.ettore.mano, m.ettore.mano, dt, 8);
    v.ettore.strizza = smussa(v.ettore.strizza, m.ettore.strizza, dt, 8);
    v.shutter = m.shutter;
    v.cartello = m.cartello;
    v.flash = m.flash;
    if (m.flash > 0) {
      this.flashT = Math.min(1.5, this.flashT + dt);
      const andata = this.flashT < 0.45 ? this.flashT / 0.45 : Math.max(0, 1 - (this.flashT - 0.45) / 1.05);
      this.hemi.color.set('#fff6ea').lerp(new THREE.Color('#ffd59a'), andata * 0.65);
      this.sporco = true;
    }
    this.scrivi(v, dt);
    this.sistemaPile(v);
    if (this.squashT > 0) {
      this.squashT -= dt;
      const k = Math.max(0, this.squashT / 0.12);
      this.torcia.scale.setScalar(1 - 0.05 * Math.sin(k * Math.PI));
      this.sporco = true;
    } else if (this.torcia.scale.x !== 1) this.torcia.scale.setScalar(1);
    if (this.zoomT > 0 && this.vetro) {
      this.zoomT -= dt;
      const k = Math.max(0, this.zoomT / 0.18);
      this.vetro.scale.setScalar(1 + 0.03 * Math.sin(k * Math.PI));
      this.sporco = true;
    }
    if (this.cameraT < 1) {
      this.cameraT = Math.min(1, this.cameraT + dt / this.cameraDurata);
      const e = easeInOutSine(this.cameraT);
      this.camera.position.lerpVectors(this.cameraDa, this.cameraA, e);
      const guarda = this._v.copy(this.guardaDa).lerp(this.guardaA, e);
      this.camera.lookAt(guarda);
      this.sporco = true;
    }
    this.aggiornaParticelle(dt);
    if ((v.tv || 0) >= 2 && this.tempo - this.ultimoTv > 0.16) {
      this.ultimoTv = this.tempo;
      this.disegnaTv(true);
      this.sporco = true;
    } else if ((v.tv || 0) === 1 && this.schermo.userData.accesa) {
      this.disegnaTv(false);
    }
    const mosso = !this.cameraFerma() || !this.oggettiFermi() || this.particelle.vite.some((p) => p.vita > 0);
    if (mosso) this.sporco = true;
    return this.sporco;
  }

  disegnaTv(accesa) {
    const ctx = this.schermo.userData.tela.getContext('2d');
    this.schermo.userData.accesa = accesa;
    if (!accesa) {
      ctx.fillStyle = '#24180f';
      ctx.fillRect(0, 0, 64, 40);
    } else {
      ctx.fillStyle = '#2f6b45';
      ctx.fillRect(0, 0, 64, 40);
      const slitta = (this.tempo * 18) % 64;
      ctx.fillStyle = '#f4efe4';
      ctx.fillRect(8 + slitta * 0.3, 16, 6, 6);
      ctx.fillStyle = '#c4623a';
      ctx.fillRect(20, 10, 8, 14);
      ctx.fillStyle = '#e7d27a';
      ctx.fillRect(36, 12, 8, 14);
    }
    this.schermo.userData.texture.needsUpdate = true;
    this.schermo.material.emissiveIntensity = accesa ? 0.9 : 0.05;
  }

  proietta(nome) {
    const nodo = typeof nome === 'string' ? this.nodo(nome) : nome;
    if (!nodo) return null;
    this.camera.updateMatrixWorld();
    nodo.getWorldPosition(this._v);
    this._v.project(this.camera);
    if (this._v.z < -1 || this._v.z > 1) return null;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    return {
      x: (this._v.x * 0.5 + 0.5) * w,
      y: (-this._v.y * 0.5 + 0.5) * h,
    };
  }

  dopoRender(dt) {
    const info = this.renderer.info.render;
    this.tris = info.triangles;
    this.draw = info.calls;
    this.adattaDpr(dt);
    this.sporco = false;
  }

  /** Ingrandimento ×2 sul punto sotto la lente. Solo mentre la lente è in mano. */
  renderLente(canvas, mondo) {
    if (!canvas || !mondo) return;
    const camera = this.lente.camera;
    camera.position.copy(this.camera.position).lerp(mondo, 0.62);
    camera.lookAt(mondo);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    this.renderer.setRenderTarget(this.lente.rt);
    this.renderer.render(this.scene, camera);
    this.renderer.readRenderTargetPixels(this.lente.rt, 0, 0, 256, 256, this.lente.buffer);
    this.renderer.setRenderTarget(null);
    const ctx = canvas.getContext('2d');
    const immagine = ctx.createImageData(256, 256);
    const src = this.lente.buffer;
    for (let y = 0; y < 256; y += 1) {
      const riga = (255 - y) * 256 * 4;
      immagine.data.set(src.subarray(riga, riga + 256 * 4), y * 256 * 4);
    }
    ctx.putImageData(immagine, 0, 0);
  }
}
