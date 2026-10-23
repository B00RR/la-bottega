import { passi } from '../dati/contenuti.js';

const CHIAVE = 'la-bottega:salvataggio';
const BAK = 'la-bottega:salvataggio.bak';
export const VERSIONE = 2;

export function statoSalvatoIniziale() {
  return {
    versione: VERSIONE,
    indice: 0,
    linea: 0,
    saltato: false,
    progressoGesto: 0,
    parziali: [],
    strumento: null,
  };
}

const ATTREZZI = new Set(['lente', 'cacciavite', 'pennello', 'leva', 'pinzette', 'nastro']);

function leggi(chiave) {
  try {
    return localStorage.getItem(chiave);
  } catch {
    return null;
  }
}

/** La v1 non ha gli stessi passi: si ricomincia, non si indovina un indice. */
function migra(dati) {
  if (dati.versione < VERSIONE) return statoSalvatoIniziale();
  return null;
}

function analizza(grezzo) {
  if (!grezzo) return null;
  try {
    const dati = JSON.parse(grezzo);
    if (!dati || typeof dati !== 'object' || typeof dati.versione !== 'number') return null;
    if (dati.versione > VERSIONE) return null;
    const normalizzato = dati.versione < VERSIONE ? migra(dati) : dati;
    if (!normalizzato || normalizzato.versione !== VERSIONE) return null;
    if (!Number.isInteger(normalizzato.indice)) return null;
    if (normalizzato.indice < 0 || normalizzato.indice >= passi.length) return null;
    const progresso = Number(normalizzato.progressoGesto);
    const parziali = Array.isArray(normalizzato.parziali)
      ? normalizzato.parziali.filter((id) => typeof id === 'string')
      : [];
    return {
      versione: VERSIONE,
      indice: normalizzato.indice,
      linea: 0,
      saltato: Boolean(normalizzato.saltato),
      progressoGesto: Number.isFinite(progresso) ? Math.min(1, Math.max(0, progresso)) : 0,
      parziali,
      strumento: ATTREZZI.has(normalizzato.strumento) ? normalizzato.strumento : null,
    };
  } catch {
    return null;
  }
}

export function carica() {
  return analizza(leggi(CHIAVE)) || analizza(leggi(BAK)) || statoSalvatoIniziale();
}

/** Copia il salvataggio buono, poi scrive. localStorage non ha una rename atomica. */
export function salva(stato) {
  const json = JSON.stringify({
    versione: VERSIONE,
    indice: stato.indice,
    linea: 0,
    saltato: Boolean(stato.saltato),
    progressoGesto: Math.min(1, Math.max(0, Number(stato.progressoGesto) || 0)),
    parziali: Array.isArray(stato.parziali) ? stato.parziali : [],
    strumento: ATTREZZI.has(stato.strumento) ? stato.strumento : null,
  });
  try {
    const attuale = localStorage.getItem(CHIAVE);
    if (attuale) localStorage.setItem(BAK, attuale);
    localStorage.setItem(CHIAVE, json);
  } catch {
    /* senza memoria si gioca lo stesso, solo per questa visita */
  }
}

export function cancella() {
  try {
    localStorage.removeItem(CHIAVE);
    localStorage.removeItem(BAK);
  } catch {
    /* niente da fare */
  }
}
