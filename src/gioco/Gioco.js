import { copione } from '../dati/contenuti.js';
import { t } from '../dati/testi.js';
import { applica, ricostruisci } from './mondo.js';
import { carica, cancella, salva } from './salvataggio.js';

const RAGGIO_LENTE = 54;
const RAGGIO_PRESA = 52;
const RAGGIO_SLOT = 84;
const SOGLIA_RUOTA = 110;
const SOGLIA_CERCHIO = 4.2;
const SOGLIA_AVVOLGI = 5;
const SOGLIA_STROFINA = 155;
const SOGLIA_ESTRAI = 96;
const ESITAZIONE = 4.5;

export class Gioco {
  constructor({ app, scena, ui, audio }) {
    this.app = app;
    this.scena = scena;
    this.ui = ui;
    this.audio = audio;
    this.canvas = scena.canvas;
    const salvato = carica();
    this.indice = salvato.indice;
    this.linea = salvato.linea;
    this.saltato = salvato.saltato;
    this.strumento = 'mano';
    this.anteprima = { giro: { torcia: 0, telecomando: 0 }, pulizia: 0, vite: 0, avvolto: 0 };
    this.pronto = false;
    this.completando = false;
    this.ultimoAvanzo = 0;
    this.ultimoInput = performance.now();
    this.posaTimer = 0;
    this.puntatore = null;
    this.azzeragesto();
    this.mondo = ricostruisci(copione, this.indice);
    this.ui.audioEtichetta(this.audio.acceso());
    this.ui.indizi(this.mondo.indizi);
    this.entra(true);
    this.collega();
  }

  passo() {
    return copione[this.indice];
  }

  azzeragesto() {
    this.gestoAttivo = false;
    this.progresso = 0;
    this.ultimoAngolo = null;
    this.trovati = new Set();
    this.estratte = new Set();
    this.inserite = new Set();
    this.presa = null;
    this.nelPunto = false;
    this.trascinato = 0;
    this.giaCorretto = false;
    this.quasiDetto = false;
    this.scatti = 0;
    const vite = this.anteprima?.vite ?? 0;
    this.anteprima = {
      giro: { torcia: 0, telecomando: 0 },
      pulizia: 0,
      avvolto: 0,
      vite,
      trascina: null,
      delta: null,
    };
  }

