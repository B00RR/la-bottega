const CHIAVE = 'la-bottega:audio';

/** Suoni procedurali, corti, da bottega. Niente file esterni. */
export class AudioBottega {
  constructor() {
    this.muto = false;
    try {
      this.muto = localStorage.getItem(CHIAVE) === '0';
    } catch {
      this.muto = false;
    }
    this.ctx = null;
    this.ultimoTick = 0;
  }

  sblocca() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  acceso() {
    return !this.muto;
  }

  impostaMuto(muto) {
    this.muto = muto;
    try {
      localStorage.setItem(CHIAVE, muto ? '0' : '1');
    } catch {
      /* la preferenza resta solo in memoria */
    }
  }

  alterna() {
    this.impostaMuto(!this.muto);
    if (!this.muto) {
      this.sblocca();
      this.tick();
    }
    return !this.muto;
  }

  beep(freq, dur, tipo, gain, quando = 0) {
    if (this.muto || !this.ctx) return;
    const t0 = this.ctx.currentTime + quando;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  borbottio() {
    this.sblocca();
    for (let i = 0; i < 4; i += 1) {
      this.beep(150 + Math.random() * 110, 0.05, 'sine', 0.035, i * 0.07);
    }
  }

  tick() {
    const ora = performance.now();
    if (ora - this.ultimoTick < 70) return;
    this.ultimoTick = ora;
    this.sblocca();
    this.beep(540, 0.035, 'triangle', 0.03);
  }

  click() {
    this.sblocca();
    this.beep(160 + Math.random() * 40, 0.028, 'square', 0.018);
  }

  campanella() {
    this.sblocca();
    this.beep(680, 0.09, 'sine', 0.035);
    this.beep(920, 0.12, 'sine', 0.025, 0.05);
  }

  clac() {
    this.sblocca();
    this.beep(96, 0.07, 'square', 0.05);
    this.beep(180, 0.04, 'triangle', 0.03, 0.03);
  }

  tonfo() {
    this.sblocca();
    this.beep(110, 0.09, 'sine', 0.04);
  }

  festa() {
    this.sblocca();
    [523, 659, 784, 1046].forEach((freq, i) => {
      this.beep(freq, 0.14, 'sine', 0.04, i * 0.08);
    });
  }
}
