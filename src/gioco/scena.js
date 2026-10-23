import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clona } from './mondo.js';
import { caricaSet, clonaMateriale, creaBottega, creaEttore, creaTelecomando, indicizza, pittura } from './modelli.js';
import { montaTorcia, posaTappo } from './torcia.js';

const POSE_TORCIA = {
  banco: new THREE.Vector3(0, 0.08, 0.02),
  spinta: new THREE.Vector3(0, 0.08, 0.07),
  lato: new THREE.Vector3(0.32, 0.08, 0.06),
};

const APERTURA_GUSCIO = 160 * Math.PI / 180;
const APERTURA_CASSETTO = 0.075;

const INQUADRATURE = {
  PORTA: { nodo: 'Soglia', dist: 1.55, alza: 0.62 },
  BANCO: { nodo: 'bottone', fisso: 'banco' },
  'DETTAGLIO-CODA': { nodo: 'macchia', ox: 0.78, oy: 0.36, oz: 0.52, guardaY: -0.04 },
  'DETTAGLIO-VITE': { nodo: 'vite', ox: 0.72, oy: 0.38, oz: 0.55, guardaY: -0.02 },
  'DETTAGLIO-TAPPO-APERTO': { nodo: 'contatto', ox: 0.59, oy: 0.64, oz: 0.49 },
  TELECOMANDO: { nodo: 'tasto_on', ox: 0.6, oy: 0.38, oz: 0.71 },
  'TC-RETRO': { nodo: 'fessura_a', anche: 'fessura_b', peso: 0.5, ox: 0.76, oy: 0.38, oz: 0.53 },
  'TC-INTERNO': { nodo: 'filo', anche: 'sede_molla', peso: 0.48, ox: 0.54, oy: 0.64, oz: 0.54 },
};