  collega() {
    const locale = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    document.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      this.audio.sblocca();
      if (this.puntatore?.attivo && this.puntatore.id === e.pointerId) return;
      if (e.target.closest('button, a, input, #impostazioni, #taccuino, #fine')) return;
      if (this.ui.pannelloAperto()) return;
      const pos = locale(e);
      this.puntatore = { id: e.pointerId, x: pos.x, y: pos.y, attivo: true };
      this.ultimoInput = performance.now();
      this.ui.nascondiAiuto();
      this.giaCorretto = false;
      this.trascinato = 0;
      this.nelPunto = false;
      this.ultimoLocale = pos;
      const passo = this.passo();
      if (passo.tipo === 'gesto') this.iniziaGesto(pos);
    });
    document.addEventListener('pointermove', (e) => {
      if (!this.puntatore?.attivo || e.pointerId !== this.puntatore.id) return;
      this.muovi(locale(e));
    });
    const fine = (e) => {
      if (!this.puntatore?.attivo || (e.pointerId != null && e.pointerId !== this.puntatore.id)) return;
      const pos = locale(e);
      this.rilascia(pos, e);
    };
    document.addEventListener('pointerup', fine);
    document.addEventListener('pointercancel', fine);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (document.activeElement?.closest('button')) return;
      const passo = this.passo();
      if ((passo.tipo === 'dialogo' || passo.tipo === 'festa') && this.ui.dialogoAperto()) {
        e.preventDefault();
        this.avanzaRiga();
      }
    });
    window.addEventListener('resize', () => this.scena.ridimensiona());
  }

  strumentiVisibili() {
    const ids = [];
    for (let i = 0; i <= this.indice; i += 1) {
      const id = copione[i].nuovoStrumento;
      if (id && !ids.includes(id)) ids.push(id);
    }
    if (!ids.length) return [];
    return ['mano', ...ids];
  }

  strumentoGiusto() {
    const richiesto = this.passo().strumento;
    if (!richiesto) return true;
    if (richiesto === 'mano' && !this.strumentiVisibili().length) return true;
    return this.strumento === richiesto;
  }

  seleziona(id, conSuono = true) {
    if (!this.strumentiVisibili().includes(id)) return;
    const cambiato = this.strumento !== id;
    this.strumento = id;
    this.ultimoInput = performance.now();
    this.ui.selezionaStrumento(id);
    if (cambiato && conSuono) this.audio.tick();
  }

  entra(dalCaricamento = false) {
    const passo = this.passo();
    this.azzeragesto();
    this.ui.applicaPasso(passo, this.strumentiVisibili());
    this.ui.indizi(this.mondo.indizi);
    if (passo.tipo === 'dialogo' || passo.tipo === 'festa') {
      this.ui.apriDialogo(t(passo.righe[this.linea] ?? passo.righe[0]));
      this.audio.borbottio();
      if (passo.tipo === 'festa' && !dalCaricamento) {
        this.audio.festa();
        this.ui.scintilleA(this.scena.proietta(passo.scintille || 'centro_torcia'));
        this.ui.lampo();
      }
    }
    if (passo.tipo === 'posa') {
      this.posaTimer = (passo.attesa ?? 700) / 1000;
      if (!dalCaricamento) this.audio.tonfo();
    }
    if (passo.tipo === 'gesto') {
      if (passo.strumento) this.seleziona(passo.strumento, !dalCaricamento);
    }
    if (passo.tipo === 'fine') this.ui.mostraFine();
    if (passo.nuovoStrumento && !dalCaricamento) this.audio.tick();
  }

  avanzaRiga() {
    const ora = performance.now();
    if (ora - this.ultimoAvanzo < 280) return;
    this.ultimoAvanzo = ora;
    const passo = this.passo();
    if (this.linea < passo.righe.length - 1) {
      this.linea += 1;
      this.memorizza();
      this.ui.apriDialogo(t(passo.righe[this.linea]));
      this.audio.borbottio();
      return;
    }
    this.completaPasso(false);
  }

  completaPasso(dalGesto) {
    if (this.completando) return;
    if (this.passo().tipo === 'fine') return;
    this.completando = true;
    const passo = this.passo();
    if (passo.suono === 'clac') this.audio.clac();
    this.indice += 1;
    this.linea = 0;
    this.memorizza();
    this.mondo = ricostruisci(copione, this.indice);
    this.entra(false);
    if (dalGesto) this.ignorareRilascio = true;
    this.completando = false;
  }

  memorizza() {
    salva({ indice: this.indice, linea: this.linea, saltato: this.saltato });
  }

  salta() {
    const indice = copione.findIndex((p) => p.id === 'fine');
    this.indice = indice;
    this.linea = 0;
    this.saltato = true;
    this.memorizza();
    this.mondo = ricostruisci(copione, this.indice);
    this.entra(true);
  }

  ricomincia() {
    cancella();
    window.location.reload();
  }

  alternaAudio() {
    const acceso = this.audio.alterna();
    this.ui.audioEtichetta(acceso);
  }

  iniziaGesto(pos) {
    if (!this.strumentoGiusto()) {
      if (this.vicinoAlLavoro(pos)) this.correggi();
      return;
    }
    this.gestoAttivo = true;
    this.viteBase = this.anteprima.vite ?? 0;
    const passo = this.passo();
    if (passo.gesto === 'lente') this.controllaLente(pos);
    if (passo.gesto === 'estrai') this.presa = this.presaEstrazione(pos);
    if (passo.gesto === 'inserisci') this.presa = this.presaInserimento(pos);
    if (passo.gesto === 'pinza') {
      const origine = this.scena.proietta(passo.origine);
      this.presa = origine && this.dist(pos, origine) < RAGGIO_PRESA ? passo.origine : null;
    }
  }

  muovi(pos) {
    const prima = this.ultimoLocale ?? pos;
    const passoPx = Math.hypot(pos.x - prima.x, pos.y - prima.y);
    this.trascinato += passoPx;
    this.ultimoLocale = pos;
    this.ultimoInput = performance.now();
    if (this.gestoAttivo) this.ui.cursoreA(pos, this.strumento);
    if (!this.gestoAttivo) return;
    const passo = this.passo();
    if (passo.gesto === 'ruota') {
      this.progresso += passoPx;
      const id = passo.bersaglio?.includes('telecomando') ? 'telecomando' : 'torcia';
      this.anteprima.giro[id] = (this.anteprima.giro[id] ?? 0) + (pos.x - prima.x) * 0.012;
      if (this.progresso >= SOGLIA_RUOTA) this.completaPasso(true);
    } else if (passo.gesto === 'circolare' || passo.gesto === 'avvolgi') {
      this.accumulaAngolo(pos, passo);
    } else if (passo.gesto === 'strofina') {
      this.strofina(pos, passo, passoPx);
    } else if (passo.gesto === 'lente') {
      this.controllaLente(pos);
    } else if (passo.gesto === 'scorri') {
      this.scorri(pos, passo);
    } else if (passo.gesto === 'estrai' && this.presa && this.trascinato >= SOGLIA_ESTRAI) {
      this.estraiPresa();
    } else if (passo.gesto === 'pinza' && this.presa) {
      this.anteprima.trascina = 'molla';
      const origine = this.scena.proietta(passo.origine);
      if (origine) {
        this.anteprima.delta = {
          x: (pos.x - origine.x) * 0.00045,
          z: (pos.y - origine.y) * 0.00045,
        };
      }
    }
  }

  rilascia(pos, evento) {
    const passo = this.passo();
    const eraGesto = this.gestoAttivo;
    if (passo.tipo === 'gesto' && this.gestoAttivo && passo.gesto === 'inserisci' && this.presa) {
      this.provaInserire(pos);
    }
    if (passo.tipo === 'gesto' && this.gestoAttivo && passo.gesto === 'pinza' && this.presa) {
      const slot = this.scena.proietta(passo.slot);
      if (slot && this.dist(pos, slot) < RAGGIO_SLOT) this.completaPasso(true);
      this.anteprima.trascina = null;
      this.anteprima.delta = null;
    }
    if (
      eraGesto &&
      this.strumentoGiusto() &&
      !this.nelPunto &&
      this.trascinato > 40 &&
      !this.quasiDetto &&
      passo.gesto !== 'ruota' &&
      passo.gesto !== 'estrai' &&
      passo.gesto !== 'inserisci' &&
      this.passo().id === passo.id
    ) {
      this.quasiDetto = true;
      this.ui.correzione(t('corr.quasi'));
      this.audio.borbottio();
    }
    this.gestoAttivo = false;
    this.presa = null;
    this.puntatore = null;
    this.ui.nascondiCursore();
    if (this.ignorareRilascio) {
      this.ignorareRilascio = false;
      return;
    }
    if (evento.target?.closest?.('button')) return;
    if ((passo.tipo === 'dialogo' || passo.tipo === 'festa') && this.ui.dialogoAperto() && !this.ui.pannelloAperto()) {
      this.avanzaRiga();
    }
  }

  accumulaAngolo(pos, passo) {
    const centro = this.scena.proietta(passo.bersaglio);
    if (!centro) return;
    const distanza = this.dist(pos, centro);
    if (distanza < 16 || distanza > 125) return;
    const angolo = Math.atan2(pos.y - centro.y, pos.x - centro.x);
    if (this.ultimoAngolo == null) {
      this.ultimoAngolo = angolo;
      this.nelPunto = true;
      return;
    }
    let delta = angolo - this.ultimoAngolo;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.ultimoAngolo = angolo;
    this.progresso += delta;
    this.nelPunto = true;
    if (passo.gesto === 'circolare') {
      this.anteprima.vite = this.viteBase + this.progresso;
      const scatti = Math.floor(Math.abs(this.progresso) / 0.9);
      if (scatti > this.scatti) {
        this.scatti = scatti;
        this.audio.click();
      }
      const direzione = passo.direzione || 1;
      if (this.progresso * direzione >= SOGLIA_CERCHIO) this.completaPasso(true);
    } else {
      this.anteprima.avvolto = Math.min(1, Math.abs(this.progresso) / SOGLIA_AVVOLGI);
      if (Math.abs(this.progresso) >= SOGLIA_AVVOLGI) this.completaPasso(true);
    }
  }

  strofina(pos, passo, passoPx) {
    const centro = this.scena.proietta(passo.bersaglio);
    if (!centro || this.dist(pos, centro) > 80) return;
    this.nelPunto = true;
    this.progresso += passoPx;
    this.anteprima.pulizia = Math.min(1, this.progresso / SOGLIA_STROFINA);
    if (this.progresso >= SOGLIA_STROFINA) this.completaPasso(true);
  }

  controllaLente(pos) {
    const passo = this.passo();
    const ids = passo.bersagli ?? [passo.bersaglio];
    for (const id of ids) {
      if (this.trovati.has(id)) continue;
      const punto = this.scena.proietta(id);
      if (!punto || this.dist(pos, punto) > RAGGIO_LENTE) continue;
      this.trovati.add(id);
      this.nelPunto = true;
      const indizio = passo.indizi?.[id];
      if (indizio) this.scopri(id, indizio, punto);
    }
    if (this.trovati.size >= ids.length) this.completaPasso(true);
  }

  scopri(id, indizio, punto) {
    if (id === 'macchia') this.mondo.parti.macchia.scoperta = true;
    if (id === 'rame') this.mondo.parti.filo.scoperto = true;
    if (id === 'molla') this.mondo.parti.molla.scoperta = true;
    if (!this.mondo.indizi.includes(indizio)) this.mondo.indizi.push(indizio);
    this.ui.indizi(this.mondo.indizi);
    this.ui.voloIndizio(indizio, punto);
    this.audio.campanella();
  }

  scorri(pos, passo) {
    const a = this.scena.proietta(passo.scorri[0]);
    const b = this.scena.proietta(passo.scorri[1]);
    if (!a || !b) return;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby || 1;
    const t = ((pos.x - a.x) * abx + (pos.y - a.y) * aby) / len2;
    const px = a.x + abx * Math.max(0, Math.min(1, t));
    const py = a.y + aby * Math.max(0, Math.min(1, t));
    if (Math.hypot(pos.x - px, pos.y - py) > 72) return;
    this.nelPunto = true;
    this.progresso = Math.max(this.progresso, t);
    if (this.progresso >= 0.72) this.completaPasso(true);
  }

  presaEstrazione(pos) {
    const passo = this.passo();
    let scelta = null;
    let meglio = RAGGIO_PRESA;
    for (const id of passo.parti) {
      if (this.estratte.has(id) || this.mondo.parti[id]?.estratta) continue;
      const punto = this.scena.proietta(id);
      if (!punto) continue;
      const d = this.dist(pos, punto);
      if (d < meglio) {
        meglio = d;
        scelta = id;
      }
    }
    return scelta;
  }

  estraiPresa() {
    if (!this.presa || this.estratte.has(this.presa)) return;
    this.estratte.add(this.presa);
    this.mondo.parti[this.presa].estratta = true;
    this.audio.click();
    this.presa = null;
    this.trascinato = 0;
    const passo = this.passo();
    const finite = passo.parti.every((id) => this.estratte.has(id) || this.mondo.parti[id].estratta);
    if (finite) this.completaPasso(true);
  }

  presaInserimento(pos) {
    const passo = this.passo();
    let scelta = null;
    let meglio = RAGGIO_PRESA;
    for (const id of passo.parti) {
      if (this.inserite.has(id) || this.mondo.parti[id]?.inserita) continue;
      const punto = this.scena.proietta(id);
      if (!punto) continue;
      const d = this.dist(pos, punto);
      if (d < meglio) {
        meglio = d;
        scelta = id;
      }
    }
    return scelta;
  }

  provaInserire(pos) {
    const passo = this.passo();
    let slot = null;
    let meglio = RAGGIO_SLOT;
    for (const id of passo.parti) {
      if (this.inserite.has(id)) continue;
      const punto = this.scena.proietta(passo.slotDi[id]);
      if (!punto) continue;
      const d = this.dist(pos, punto);
      if (d < meglio) {
        meglio = d;
        slot = id;
      }
    }
    if (!slot) return;
    this.inserite.add(slot);
    this.mondo.parti[slot].inserita = true;
    this.audio.tick();
    const finite = passo.parti.every((id) => this.inserite.has(id));
    if (finite) this.completaPasso(true);
  }

  vicinoAlLavoro(pos) {
    const id = this.passo().bersaglio || 'centro_torcia';
    const punto = this.scena.proietta(id) || this.scena.proietta('centro_torcia');
    if (!punto) return true;
    return this.dist(pos, punto) < 170;
  }

  correggi() {
    if (this.giaCorretto) return;
    this.giaCorretto = true;
    const id = this.strumentiVisibili().includes(this.strumento) ? this.strumento : 'mano';
    this.ui.correzione(t(`corr.${id}`));
    this.audio.borbottio();
  }

  dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  aggiorna(dt) {
    this.scena.aggiorna(dt, this.mondo, this.anteprima);
    const passo = this.passo();
    if (passo.tipo === 'posa') {
      this.posaTimer -= dt;
      if (this.posaTimer <= 0) this.completaPasso(false);
    }
    if (passo.tipo === 'gesto' && !this.ui.pannelloAperto()) {
      if (performance.now() - this.ultimoInput >= ESITAZIONE * 1000) this.ui.aiuto(true, passo.strumento);
    }
    this.fotogrammi = (this.fotogrammi || 0) + 1;
    if (this.ui.aiutoAttivo) {
      const punto = this.scena.proietta(passo.bersaglio);
      this.ui.posizionaMano(punto);
    }
    this.aggiornaAttributi();
    this.pronto = true;
  }

  punti(ids) {
    return ids
      .map((id) => {
        const p = this.scena.proietta(id);
        return p ? { id, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 } : null;
      })
      .filter(Boolean);
  }

  aggiornaAttributi() {
    const passo = this.passo();
    const app = this.app;
    app.dataset.pronto = this.pronto ? '1' : '0';
    app.dataset.passo = passo.id;
    app.dataset.fotogrammi = String(this.fotogrammi || 0);
    app.dataset.aiuto = this.ui.aiutoAttivo ? '1' : '0';
    app.dataset.tipo = passo.tipo;
    app.dataset.gesto = passo.gesto || '';
    app.dataset.linea = String(this.linea);
    app.dataset.direzione = passo.direzione != null ? String(passo.direzione) : '';
    app.dataset.strumentoAttivo = this.strumento || '';
    const bersaglio = passo.bersaglio ? this.scena.proietta(passo.bersaglio) : null;
    app.dataset.bersaglio = bersaglio ? `${bersaglio.x.toFixed(1)},${bersaglio.y.toFixed(1)}` : '';
    const ids = passo.bersagli ?? (passo.gesto === 'estrai' ? (passo.parti ?? []) : passo.bersaglio ? [passo.bersaglio] : []);
    app.dataset.bersagli = JSON.stringify(this.punti(ids));
    if (passo.scorri) {
      const a = this.scena.proietta(passo.scorri[0]);
      const b = this.scena.proietta(passo.scorri[1]);
      app.dataset.scorri = a && b ? JSON.stringify({
        ax: +a.x.toFixed(1),
        ay: +a.y.toFixed(1),
        bx: +b.x.toFixed(1),
        by: +b.y.toFixed(1),
      }) : '';
    } else app.dataset.scorri = '';
    if (passo.gesto === 'inserisci' || passo.gesto === 'pinza') {
      const coppie = [];
      if (passo.gesto === 'pinza') {
        const da = this.scena.proietta(passo.origine);
        const a = this.scena.proietta(passo.slot);
        if (da && a) coppie.push({
          da: { x: +da.x.toFixed(1), y: +da.y.toFixed(1) },
          a: { x: +a.x.toFixed(1), y: +a.y.toFixed(1) },
        });
      } else {
        for (const id of passo.parti) {
          if (this.mondo.parti[id]?.inserita) continue;
          const da = this.scena.proietta(id);
          const a = this.scena.proietta(passo.slotDi[id]);
          if (!da || !a) continue;
          coppie.push({
            id,
            da: { x: +da.x.toFixed(1), y: +da.y.toFixed(1) },
            a: { x: +a.x.toFixed(1), y: +a.y.toFixed(1) },
          });
        }
      }
      app.dataset.coppie = JSON.stringify(coppie);
    } else app.dataset.coppie = '';
    const p = this.mondo.parti;
    app.dataset.stato = JSON.stringify({
      tappo: p.tappo.aperto,
      pulizia: p.contatto.pulizia,
      pileFuori: ['pila_a', 'pila_b'].filter((id) => p[id].estratta).length,
      pileDentro: ['pila_nuova_a', 'pila_nuova_b'].filter((id) => p[id].inserita).length,
      guscio: p.guscio.aperto,
      molla: p.molla.aPosto ? 1 : 0,
      nastro: p.filo.avvolto,
      tv: this.mondo.tv ? 1 : 0,
      torciaAccesa: this.mondo.oggetti.torcia.acceso ? 1 : 0,
    });
    app.dataset.indizi = this.mondo.indizi.map((id) => t(id)).join('|');
  }
}
