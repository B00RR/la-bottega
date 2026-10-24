import { passi, corrRotazione, idBattute } from '../dati/contenuti.js';
import { gesti, rad } from '../dati/gesti.js';
import { t, validaId } from '../dati/testi.js';
import { applica, clona, ricostruisci } from './mondo.js';
import { carica, cancella, salva } from './salvataggio.js';
import {
  eTap,
  passoCerchio,
  passoScorri,
  passoStrofina,
  statoCerchio,
  statoStrofina,
  vicinoAngolo,
} from './gestoPuro.js';
import { vibra } from './vibra.js';

const NOMI = [
  'bottone', 'centro_torcia', 'macchia', 'vite', 'contatto', 'tappo',
  'pila_a', 'pila_b', 'pila_nuova_a', 'pila_nuova_b', 'sede_a', 'sede_b',
  'tasto_on', 'centro_telecomando', 'fessura_a', 'fessura_b', 'filo', 'rame',
  'molla', 'sede_molla', 'guscio', 'sede_guscio', 'vetro',
];

function ora() {
  return performance.now();
}

export class Gioco {
  constructor({ app, scena, audio, ui }) {
    this.app = app;
    this.scena = scena;
    this.audio = audio;
    this.ui = ui;
    const dbg = (new URLSearchParams(location.search).get('debug') || '').split(',');
    this.debugZone = dbg.includes('zone');
    this.debugCorr = dbg.includes('corr');
    this.parametri = new URLSearchParams(location.search);
    validaId(idBattute());

    const salvato = carica();
    this.saltato = salvato.saltato;
    this.indice = salvato.indice;
    this.progressoGesto = salvato.progressoGesto;
    this.parziali = [...salvato.parziali];
    if (this.debugZone && this.parametri.get('passo')) {
      const trovato = passi.findIndex((p) => p.id === this.parametri.get('passo'));
      if (trovato >= 0) {
        this.indice = trovato;
        this.progressoGesto = 0;
        this.parziali = [];
        this.saltato = false;
      }
    }
    this.passo = passi[this.indice];
    this.vista = ricostruisci(this.indice);
    this.strumento = null;
    this.strumentoSalvato = salvato.strumento || null;
    this.salvataggioSpento = false;
    this.gestoAmmesso = false;
    this.erroreSensoGesto = 0;
    this.fermo = false;
    this.bloccoT = 0;
    this.eventiFatti = new Set();
    this.esitazione = 0;
    this.aiuto = 0;
    this.aiutoTempi = {};
    this.errori = 0;
    this.calma = false;
    this.corrI = 0;
    this.nudi = 0;
    this.mancati = 0;
    this.tapContatto = 0;
    this.dettoSenso = false;
    this.coda = [];
    this.bolla = null;
    this.consecutive = 0;
    this.intro = false;
    this.ripresaDetta = false;
    this.apertura = this.indice === 0 && !this.saltato ? 0 : 1;
    this.shutterT = 0;
    this.shutterAuto = false;
    this.premuto = false;
    this.ignora = false;
    this.attesa = null;
    this.codaPunti = [];
    this.down = null;
    this.ultimo = null;
    this.gesto = null;
    this.scatto = null;
    this.quarti = 0;
    this.ganci = new Set();
    this.celebrando = 0;
    this.pausa = false;
    this.riduci = false;
    this.lenteT = {};
    this.finePausa = 0;
    this.fine2 = false;
    this.ultimoSalva = 0;
    this.immediato = new Set();
    this.torciaPronta = false;
    this.corrOk = false;
    this.ui.collega(this);
    this.ascolta();
    this.ui.safe(this.parametri.get('safeTop'), this.parametri.get('safeBottom'));
    if (this.debugCorr) this.coda.push('corr.1', 'corr.2', 'corr.3', 'corr.nuda', 'corr.calma');
    this.scena._onRitratto = (url) => this.ui.ritratto?.(url);
    this.scena.prontaGlb.then(() => {
      this.torciaPronta = true;
      this.ui.alzaPronta();
      this.ui.ritratto?.(this.scena.ritratto);
      this.applicaProgresso();
      if (this.passo.tipo !== 'saracinesca') this.preparaPasso(this.progressoGesto > 0.02 || this.parziali.length > 0);
      this.pubblica();
    });
    if (this.passo.tipo === 'saracinesca') this.fermo = true;
    this.pubblica();
  }

