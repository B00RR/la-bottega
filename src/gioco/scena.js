import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { pose } from '../dati/contenuti.js';

const riduciMovimento = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Bottega, Ettore e oggetti, tutti in geometria procedurale.
 * La camera resta ferma: OrbitControls ruberebbe i gesti di riparazione.
 * I modelli glTF non servono; threejs-gltf-loading resta fuori di proposito.
 */
export class Scena {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f4d2c0');
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 20);
    this.camera.position.set(0.0, 0.4, 0.36);
    this.camera.lookAt(0, 0.05, 0);

    const cielo = new THREE.HemisphereLight('#fff6ea', '#c4844e', 0.62);
    this.scene.add(cielo);
    const sole = new THREE.DirectionalLight('#ffd59a', 2.45);
    sole.position.set(1.1, 2.6, 1.8);
    sole.castShadow = true;
    sole.shadow.mapSize.set(1024, 1024);
    sole.shadow.camera.near = 0.4;
    sole.shadow.camera.far = 7;
    sole.shadow.camera.left = -1.1;
    sole.shadow.camera.right = 1.1;
    sole.shadow.camera.top = 1.1;
    sole.shadow.camera.bottom = -1.1;
    sole.shadow.bias = -0.0004;
    sole.shadow.normalBias = 0.04;
    this.scene.add(sole);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.nodi = new Map();
    this.gruppi = {};
    this.visibilePrima = { torcia: false, telecomando: false };
    this.tempo = 0;
    this.tvAccesa = false;
    this.ultimoTv = 0;
    this._v = new THREE.Vector3();

    this.costruisciBottega();
    this.costruisciEttore();
    this.costruisciCassetto();
    this.costruisciTorcia();
    this.costruisciTelecomando();
    this.costruisciTv();
    this.ridimensiona();
  }

  materiale(colore, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color: colore,
      roughness: extra.roughness ?? 0.72,
      metalness: extra.metalness ?? 0.04,
      flatShading: true,
      emissive: new THREE.Color(extra.emissive ?? '#000000'),
      emissiveIntensity: extra.emissiveIntensity ?? 0,
    });
  }

  mesh(forma, args, colore, extra = {}) {
    let geometria;
    if (forma === 'cilindro') geometria = new THREE.CylinderGeometry(...args);
    else if (forma === 'sfera') geometria = new THREE.SphereGeometry(...args);
    else geometria = new THREE.BoxGeometry(...args);
    const mesh = new THREE.Mesh(geometria, this.materiale(colore, extra));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  registra(id, nodo) {
    this.nodi.set(id, nodo);
    return nodo;
  }

  costruisciBottega() {
    const piano = this.mesh('scatola', [1.05, 0.06, 0.62], '#c4844e', { roughness: 0.8 });
    piano.position.set(0, -0.03, 0);
    piano.castShadow = false;
    this.scene.add(piano);

    const panno = this.mesh('scatola', [0.34, 0.01, 0.24], '#8fbfa8', { roughness: 0.92 });
    panno.position.set(0, 0.004, 0.03);
    panno.castShadow = false;
    this.scene.add(panno);

    const muro = this.mesh('scatola', [1.8, 1.2, 0.06], '#f4d2c0', { roughness: 0.96, metalness: 0 });
    muro.position.set(0, 0.52, -0.52);
    muro.castShadow = false;
    this.scene.add(muro);

    const pavimento = this.mesh('scatola', [2.2, 0.04, 1.6], '#e7cbb8', { roughness: 0.94 });
    pavimento.position.set(0, -0.22, 0.15);
    pavimento.castShadow = false;
    this.scene.add(pavimento);

    const finestra = this.mesh('scatola', [0.34, 0.42, 0.02], '#fff6ea', {
      roughness: 0.2,
      emissive: '#ffd59a',
      emissiveIntensity: 0.35,
    });
    finestra.position.set(-0.48, 0.72, -0.48);
    this.scene.add(finestra);

    const vaso = this.mesh('cilindro', [0.034, 0.028, 0.07, 6], '#7eae96');
    vaso.position.set(-0.36, 0.04, -0.1);
    const vaso2 = this.mesh('cilindro', [0.022, 0.018, 0.05, 6], '#fff6ea', { roughness: 0.4 });
    vaso2.position.set(-0.29, 0.03, -0.14);
    const vasoPianta = this.mesh('cilindro', [0.03, 0.024, 0.045, 6], '#c4623a');
    vasoPianta.position.set(0.38, 0.028, 0.08);
    const foglia = this.mesh('sfera', [0.045, 6, 5], '#7eae96', { roughness: 0.8 });
    foglia.position.set(0.38, 0.09, 0.08);
    foglia.scale.y = 0.65;
    this.scene.add(vaso, vaso2, vasoPianta, foglia);
  }

  costruisciEttore() {
    const e = new THREE.Group();
    e.position.set(0, 0, -0.38);
    const busto = this.mesh('scatola', [0.16, 0.16, 0.08], '#c4623a');
    busto.position.y = 0.2;
    const grembiule = this.mesh('scatola', [0.13, 0.11, 0.02], '#8fbfa8');
    grembiule.position.set(0, 0.17, 0.045);
    const collo = this.mesh('cilindro', [0.028, 0.032, 0.04, 6], '#f0c7a8');
    collo.position.y = 0.3;
    const testa = this.mesh('sfera', [0.068, 8, 6], '#f0c7a8', { roughness: 0.8 });
    testa.position.y = 0.39;
    testa.scale.set(1, 1.05, 0.95);
    const capelli = this.mesh('sfera', [0.07, 8, 6], '#d5d5d5', { roughness: 0.85 });
    capelli.scale.set(1.02, 0.5, 1);
    capelli.position.y = 0.445;
    const baffo = this.mesh('scatola', [0.055, 0.012, 0.018], '#b9b9b9');
    baffo.position.set(0, 0.365, 0.058);
    const occhio = (x) => {
      const m = this.mesh('sfera', [0.008, 6, 4], '#3c291c', { roughness: 0.4 });
      m.position.set(x, 0.4, 0.058);
      return m;
    };
    e.add(busto, grembiule, collo, testa, capelli, baffo, occhio(-0.024), occhio(0.024));
    this.ettore = e;
    this.scene.add(e);
  }

  costruisciCassetto() {
    const g = new THREE.Group();
    g.position.set(-0.24, -0.12, 0.1);
    const scatola = this.mesh('scatola', [0.16, 0.028, 0.1], '#c4844e', { roughness: 0.78 });
    const bordo = this.mesh('scatola', [0.17, 0.012, 0.012], '#a86b3a');
    bordo.position.set(0, 0.01, 0.05);
    g.add(scatola, bordo);
    const a = this.pila('#7dbe6e', -0.03);
    const b = this.pila('#8bcf78', 0.03);
    a.position.y = 0.028;
    b.position.y = 0.028;
    g.add(a, b);
    this.registra('pila_nuova_a', a);
    this.registra('pila_nuova_b', b);
    this.cassetto = g;
    this.scene.add(g);
  }

  pila(colore, x) {
    const g = new THREE.Group();
    const corpo = this.mesh('cilindro', [0.012, 0.012, 0.042, 6], colore, { roughness: 0.55, metalness: 0.15 });
    const polo = this.mesh('cilindro', [0.005, 0.005, 0.008, 6], '#d9dde2', { metalness: 0.7, roughness: 0.3 });
    polo.position.y = 0.024;
    g.add(corpo, polo);
    g.position.x = x;
    return g;
  }

  costruisciTorcia() {
    const g = new THREE.Group();
    g.visible = false;

    const corpo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.044, 0.15, 8, 1, true),
      this.materiale('#c4623a', { roughness: 0.62 }),
    );
    corpo.castShadow = true;
    corpo.receiveShadow = true;
    corpo.material.side = THREE.DoubleSide;
    corpo.position.y = 0.145;
    const testa = this.mesh('cilindro', [0.052, 0.05, 0.05, 8], '#8d929a', { metalness: 0.55, roughness: 0.36 });
    testa.position.y = 0.22;
    const vetro = this.mesh('cilindro', [0.036, 0.036, 0.012, 8], '#ffe7b0', {
      roughness: 0.22,
      metalness: 0.08,
      emissive: '#ffd59a',
      emissiveIntensity: 0,
    });
    vetro.position.y = 0.25;
    this.vetro = vetro;
    this.luceTorcia = new THREE.PointLight('#ffd59a', 0, 0.85, 2);
    vetro.add(this.luceTorcia);

    const cerniera = new THREE.Group();
    cerniera.position.set(-0.028, 0.018, 0);
    const tappo = this.mesh('cilindro', [0.044, 0.044, 0.028, 8], '#a87848', { roughness: 0.7 });
    tappo.position.set(0.028, -0.02, 0);
    const macchia = this.mesh('sfera', [0.011, 6, 5], '#6e8b4e', {
      roughness: 0.8,
      emissive: '#9bb86a',
      emissiveIntensity: 0.05,
    });
    macchia.position.set(0.055, -0.034, 0.012);
    cerniera.add(tappo, macchia);

    const vite = new THREE.Group();
    vite.position.set(0.03, 0.002, 0.02);
    const stelo = this.mesh('cilindro', [0.011, 0.011, 0.01, 8], '#e4e7eb', { metalness: 0.72, roughness: 0.28 });
    const croceA = this.mesh('scatola', [0.018, 0.004, 0.004], '#f7f8f8', { metalness: 0.6, roughness: 0.3 });
    const croceB = this.mesh('scatola', [0.004, 0.004, 0.018], '#f7f8f8', { metalness: 0.6, roughness: 0.3 });
    croceA.position.y = -0.006;
    croceB.position.y = -0.006;
    vite.add(stelo, croceA, croceB);

    const contatto = this.mesh('cilindro', [0.016, 0.016, 0.006, 8], '#6e8b4e', {
      roughness: 0.5,
      metalness: 0.25,
      emissive: '#9bb86a',
      emissiveIntensity: 0.15,
    });
    contatto.position.y = 0.078;
    contatto.scale.set(1.35, 1, 1.35);

    const pilaA = this.pila('#6a7348', -0.016);
    const pilaB = this.pila('#6d7a52', 0.016);
    pilaA.position.y = 0.05;
    pilaB.position.y = 0.05;
    const messaA = this.pila('#7dbe6e', -0.016);
    const messaB = this.pila('#8bcf78', 0.016);
    messaA.position.y = 0.05;
    messaB.position.y = 0.05;
    messaA.visible = false;
    messaB.visible = false;

    const sedeA = new THREE.Object3D();
    sedeA.position.set(-0.016, 0.05, 0);
    const sedeB = new THREE.Object3D();
    sedeB.position.set(0.016, 0.05, 0);
    const centro = new THREE.Object3D();
    centro.position.y = 0.12;

    g.scale.setScalar(1.35);
    g.add(corpo, testa, vetro, cerniera, vite, contatto, pilaA, pilaB, messaA, messaB, sedeA, sedeB, centro);
    this.registra('tappo', cerniera);
    this.registra('macchia', macchia);
    this.registra('vite', vite);
    this.registra('contatto', contatto);
    this.registra('pila_a', pilaA);
    this.registra('pila_b', pilaB);
    this.registra('pila_messa_a', messaA);
    this.registra('pila_messa_b', messaB);
    this.registra('sede_a', sedeA);
    this.registra('sede_b', sedeB);
    this.registra('centro_torcia', centro);
    this.registra('vetro', vetro);
    this.gruppi.torcia = g;
    this.scene.add(g);
  }

  costruisciTelecomando() {
    const g = new THREE.Group();
    g.visible = false;
    const corpo = this.mesh('scatola', [0.078, 0.016, 0.168], '#f4efe4', { roughness: 0.55 });
    const tasti = new THREE.Group();
    const colori = ['#c4623a', '#7eae96', '#e7d27a', '#8d929a'];
    colori.forEach((colore, i) => {
      const tasto = this.mesh('scatola', [0.016, 0.006, 0.016], colore, { roughness: 0.45 });
      tasto.position.set(-0.018 + (i % 2) * 0.028, -0.01, -0.02 + Math.floor(i / 2) * 0.028);
      tasti.add(tasto);
    });
    const guscio = this.mesh('scatola', [0.08, 0.008, 0.17], '#e4dccd', { roughness: 0.5 });
    guscio.position.y = 0.012;
    const fa = new THREE.Object3D();
    fa.position.set(0.04, 0.014, -0.055);
    const fb = new THREE.Object3D();
    fb.position.set(0.04, 0.014, 0.055);
    const filo = this.mesh('cilindro', [0.0045, 0.0045, 0.055, 6], '#d08a3a', {
      metalness: 0.45,
      roughness: 0.4,
      emissive: '#c4623a',
      emissiveIntensity: 0,
    });
    filo.rotation.x = Math.PI / 2;
    filo.position.set(-0.012, 0.006, 0.01);
    const rame = new THREE.Object3D();
    rame.position.set(-0.012, 0.014, 0.01);
    const molla = this.mesh('cilindro', [0.009, 0.009, 0.022, 6], '#c5c9ce', { metalness: 0.78, roughness: 0.28 });
    molla.position.set(0.02, 0.012, -0.045);
    const sede = new THREE.Object3D();
    sede.position.set(0.02, 0.012, 0.04);
    const nastro = this.mesh('cilindro', [0.012, 0.012, 0.04, 6], '#e7d27a', { roughness: 0.62 });
    nastro.rotation.x = Math.PI / 2;
    nastro.position.copy(filo.position);
    nastro.visible = false;
    const centro = new THREE.Object3D();
    g.add(corpo, tasti, guscio, fa, fb, filo, rame, molla, sede, nastro, centro);
    this.registra('guscio', guscio);
    this.registra('fessura_a', fa);
    this.registra('fessura_b', fb);
    this.registra('filo', filo);
    this.registra('rame', rame);
    this.registra('molla', molla);
    this.registra('sede_molla', sede);
    this.registra('nastro_filo', nastro);
    this.registra('centro_telecomando', centro);
    g.scale.setScalar(1.45);
    this.mollaBase = new THREE.Vector3(0.02, 0.012, -0.045);
    this.sedeMolla = new THREE.Vector3(0.02, 0.012, 0.04);
    this.gruppi.telecomando = g;
    this.scene.add(g);
  }

  costruisciTv() {
    const g = new THREE.Group();
    g.position.set(0.34, 0.3, -0.36);
    const scocca = this.mesh('scatola', [0.2, 0.14, 0.04], '#c4844e', { roughness: 0.7 });
    const tela = document.createElement('canvas');
    tela.width = 64;
    tela.height = 40;
    this.tvTela = tela;
    this.tvCtx = tela.getContext('2d');
    this.tvTex = new THREE.CanvasTexture(tela);
    this.tvTex.colorSpace = THREE.SRGBColorSpace;
    const schermo = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.006),
      new THREE.MeshStandardMaterial({
        map: this.tvTex,
        emissive: new THREE.Color('#ffd59a'),
        emissiveMap: this.tvTex,
        emissiveIntensity: 0,
        roughness: 0.42,
        metalness: 0.02,
        flatShading: true,
      }),
    );
    schermo.position.z = 0.022;
    schermo.castShadow = true;
    const antenna = this.mesh('cilindro', [0.004, 0.004, 0.06, 4], '#8d929a', { metalness: 0.6, roughness: 0.35 });
    antenna.position.set(0.04, 0.09, 0);
    antenna.rotation.z = 0.4;
    g.add(scocca, schermo, antenna);
    this.tvSchermo = schermo;
    this.registra('schermo_tv', schermo);
    this.disegnaTv(false, 0);
    this.scene.add(g);
  }

  disegnaTv(accesa, tempo) {
    const ctx = this.tvCtx;
    if (!accesa) {
      ctx.fillStyle = '#3c291c';
      ctx.fillRect(0, 0, 64, 40);
    } else {
      const colori = ['#c4623a', '#ffd59a', '#7eae96', '#fff6ea'];
      const slitta = Math.floor(tempo * 6) % 16;
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = colori[(i + slitta) % colori.length];
        ctx.fillRect(i * 16, 0, 16, 40);
      }
    }
    this.tvTex.needsUpdate = true;
  }

  ridimensiona() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.fov = this.camera.aspect < 1 ? 36 : 30;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  proietta(id) {
    const nodo = this.nodi.get(id);
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

  aggiorna(dt, mondo, anteprima) {
    this.tempo += dt;
    const calmo = riduciMovimento();
    if (!calmo) this.ettore.position.y = Math.sin(this.tempo * 1.4) * 0.006;

    this.aggiornaOggetto('torcia', mondo.oggetti.torcia, dt, anteprima);
    this.aggiornaOggetto('telecomando', mondo.oggetti.telecomando, dt, anteprima);
    this.aggiornaTorcia(mondo, anteprima, dt);
    this.aggiornaTelecomando(mondo, anteprima, dt);
    this.aggiornaCassetto(mondo, dt);
    this.aggiornaTv(mondo, dt);
  }

  aggiornaOggetto(id, log, dt, anteprima) {
    const gruppo = this.gruppi[id];
    const destinazione = pose[id][log.posa] ?? pose[id].ingresso;
    if (log.visibile && !this.visibilePrima[id]) {
      gruppo.position.set(destinazione.pos[0], destinazione.pos[1] + 0.32, destinazione.pos[2]);
      gruppo.rotation.set(destinazione.rot[0], destinazione.rot[1], destinazione.rot[2]);
    }
    this.visibilePrima[id] = log.visibile;
    gruppo.visible = log.visibile;
    if (!log.visibile) return;
    const giro = THREE.MathUtils.clamp(anteprima.giro?.[id] ?? 0, -1.2, 1.2);
    const meta = {
      x: destinazione.pos[0],
      y: destinazione.pos[1],
      z: destinazione.pos[2],
      rx: destinazione.rot[0],
      ry: destinazione.rot[1] + giro,
      rz: destinazione.rot[2],
    };
    const dx = meta.x - gruppo.position.x;
    const dy = meta.y - gruppo.position.y;
    const dz = meta.z - gruppo.position.z;
    const rx = meta.rx - gruppo.rotation.x;
    const ry = meta.ry - gruppo.rotation.y;
    const rz = meta.rz - gruppo.rotation.z;
    if (dx * dx + dy * dy + dz * dz < 1e-6 && rx * rx + ry * ry + rz * rz < 1e-5) {
      gruppo.position.set(meta.x, meta.y, meta.z);
      gruppo.rotation.set(meta.rx, meta.ry, meta.rz);
      return;
    }
    const k = 1 - Math.exp(-dt * 8);
    gruppo.position.x += dx * k;
    gruppo.position.y += dy * k;
    gruppo.position.z += dz * k;
    gruppo.rotation.x += rx * k;
    gruppo.rotation.y += ry * k;
    gruppo.rotation.z += rz * k;
  }

  aggiornaTorcia(mondo, anteprima, dt) {
    const k = 1 - Math.exp(-dt * 8);
    const tappo = this.nodi.get('tappo');
    const aperto = mondo.parti.tappo.aperto;
    const metaTappo = -aperto * 2.15;
    if (Math.abs(metaTappo - tappo.rotation.z) < 0.02) tappo.rotation.z = metaTappo;
    else tappo.rotation.z += (metaTappo - tappo.rotation.z) * k;
    const dentro = Math.abs(tappo.rotation.z) > 0.7;
    this.nodi.get('contatto').visible = dentro;
    this.nodi.get('pila_a').visible = dentro && !mondo.parti.pila_a.estratta;
    this.nodi.get('pila_b').visible = dentro && !mondo.parti.pila_b.estratta;
    this.nodi.get('pila_messa_a').visible = dentro && mondo.parti.pila_nuova_a.inserita;
    this.nodi.get('pila_messa_b').visible = dentro && mondo.parti.pila_nuova_b.inserita;

    const pulizia = Math.max(mondo.parti.macchia.pulizia, anteprima.pulizia ?? 0);
    this.coloraOssido(this.nodi.get('macchia'), pulizia, mondo.parti.macchia.scoperta && pulizia < 0.92);
    this.coloraOssido(this.nodi.get('contatto'), Math.max(mondo.parti.contatto.pulizia, anteprima.pulizia ?? 0), false);

    const vite = this.nodi.get('vite');
    const angolo = anteprima.vite ?? vite.userData.angolo ?? 0;
    vite.userData.angolo = angolo;
    vite.rotation.y = angolo;

    const accesa = mondo.oggetti.torcia.acceso;
    this.vetro.material.emissiveIntensity = accesa ? 1.5 : 0;
    this.luceTorcia.intensity = accesa ? 1.6 : 0;
  }

  coloraOssido(mesh, pulizia, brilla) {
    const sporco = new THREE.Color('#6e8b4e');
    const pulito = new THREE.Color('#c5c8cc');
    mesh.material.color.copy(sporco).lerp(pulito, pulizia);
    mesh.material.emissive.set('#b6d48a');
    mesh.material.emissiveIntensity = brilla ? 0.85 : 0.04;
  }

  aggiornaTelecomando(mondo, anteprima, dt) {
    const k = 1 - Math.exp(-dt * 9);
    const guscio = this.nodi.get('guscio');
    const aperto = mondo.parti.guscio.aperto;
    const y = 0.012 + aperto * 0.075;
    guscio.position.y += (y - guscio.position.y) * k;
    guscio.rotation.z += (-aperto * 0.7 - guscio.rotation.z) * k;
    const dentro = guscio.position.y > 0.04;
    const filo = this.nodi.get('filo');
    const molla = this.nodi.get('molla');
    const nastro = this.nodi.get('nastro_filo');
    filo.visible = dentro;
    molla.visible = dentro;
    const avvolto = Math.max(mondo.parti.filo.avvolto, anteprima.avvolto ?? 0);
    nastro.visible = dentro && avvolto > 0.04;
    const scala = 0.25 + avvolto * 0.85;
    nastro.scale.setScalar(scala);
    const scoperto = mondo.parti.filo.scoperto && avvolto < 0.75;
    filo.material.emissiveIntensity = scoperto ? 0.75 : 0;
    filo.material.color.set(scoperto ? '#e08a3c' : '#d08a3a');

    const meta = mondo.parti.molla.aPosto ? this.sedeMolla : this.mollaBase;
    if (anteprima.trascina === 'molla' && anteprima.delta) {
      molla.position.copy(this.mollaBase);
      molla.position.x += anteprima.delta.x;
      molla.position.z += anteprima.delta.z;
    } else {
      molla.position.lerp(meta, k);
    }
    molla.material.emissive.set('#ffd59a');
    molla.material.emissiveIntensity = mondo.parti.molla.scoperta && !mondo.parti.molla.aPosto ? 0.45 : 0;
  }

  aggiornaCassetto(mondo, dt) {
    const k = 1 - Math.exp(-dt * 8);
    const y = -0.12 + mondo.cassetto * 0.15;
    this.cassetto.position.y += (y - this.cassetto.position.y) * k;
    const aperto = this.cassetto.position.y > -0.02;
    this.nodi.get('pila_nuova_a').visible = aperto && !mondo.parti.pila_nuova_a.inserita;
    this.nodi.get('pila_nuova_b').visible = aperto && !mondo.parti.pila_nuova_b.inserita;
  }

  aggiornaTv(mondo, dt) {
    this.tvSchermo.material.emissiveIntensity = mondo.tv ? 0.9 : 0;
    if (!mondo.tv) {
      if (this.tvAccesa) this.disegnaTv(false, 0);
      this.tvAccesa = false;
      return;
    }
    this.tvAccesa = true;
    if (this.tempo - this.ultimoTv > 0.12) {
      this.ultimoTv = this.tempo;
      this.disegnaTv(true, this.tempo);
    }
  }
}
