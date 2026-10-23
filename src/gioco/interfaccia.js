import { t } from '../dati/testi.js';
import { strumenti } from '../dati/contenuti.js';

const ICONE = {
  mano: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#f0c7a8" stroke="#3c291c" stroke-width="1.5" d="M11 16 V8 a2 2 0 0 1 4 0 V15 M15 14 V6 a2 2 0 0 1 4 0 V15 M19 14 V8 a2 2 0 0 1 4 0 V18 c0 6-4 9-8 9 h-2 c-4 0-7-3-7-7 v-5 a2 2 0 0 1 4 0 V16"/></svg>',
  lente: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="13" r="7" fill="none" stroke="#3c291c" stroke-width="2"/><circle cx="13" cy="13" r="4" fill="#d7ecf4"/><path stroke="#c4623a" stroke-width="3" d="M18 18 L25 26"/></svg>',
  cacciavite: '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#c4844e" stroke-width="4" d="M8 24 L20 10"/><path stroke="#8d929a" stroke-width="3" d="M18 8 L24 14"/><path stroke="#3c291c" stroke-width="1.5" d="M16 12 L22 6 M20 14 L26 8"/></svg>',
  pennello: '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#c4844e" stroke-width="3" d="M10 26 L20 12"/><path fill="#f4efe4" stroke="#3c291c" d="M18 12 l6-6 3 3-6 6z"/><path fill="#6e8b4e" d="M8 24 h6 l-1 4 h-4z"/></svg>',
  leva: '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#8d929a" stroke-width="4" stroke-linecap="round" d="M7 22 L24 8"/><path fill="#c4623a" d="M22 6 l6 2-3 6z"/></svg>',
  pinzette: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="none" stroke="#8d929a" stroke-width="2" d="M10 6 C14 16 14 20 16 26 M22 6 C18 16 18 20 16 26"/></svg>',
  nastro: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="7" fill="#e7d27a" stroke="#3c291c" stroke-width="1.5"/><circle cx="16" cy="16" r="2.5" fill="#fff6ea"/></svg>',
};

