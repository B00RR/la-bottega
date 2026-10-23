import * as THREE from 'three';
import { pittura } from './modelli.js';

const CLIP = ['giornale_su', 'spinta_dito', 'mano_occhi', 'sbattere'];

function azione(mixer, clips, nome) {
  const clip = THREE.AnimationClip.findByName(clips, nome);
  if (!clip) return null;
  const fatta = mixer.clipAction(clip);
  fatta.setLoop(THREE.LoopOnce, 1);
  fatta.clampWhenFinished = false;
  return fatta;
}

/**
 * Quattro clip. sbattere e mano_occhi muovono entrambe palpebre.scale.y:
 * non vanno mai sommate.
 */
export class RegiaEttore {
  constructor(radice, clips) {
    this.radice = radice;
    this.mixer = new THREE.AnimationMixer(radice);
    this.azioni = {};
    for (const nome of CLIP) {
      const fatta = azione(this.mixer, clips, nome);
      if (fatta) this.azioni[nome] = fatta;
    }
    this.fase = 'attesa';
    this.vuoleDito = false;
    this.abbaglio = false;
    this.battito = 2.4;
    this.allineata = false;
  }

  tieniGiornale() {
    const su = this.azioni.giornale_su;
    this.ferma('spinta_dito');
    if (!su) {
      this.fase = 'su';
      return;
    }
    su.reset();
    su.timeScale = 1;
    su.clampWhenFinished = true;
    su.play();
    su.time = su.getClip().duration;
    su.paused = true;
    this.mixer.update(0);
    this.fase = 'su';
  }

  abbassa() {
    if (this.fase === 'abbassa' || this.fase === 'dito' || this.fase === 'riposo' || this.fase === 'abbaglio') return;
    const su = this.azioni.giornale_su;
    if (!su) {
      this.fase = 'riposo';
      if (this.vuoleDito) this.avviaDito();
      return;
    }
    su.paused = false;
    su.timeScale = -1;
    su.clampWhenFinished = false;
    su.play();
    this.fase = 'abbassa';
  }

  spingi() {
    if (this.fase === 'dito' || this.fase === 'abbaglio') return;
    this.vuoleDito = true;
    if (this.fase === 'su' || this.fase === 'attesa') this.abbassa();
    else if (this.fase === 'riposo') this.avviaDito();
  }

  avviaDito() {
    this.ferma('giornale_su');
    const dito = this.azioni.spinta_dito;
    this.vuoleDito = false;
    if (!dito) {
      this.fase = 'riposo';
      return;
    }
    dito.reset();
    dito.timeScale = 1;
    dito.clampWhenFinished = false;
    dito.setLoop(THREE.LoopOnce, 1);
    dito.play();
    this.fase = 'dito';
  }

  abbaglia() {
    if (this.abbaglio) return;
    this.abbaglio = true;
    this.ferma('sbattere');
    this.ferma('giornale_su');
    this.ferma('spinta_dito');
    const mano = this.azioni.mano_occhi;
    if (!mano) {
      this.fase = 'abbaglio';
      return;
    }
    mano.reset();
    mano.timeScale = 1;
    mano.clampWhenFinished = true;
    mano.setLoop(THREE.LoopOnce, 1);
    mano.fadeIn(0.12);
    mano.play();
    this.fase = 'abbaglio';
  }

  lasciaOcchi() {
    if (!this.abbaglio) return;
    this.abbaglio = false;
    const mano = this.azioni.mano_occhi;
    if (mano) mano.fadeOut(0.35);
    this.fase = 'riposo';
    this.battito = 1.2;
  }

  saltaRiposo() {
    for (const nome of CLIP) this.ferma(nome);
    this.vuoleDito = false;
    this.abbaglio = false;
    this.fase = 'riposo';
    this.mixer.update(0);
  }

  ferma(nome) {
    const fatta = this.azioni[nome];
    if (!fatta) return;
    if (fatta.isRunning() || fatta.paused) fatta.stop();
  }

  palpebreOccupate() {
    const mano = this.azioni.mano_occhi;
    if (this.abbaglio) return true;
    return Boolean(mano && mano.isRunning() && mano.getEffectiveWeight() > 0.02);
  }

  battitoTick(dt) {
    const battito = this.azioni.sbattere;
    if (!battito) return;
    if (this.palpebreOccupate()) {
      if (battito.isRunning()) this.ferma('sbattere');
      return;
    }
    if (battito.isRunning()) return;
    this.battito -= dt;
    if (this.battito > 0) return;
    battito.reset();
    battito.timeScale = 1;
    battito.clampWhenFinished = false;
    battito.setLoop(THREE.LoopOnce, 1);
    battito.weight = 1;
    battito.play();
    this.battito = 3 + Math.random() * 3;
  }

  aggiorna(dt, vista) {
    const prima = this.fase;
    const ettore = vista?.ettore || {};
    if (!this.allineata) {
      this.allineata = true;
      if (ettore.posa === 'giornale') this.tieniGiornale();
      else this.fase = 'riposo';
    }
    const vuoleOcchi = (ettore.strizza || 0) > 0.5 || (ettore.mano || 0) > 0.5;
    if (vuoleOcchi) this.abbaglia();
    else if (this.abbaglio) this.lasciaOcchi();
    if (ettore.posa !== 'giornale' && this.fase === 'su') this.saltaRiposo();
    this.battitoTick(dt);
    this.mixer.update(dt);
    if (this.fase === 'abbassa') {
      const su = this.azioni.giornale_su;
      if (!su || !su.enabled || su.time <= 0.001) {
        if (su) this.ferma('giornale_su');
        this.fase = 'riposo';
        if (this.vuoleDito) this.avviaDito();
      }
    }
    if (this.fase === 'dito') {
      const dito = this.azioni.spinta_dito;
      if (!dito || !dito.isRunning()) this.fase = 'riposo';
    }
    return this.animato() || this.fase !== prima;
  }

  animato() {
    return Object.values(this.azioni).some((fatta) => fatta.isRunning()
      || (fatta.enabled && !fatta.paused && fatta.getEffectiveWeight() > 0.02));
  }
}

/** Piano a y = −0.339, dietro il banco, sotto le suole. */
export function creaPedana(ettore) {
  const piedi = ettore.getObjectByName('piedi');
  const punto = new THREE.Vector3();
  if (piedi) piedi.getWorldPosition(punto);
  else punto.copy(ettore.position);
  const ySuola = Math.min(punto.y, -0.339);
  const yTerra = -0.88;
  const altezza = Math.max(0.08, ySuola - yTerra);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, altezza, 0.2),
    pittura('#c4a484', { unico: true, roughness: 0.92 }),
  );
  mesh.name = 'pedana';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.position.set(punto.x, yTerra + altezza / 2, Math.min(punto.z, -0.46));
  return mesh;
}
