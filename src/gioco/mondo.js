import { passi } from '../dati/contenuti.js';

export function statoIniziale() {
  return {
    shutter: 0,
    cartello: 'bottega',
    fine: 0,
    musica: 0,
    cassetto: 0,
    tv: 0,
    strumenti: [],
    indizi: [],
    spuntati: [],
    ettore: { posa: 'giornale', cappello: 0, mano: 0, strizza: 0 },
    torcia: {
      visibile: false,
      posa: 'banco',
      yaw: 0,
      tilt: 0,
      roll: 0,
      accesa: false,
      premuta: 0,
      bottone: 0,
      tappo: 0,
      vite: 0,
      pulizia: 0,
      macchia: 0,
      pileVecchie: 0,
      pileNuove: 0,
      giri: 0,
    },
    telecomando: {
      visibile: false,
      yaw: 0,
      tilt: 0,
      premuto: 0,
      pancia: 0,
      fessura: 0,
      guscio: 0,
      nastro: 0,
      molla: 0,
      filoVisto: 0,
      mollaVista: 0,
    },
    flash: 0,
  };
}

function unici(lista) {
  return [...new Set(lista.filter(Boolean))];
}

export function applica(stato, patch) {
  if (!patch) return stato;
  for (const [chiave, valore] of Object.entries(patch)) {
    if (chiave === 'indizi') stato.indizi = unici([...stato.indizi, ...valore]);
    else if (chiave === 'spunta') stato.spuntati = unici([...stato.spuntati, ...valore]);
    else if (chiave === 'sblocca') {
      if (valore && !stato.strumenti.includes(valore)) stato.strumenti = [...stato.strumenti, valore];
    } else if (valore && typeof valore === 'object' && !Array.isArray(valore)) {
      stato[chiave] = { ...(stato[chiave] || {}), ...valore };
    } else stato[chiave] = valore;
  }
  return stato;
}

export function clona(stato) {
  return {
    ...stato,
    strumenti: [...stato.strumenti],
    indizi: [...stato.indizi],
    spuntati: [...stato.spuntati],
    ettore: { ...stato.ettore },
    torcia: { ...stato.torcia },
    telecomando: { ...stato.telecomando },
  };
}

/** Stato all'inizio del passo: fatti precedenti, attrezzi fino a qui, entra del passo. */
export function ricostruisci(indice, elenco = passi) {
  const stato = statoIniziale();
  const i = Math.max(0, Math.min(indice, elenco.length - 1));
  for (let n = 0; n < i; n += 1) {
    applica(stato, elenco[n].sblocca ? { sblocca: elenco[n].sblocca } : null);
    applica(stato, elenco[n].fatto);
  }
  const corrente = elenco[i];
  if (corrente?.sblocca) applica(stato, { sblocca: corrente.sblocca });
  applica(stato, corrente?.entra);
  return stato;
}