function distanzaMinima(dest, guarda, minima = 0.9) {
  if (dest.distanceTo(guarda) >= 0.7) return;
  dest.sub(guarda).setLength(minima).add(guarda);
}

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
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor('#f4d2c0', 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    this.scene.fog = new THREE.Fog('#f4d2c0', 2.6, 5.5);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.02, 20);
    this.hemi = new THREE.HemisphereLight('#fff6ea', '#c4844e', 0.62);
    this.sole = new THREE.DirectionalLight('#ffd59a', 2.45);
    this.sole.position.set(1.1, 2.6, 1.8);
    this.sole.castShadow = true;
    this.sole.shadow.mapSize.set(1024, 1024);
    this.sole.shadow.radius = 4;
    this.sole.shadow.bias = -0.0004;
    this.sole.shadow.normalBias = 0.04;
    const campo = this.sole.shadow.camera;
    campo.near = 0.4;
    campo.far = 7;
    campo.left = -1.5;
    campo.right = 1.5;
    campo.top = 1.5;
    campo.bottom = -1.5;
    this.taglio = new THREE.DirectionalLight('#fff6ea', 0.8);
    this.taglio.position.set(-1.5, 1.6, -1.2);
    this.scene.add(this.hemi, this.sole, this.sole.target, this.taglio);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    pmrem.dispose();

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
    this.ultimoTv = -1;
    this.allarmeAnello = 0;

    this.ridimensiona();
    this._miraCassetto = false;
    this._miraTubo = false;
    this.prontaGlb = this.montaTutto();
  }

  async montaTutto() {
    try {
      const info = await montaTorcia(this.modelloTorcia);
      this.glb = info.glb;
      this.nodiTorcia = info.nodi;
      const set = await caricaSet();
      if (set.banco) {
        this.scene.remove(this.cassetto);
        this.scene.remove(this.vassoio);
        this.scene.add(set.banco.radice);
        this.cassetto = set.banco.cassetto;
        this.vassoio = set.banco.vassoio;
      }
      if (set.telecomando) {
        this.scene.remove(this.telecomando);
        this.telecomando = set.telecomando;
        this.scene.add(this.telecomando);
      }
      this.reindicizza();
      this.preparaOmbre();
      return info;
    } catch {
      this.reindicizza();
      this.preparaOmbre();
      return { glb: false, nodi: [] };
    }
  }

  preparaOmbre() {
    const banco = this.scene.getObjectByName('banco');
    const stanza = this.scene.getObjectByName('BottegaStatica');
    if (stanza) stanza.traverse((nodo) => { if (nodo.isMesh) nodo.receiveShadow = true; });
    this.casterBanco = this.scegliCaster(banco, true);
    const blob = this.scene.getObjectByName('Ombra');
    if (blob) blob.visible = !this.casterBanco;
    this.casterOggetto = null;
    this.oggettoOmbra = null;
  }

  scegliCaster(radice, riceve) {
    if (!radice) return null;
    let scelto = null;
    let max = 0;
    radice.traverse((nodo) => {
      if (!nodo.isMesh || this.eAttrezzo(nodo)) return;
      nodo.castShadow = false;
      if (riceve) nodo.receiveShadow = true;
      const geo = nodo.geometry;
      const tris = geo?.index ? geo.index.count / 3 : (geo?.attributes?.position?.count || 0) / 3;
      if (tris > max) { max = tris; scelto = nodo; }
    });
    if (scelto) scelto.castShadow = true;
    return scelto;
  }

  eAttrezzo(nodo) {
    let corrente = nodo;
    while (corrente) {
      if (corrente.name?.startsWith('attrezzo_')) return true;
      corrente = corrente.parent;
    }
    return false;
  }

  aggiornaOmbraOggetto(vista) {
    const prossimo = vista?.telecomando?.visibile ? this.telecomando : this.torcia;
    if (prossimo === this.oggettoOmbra) return;
    if (this.casterOggetto) this.casterOggetto.castShadow = false;
    this.casterOggetto = this.scegliCaster(prossimo, false);
    this.oggettoOmbra = prossimo;
    this.sporco = true;
  }

  reindicizza() {
    this.nodi = new Map();
    indicizza(this.scene, this.nodi);
    this.anello = this.nodi.get('anello');
    this.vetro = this.nodi.get('vetro');
    this.macchia = this.nodi.get('macchia');
    this.contatto = this.nodi.get('contatto');
    this.schermo = this.nodi.get('Schermo') || this.schermo;
    this.sporco = true;
  }

  creaFascio() {
    const altezza = 0.72;
    const geometria = new THREE.ConeGeometry(0.07, altezza, 14, 1, true);
    const posizione = geometria.attributes.position;
    const colori = new Float32Array(posizione.count * 3);
    for (let i = 0; i < posizione.count; i += 1) {
      const t = THREE.MathUtils.clamp(posizione.getY(i) / altezza + 0.5, 0, 1);
      const k = 1 - t;
      colori[i * 3] = 1 * k;
      colori[i * 3 + 1] = 0.906 * k;
      colori[i * 3 + 2] = 0.69 * k;
    }
    geometria.setAttribute('color', new THREE.BufferAttribute(colori, 3));
    const mesh = new THREE.Mesh(geometria, new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));
    mesh.visible = false;
    mesh.name = 'Fascio';
    mesh.frustumCulled = false;
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
    const parcheggia = (t.pulizia || 0) >= 0.98 && (t.tappo || 0) > 0.85;
    if (tappo) posaTappo(tappo, vite, t.tappo || 0, t.giri || 0, parcheggia);
    this.coloriOssido(t.pulizia || 0, t.macchia || 0);
    const bottone = this.nodo('bottone');
    if (bottone) bottone.position.z = (bottone.userData.baseZ ?? 0.044) - (t.bottone || 0) * 0.002;
    if (this.vetro?.material) {
      const materiale = clonaMateriale(this.vetro);
      materiale.emissive = materiale.emissive || new THREE.Color('#ffd59a');
      materiale.emissive.set('#ffd59a');
      materiale.emissiveIntensity = t.accesa ? 1.15 : 0;
    }

    const telecomando = this.telecomando;
    const c = vista.telecomando;
    telecomando.visible = Boolean(c.visibile);
    if (!telecomando.userData.posato) telecomando.position.set(0, 0.1, 0.04);
    telecomando.rotation.set(c.tilt || 0, c.yaw || 0, 0);
    const guscio = this.nodo('guscio');
    const apertoGuscio = c.guscio || 0;
    if (guscio && !this.trascinati.has('guscio')) {
      if (guscio.userData.basePos) {
        const casa = guscio.userData.casaParent;
        if (casa && guscio.parent !== casa) casa.add(guscio);
        guscio.scale.set(1, 1, 1);
        guscio.position.copy(guscio.userData.basePos);
        guscio.rotation.set(0, 0, apertoGuscio * APERTURA_GUSCIO);
      } else {
        guscio.position.z = -0.012 - apertoGuscio * 0.05;
        guscio.rotation.x = -apertoGuscio * 0.7;
      }
    }
    const mostraDentro = apertoGuscio > 0.35;
    const filo = this.nodo('filo');
    const molla = this.nodo('molla');
    if (filo) filo.visible = mostraDentro;
    if (molla) molla.visible = mostraDentro || this.trascinati.has('molla');
    const nastro = this.nodo('nastro');
    if (nastro) {
      const acceso = mostraDentro && (c.nastro || 0) > 0.02;
      nastro.visible = acceso;
      if (nastro.userData.manica) nastro.scale.z = Math.max(0.001, c.nastro || 0);
      else {
        const fasi = Math.min(6, Math.ceil((c.nastro || 0) * 6));
        nastro.scale.setScalar(0.35 + fasi * 0.12);
      }
    }
    if (molla && !this.trascinati.has('molla')) {
      if (molla.userData.basePos) {
        const casa = molla.userData.casaParent;
        if (casa && molla.parent !== casa) casa.add(molla);
        molla.scale.set(1, 1, 1);
        if ((c.molla || 0) > 0.5) {
          const sede = this.nodo('sede_molla');
          if (sede) molla.position.copy(sede.position);
          molla.quaternion.identity();
        } else {
          molla.position.copy(molla.userData.basePos);
          molla.quaternion.copy(molla.userData.baseQuat);
        }
      } else {
        const sede = c.molla > 0.5 ? this.nodo('sede_molla').position : new THREE.Vector3(0.016, -0.03, -0.002);
        molla.position.copy(sede);
      }
    }
    const tasto = this.nodo('tasto_on');
    if (tasto && tasto.userData.baseY != null) {
      tasto.position.y = tasto.userData.baseY - (c.premuto || 0) * 0.0015;
    }
    if (filo?.material) {
      const materiale = clonaMateriale(filo);
      materiale.vertexColors = false;
      materiale.color.set('#e8977c');
      materiale.emissive.set('#c4623a');
      materiale.emissiveIntensity = mostraDentro && (c.nastro || 0) < 0.85 ? 0.9 : 0;
    }
    if (molla?.material) {
      const materiale = clonaMateriale(molla);
      materiale.vertexColors = false;
      materiale.color.set('#d9dde2');
      materiale.emissive.set('#ffd59a');
      materiale.emissiveIntensity = mostraDentro && (c.molla || 0) < 0.5 ? 0.65 : 0.12;
    }
    const segnoMolla = this.nodo('sede_molla_segno');
    if (segnoMolla) segnoMolla.visible = mostraDentro && (c.molla || 0) < 0.5;

    if (this.cassetto?.userData.sulBanco) {
      const base = this.cassetto.userData.basePos;
      const aperto = vista.cassetto || 0;
      this.cassetto.position.set(base.x, base.y, base.z + APERTURA_CASSETTO * aperto);
    } else if ((vista.cassetto || 0) > 0.45) this.ancora(this.cassetto, 0.52, 0.56, 0.62);
    if (!this.vassoio?.userData.sulBanco && (t.pileVecchie || 0) > 0) this.ancora(this.vassoio, 0.28, 0.62, 0.62);
    if ((vista.tv || 0) > 0) {
      this.ancora(this.tv, 0.62, 0.16, 1.15);
      this.tv.lookAt(this.camera.position);
    }

    const e = this.ettore;
    const posaEttore = vista.ettore.posa;
    e.position.y = posaEttore === 'alzato' ? 0.08 : 0;
    const giornale = this.nodo('giornale');
    if (giornale) {
      const su = posaEttore === 'giornale';
      giornale.rotation.x = su ? -0.35 : 1.25;
      giornale.position.y = su ? 0.4 : 0.16;
      giornale.position.z = su ? 0.1 : 0.07;
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
      const dist = Math.max(0.35, origine.distanceTo(faccia));
      this.fascio.position.copy(origine).lerp(faccia, 0.5);
      this.fascio.lookAt(faccia);
      this.fascio.rotateX(Math.PI / 2);
      this.fascio.scale.set(1, dist / 0.72, 1);
    }
  }

  coloriOssido(pulizia, macchia) {
    if (!this.contatto?.material || !this.macchia?.material) return;
    const t = pulizia >= 0.98 ? 1 : Math.min(0.72, pulizia * 0.72);
    const sporco = new THREE.Color('#6e8b4e');
    const pulito = new THREE.Color('#d9dde2');
    const contatto = clonaMateriale(this.contatto);
    const macchiaMat = clonaMateriale(this.macchia);
    contatto.color.copy(sporco).lerp(pulito, t);
    contatto.emissive.set('#9bb86a');
    contatto.emissiveIntensity = t > 0.9 ? 0.25 : 0.08;
    const viva = macchia && pulizia < 0.92;
    macchiaMat.color.copy(sporco).lerp(pulito, t * 0.85);
    macchiaMat.emissive.set('#9bb86a');
    macchiaMat.emissiveIntensity = viva ? 0.7 : 0.05;
  }

  sistemaPile(vista) {
    const t = vista.torcia;
    const cassettoAperto = (vista.cassetto || 0) > 0.45;
    const radice = this.modelloTorcia.children[0];
    const sistema = (nome, fuori, xVassoio, visibile) => {
      if (this.trascinati.has(nome)) return;
      const nodo = this.nodo(nome);
      if (!nodo || !radice) return;
      if (fuori) {
        this.posaNelVassoio(nodo, xVassoio);
        return;
      }
      if (nodo.parent !== radice) radice.add(nodo);
      nodo.scale.set(1, 1, 1);
      const casa = nodo.userData.basePos;
      if (casa) {
        nodo.position.copy(casa);
        nodo.quaternion.copy(nodo.userData.baseQuat);
      } else nodo.position.set(nome.endsWith('a') ? -0.016 : 0.016, 0.0655, 0);
      nodo.visible = visibile;
    };
    sistema('pila_a', (t.pileVecchie || 0) >= 1, -0.02, (t.pileVecchie || 0) < 1);
    sistema('pila_b', (t.pileVecchie || 0) >= 2, 0.02, (t.pileVecchie || 0) < 2);
    const nelCassetto = (nome, inserita) => {
      if (this.trascinati.has(nome)) return;
      const nodo = this.nodo(nome);
      if (!nodo) return;
      if (inserita) {
        if (!radice) return;
        const sede = this.nodo(nome.endsWith('a') ? 'sede_a' : 'sede_b');
        if (nodo.parent !== radice) radice.add(nodo);
        nodo.scale.set(1, 1, 1);
        if (sede?.userData.basePos) nodo.position.copy(sede.userData.basePos);
        else if (sede) nodo.position.copy(sede.position);
        else nodo.position.set(nome.endsWith('a') ? -0.016 : 0.016, 0.0655, 0);
        nodo.quaternion.identity();
        nodo.visible = true;
        return;
      }
      if (this.cassetto && nodo.parent !== this.cassetto) this.cassetto.add(nodo);
      nodo.scale.set(1, 1, 1);
      if (nodo.userData.basePos) {
        nodo.position.copy(nodo.userData.basePos);
        nodo.quaternion.copy(nodo.userData.baseQuat);
      } else {
        nodo.position.set(nome.endsWith('a') ? -0.016 : 0.016, 0.03, 0.01);
        nodo.rotation.set(Math.PI / 2, 0, 0);
      }
      nodo.visible = cassettoAperto;
    };
    nelCassetto('pila_nuova_a', (t.pileNuove || 0) >= 1);
    nelCassetto('pila_nuova_b', (t.pileNuove || 0) >= 2);
    const aperto = (t.tappo || 0) > 0.55;
    const segno = (nome, visibile) => {
      const nodo = this.nodo(nome);
      if (nodo) nodo.visible = visibile;
    };
    segno('sede_a_segno', aperto && (t.pileVecchie || 0) >= 1 && (t.pileNuove || 0) < 1);
    segno('sede_b_segno', aperto && (t.pileVecchie || 0) >= 2 && (t.pileNuove || 0) < 2);
  }

  posaNelVassoio(nodo, x) {
    if (this.vassoio && nodo.parent !== this.vassoio) this.vassoio.add(nodo);
    nodo.scale.set(1, 1, 1);
    nodo.position.set(x, 0.02, 0.01);
    nodo.quaternion.set(0, 0, -Math.SQRT1_2, Math.SQRT1_2);
    nodo.visible = true;
  }

  aggiornaAnello(progresso, visibile) {
    if (!this.anello) return;
    const allarme = this.allarmeAnello > 0;
    this.anello.visible = visibile && (progresso > 0.01 || allarme);
    const freccia = this.nodo('freccia');
    if (freccia) {
      if (freccia.visible !== visibile) this.sporco = true;
      freccia.visible = visibile;
      freccia.scale.setScalar(allarme ? 1.45 : 1);
    }
    if (!this.anello.visible) return;
    const chiave = Math.round(progresso * 40);
    if (this.anello.userData.chiave === chiave) return;
    this.anello.userData.chiave = chiave;
    this.anello.geometry.dispose();
    this.anello.geometry = new THREE.RingGeometry(0.013, 0.017, 18, 1, Math.PI / 2, Math.max(0.05, progresso * Math.PI * 2));
    this.anello.rotation.x = Math.PI / 2;
    this.sporco = true;
  }

  mostraFrecciaFilo(visibile) {
    const freccia = this.nodo('freccia_filo');
    if (!freccia) return;
    if (freccia.visible !== visibile) this.sporco = true;
    freccia.visible = visibile;
    freccia.scale.setScalar(this.allarmeAnello > 0 ? 1.45 : 1);
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
    const vuoleCassetto = (vistaFinale.cassetto || 0) > 0.45 && Boolean(this.cassetto?.userData.sulBanco);
    const vuoleTubo = nome === 'DETTAGLIO-TAPPO-APERTO' && (vistaFinale.torcia?.pulizia || 0) >= 0.98 && !vuoleCassetto;
    if (this.shot === nome && this.cameraFerma() && durata < 0.2 && this._miraCassetto === vuoleCassetto && this._miraTubo === vuoleTubo) {
      this.meta = vistaFinale;
      this.sporco = true;
      return;
    }
    this._miraCassetto = vuoleCassetto;
    this._miraTubo = vuoleTubo;
    if (vuoleCassetto) durata = Math.max(durata, 0.55);
    this.shot = nome;
    const prima = this.visuale;
    this.scrivi(vistaFinale, 1);
    this.sistemaPile(vistaFinale);
    this.scene.updateMatrixWorld(true);
    const nodo = this.nodo(vuoleTubo ? 'sede_a' : shot.nodo) || this.torcia;
    nodo.getWorldPosition(this._v);
    if (shot.anche) {
      const altro = this.nodo(shot.anche);
      if (altro) {
        altro.getWorldPosition(this._v2);
        this._v.lerp(this._v2, shot.peso ?? 0.5);
      }
    }
    const guarda = this._v.clone();
    guarda.y += shot.guardaY || 0;
    const dest = shot.ox != null
      ? new THREE.Vector3(guarda.x + shot.ox, guarda.y + shot.oy, guarda.z + shot.oz)
      : new THREE.Vector3(this._v.x + (shot.lato || 0), this._v.y + (shot.alza || 0), this._v.z + (shot.dist || 1));
    if (shot.fisso === 'banco' && !vuoleCassetto) {
      const base = this.torcia.position;
      guarda.set(base.x - 0.18, base.y - 0.13, base.z - 0.18);
      dest.set(base.x - 0.18, base.y + 1.09, base.z + 2.0);
    }
    if (vuoleCassetto) {
      guarda.set(0.26, 0.06, 0.02);
      dest.set(0.08, 0.92, 1.45);
    }
    distanzaMinima(dest, guarda);
    if (!this.visuale) this.visuale = clona(vistaFinale);
    if (prima) {
      this.scrivi(prima, 1);
      this.sistemaPile(prima);
    }
    this.cameraDa.copy(this.camera.position);
    this.guardaDa.copy(this.guardaA);
    this.cameraA.copy(dest);
    this.guardaA.copy(guarda);
    this.sole.target.position.copy(guarda);
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
    if (m.flash > 0 && this.flashT < 1.9) {
      this.flashT = Math.min(1.9, this.flashT + dt);
      const salita = this.flashT < 0.4 ? this.flashT / 0.4 : Math.max(0, 1 - (this.flashT - 0.4) / 1.5);
      this.renderer.toneMappingExposure = 1.05 + 0.2 * salita;
      this.sporco = true;
    }
    this.scrivi(v, dt);
    this.sistemaPile(v);
    this.aggiornaOmbraOggetto(v);
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
    if (this.allarmeAnello > 0) {
      this.allarmeAnello -= dt;
      this.sporco = true;
    }
    if (this.cameraT < 1) {
      this.cameraT = Math.min(1, this.cameraT + dt / this.cameraDurata);
      const e = easeInOutSine(this.cameraT);
      this.camera.position.lerpVectors(this.cameraDa, this.cameraA, e);
      const guarda = this._v.copy(this.guardaDa).lerp(this.guardaA, e);
      this.camera.lookAt(guarda);
      this.sole.target.position.copy(guarda);
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
      ctx.fillStyle = '#5a4a40';
      ctx.fillRect(0, 0, 64, 40);
      ctx.strokeStyle = '#a99e94';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(6, 34);
      ctx.lineTo(58, 6);
      ctx.stroke();
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
    const materiale = this.schermo.material;
    materiale.color.set('#ffffff');
    materiale.emissive.set(accesa ? '#ffffff' : '#3c291c');
    materiale.emissiveIntensity = accesa ? 1 : 0.2;
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
