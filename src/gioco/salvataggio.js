import { copione } from '../dati/contenuti.js';

const CHIAVE = 'la-bottega:salvataggio';
const BAK = 'la-bottega:salvataggio.bak';
export const VERSIONE = 1;

export function statoIniziale() {
  return { versione: VERSIONE, indice: 0, linea: 0, saltato: false };
}

function leggi(chiave) {
  try {
    return localStorage.getItem(chiave);
  } catch {
    return null;
  }
}

function analizza(grezzo) {
  if (!grezzo) return null;
  try {
    const dati = JSON.parse(grezzo);
    if (!dati || typeof dati !== 'object') return null;
    if (typeof dati.versione !== 'number') return null;
    if (dati.versione > VERSIONE) return null;
    const normalizzato = dati.versione < VERSIONE ? migra(dati) : dati;
    if (!normalizzato || normalizzato.versione !== VERSIONE) return null;
    if (!Number.isInteger(normalizzato.indice)) return null;
    if (normalizzato.indice < 0 || normalizzato.indice >= copione.length) return null;
    const passo = copione[normalizzato.indice];
    const righe = passo.righe?.length ?? 1;
    const linea = Number.isInteger(normalizzato.linea) ? normalizzato.linea : 0;
    if (linea < 0 || linea >= righe) return null;
    return {
      versione: VERSIONE,
      indice: normalizzato.indice,
      linea,
      saltato: Boolean(normalizzato.saltato),
    };
  } catch {
    return null;
  }
}

function migra(dati) {
  if (dati.versione === 0) {
    return { versione: VERSIONE, indice: 0, linea: 0, saltato: false };
  }
  return null;
}

export function carica() {
  return analizza(leggi(CHIAVE)) || analizza(leggi(BAK)) || statoIniziale();
}

/** Copia il salvataggio buono, poi scrive. localStorage non ha una rename atomica. */
export function salva(stato) {
  const json = JSON.stringify({
    versione: VERSIONE,
    indice: stato.indice,
    linea: stato.linea,
    saltato: Boolean(stato.saltato),
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
