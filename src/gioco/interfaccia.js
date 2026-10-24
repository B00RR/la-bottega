import { t } from '../dati/testi.js';

const ORDINE = ['lente', 'cacciavite', 'pennello', 'leva', 'pinzette', 'nastro'];
const ICONE = {
  lente: '<circle cx="14" cy="14" r="10" fill="#b7dfe6" stroke="#3c291c" stroke-width="2.5"/><circle cx="14" cy="14" r="5" fill="#f4efe4"/><path d="M21 21 L31 31" stroke="#c4844e" stroke-width="4.5" stroke-linecap="round"/>',
  cacciavite: '<path d="M7 31 L19 15" stroke="#c4844e" stroke-width="5" stroke-linecap="round"/><path d="M15 6 h16 l-3 9 h-13 z" fill="#d9dde2" stroke="#3c291c" stroke-width="2.5" stroke-linejoin="round"/>',
  pennello: '<path d="M9 32 L19 16" stroke="#9a5f38" stroke-width="5" stroke-linecap="round"/><path d="M12 4 h16 v13 h-16 z" fill="#e8977c" stroke="#3c291c" stroke-width="2.5"/>',
  leva: '<path d="M5 31 L29 7" stroke="#c9bfb4" stroke-width="6" stroke-linecap="round"/><path d="M5 31 L14 22" stroke="#3c291c" stroke-width="6" stroke-linecap="round"/>',
  pinzette: '<path d="M8 4 L18 24 L28 4" fill="none" stroke="#c9bfb4" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 18 L18 30 L22 18" fill="#d9dde2" stroke="#3c291c" stroke-width="2.5" stroke-linejoin="round"/>',
  nastro: '<circle cx="18" cy="18" r="13" fill="#f0b86e" stroke="#3c291c" stroke-width="2.5"/><circle cx="18" cy="18" r="4.5" fill="#3c291c"/>',
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
    appEvita(this.app.querySelector('#chiudi-taccuino'), () => {
      if (gioco.faseFine === 'taccuino') {
        gioco.chiudiFinale();
        return;
      }
      this.taccuino.hidden = true;
    });
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
    const serranda = gioco.faseFine === 'serranda';
    this.bollaEl.hidden = serranda || !gioco.bolla;
    this.app.querySelector('#chi-parla').hidden = serranda;
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
    const zona = Boolean(gioco.debugZone);
    this.zone.hidden = !zona;
    this.zone.classList.toggle('attiva', zona);
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
        bottone.innerHTML = `<svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">${ICONE[id] || ''}</svg>`;
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
    let pina = this.taccuino.querySelector(':scope > .pina');
    if (gioco.vista.fine) {
      if (!pina) {
        pina = document.createElement('p');
        pina.className = 'pina';
        this.app.querySelector('#chiudi-taccuino').before(pina);
      }
      pina.textContent = t('ui.pina');
      pina.hidden = false;
    } else if (pina) pina.hidden = true;
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
    this.taccuino.classList.add('riparato', 'finale');
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

  fine(fase) {
    const attivo = fase === 'taccuino' || fase === 'serranda';
    this.app.classList.toggle('fine', attivo);
    this.app.classList.toggle('serranda', fase === 'serranda');
    this.cassetta.classList.toggle('via', attivo);
    this.azioni.hidden = fase !== 'serranda';
  }

  paesaggio(attivo) {
    this.paesaggioEl.hidden = !attivo;
  }

  ritrato(url) {
    if (!url) return;
    const nodo = this.app.querySelector('#medaglione');
    if (nodo) nodo.style.backgroundImage = `url("${url}")`;
  }

  /** Rettangoli visibili che si toccano, testo della bolla coperto, Chiudi fuori carta. */
  sovrapposizioni() {
    const sel = ['#bolla', '#chi-parla', '#ingranaggio', '#cassetta', '#cartoncino', '#taccuino', '#impostazioni', '#azioni', '#continua', '#rigioca', '#chiudi-taccuino', '#cartello', '.timbro-pagina', '.pina'];
    const visi = [];
    for (const id of sel) {
      const el = this.app.querySelector(id);
      if (!el || !visibileSu(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom < 2 || r.top > window.innerHeight - 2) continue;
      visi.push({ id, el, r });
    }
    const problemi = [];
    for (let i = 0; i < visi.length; i += 1) {
      for (let j = i + 1; j < visi.length; j += 1) {
        const a = visi[i];
        const b = visi[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (area(a.r, b.r) > 16) problemi.push(`${a.id.slice(1)}~${b.id.slice(1)}`);
      }
    }
    const taccuino = this.taccuino;
    const chiudi = this.app.querySelector('#chiudi-taccuino');
    if (visibileSu(taccuino) && visibileSu(chiudi)) {
      const t = taccuino.getBoundingClientRect();
      const c = chiudi.getBoundingClientRect();
      if (c.left < t.left + 4 || c.right > t.right - 4 || c.top < t.top + 4 || c.bottom > t.bottom - 4) {
        problemi.push('chiudi');
      }
    }
    if (visibileSu(this.bollaEl) && this.rigaEl.textContent) {
      const range = document.createRange();
      range.selectNodeContents(this.rigaEl);
      const b = this.bollaEl.getBoundingClientRect();
      for (const r of range.getClientRects()) {
        if (r.width < 1) continue;
        if (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1) {
          problemi.push('bolla');
          break;
        }
        const sopra = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        if (sopra && sopra !== this.bollaEl && !this.bollaEl.contains(sopra)) {
          problemi.push('bolla');
          break;
        }
      }
    }
    return problemi.join(',');
  }

}

function visibileSu(el) {
  if (!el || el.hidden) return false;
  const stile = getComputedStyle(el);
  return stile.display !== 'none' && stile.visibility !== 'hidden';
}

function area(a, b) {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (x <= 0 || y <= 0) return 0;
  return x * y;
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