  ascolta() {
    const giu = (e) => this.puntatoreGiu(e);
    const muovi = (e) => this.puntatoreMuovi(e);
    const su = (e) => this.puntatoreSu(e);
    document.addEventListener('pointerdown', giu);
    document.addEventListener('pointermove', muovi);
    document.addEventListener('pointerup', su);
    document.addEventListener('pointercancel', su);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.memorizza();
    });
    window.addEventListener('resize', () => this.scena.ridimensiona());
  }

  ignoraPunto(e) {
    const n = e.target;
    if (!(n instanceof Element)) return false;
    return Boolean(n.closest('button, a, input, #impostazioni, #taccuino, #azioni'));
  }

  puntatoreGiu(e) {
    if (this.pausa || this.ignoraPunto(e)) return;
    if (e.isPrimary === false) return;
    try {
      const x = e.clientX;
      const y = e.clientY;
      if (this.bolla && this.ui.sopraBolla(x, y) && !(this.passo.tipo === 'gesto' && this.sulBersaglio(x, y))) {
        this.toccaBolla();
        return;
      }
      this.premuto = true;
      this.down = { x, y, t: Number.isFinite(e.timeStamp) ? e.timeStamp : ora() };
      this.ultimo = { x, y };
      this.gestoAmmesso = false;
      this.erroreSensoGesto = 0;
      this.sensoSegnato = false;
      this.dettoSenso = false;
      if (this.passo.tipo === 'saracinesca' && this.apertura < 1) {
        this.shDown = { x, y, t: Number.isFinite(e.timeStamp) ? e.timeStamp : ora() };
        return;
      }
      if (!this.fermo || this.celebrando > 0) {
        this.attesa = { x, y, t: ora() };
        this.codaPunti = [];
        return;
      }
      this.inizia(x, y);
    } catch (errore) {
      console.error(errore);
    } finally {
      try { this.audio.sblocca(); } catch (errore) { console.error(errore); }
    }
  }

  puntatoreMuovi(e) {
    if (!this.premuto || this.pausa) return;
    try {
      const x = e.clientX;
      const y = e.clientY;
      if (this.shDown && this.apertura < 1 && !this.shutterAuto) {
        const h = window.innerHeight || 1;
        const salita = (this.shDown.y - y) / (h * 0.55);
        this.apertura = Math.max(0, Math.min(1, salita));
        if (this.apertura >= 0.4) this.chiudiSaracinesca();
        return;
      }
      if (this.attesa) {
        this.codaPunti.push({ x, y });
        return;
      }
      if (this.ignora || !this.fermo) return;
      this.muovi(x, y);
      this.ultimo = { x, y };
    } catch (errore) {
      console.error(errore);
    }
  }

  puntatoreSu(e) {
    if (!this.premuto) return;
    this.premuto = false;
    try {
      const x = e.clientX;
      const y = e.clientY;
      const segno = Number.isFinite(e.timeStamp) ? e.timeStamp : ora();
      if (this.shDown && !this.shutterAuto && this.passo.tipo === 'saracinesca') {
        const dt = segno - this.shDown.t;
        const dist = Math.hypot(x - this.shDown.x, y - this.shDown.y);
        // Un dito fermo apre anche se il fotogramma arriva in ritardo: non è un bottone.
        if (eTap(dt, dist) || dist <= gesti.tap.px || this.apertura >= 0.4) this.chiudiSaracinesca();
        this.shDown = null;
      }
      if (this.attesa) {
        this.codaPunti.push({ x, y });
        this.rilascioInAttesa = { x, y, t: segno };
        return;
      }
      if (this.ignora) {
        this.ignora = false;
        this.memorizza();
        return;
      }
      this.rilascia(x, y, segno);
      this.memorizza();
    } catch (errore) {
      console.error(errore);
    }
  }

  scaricaCoda() {
    if (!this.attesa) return;
    const su = this.rilascioInAttesa;
    this.inizia(this.attesa.x, this.attesa.y);
    for (const p of this.codaPunti) this.muovi(p.x, p.y);
    this.attesa = null;
    this.codaPunti = [];
    this.rilascioInAttesa = null;
    if (su) {
      this.rilascia(su.x, su.y, su.t);
      this.memorizza();
    }
  }

  chiudiSaracinesca() {
    if (this.shutterAuto) return;
    this.shutterAuto = true;
    try {
      this.audio.sblocca();
      this.audio.sferraglia();
      window.setTimeout(() => {
        try { this.audio.campanello(); } catch (errore) { console.error(errore); }
      }, 160);
    } catch (errore) {
      console.error(errore);
    }
  }

  completaShutter() {
    if (this.passo.tipo !== 'saracinesca') return;
    this.audio.ambienteInterno();
    this.apertura = 1;
    this.indice = 1;
    this.progressoGesto = 0;
    this.parziali = [];
    this.memorizza();
    if (this.torciaPronta) this.preparaPasso(false);
  }

  preparaPasso(ripresa) {
    this.passo = passi[this.indice];
    this.vista = ricostruisci(this.indice);
    this.applicaProgresso();
    this.fermo = false;
    this.esitazione = 0;
    this.aiuto = 0;
    this.aiutoTempi = {};
    this.errori = 0;
    this.calma = false;
    this.nudi = 0;
    this.mancati = 0;
    this.tapContatto = 0;
    this.dettoSenso = false;
    this.intro = false;
    this.scatto = null;
    this.quarti = 0;
    this.ganci = new Set();
    this.lenteT = {};
    this.finePausa = 0;
    this.fine2 = false;
    this.gesto = this.passo.gesto === 'cerchio'
      ? { ...statoCerchio(), progresso: this.progressoGesto * rad(this.passo.gradi || 0) }
      : this.passo.gesto === 'strofina'
        ? statoStrofina(this.progressoGesto)
        : { progresso: this.progressoGesto };
    this.strumento = null;
    this.ui.strumento(null);
    if (ripresa && this.strumentoSalvato && this.vista.strumenti.includes(this.strumentoSalvato)) {
      this.strumento = this.strumentoSalvato;
      this.ui.strumento(this.strumento);
    }
    this.strumentoSalvato = null;
    this.gestoAmmesso = false;
    this.erroreSensoGesto = 0;
    this.passoCompletato = false;
    this.bloccoT = 0;
    this.ettoreAbbassato = false;
    this.eventiFatti = new Set();
    if (this.passo.tipo === 'saracinesca') {
      this.fermo = true;
      return;
    }
    const stessa = this.scena.shot === this.passo.inquadratura;
    const durata = this.passo.tipo === 'blocco'
      ? this.passo.durata
      : (stessa ? 0.01 : (this.passo.transizione || 0.55));
    this.scena.inquadra(this.passo.inquadratura || 'BANCO', this.vista, durata);
    if (ripresa && !this.ripresaDetta) {
      this.ripresaDetta = true;
      this.intro = true;
      this.accoda(['dlg.ripresa']);
    }
    if (this.passo.tipo === 'fine') {
      this.apertura = 1;
      this.faseFine = 'taccuino';
      this.ui.fine('taccuino');
    }
    if (this.passo.gesto === 'cerchio') this.scena.aggiornaAnello(this.progressoGesto, this.progressoGesto > 0.02);
  }

  applicaProgresso() {
    const p = this.passo;
    const g = this.progressoGesto;
    if (!p || g <= 0) return;
    if (p.gesto === 'cerchio' && p.soggetto === 'torcia' && p.senso === 'antiorario') {
      this.vista.torcia.tappo = g;
      this.vista.torcia.giri = g * ((p.gradi || 540) / 360);
    }
    if (p.gesto === 'cerchio' && p.senso === 'orario') {
      this.vista.torcia.tappo = 0.15 * (1 - g);
      this.vista.torcia.giri = 0.225 * (1 - g);
    }
    if (p.gesto === 'strofina') this.vista.torcia.pulizia = g;
    if (p.gesto === 'gira') {
      const meta = p.metaYaw || 0;
      if (p.quale === 'telecomando') this.vista.telecomando.yaw = meta * Math.min(1, g);
      else this.vista.torcia.yaw = meta * Math.min(1, g);
    }
    if (p.gesto === 'scorri') this.vista.telecomando.fessura = g;
    if (p.nastro) this.vista.telecomando.nastro = g;
  }

  aggiorna(dt) {
    this.pausa = this.ePausa();
    this.ui.paesaggio(this.pausa);
    if (this.pausa) {
      this.pubblica();
      return false;
    }
    const vivo = this.dtLente || dt;
    const adesso = performance.now();
    const muro = this._muro == null ? 0 : Math.min(2, (adesso - this._muro) / 1000);
    this._muro = adesso;
    const parete = Math.max(this.dtParete || 0, muro, vivo);
    if (this.passo.tipo === 'saracinesca') {
      this.shutterT += parete;
      const alza = this.ui.maniglia.dataset.stato === 'pronta';
      this.ui.gesso(this.shutterT > 2.5 && !this.shutterAuto && alza);
      if (this.shutterAuto && this.apertura < 1) {
        this.apertura = Math.min(1, this.apertura + parete * 1.35);
      }
      // Può arrivare in cima prima dei modelli: l'ingresso si completa al frame dopo.
      if (this.shutterAuto && this.apertura >= 1 && this.torciaPronta) this.completaShutter();
    } else if (this.passo.tipo === 'fine' && this.faseFine === 'serranda' && this.apertura > 0.5) {
      this.apertura = Math.max(0.5, this.apertura - parete * 0.45);
    }
    this.ui.saracinesca(this.apertura, this.torciaPronta);

    if (this.torciaPronta && this.passo.tipo === 'blocco') {
      if (!this.ettoreAbbassato && this.bloccoT >= 0.35 && (this.passo.eventi || []).some((ev) => ev.spinta)) {
        this.ettoreAbbassato = true;
        this.scena.ettoreAbbassa();
      }
      this.bloccoT += parete;
      for (const ev of this.passo.eventi || []) {
        if (this.bloccoT >= ev.a && !this.eventiFatti.has(ev.a)) {
          this.eventiFatti.add(ev.a);
          if (ev.riga) this.accoda([ev.riga]);
          if (ev.spinta) {
            this.vista.torcia.posa = 'spinta';
            this.scena.ettoreSpinge();
          }
        }
      }
      if (this.bloccoT >= this.passo.durata) this.successo();
    }

    if (this.torciaPronta && this.passo.tipo === 'gesto') {
      const fermoOra = this.scena.cameraFerma() && this.scena.oggettiFermi() && this.celebrando <= 0;
      if (fermoOra && !this.fermo) {
        this.fermo = true;
        if (!this.intro) {
          this.intro = true;
          if (this.passo.righe?.length) this.accoda(this.passo.righe);
        }
        const mosso = this.attesa && this.codaPunti.some((p) => Math.hypot(p.x - this.attesa.x, p.y - this.attesa.y) > 18);
        if (this.passo.righe?.length && !mosso) {
          this.attesa = null;
          this.codaPunti = [];
          this.rilascioInAttesa = null;
        } else this.scaricaCoda();
      } else this.fermo = fermoOra;
      if (this.fermo) this.esitazione += dt;
      this.lenteAggiorna(dt);
      this.scattoYaw(dt);
    }

    if (this.torciaPronta && this.passo.tipo === 'fine') {
      this.fermo = this.scena.cameraFerma() && this.scena.oggettiFermi();
      if (this.fermo && !this.intro) {
        this.intro = true;
        this.faseFine = 'taccuino';
        if (this.passo.righe?.length) this.accoda(this.passo.righe);
        this.ui.fine('taccuino');
        this.ui.apriPina();
      }
      if (this.intro && !this.bolla && this.coda.length === 0 && !this.fine2) {
        this.finePausa += parete;
        if (this.finePausa > 0.8 && this.passo.dopoPausa) {
          this.fine2 = true;
          this.accoda([this.passo.dopoPausa]);
        }
      }
    }

    const tieneLuce = this.passoCompletato && this.passo.grande === 'torcia' && (this.bolla || this.coda.length > 0);
    if (this.celebrando > 0) {
      this.celebrando -= parete;
      if (this.celebrando <= 0 && !tieneLuce) this.avanza();
    } else if (this.passoCompletato && this.passo.grande === 'torcia' && !tieneLuce) {
      this.avanza();
    }

    const mostraVite = this.passo.gesto === 'cerchio' && this.passo.soggetto === 'torcia' && this.strumento === 'cacciavite';
    this.scena.aggiornaAnello(Math.max(this.progressoGesto, mostraVite ? 0.18 : 0), mostraVite);
    this.scena.mostraFrecciaFilo(Boolean(this.passo.nastro));
    if (this.premuto && (this.passo.gesto === 'gira' || this.passo.gesto === 'cerchio' || this.passo.gesto === 'strofina')) {
      this.immediato.add('torcia.yaw');
      this.immediato.add('torcia.tappo');
      this.immediato.add('torcia.giri');
      this.immediato.add('telecomando.yaw');
    }
    this.mollaTilt(dt);
    this.aiuti();
    const paga = this.passoCompletato && this.passo.grande === 'torcia';
    this.bolle(this.celebrando > 0 || paga ? parete : dt);
    const dirty = this.scena.aggiorna(Math.min(parete, 0.45), this.vista, this.immediato);
    this.immediato = new Set();
    if (this.strumento === 'lente' && this.premuto && this.ultimo) {
      const mondo = this.scena.mondoDaSchermo(this.ultimo.x, this.ultimo.y + gesti.lente.offsetY, 0.12);
      this.scena.renderLente(this.ui.telaLente(), mondo);
    }
    this.ui.segui(this);
    this.pubblica();
    this.ultimoSalva += dt;
    if (this.ultimoSalva > 0.5) {
      this.ultimoSalva = 0;
      this.memorizza();
    }
    return dirty;
  }

  ePausa() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w > h && Math.min(w, h) <= 520;
  }

  inizia(x, y) {
    if (this.passo.tipo !== 'gesto' || this.celebrando > 0) return;
    this.gestoAmmesso = false;
    this.azioneLeggera();
    if (!this.strumentoGiusto(x, y)) return;
    this.gestoAmmesso = true;
    const g = this.passo.gesto;
    if (g === 'gira' || g === 'cerchio' || g === 'strofina' || g === 'scorri') this.ultimo = { x, y };
    if (g === 'estrai' || g === 'inserisci' || g === 'pinza' || g === 'chiudi') this.prendi(x, y);
  }

  muovi(x, y) {
    const p = this.passo;
    if (p.tipo !== 'gesto' || !this.gestoAmmesso) return;
    if (p.gesto === 'gira') this.muoviGira(x, y);
    else if (p.gesto === 'cerchio') this.muoviCerchio(x, y);
    else if (p.gesto === 'strofina') this.muoviStrofina(x, y);
    else if (p.gesto === 'scorri') this.muoviScorri(x, y);
    else if (this.preso) this.scena.trascina(this.preso, x, y, gesti.trascinare.sopra);
    this.ultimo = { x, y };
    this.memorizzaPresto();
  }

  rilascia(x, y, segno) {
    const p = this.passo;
    if (p.tipo !== 'gesto' || this.celebrando > 0) {
      this.preso = null;
      return;
    }
    if (p.gesto === 'tap') this.rilasciaTap(x, y, segno);
    if (p.gesto === 'gira') this.vista[p.quale === 'telecomando' ? 'telecomando' : 'torcia'].tilt = 0;
    if (p.gesto === 'estrai') this.rilasciaEstrai(x, y);
    if (p.gesto === 'inserisci') this.rilasciaInserisci(x, y);
    if (p.gesto === 'pinza') this.rilasciaPinza(x, y);
    if (p.gesto === 'chiudi') this.rilasciaChiudi(x, y);
    const durata = (segno || ora()) - (this.down ? this.down.t : segno || ora());
    if (p.gesto === 'strofina' && this.down && eTap(durata, Math.hypot(x - this.down.x, y - this.down.y))) {
      this.tapContatto += 1;
      this.audio.toc();
      if (p.erroreTap && this.tapContatto >= p.erroreTap.dalla) this.errore(p.erroreTap.testo);
    }
    this.preso = null;
  }

  strumentoGiusto(x, y) {
    const p = this.passo;
    if (!p.strumento) return true;
    if (this.strumento === p.strumento) return true;
    const sopra = this.sulBersaglio(x, y);
    if (this.strumento === 'lente' && !sopra) return false;
    if (!sopra) {
      if (!this.strumento && p.zonaMorbida && this.vicino(p.zonaMorbida, x, y, 90)) {
        this.audio.toc();
        this.scena.emetti('bottone', '#f0b86e', 3);
        this.aiuto = Math.max(this.aiuto, 1);
      }
      return false;
    }
    if (!this.strumento) {
      this.nudi += 1;
      if (p.senza && this.nudi >= p.senza.dalla) this.errore(p.senza.testo);
      else this.errore('corr.nuda');
    } else this.errore('corr');
    return false;
  }

  rilasciaTap(x, y, segno) {
    if (!this.down) return;
    const durata = (segno || ora()) - this.down.t;
    const dist = Math.hypot(x - this.down.x, y - this.down.y);
    // Il dito è rimasto sul punto: è un tap anche se il fotogramma ha tardato.
    if (!eTap(durata, dist) && dist > gesti.tap.px) return;
    if (this.passo.strumento && this.strumento !== this.passo.strumento) return;
    const area = this.passo.area || gesti.tap.area;
    if (this.vicino(this.passo.bersaglio, x, y, area / 2)) {
      this.audio.click();
      this.vista.torcia.bottone = this.passo.soggetto === 'torcia' ? 1 : this.vista.torcia.bottone;
      if (this.passo.soggetto === 'telecomando') this.vista.telecomando.premuto = 1;
      this.successo();
      return;
    }
    if (this.passo.zonaMorbida && this.vicino(this.passo.zonaMorbida, x, y, 88)) {
      this.audio.toc();
      this.aiuto = Math.max(this.aiuto, 1);
    }
  }

  muoviGira(x, y) {
    const centro = this.scena.proietta(this.passo.bersaglio);
    if (!centro || !this.ultimo) return;
    const dist = Math.hypot(x - centro.x, y - centro.y);
    if (dist > 210) return;
    const dx = x - this.ultimo.x;
    const dy = y - this.ultimo.y;
    const quale = this.passo.quale === 'telecomando' ? 'telecomando' : 'torcia';
    const nodo = this.vista[quale];
    nodo.yaw += rad(gesti.girare.gradiPerPx) * dx;
    const tilt = (nodo.tilt || 0) + rad(0.12) * dy;
    const max = rad(gesti.girare.tiltMax);
    nodo.tilt = Math.max(-max, Math.min(max, tilt));
    const meta = this.passo.metaYaw;
    const manca = Math.abs(Math.atan2(Math.sin(meta - nodo.yaw), Math.cos(meta - nodo.yaw)));
    this.progressoGesto = Math.max(this.progressoGesto, 1 - manca / Math.PI);
    if (vicinoAngolo(nodo.yaw, meta, gesti.girare.scatto) && !this.scatto) {
      this.scatto = { quale, da: nodo.yaw, meta, t: 0 };
      this.audio.toc();
      vibra(8);
    }
    if (Math.abs(dx) + Math.abs(dy) > 1) this.audio.fruscio();
  }

  scattoYaw(dt) {
    if (!this.scatto) return;
    this.scatto.t += dt / gesti.girare.molla;
    const k = Math.min(1, this.scatto.t);
    const eased = 1 - (1 - k) ** 3;
    const nodo = this.vista[this.scatto.quale];
    nodo.yaw = this.scatto.da + (this.scatto.meta - this.scatto.da) * eased;
    this.immediato.add(`${this.scatto.quale}.yaw`);
    this.progressoGesto = 1;
    if (k >= 1) {
      nodo.yaw = this.scatto.meta;
      this.scatto = null;
      this.successo();
    }
  }

  mollaTilt(dt) {
    if (this.premuto || !this.vista) return;
    this.vista.torcia.tilt *= Math.exp(-8 * dt);
    this.vista.telecomando.tilt = (this.vista.telecomando.tilt || 0) * Math.exp(-8 * dt);
  }

  muoviCerchio(x, y) {
    const centro = this.scena.proietta(this.passo.bersaglio);
    if (!centro) return;
    const d = Math.hypot(x - centro.x, y - centro.y);
    const cfg = {
      rMin: d <= gesti.cerchio.aggancio ? 0 : gesti.cerchio.rMin,
      rMax: gesti.cerchio.rMax,
      scarto: rad(gesti.cerchio.scarto),
      senso: this.passo.senso,
      richiesti: rad(this.passo.gradi),
    };
    const res = passoCerchio(this.gesto, { x, y }, centro, cfg);
    this.gesto = res;
    if (res.pausa) return;
    const frazione = cfg.richiesti ? res.progresso / cfg.richiesti : 0;
    this.progressoGesto = frazione;
    if (this.passo.soggetto === 'torcia' && this.passo.senso === 'antiorario') {
      this.vista.torcia.tappo = frazione;
      this.vista.torcia.giri = frazione * (this.passo.gradi / 360);
      this.scena.aggiornaAnello(Math.max(frazione, 0.02), true);
    } else if (this.passo.senso === 'orario') {
      this.vista.torcia.tappo = 0.15 * (1 - frazione);
      this.vista.torcia.giri = 0.225 * (1 - frazione);
      this.scena.aggiornaAnello(Math.max(frazione, 0.02), true);
    }
    if (this.passo.nastro) {
      this.vista.telecomando.nastro = frazione;
      if (res.aggiunto > 0.02) this.audio.sssk();
    }
    const quarti = Math.floor(res.progresso / (Math.PI / 2));
    if (quarti > this.quarti) {
      this.quarti = quarti;
      this.audio.tic(quarti);
      vibra(6);
      this.scena.emetti(this.passo.bersaglio, '#f0b86e', 2);
    }
    if (res.errore > 0) this.erroreSensoGesto += res.errore;
    else if (res.aggiunto > 0) this.erroreSensoGesto = 0;
    if (this.erroreSensoGesto >= rad(45) && !this.sensoSegnato) {
      this.sensoSegnato = true;
      this.audio.cric();
      this.scena.schiaccia();
      this.scena.allarmeAnello = 0.45;
      this.scena.emetti(this.passo.bersaglio, '#c4623a', 6);
    }
    const soglia = rad(this.passo.erroreSenso?.gradi || 90);
    if (this.erroreSensoGesto >= soglia && !this.dettoSenso) {
      this.dettoSenso = true;
      this.errore(this.passo.erroreSenso?.testo || 'corr.verso');
    }
    if (res.fatto) this.successo();
  }

  muoviStrofina(x, y) {
    const centro = this.scena.proietta(this.passo.bersaglio);
    if (!centro) return;
    const res = passoStrofina(this.gesto, { x, y }, centro, {
      raggio: gesti.strofinare.raggio,
      strada: gesti.strofinare.strada,
      bonus: gesti.strofinare.bonus,
    });
    this.gesto = res;
    if (res.pausa) return;
    this.progressoGesto = res.progresso;
    this.vista.torcia.pulizia = res.progresso;
    if (res.aggiunto > 0) this.audio.shsh(res.aggiunto * 8);
    if (res.inversione) {
      vibra(5);
      this.scena.emetti('contatto', '#c6d48a', 4);
    }
    if (res.fatto) this.successo();
  }

  muoviScorri(x, y) {
    const [na, nb] = this.passo.scorri;
    const a = this.scena.proietta(na);
    const b = this.scena.proietta(nb);
    if (!a || !b) return;
    const prima = this.progressoGesto;
    const res = passoScorri({ progresso: this.progressoGesto }, { x, y }, a, b, gesti.scorri.corridoio);
    if (res.pausa) return;
    this.progressoGesto = res.progresso;
    this.vista.telecomando.fessura = res.progresso;
    for (const gancio of gesti.scorri.ganci) {
      if (prima < gancio && res.progresso >= gancio && !this.ganci.has(gancio)) {
        this.ganci.add(gancio);
        this.audio.tic(gancio * 4);
      }
    }
    if (res.fatto) {
      this.audio.clac();
      this.successo();
    }
  }

  pezzoAttuale(elenco) {
    return (elenco || []).find((id) => !this.parziali.includes(id)) || null;
  }

  prendi(x, y) {
    const p = this.passo;
    if (p.gesto === 'estrai' || p.gesto === 'inserisci') {
      const nome = this.pezzoAttuale(p.parti);
      if (nome && this.vicino(nome, x, y, gesti.trascinare.presa)) {
        this.preso = nome;
        this.presoDa = { x, y };
        this.audio.toc();
      }
      return;
    }
    if (p.gesto === 'pinza' && this.vicino(p.bersaglio, x, y, gesti.pinzette.presa)) {
      this.preso = 'molla';
      this.presoDa = { x, y };
      this.audio.toc();
    }
    if (p.gesto === 'chiudi' && this.vicino('guscio', x, y, 80)) {
      this.preso = 'guscio';
      this.presoDa = { x, y };
      this.audio.toc();
    }
  }

  rilasciaEstrai(x, y) {
    if (!this.preso) return;
    const mosso = Math.hypot(x - this.presoDa.x, y - this.presoDa.y);
    this.scena.rilasciaTrascinato(this.preso);
    if (mosso > 70) {
      this.parziali.push(this.preso);
      this.vista.torcia.pileVecchie = this.parziali.length;
      this.audio.tump();
      vibra(12);
      this.progressoGesto = this.parziali.length / this.passo.parti.length;
      if (this.parziali.length >= this.passo.parti.length) this.successo();
    }
    this.preso = null;
  }

  rilasciaInserisci(x, y) {
    if (!this.preso) return;
    const sede = this.parziali.length === 0 ? 'sede_a' : 'sede_b';
    this.scena.rilasciaTrascinato(this.preso);
    if (this.vicino(sede, x, y, gesti.trascinare.scatto)) {
      this.parziali.push(this.preso);
      this.vista.torcia.pileNuove = this.parziali.length;
      this.audio.tump();
      this.scena.schiaccia();
      vibra(12);
      this.progressoGesto = this.parziali.length / this.passo.parti.length;
      if (this.parziali.length >= this.passo.parti.length) this.successo();
    } else if (this.vicino('contatto', x, y, 80) || this.vicino('centro_torcia', x, y, 80)) {
      this.audio.toc();
    } else {
      this.mancati += 1;
      this.audio.toc();
      if (this.passo.erroreLascia && this.mancati >= this.passo.erroreLascia.dalla) {
        this.errore(this.passo.erroreLascia.testo);
      }
    }
    this.preso = null;
  }

  rilasciaPinza(x, y) {
    if (!this.preso) return;
    this.scena.rilasciaTrascinato('molla');
    if (this.vicino(this.passo.slot, x, y, gesti.pinzette.lascia)) {
      this.vista.telecomando.molla = 1;
      this.audio.ping();
      vibra(12);
      this.successo();
    }
    this.preso = null;
  }

  rilasciaChiudi(x, y) {
    if (!this.preso) return;
    this.scena.rilasciaTrascinato('guscio');
    if (this.vicino(this.passo.slot, x, y, 70)) {
      this.vista.telecomando.guscio = 0;
      this.audio.clac();
      this.successo();
    }
    this.preso = null;
  }

  lenteAggiorna(dt) {
    const p = this.passo;
    if (p.gesto !== 'lente' || this.strumento !== 'lente' || !this.premuto || !this.ultimo) return;
    const lx = this.ultimo.x;
    const ly = this.ultimo.y + gesti.lente.offsetY;
    const bersagli = p.bersagli || [p.bersaglio];
    for (const nome of bersagli) {
      if (this.parziali.includes(nome)) continue;
      const zone = nome === 'macchia' ? ['macchia', 'tappo'] : [nome];
      const raggio = nome === 'macchia' ? 100 : gesti.lente.raggio;
      const sopra = zone.some((zona) => this.vicino(zona, lx, ly, raggio));
      if (sopra) this.lenteT[nome] = (this.lenteT[nome] || 0) + (this.dtLente || dt);
      else this.lenteT[nome] = 0;
      if ((this.lenteT[nome] || 0) >= gesti.lente.conferma) {
        this.parziali.push(nome);
        const id = p.indizi?.[nome];
        if (id) {
          this.vista.indizi = [...new Set([...this.vista.indizi, id])];
          if (nome === 'macchia') this.vista.torcia.macchia = 1;
          if (nome === 'rame') this.vista.telecomando.filoVisto = 1;
          if (nome === 'molla') this.vista.telecomando.mollaVista = 1;
          this.audio.campanellino();
          vibra(15);
          this.ui.volaIndizio(t(id));
        }
        this.progressoGesto = this.parziali.length / bersagli.length;
      }
    }
    if (bersagli.every((nome) => this.parziali.includes(nome))) this.successo();
  }

  vicino(nome, x, y, raggio) {
    const p = this.scena.proietta(nome);
    if (!p) return false;
    return Math.hypot(p.x - x, p.y - y) <= raggio;
  }

  sulBersaglio(x, y) {
    const nomi = this.passo.bersagli || [this.passo.bersaglio];
    return nomi.some((nome) => nome && this.vicino(nome, x, y, 80));
  }

  successo() {
    if (this.celebrando > 0 || this.passoCompletato || this.passo.tipo === 'fine') return;
    this.passoCompletato = true;
    if (this.premuto) this.ignora = true;
    const p = this.passo;
    try {
    this.strumento = null;
    this.ui.strumento(null);
    this.scena.aggiornaAnello(0, false);
    applica(this.vista, p.fatto);
    if (p.piccolo) {
      this.audio.ding();
      this.scena.emetti(p.bersaglio, '#f0b86e', 8);
      vibra(15);
    }
    if (p.grande === 'torcia') {
      this.vista.torcia.accesa = true;
      this.vista.flash = 1;
      this.vista.ettore.strizza = 1;
      this.vista.ettore.mano = 1;
      this.audio.click();
      this.audio.arpeggio();
      this.scena.emetti('vetro', '#ffe7b0', 18);
      this.scena.pulsaLampadina();
      vibra([20, 40, 30]);
      this.ui.timbroLuce();
      this.audio.strato(2);
    }
    if (p.grande === 'tv') {
      this.vista.tv = 2;
      this.audio.arpeggio();
      this.audio.cori();
      vibra([20, 40, 30]);
    }
    if (p.musica) this.audio.strato(p.musica);
    if (p.id === 'b7-svita') this.audio.clac();
    if (p.dopo?.length) {
      this.coda = [];
      this.consecutive = 0;
      if (p.grande === 'torcia' && this.bolla) this.chiudiBolla();
      this.accoda(p.dopo);
    }
    this.progressoGesto = 0;
    this.parziali = [];
    this.memorizza();
    } catch (errore) {
      console.error(errore);
    }
    this.celebrando = p.grande === 'torcia' ? 3 : p.grande ? 1.15 : p.tipo === 'blocco' ? 0.02 : 0.28;
  }

  avanza() {
    this.celebrando = 0;
    this.passoCompletato = false;
    this.indice = Math.min(passi.length - 1, this.indice + 1);
    this.progressoGesto = 0;
    this.parziali = [];
    this.memorizza();
    this.preparaPasso(false);
  }

  aiuti() {
    const a = this.passo.aiuti;
    if (!a || !this.fermo || this.celebrando > 0 || this.passo.tipo !== 'gesto') return;
    if (!this.aiutoTempi.a1 && a.a1 && this.esitazione >= a.a1) {
      this.aiuto = Math.max(this.aiuto, 1);
      this.aiutoTempi.a1 = this.esitazione;
    }
    if (!this.aiutoTempi.a2 && a.a2 && this.esitazione >= a.a2) {
      this.aiuto = Math.max(this.aiuto, 2);
      this.aiutoTempi.a2 = this.esitazione;
    }
    if (!this.aiutoTempi.a3 && a.a3 && a.testo && this.esitazione >= a.a3) {
      this.aiuto = Math.max(this.aiuto, 3);
      this.aiutoTempi.a3 = this.esitazione;
      this.accoda([a.testo]);
    }
  }

  errore(tipo) {
    this.errori += 1;
    this.aiuto = Math.max(this.aiuto, 1);
    if (!this.aiutoTempi.a1) this.aiutoTempi.a1 = Math.max(0, this.esitazione);
    this.audio.tonk();
    this.scena.schiaccia();
    this.consecutive = 0;
    let id = tipo;
    if (tipo === 'corr') {
      id = corrRotazione[this.corrI % corrRotazione.length];
      this.corrI += 1;
      this.app.dataset.corr = id;
    } else if (tipo === 'corr.nuda') id = 'corr.nuda';
    this.coda = [];
    if (this.bolla) {
      this.bolla = null;
      this.app.dataset.bolla = '';
    }
    this.subito = true;
    this.accoda([id]);
    this.ui.segui(this);
    if (this.errori >= 3 && !this.calma) {
      this.calma = true;
      this.aiuto = Math.max(this.aiuto, 2);
      if (!this.aiutoTempi.a2) this.aiutoTempi.a2 = this.esitazione;
      this.accoda(['corr.calma']);
    }
  }

  azioneLeggera() {
    this.consecutive = 0;
    this.esitazione = 0;
    this.aiuto = 0;
    this.aiutoTempi = {};
  }

  accoda(ids) {
    for (const id of ids) if (id) this.coda.push(id);
    this.mostraBolla();
  }

  mostraBolla() {
    if (this.bolla || this.coda.length === 0 || this.consecutive >= 2) return;
    const id = this.coda.shift();
    const testo = t(id);
    const durata = this.debugCorr ? 0.35 : Math.max(1.8, 1.2 + testo.length * 0.06);
    const pieno = this.subito || this.debugCorr;
    this.subito = false;
    this.bolla = { id, testo, durata, eta: durata, caratteri: pieno ? testo.length : 0 };
    this.consecutive += 1;
    if (this.debugCorr) this.corrViste = [...(this.corrViste || []), testo];
    if (!this.debugCorr) this.audio.parla(testo);
    this.app.dataset.bolla = testo;
  }

  bolle(dt) {
    if (!this.bolla) {
      if (this.consecutive >= 2 && this.coda.length > 0) this.consecutive = 0;
      this.mostraBolla();
      if (this.debugCorr && !this.bolla && this.coda.length === 0) this.corrOk = true;
      return;
    }
    const passo = this.bolla.testo.length / Math.max(0.4, this.bolla.durata * 0.55);
    const ditoFermo = this.premuto && !this.passoCompletato;
    if (!this.bolla.ferma) {
      this.bolla.caratteri = Math.min(this.bolla.testo.length, this.bolla.caratteri + passo * dt);
    }
    if (!ditoFermo) this.bolla.eta -= dt;
    if (this.bolla.eta <= 0) this.chiudiBolla();
  }

  toccaBolla() {
    if (!this.bolla) return;
    if (this.bolla.caratteri < this.bolla.testo.length) {
      this.bolla.caratteri = this.bolla.testo.length;
      this.bolla.ferma = true;
      return;
    }
    this.chiudiBolla();
  }

  chiudiBolla() {
    this.bolla = null;
    this.app.dataset.bolla = '';
    this.consecutive = 0;
    this.mostraBolla();
  }

  seleziona(id) {
    if (this.pausa) return;
    this.audio.sblocca();
    this.audio.tick();
    vibra(8);
    this.strumento = this.strumento === id ? null : id;
    this.ui.strumento(this.strumento);
    this.azioneLeggera();
    this.consecutive = 0;
    if (this.bolla) this.chiudiBolla();
  }

  salta() {
    this.indice = passi.findIndex((p) => p.id === 'chiusura');
    this.saltato = true;
    this.progressoGesto = 0;
    this.parziali = [];
    this.coda = [];
    this.bolla = null;
    this.apertura = 1;
    this.faseFine = 'taccuino';
    this.memorizza();
    this.preparaPasso(false);
    this.ui.chiudiImpostazioni();
  }

  /** Il taccuino si chiude e la saracinesca scende: un solo bottone primario. */
  chiudiFinale() {
    if (this.faseFine === 'serranda') return;
    this.faseFine = 'serranda';
    this.bolla = null;
    this.coda = [];
    this.app.dataset.bolla = '';
    this.ui.taccuino.hidden = true;
    this.ui.fine('serranda');
  }

  ricomincia() {
    this.salvataggioSpento = true;
    cancella();
    location.replace(location.pathname);
  }

  alternaAudio() {
    const acceso = this.audio.alterna();
    this.ui.audio(acceso);
    return acceso;
  }

  impostaRiduci(attivo) {
    this.riduci = attivo;
    this.scena.riduci = attivo;
  }

  memorizzaPresto() {
    if (this.ultimoSalva > 0.5) {
      this.ultimoSalva = 0;
      this.memorizza();
    }
  }

  memorizza() {
    if (this.salvataggioSpento) return;
    salva({
      indice: this.indice,
      progressoGesto: this.progressoGesto,
      parziali: this.parziali,
      saltato: this.saltato,
      strumento: this.strumento,
    });
  }

  pubblica() {
    const app = this.app;
    const p = this.passo;
    app.dataset.pronto = this.torciaPronta || p.tipo === 'saracinesca' ? '1' : '0';
    app.dataset.passo = p.id;
    app.dataset.fermo = this.fermo ? '1' : '0';
    app.dataset.gesto = p.gesto || '';
    app.dataset.bersaglio = p.bersaglio || '';
    app.dataset.bersagli = (p.bersagli || [p.bersaglio]).filter(Boolean).join(',');
    app.dataset.progresso = String(Math.round(this.progressoGesto * 1000) / 1000);
    app.dataset.strumento = this.strumento || '';
    app.dataset.stato = this.fermo ? 'attivo' : 'entra';
    app.dataset.bolla = this.bolla?.testo || '';
    app.dataset.fine = this.vista.fine ? '1' : '0';
    app.dataset.fase = this.faseFine || '';
    app.dataset.aiuto = String(this.aiuto);
    app.dataset.esitazione = String(Math.round(this.esitazione * 1000) / 1000);
    app.dataset.ta1 = this.aiutoTempi.a1 != null ? String(this.aiutoTempi.a1) : '';
    app.dataset.ta2 = this.aiutoTempi.a2 != null ? String(this.aiutoTempi.a2) : '';
    app.dataset.ta3 = this.aiutoTempi.a3 != null ? String(this.aiutoTempi.a3) : '';
    app.dataset.inquadratura = this.scena.shot || p.inquadratura || '';
    app.dataset.dpr = String(this.scena.dpr);
    app.dataset.fps = String(Math.round(this.scena.fps || 0));
    app.dataset.tris = String(this.scena.tris || 0);
    app.dataset.draw = String(this.scena.draw || 0);
    app.dataset.glb = this.scena.glb ? 'torcia' : '';
    app.dataset.nodi = (this.scena.nodiTorcia || []).join(',');
    app.dataset.parziali = this.parziali.join(',');
    app.dataset.corrOk = this.corrOk ? '1' : '0';
    app.dataset.corrViste = (this.corrViste || []).join('|');
    app.dataset.cartello = this.vista.cartello || 'bottega';
    const tappo = this.scena.nodo('tappo');
    app.dataset.tappoY = tappo ? String(Math.round(tappo.position.y * 1000) / 1000) : '';
    const punti = {};
    for (const nome of NOMI) {
      const pos = this.scena.proietta(nome);
      if (pos) punti[nome] = { x: Math.round(pos.x), y: Math.round(pos.y) };
    }
    app.dataset.punti = JSON.stringify(punti);
    const ingombro = this.scena.ingombroEttore();
    if (ingombro) app.dataset.ettore = JSON.stringify(ingombro);
    else delete app.dataset.ettore;
    if (this.torciaPronta) {
      const ui = this.ui.sovrapposizioni();
      if (ui.split(',').includes('bolla')) this._bollaCoperta = 'bolla';
      const scena = this.fermo ? this.scena.ostacoli(p.bersaglio) : '';
      app.dataset.quadro = [scena, ui].filter(Boolean).join(',');
      app.dataset.bollaCoperta = this._bollaCoperta || '';
    }
    if (this.torciaPronta) app.dataset.pronto = '1';
  }
}
