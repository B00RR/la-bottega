import { t } from '../dati/testi.js';

const ICONE = {
  lente: '<circle cx="14" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 18 l5 5" stroke="currentColor" stroke-width="2"/>',
  cacciavite: '<path d="M8 20 L16 8" stroke="currentColor" stroke-width="2"/><path d="M14 6 h6 v4 h-6 z" fill="currentColor"/>',
  pennello: '<path d="M8 22 L16 10" stroke="currentColor" stroke-width="2"/><path d="M14 6 h7 v5 h-7 z" fill="#e8977c"/>',
  leva: '<path d="M6 18 L20 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  pinzette: '<path d="M10 6 L14 16 L18 6" fill="none" stroke="currentColor" stroke-width="2"/>',
  nastro: '<circle cx="14" cy="14" r="6" fill="none" stroke="#f0b86e" stroke-width="3"/><circle cx="14" cy="14" r="2" fill="currentColor"/>',
};

export class Interfaccia {
  constructor(app) {
    this.app = app;
    this.saracinescaEl = app.querySelector('#saracinesca');
    this.bollaEl = app.querySelector('#bolla');
    this.rigaEl = app.querySelector('#bolla .riga');
    this.cassetta = app.querySelector('#cassetta');
    this.attrezzi = app.querySelector('#cassetta .attrezzi');
    this.punto = app.querySelector('#punto-aiuto');
    this.mano = app.querySelector('#mano-aiuto');
    this.lente = app.querySelector('#lente-ui');
    this.taccuino = app.querySelector('#taccuino');
    this.impostazioni = app.querySelector('#impostazioni');
    this.azioni = app.querySelector('#azioni');
    this.paesaggioEl = app.querySelector('#paesaggio');
    this.cartello = app.querySelector('#cartello');
    this.gessoEl = app.querySelector('#gesso');
    this.maniglia = app.querySelector('#maniglia');
    this.lista = app.querySelector('#lista-indizi');
    this.volo = app.querySelector('#indizio-volo');
    this.zone = app.querySelector('#zone-debug');
    this.manoFinita = false;
    this.taccuinoTimer = 0;
    this.ultimoStrumenti = '';
  }

  collega(gioco) {
    this.gioco = gioco;
    appEvita(this.app.querySelector('#ingranaggio'), () => this.apriImpostazioni());
    appEvita(this.app.querySelector('#chiudi-imp'), () => this.chiudiImpostazioni());
    appEvita(this.app.querySelector('#audio-toggle'), () => gioco.alternaAudio());
    appEvita(this.app.querySelector('#movimento'), () => {
      const premuto = this.app.querySelector('#movimento').getAttribute('aria-pressed') !== 'true';
      this.app.querySelector('#movimento').setAttribute('aria-pressed', premuto ? 'true' : 'false');
      this.app.querySelector('#movimento').textContent = t(premuto ? 'ui.movimento.on' : 'ui.movimento');
      gioco.impostaRiduci(premuto);
    });
    appEvita(this.app.querySelector('#testo'), () => {
      const premuto = this.app.querySelector('#testo').getAttribute('aria-pressed') !== 'true';
      this.app.querySelector('#testo').setAttribute('aria-pressed', premuto ? 'true' : 'false');
      document.documentElement.classList.toggle('testo-grande', premuto);
    });
    appEvita(this.app.querySelector('#salta'), () => gioco.salta());
    appEvita(this.app.querySelector('#taccuino-btn'), () => this.alternaTaccuino());
    appEvita(this.app.querySelector('#chiudi-taccuino'), () => { this.taccuino.hidden = true; });
    appEvita(this.app.querySelector('#continua'), () => { this.azioni.dataset.domani = '1'; });
    appEvita(this.app.querySelector('#rigioca'), () => gioco.ricomincia());
    this.mano.addEventListener('animationend', () => {
      this.manoFinita = true;
      this.mano.hidden = true;
    });
    this.audio(gioco.audio.acceso());
  }

