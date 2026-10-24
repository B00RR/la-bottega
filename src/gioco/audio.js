const CHIAVE = 'la-bottega:audio';

const db = (valore) => 10 ** (valore / 20);

/** Bus in dB: musica, effetti, voce, ambiente. Il primo gesto sblocca l'AudioContext. */
export class AudioBottega {
  constructor() {
    this.muto = false;
    try {
      this.muto = localStorage.getItem(CHIAVE) === '0';
    } catch {
      this.muto = false;
    }
    this.ctx = null;
    this.livelloMusica = 0;
    this.anatraFino = 0;
    this.ultimoFruscio = 0;
    this.interno = false;
  }

  sblocca() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.musica = this.bus(-18);
        this.sfx = this.bus(-4);
        this.voce = this.bus(-6);
        this.ambiente = this.bus(-16);
        this.guadagnoBase = -18;
      }
      if (this.ctx.state === 'suspended') {
        const ripresa = this.ctx.resume();
        if (ripresa && typeof ripresa.catch === 'function') ripresa.catch(() => {});
      }
      this.applicaMuto();
    } catch (errore) {
      console.error(errore);
      this.ctx = null;
      this.master = null;
    }
  }

  bus(decibel) {
    const nodo = this.ctx.createGain();
    nodo.gain.value = db(decibel);
    nodo.connect(this.master);
    return nodo;
  }

  acceso() {
    return !this.muto;
  }

  applicaMuto() {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.muto ? 0.0001 : 1, this.ctx.currentTime, 0.02);
  }

  impostaMuto(muto) {
    this.muto = muto;
    try {
      localStorage.setItem(CHIAVE, muto ? '0' : '1');
    } catch {
      /* la preferenza resta solo in memoria */
    }
    this.applicaMuto();
  }

  alterna() {
    this.impostaMuto(!this.muto);
    if (!this.muto) {
      this.sblocca();
      this.tick();
    }
    return !this.muto;
  }

  tono(base) {
    const variante = [0.94, 1, 1.06][Math.floor(Math.random() * 3)];
    const jitter = 1 + (Math.random() * 0.12 - 0.06);
    return base * variante * jitter;
  }

  beep(bus, freq, dur, tipo, gain, quando = 0) {
    if (this.muto || !this.ctx || !bus) return;
    try {
    const t0 = this.ctx.currentTime + quando;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
    } catch (errore) {
      console.error(errore);
    }
  }

  rumore(bus, dur, gain, freq = 800) {
    if (this.muto || !this.ctx || !bus) return;
    try {
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const dati = buffer.getChannelData(0);
    for (let i = 0; i < n; i += 1) dati[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    src.connect(filtro);
    filtro.connect(g);
    g.connect(bus);
    src.start();
    src.stop(this.ctx.currentTime + dur + 0.02);
    } catch (errore) {
      console.error(errore);
    }
  }

  /** Un blip ogni due caratteri, tono basso ±6%. La musica scende di 6 dB. */
  parla(testo) {
    this.sblocca();
    const pulito = String(testo || '');
    const colpi = Math.max(1, Math.ceil(pulito.length / 2));
    for (let i = 0; i < colpi; i += 1) {
      const freq = 168 * (1 + (Math.random() * 0.12 - 0.06));
      this.beep(this.voce, freq, 0.045, 'sine', 0.55, i * 0.075);
    }
    const durata = Math.max(1.8, 1.2 + pulito.length * 0.06);
    this.anatra(durata);
  }

  anatra(durata) {
    if (!this.ctx || !this.musica) return;
    const ora = this.ctx.currentTime;
    const base = db(this.guadagnoBase);
    this.musica.gain.cancelScheduledValues(ora);
    this.musica.gain.setValueAtTime(this.musica.gain.value, ora);
    this.musica.gain.linearRampToValueAtTime(base * db(-6), ora + 0.05);
    this.musica.gain.linearRampToValueAtTime(base, ora + durata);
  }

  strato(livello) {
    this.livelloMusica = livello;
    if (livello <= 0 || this.timerMusica) return;
    this.sblocca();
    this.timerMusica = window.setInterval(() => this.nota(), 760);
    this.nota();
  }

  nota() {
    if (!this.ctx || this.livelloMusica <= 0) return;
    const scala = [196, 220, 247, 294, 330];
    const freq = scala[Math.floor(Math.random() * scala.length)];
    this.beep(this.musica, freq, 0.2, 'triangle', 0.22);
    if (this.livelloMusica >= 2) this.beep(this.musica, freq * 2, 0.24, 'sine', 0.1, 0.1);
  }

  ambienteInterno() {
    if (this.interno) return;
    this.interno = true;
    this.sblocca();
    this.timerOrologio = window.setInterval(() => {
      this.beep(this.ambiente, this.tono(760), 0.018, 'square', 0.04);
    }, 1100);
  }

  sferraglia() {
    this.sblocca();
    this.rumore(this.sfx, 0.28, 0.35, 420);
    this.beep(this.sfx, 140, 0.12, 'square', 0.08, 0.05);
  }

  campanello() {
    this.sblocca();
    this.beep(this.sfx, this.tono(784), 0.18, 'sine', 0.12);
    this.beep(this.sfx, this.tono(1046), 0.22, 'sine', 0.08, 0.08);
  }

  tick() {
    this.sblocca();
    this.beep(this.sfx, this.tono(520), 0.03, 'triangle', 0.08);
  }

  click() {
    this.sblocca();
    this.beep(this.sfx, this.tono(180), 0.025, 'square', 0.05);
  }

  toc() {
    this.sblocca();
    this.beep(this.sfx, this.tono(240), 0.03, 'triangle', 0.05);
  }

  tonk() {
    this.sblocca();
    this.beep(this.sfx, this.tono(98), 0.07, 'sine', 0.12);
  }

  tic(passo = 0) {
    this.sblocca();
    this.beep(this.sfx, this.tono(420 + passo * 40), 0.028, 'square', 0.045);
  }

  fruscio() {
    const ora = performance.now();
    if (ora - this.ultimoFruscio < 80) return;
    this.ultimoFruscio = ora;
    this.rumore(this.sfx, 0.05, 0.06, 900);
  }

  shsh(vel = 1) {
    this.rumore(this.sfx, 0.06, Math.min(0.12, 0.04 + vel * 0.02), 1400);
  }

  campanellino() {
    this.sblocca();
    this.beep(this.sfx, this.tono(880), 0.1, 'sine', 0.08);
    this.beep(this.sfx, this.tono(1320), 0.14, 'sine', 0.05, 0.06);
  }

  clac() {
    this.sblocca();
    this.beep(this.sfx, 110, 0.06, 'square', 0.1);
    this.beep(this.sfx, 70, 0.08, 'triangle', 0.06, 0.03);
  }

  tump() {
    this.sblocca();
    this.beep(this.sfx, this.tono(150), 0.07, 'sine', 0.1);
  }

  ping() {
    this.sblocca();
    this.beep(this.sfx, this.tono(660), 0.12, 'sine', 0.08);
  }

  sssk() {
    this.rumore(this.sfx, 0.08, 0.07, 1800);
  }

  ding() {
    this.sblocca();
    this.beep(this.sfx, this.tono(988), 0.12, 'sine', 0.08);
  }

  cric() {
    this.sblocca();
    this.beep(this.sfx, this.tono(90), 0.05, 'sawtooth', 0.03);
  }

  arpeggio() {
    this.sblocca();
    [523, 659, 784, 1046].forEach((freq, i) => {
      this.beep(this.sfx, freq, 0.16, i % 2 ? 'triangle' : 'sine', 0.07, i * 0.09);
    });
  }

  cori() {
    this.sblocca();
    this.rumore(this.ambiente, 0.4, 0.08, 500);
    this.beep(this.ambiente, 220, 0.3, 'sine', 0.05, 0.05);
  }
}