function interseca(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** DOM del tutorial. Si aggiorna agli eventi, non leggendo il mondo ogni frame. */
export class Interfaccia {
  constructor(radice, azioni) {
    this.radice = radice;
    this.azioni = azioni;
    this.dialogo = radice.querySelector('#dialogo');
    this.riga = radice.querySelector('#dialogo .riga');
    this.istruzione = radice.querySelector('#istruzione');
    this.verbo = radice.querySelector('#istruzione .verbo');
    this.testoIstruzione = radice.querySelector('#istruzione .testo');
    this.cassetta = radice.querySelector('#cassetta');
    this.attrezzi = radice.querySelector('#cassetta .attrezzi');
    this.correzione = radice.querySelector('#correzione');
    this.mano = radice.querySelector('#mano-aiuto');
    this.punto = radice.querySelector('#punto-aiuto');
    this.cursore = radice.querySelector('#cursore-strumento');
    this.taccuino = radice.querySelector('#taccuino');
    this.lista = radice.querySelector('#taccuino ul');
    this.vuoto = radice.querySelector('#taccuino .vuoto');
    this.impostazioni = radice.querySelector('#impostazioni');
    this.audioBtn = radice.querySelector('#audio-toggle');
    this.fine = radice.querySelector('#fine');
    this.lampo = radice.querySelector('#lampo');
    this.scintille = radice.querySelector('#scintille');
    this.volo = radice.querySelector('#indizio-volo');
    this.timerCorrezione = 0;
    this.aiutoAttivo = false;
    this.strumentoPulsa = null;

    radice.querySelector('#impostazioni-btn').addEventListener('click', () => this.apriImpostazioni());
    radice.querySelector('#taccuino-btn').addEventListener('click', () => this.apriTaccuino());
    radice.querySelector('#chiudi-imp').addEventListener('click', () => this.chiudiPannelli());
    radice.querySelector('#chiudi-taccuino').addEventListener('click', () => this.chiudiPannelli());
    radice.querySelector('#salta').addEventListener('click', () => {
      this.chiudiPannelli();
      azioni.salta();
    });
    radice.querySelector('#ricomincia').addEventListener('click', () => azioni.ricomincia());
    this.audioBtn.addEventListener('click', () => azioni.alternaAudio());

    this.attrezzi.addEventListener('click', (evento) => {
      const bottone = evento.target.closest('[data-strumento]');
      if (!bottone) return;
      azioni.seleziona(bottone.dataset.strumento);
    });
  }

  pannelloAperto() {
    return !this.impostazioni.hidden || !this.taccuino.hidden;
  }

  dialogoAperto() {
    return !this.dialogo.hidden;
  }

  applicaPasso(passo, visibili) {
    const gesto = passo.tipo === 'gesto';
    this.istruzione.hidden = !gesto;
    if (gesto) {
      this.verbo.textContent = t(passo.verbo);
      this.testoIstruzione.textContent = t(passo.istruzione);
    }
    if (passo.tipo !== 'dialogo' && passo.tipo !== 'festa') this.chiudiDialogo();
    if (passo.tipo !== 'fine') this.fine.hidden = true;
    this.cassetta.hidden = visibili.length === 0;
    this.cassetta.classList.toggle('in-pausa', passo.tipo === 'dialogo' || passo.tipo === 'festa');
    this.disegnaAttrezzi(visibili, passo.nuovoStrumento);
    this.nascondiAiuto();
    this.nascondiCursore();
  }

  apriDialogo(frase) {
    this.riga.textContent = frase;
    this.dialogo.hidden = false;
    this.istruzione.hidden = true;
  }

  chiudiDialogo() {
    this.dialogo.hidden = true;
  }

  disegnaAttrezzi(visibili, nuovo) {
    const firma = visibili.join(',');
    if (firma !== this.firmaAttrezzi) {
      this.firmaAttrezzi = firma;
      this.attrezzi.replaceChildren();
      for (const id of visibili) {
        const def = strumenti.find((s) => s.id === id);
        const bottone = document.createElement('button');
        bottone.type = 'button';
        bottone.dataset.strumento = id;
        bottone.className = 'attrezzo';
        bottone.innerHTML = `<span class="icona">${ICONE[id] ?? ''}</span><span class="nome"></span><span class="stato"></span>`;
        bottone.querySelector('.nome').textContent = t(def.nome);
        this.attrezzi.appendChild(bottone);
      }
    }
    if (nuovo) {
      const bottone = this.attrezzi.querySelector(`[data-strumento="${nuovo}"]`);
      bottone?.classList.add('nuovo');
    }
  }

  selezionaStrumento(id) {
    for (const bottone of this.attrezzi.querySelectorAll('.attrezzo')) {
      const attivo = bottone.dataset.strumento === id;
      bottone.classList.toggle('selezionato', attivo);
      bottone.setAttribute('aria-pressed', attivo ? 'true' : 'false');
      bottone.querySelector('.stato').textContent = attivo ? t('attrezzo.inmano') : '';
      if (attivo) bottone.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }

  correzione(frase) {
    this.correzione.textContent = frase;
    this.correzione.hidden = false;
    window.clearTimeout(this.timerCorrezione);
    this.timerCorrezione = window.setTimeout(() => {
      this.correzione.hidden = true;
    }, 2400);
  }

  aiuto(attivo, idStrumento) {
    this.aiutoAttivo = attivo;
    this.strumentoPulsa = attivo ? idStrumento : null;
    for (const bottone of this.attrezzi.querySelectorAll('.attrezzo')) {
      bottone.classList.toggle('pulsa', attivo && bottone.dataset.strumento === idStrumento);
    }
    if (!attivo) this.nascondiAiuto();
  }

  posizionaMano(punto) {
    if (!this.aiutoAttivo || !punto || this.dialogoAperto() || this.pannelloAperto()) {
      this.mano.hidden = true;
      this.punto.hidden = true;
      return;
    }
    this.punto.hidden = false;
    this.punto.style.left = `${punto.x}px`;
    this.punto.style.top = `${punto.y}px`;
    this.mano.hidden = false;
    let x = punto.x - 18;
    let y = punto.y - 52;
    this.mano.style.left = `${x}px`;
    this.mano.style.top = `${y}px`;
    const mano = this.mano.getBoundingClientRect();
    for (const sel of ['#cassetta', '#istruzione', '#dialogo', '#correzione']) {
      const el = this.radice.querySelector(sel);
      if (!el || el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (interseca(mano, r)) y = Math.min(y, r.top - mano.height - 10);
    }
    this.mano.style.top = `${Math.max(8, y)}px`;
    this.mano.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 56))}px`;
  }

  nascondiAiuto() {
    this.aiutoAttivo = false;
    this.mano.hidden = true;
    this.punto.hidden = true;
    for (const bottone of this.attrezzi.querySelectorAll('.pulsa')) bottone.classList.remove('pulsa');
  }

  cursoreA(punto, id) {
    if (!punto || this.dialogoAperto() || this.pannelloAperto()) {
      this.nascondiCursore();
      return;
    }
    this.cursore.hidden = false;
    this.cursore.innerHTML = ICONE[id] ?? '';
    this.cursore.style.left = `${punto.x - 26}px`;
    this.cursore.style.top = `${punto.y - 58}px`;
  }

  nascondiCursore() {
    this.cursore.hidden = true;
  }

  indizi(lista) {
    this.lista.replaceChildren();
    this.vuoto.hidden = lista.length > 0;
    for (const id of lista) {
      const voce = document.createElement('li');
      voce.textContent = t(id);
      this.lista.appendChild(voce);
    }
  }

  voloIndizio(id, da) {
    this.volo.textContent = t(id);
    this.volo.hidden = false;
    const meta = this.radice.querySelector('#taccuino-btn').getBoundingClientRect();
    const x = da?.x ?? window.innerWidth / 2;
    const y = da?.y ?? window.innerHeight / 2;
    this.volo.style.left = `${x}px`;
    this.volo.style.top = `${y}px`;
    this.volo.style.transform = 'translate(-50%, -50%)';
    requestAnimationFrame(() => {
      this.volo.style.left = `${meta.left + meta.width / 2}px`;
      this.volo.style.top = `${meta.top + meta.height / 2}px`;
    });
    window.setTimeout(() => {
      this.volo.hidden = true;
    }, 700);
  }

  scintilleA(punto) {
    const origine = punto ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.35 };
    for (let i = 0; i < 12; i += 1) {
      const s = document.createElement('i');
      s.className = 'scintilla';
      s.style.left = `${origine.x}px`;
      s.style.top = `${origine.y}px`;
      s.style.setProperty('--dx', `${Math.random() * 140 - 70}px`);
      s.style.setProperty('--dy', `${-40 - Math.random() * 120}px`);
      this.scintille.appendChild(s);
      window.setTimeout(() => s.remove(), 900);
    }
  }

  lampo() {
    this.lampo.classList.remove('acceso');
    void this.lampo.offsetWidth;
    this.lampo.classList.add('acceso');
  }

  audioEtichetta(acceso) {
    this.audioBtn.textContent = acceso ? t('ui.audio.on') : t('ui.audio.off');
    this.audioBtn.setAttribute('aria-pressed', acceso ? 'true' : 'false');
  }

  apriImpostazioni() {
    this.taccuino.hidden = true;
    this.impostazioni.hidden = false;
    this.audioBtn.focus();
  }

  apriTaccuino() {
    this.impostazioni.hidden = true;
    this.taccuino.hidden = false;
    this.radice.querySelector('#chiudi-taccuino').focus();
  }

  chiudiPannelli() {
    this.impostazioni.hidden = true;
    this.taccuino.hidden = true;
  }

  mostraFine() {
    this.chiudiDialogo();
    this.istruzione.hidden = true;
    this.nascondiAiuto();
    this.nascondiCursore();
    this.fine.hidden = false;
  }
}