  audio(acceso) {
    const bottone = this.app.querySelector('#audio-toggle');
    bottone.textContent = t(acceso ? 'ui.audio.on' : 'ui.audio.off');
    bottone.setAttribute('aria-pressed', acceso ? 'true' : 'false');
  }

  safe(top, bottom) {
    if (top) document.documentElement.style.setProperty('--safe-top', `${top}px`);
    if (bottom) document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
  }

  saracinesca(apertura, pronta) {
    this.saracinescaEl.style.transform = `translateY(${-105 * apertura}%)`;
    this.saracinescaEl.classList.toggle('aperta', apertura >= 0.98);
    this.maniglia.classList.toggle('pronta', Boolean(pronta));
    const domani = this.gioco?.vista?.cartello === 'domani';
    this.cartello.textContent = t(domani ? 'ui.domani' : 'ui.cartello');
  }

  gesso(visibile) {
    this.gessoEl.hidden = !visibile;
  }

  sopraBolla(x, y) {
    if (this.bollaEl.hidden) return false;
    const r = this.bollaEl.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  telaLente() {
    return this.lente.querySelector('canvas');
  }

  strumento(id) {
    this.selezionato = id;
  }

  segui(gioco) {
    const testo = gioco.bolla ? gioco.bolla.testo.slice(0, Math.ceil(gioco.bolla.caratteri)) : '';
    this.bollaEl.hidden = !gioco.bolla;
    this.rigaEl.textContent = testo;
    this.disegnaAttrezzi(gioco);
    this.disegnaIndizi(gioco);
    const nomeAiuto = nomeDelPunto(gioco);
    const punto = nomeAiuto ? gioco.scena.proietta(nomeAiuto) : null;
    const pulsaSlot = gioco.aiuto >= 1 && gioco.passo.strumento && gioco.strumento !== gioco.passo.strumento;
    const pulsaPunto = gioco.aiuto >= 1 && !pulsaSlot && punto;
    this.punto.hidden = !pulsaPunto;
    if (pulsaPunto) {
      this.punto.style.left = `${punto.x}px`;
      this.punto.style.top = `${punto.y}px`;
    }
    if (gioco.aiuto < 2) this.manoFinita = false;
    const mostraMano = gioco.aiuto >= 2 && !this.manoFinita && punto;
    this.mano.hidden = !mostraMano;
    if (mostraMano) {
      this.mano.style.left = `${punto.x + 40}px`;
      this.mano.style.top = `${punto.y + 40}px`;
      this.mano.dataset.gesto = gioco.passo.gesto || '';
    }
    const lente = gioco.strumento === 'lente' && gioco.premuto && gioco.ultimo;
    this.lente.hidden = !lente;
    if (lente) {
      this.lente.style.left = `${gioco.ultimo.x}px`;
      this.lente.style.top = `${gioco.ultimo.y + -70}px`;
    }
    this.taccuinoBtn().hidden = !gioco.vista.strumenti.includes('lente');
    this.cassetta.hidden = gioco.vista.strumenti.length === 0;
    this.zone.hidden = !gioco.debugZone;
    if (this.taccuinoTimer > 0) {
      this.taccuinoTimer -= 1;
      if (this.taccuinoTimer === 0) this.taccuino.hidden = true;
    }
  }

  taccuinoBtn() {
    return this.app.querySelector('#taccuino-btn');
  }

  disegnaAttrezzi(gioco) {
    const lista = gioco.vista.strumenti.join(',');
    if (lista !== this.ultimoStrumenti) {
      this.ultimoStrumenti = lista;
      this.attrezzi.replaceChildren();
      for (const id of gioco.vista.strumenti) {
        const bottone = document.createElement('button');
        bottone.type = 'button';
        bottone.className = 'slot';
        bottone.dataset.strumento = id;
        bottone.setAttribute('aria-label', id);
        bottone.innerHTML = `<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">${ICONE[id] || ''}</svg>`;
        bottone.addEventListener('pointerdown', (e) => e.stopPropagation());
        bottone.addEventListener('pointerup', (e) => {
          e.stopPropagation();
          gioco.seleziona(id);
        });
        this.attrezzi.append(bottone);
      }
    }
    for (const bottone of this.attrezzi.querySelectorAll('.slot')) {
      const id = bottone.dataset.strumento;
      bottone.classList.toggle('in-mano', id === gioco.strumento);
      bottone.classList.toggle('pulsa', gioco.aiuto >= 1 && gioco.passo.strumento === id && gioco.strumento !== id);
    }
  }

  disegnaIndizi(gioco) {
    const indizi = gioco.vista.indizi || [];
    const spunta = new Set(gioco.vista.spuntati || []);
    const firma = `${indizi.join(',')}|${[...spunta].join(',')}|${gioco.vista.fine || 0}`;
    if (firma === this.firmaIndizi) return;
    this.firmaIndizi = firma;
    this.lista.replaceChildren();
    for (const id of indizi) {
      const voce = document.createElement('li');
      voce.className = spunta.has(id) ? 'fatto' : '';
      voce.dataset.indizio = id;
      const segno = document.createElement('span');
      segno.className = 'segno';
      segno.textContent = spunta.has(id) ? '✓' : '';
      const nome = document.createElement('span');
      nome.textContent = t(id);
      voce.append(segno, nome);
      this.lista.append(voce);
    }
    let pina = this.taccuino.querySelector('.pina');
    if (gioco.vista.fine) {
      if (!pina) {
        pina = document.createElement('p');
        pina.className = 'pina';
        pina.textContent = t('ui.pina');
        this.taccuino.querySelector('.pagine').append(pina);
      }
    }
    this.taccuino.classList.toggle('riparato', Boolean(gioco.vista.torcia.accesa));
  }

  volaIndizio(testo) {
    this.volo.hidden = false;
    this.volo.textContent = testo;
    this.volo.classList.remove('vola');
    void this.volo.offsetWidth;
    this.volo.classList.add('vola');
    window.setTimeout(() => { this.volo.hidden = true; }, 700);
  }

  taccuinoAuto(aperto) {
    if (!aperto) return;
    this.taccuino.hidden = false;
    this.taccuino.classList.add('riparato');
    this.taccuinoTimer = 120;
  }

  alternaTaccuino() {
    this.taccuino.hidden = !this.taccuino.hidden;
    this.taccuinoTimer = 0;
  }

  apriImpostazioni() {
    this.impostazioni.hidden = false;
    this.app.querySelector('#audio-toggle').focus();
  }

  chiudiImpostazioni() {
    this.impostazioni.hidden = true;
  }

  fine(visibile) {
    this.azioni.hidden = !visibile;
  }

  paesaggio(attivo) {
    this.paesaggioEl.hidden = !attivo;
  }

  correzione(testo, x, y) {
    const nodo = this.app.querySelector('#correzione');
    if (!nodo || !testo || testo === '…') return;
    nodo.hidden = false;
    nodo.textContent = testo;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const left = Math.max(12, Math.min(w - 180, (x || w / 2) - 20));
    const top = Math.max(72, Math.min(h - 160, (y || h / 2) - 64));
    nodo.style.left = `${left}px`;
    nodo.style.top = `${top}px`;
    window.clearTimeout(this.correzioneTimer);
    this.correzioneTimer = window.setTimeout(() => { nodo.hidden = true; }, 1600);
  }
}

function nomeDelPunto(gioco) {
  const p = gioco.passo;
  if (p.gesto === 'pinza' || p.gesto === 'chiudi') return p.slot || p.bersaglio;
  if (p.gesto === 'inserisci' || p.gesto === 'estrai') return gioco.pezzoAttuale(p.parti) || p.bersaglio;
  return p.bersaglio;
}

function appEvita(nodo, fn) {
  let appena = 0;
  nodo.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    e.preventDefault();
    appena = performance.now();
    fn();
  });
  nodo.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - appena < 500) return;
    fn();
  });
}
