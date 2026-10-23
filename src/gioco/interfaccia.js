import { t } from '../dati/testi.js';

const ORDINE = ['lente', 'cacciavite', 'pennello', 'leva', 'pinzette', 'nastro'];
const ICONE = {
  lente: '<circle cx="16" cy="16" r="8" fill="none" stroke="#3c291c" stroke-width="2.4"/><circle cx="16" cy="16" r="5" fill="#d7ecf2" fill-opacity="0.7"/><path d="M22 22 l7 7" stroke="#c4844e" stroke-width="3" stroke-linecap="round"/>',
  cacciavite: '<path d="M10 30 L22 12" stroke="#c4844e" stroke-width="3.2" stroke-linecap="round"/><path d="M18 8 h10 l-2 6 h-8 z" fill="#c9bfb4" stroke="#3c291c" stroke-width="1.4"/>',
  pennello: '<path d="M12 32 L22 14" stroke="#9a5f38" stroke-width="3.2" stroke-linecap="round"/><path d="M16 6 h12 v8 h-12 z" fill="#e8977c" stroke="#3c291c" stroke-width="1.4"/>',
  leva: '<path d="M6 28 L26 8" stroke="#c9bfb4" stroke-width="4" stroke-linecap="round"/><path d="M6 28 L12 22" stroke="#3c291c" stroke-width="4" stroke-linecap="round"/>',
  pinzette: '<path d="M12 6 L18 22 L24 6" fill="none" stroke="#c9bfb4" stroke-width="3" stroke-linecap="round"/><path d="M16 18 L18 26 L20 18" fill="none" stroke="#3c291c" stroke-width="2"/>',
  nastro: '<circle cx="18" cy="18" r="9" fill="none" stroke="#f0b86e" stroke-width="4"/><circle cx="18" cy="18" r="3" fill="#3c291c"/>',
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
    this.giaDisegnato = false;
    this.cartelloDomani = null;
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
    this.saracinescaEl.classList.toggle('pronta', Boolean(pronta));
    this.maniglia.classList.toggle('pronta', Boolean(pronta));
    const domani = this.gioco?.vista?.cartello === 'domani';
    if (domani === this.cartelloDomani) return;
    this.cartelloDomani = domani;
    this.cartello.classList.toggle('domani', domani);
    this.cartello.replaceChildren();
    if (domani) {
      this.cartello.textContent = t('ui.domani');
      return;
    }
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = 'La Bottega';
    const sotto = document.createElement('span');
    sotto.className = 'sotto';
    sotto.textContent = 'riparazioni';
    this.cartello.append(nome, sotto);
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
    const sbloccati = new Set(gioco.vista.strumenti);
    const lista = ORDINE.map((id) => (sbloccati.has(id) ? id : '·')).join(',');
    if (lista !== this.ultimoStrumenti) {
      const prima = new Set(this.ultimoStrumenti.split(',').filter((id) => id && id !== '·'));
      this.ultimoStrumenti = lista;
      this.attrezzi.replaceChildren();
      for (const id of ORDINE) {
        if (!sbloccati.has(id)) {
          const incavo = document.createElement('div');
          incavo.className = 'incavo';
          this.attrezzi.append(incavo);
          continue;
        }
        const bottone = document.createElement('button');
        bottone.type = 'button';
        bottone.className = 'slot';
        if (this.giaDisegnato && !prima.has(id)) bottone.classList.add('nuovo');
        bottone.dataset.strumento = id;
        bottone.setAttribute('aria-label', id);
        bottone.innerHTML = `<svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">${ICONE[id] || ''}</svg>`;
        bottone.addEventListener('pointerdown', (e) => e.stopPropagation());
        bottone.addEventListener('pointerup', (e) => {
          e.stopPropagation();
          gioco.seleziona(id);
        });
        this.attrezzi.append(bottone);
      }
      this.giaDisegnato = true;
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

  timbroLuce() {
    const nodo = this.app.querySelector('#cartoncino');
    if (!nodo) return;
    nodo.hidden = false;
    nodo.classList.remove('entra');
    void nodo.offsetWidth;
    nodo.classList.add('entra');
    window.clearTimeout(this.timbroTimer);
    this.timbroTimer = window.setTimeout(() => { nodo.hidden = true; }, 2000);
  }

  apriPina() {
    this.taccuino.hidden = false;
    this.taccuino.classList.add('riparato');
    this.taccuinoTimer = 0;
    this.firmaIndizi = '';
    this.disegnaIndizi(this.gioco);
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
    this.cassetta.classList.toggle('via', visibile);
  }

  paesaggio(attivo) {
    this.paesaggioEl.hidden = !attivo;
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
