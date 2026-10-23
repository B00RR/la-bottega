/**
 * Copione dei primi istanti. Un passo = un verbo.
 * `entra` vale all'arrivo sul passo, `fatto` quando il passo è compiuto.
 * Gli id delle battute devono esistere in testi.js: si controllano all'avvio.
 */

const visto = { a1: 6, a2: 10, a3: 16 };
const nuovo = { a1: 4, a2: 7, a3: 13 };

export const passi = [
  {
    id: 'b1-saracinesca',
    tipo: 'saracinesca',
    fatto: { shutter: 1 },
  },
  {
    id: 'b2-entrata',
    tipo: 'blocco',
    durata: 1.6,
    inquadratura: 'BANCO',
    da: 'PORTA',
    transizione: 1.6,
    eventi: [
      { a: 0.75, riga: 'dlg.b3.1' },
      { a: 1.0, spinta: true },
      { a: 1.25, riga: 'dlg.b3.2' },
    ],
    entra: { torcia: { visibile: true, posa: 'banco', yaw: 0 } },
    fatto: { ettore: { posa: 'presente' }, torcia: { visibile: true, posa: 'spinta', yaw: 0 } },
  },
  {
    id: 'b4-bottone',
    tipo: 'gesto',
    inquadratura: 'BANCO',
    bersaglio: 'bottone',
    soggetto: 'torcia',
    gesto: 'tap',
    area: 72,
    zonaMorbida: 'centro_torcia',
    righe: [],
    aiuti: { a1: 3, a2: 6, a3: 11, testo: 'dlg.b4.a3' },
    dopo: ['dlg.b4.dopo'],
    fatto: { torcia: { premuta: 1 } },
  },
  {
    id: 'b5-gira',
    tipo: 'gesto',
    inquadratura: 'BANCO',
    bersaglio: 'centro_torcia',
    soggetto: 'torcia',
    gesto: 'gira',
    metaYaw: Math.PI / 2,
    righe: ['dlg.b5.1'],
    aiuti: { ...nuovo, testo: 'dlg.b5.a3' },
    dopo: ['dlg.b5.scatto'],
    fatto: { torcia: { yaw: Math.PI / 2, macchia: 1 } },
  },
  {
    id: 'b6-lente',
    tipo: 'gesto',
    inquadratura: 'DETTAGLIO-CODA',
    transizione: 0.5,
    bersaglio: 'macchia',
    bersagli: ['macchia'],
    soggetto: 'torcia',
    strumento: 'lente',
    sblocca: 'lente',
    gesto: 'lente',
    indizi: { macchia: 'indizio.contatto' },
    righe: ['dlg.b6.1'],
    aiuti: { ...nuovo, testo: 'dlg.b6.a3' },
    senza: { dalla: 2, testo: 'dlg.b6.nuda' },
    dopo: ['dlg.b6.dopo'],
    musica: 1,
    fatto: { indizi: ['indizio.contatto'], musica: 1, torcia: { macchia: 1 } },
  },
  {
    id: 'b7-svita',
    tipo: 'gesto',
    inquadratura: 'DETTAGLIO-VITE',
    transizione: 0.55,
    bersaglio: 'vite',
    soggetto: 'torcia',
    strumento: 'cacciavite',
    sblocca: 'cacciavite',
    gesto: 'cerchio',
    senso: 'antiorario',
    gradi: 540,
    righe: ['dlg.b7.1'],
    aiuti: { a1: 4, a2: 6, a3: 12, testo: 'dlg.b7.a3' },
    erroreSenso: { gradi: 90, testo: 'dlg.b7.senso' },
    piccolo: true,
    fatto: { torcia: { vite: 1, tappo: 1, giri: 1.5 }, indizi: ['indizio.pile'] },
  },
  {
    id: 'b8-pennello',
    tipo: 'gesto',
    inquadratura: 'DETTAGLIO-TAPPO-APERTO',
    transizione: 0.55,
    bersaglio: 'contatto',
    soggetto: 'torcia',
    strumento: 'pennello',
    sblocca: 'pennello',
    gesto: 'strofina',
    righe: ['dlg.b8.1', 'dlg.b8.2'],
    aiuti: { a1: 4, a2: 6, a3: 12, testo: 'dlg.b8.a3' },
    erroreTap: { dalla: 3, testo: 'dlg.b8.tap' },
    dopo: ['dlg.b8.dopo'],
    piccolo: true,
    fatto: { torcia: { pulizia: 1 }, spunta: ['indizio.contatto'] },
  },
  {
    id: 'b9-pile-fuori',
    tipo: 'gesto',
    inquadratura: 'DETTAGLIO-TAPPO-APERTO',
    bersaglio: 'pila_a',
    parti: ['pila_a', 'pila_b'],
    soggetto: 'torcia',
    gesto: 'estrai',
    righe: ['dlg.b9.1'],
    aiuti: { ...nuovo, testo: 'dlg.b9.a3' },
    fatto: { torcia: { pileVecchie: 2 } },
  },
  {
    id: 'b10-pile-dentro',
    tipo: 'gesto',
    inquadratura: 'DETTAGLIO-TAPPO-APERTO',
    bersaglio: 'sede_a',
    parti: ['pila_nuova_a', 'pila_nuova_b'],
    soggetto: 'torcia',
    gesto: 'inserisci',
    righe: ['dlg.b10.1'],
    aiuti: { ...visto },
    erroreLascia: { dalla: 2, testo: 'dlg.b10.fuori' },
    entra: { cassetto: 1 },
    piccolo: true,
    fatto: { torcia: { pileNuove: 2 }, cassetto: 0, spunta: ['indizio.pile'] },
  },
  {
    id: 'b11-chiudi',
    tipo: 'gesto',
    inquadratura: 'DETTAGLIO-VITE',
    transizione: 0.55,
    bersaglio: 'vite',
    soggetto: 'torcia',
    strumento: 'cacciavite',
    gesto: 'cerchio',
    senso: 'orario',
    gradi: 360,
    righe: ['dlg.b11.1'],
    aiuti: { ...visto, testo: 'dlg.b11.a3' },
    erroreSenso: { gradi: 90, testo: 'corr.destra' },
    entra: { torcia: { tappo: 0.15, giri: 0.225 } },
    fatto: { torcia: { tappo: 0, vite: 0, yaw: 0, giri: 0 } },
  },
  {
    id: 'b12-prova',
    tipo: 'gesto',
    inquadratura: 'BANCO',
    transizione: 0.55,
    bersaglio: 'bottone',
    soggetto: 'torcia',
    gesto: 'tap',
    area: 72,
    righe: ['dlg.b12.1'],
    aiuti: { a1: 5 },
    dopo: ['dlg.b12.dopo1', 'dlg.b12.dopo2'],
    grande: 'torcia',
    fatto: { torcia: { accesa: true, posa: 'banco' }, musica: 2 },
  },
  {
    id: 'r1-on',
    tipo: 'gesto',
    inquadratura: 'TELECOMANDO',
    transizione: 0.55,
    bersaglio: 'tasto_on',
    soggetto: 'telecomando',
    gesto: 'tap',
    area: 72,
    righe: ['dlg.r1.1'],
    aiuti: { ...visto },
    dopo: ['dlg.r1.dopo'],
    entra: {
      torcia: { posa: 'lato', accesa: true, visibile: true },
      telecomando: { visibile: true, yaw: 0 },
      tv: 1,
    },
    fatto: {
      torcia: { posa: 'lato', accesa: true, visibile: true },
      telecomando: { visibile: true, premuto: 1, yaw: 0 },
      tv: 1,
    },
  },
  {
    id: 'r2-gira',
    tipo: 'gesto',
    inquadratura: 'TELECOMANDO',
    bersaglio: 'centro_telecomando',
    soggetto: 'telecomando',
    gesto: 'gira',
    metaYaw: Math.PI,
    quale: 'telecomando',
    aiuti: { ...visto },
    fatto: { telecomando: { yaw: Math.PI, pancia: 1 } },
  },
  {
    id: 'r3-leva',
    tipo: 'gesto',
    inquadratura: 'TC-RETRO',
    transizione: 0.55,
    bersaglio: 'fessura_a',
    soggetto: 'telecomando',
    strumento: 'leva',
    sblocca: 'leva',
    gesto: 'scorri',
    scorri: ['fessura_a', 'fessura_b'],
    righe: ['dlg.r3.1'],
    aiuti: { ...nuovo },
    fatto: { telecomando: { fessura: 1, guscio: 1 } },
  },
  {
    id: 'r4-lente',
    tipo: 'gesto',
    inquadratura: 'TC-INTERNO',
    transizione: 0.55,
    bersaglio: 'rame',
    bersagli: ['rame', 'molla'],
    soggetto: 'telecomando',
    strumento: 'lente',
    gesto: 'lente',
    indizi: { rame: 'indizio.filo', molla: 'indizio.molla' },
    righe: ['dlg.r4.1'],
    aiuti: { ...visto },
    fatto: {
      indizi: ['indizio.filo', 'indizio.molla'],
      telecomando: { filoVisto: 1, mollaVista: 1 },
    },
  },
  {
    id: 'r5-pinze',
    tipo: 'gesto',
    inquadratura: 'TC-INTERNO',
    bersaglio: 'molla',
    slot: 'sede_molla',
    soggetto: 'telecomando',
    strumento: 'pinzette',
    sblocca: 'pinzette',
    gesto: 'pinza',
    righe: ['dlg.r5.1'],
    aiuti: { ...nuovo },
    fatto: { telecomando: { molla: 1 } },
  },
  {
    id: 'r6-nastro',
    tipo: 'gesto',
    inquadratura: 'TC-INTERNO',
    bersaglio: 'filo',
    soggetto: 'telecomando',
    strumento: 'nastro',
    sblocca: 'nastro',
    gesto: 'cerchio',
    senso: 'antiorario',
    gradi: 720,
    nastro: true,
    righe: ['dlg.r6.1'],
    aiuti: { ...visto },
    erroreSenso: { gradi: 90, testo: 'corr.verso' },
    fatto: { telecomando: { nastro: 1 } },
  },
  {
    id: 'r7-guscio',
    tipo: 'gesto',
    inquadratura: 'TC-INTERNO',
    bersaglio: 'guscio',
    slot: 'sede_guscio',
    soggetto: 'telecomando',
    gesto: 'chiudi',
    aiuti: { ...visto },
    fatto: { telecomando: { guscio: 0 }, spunta: ['indizio.filo', 'indizio.molla'] },
  },
  {
    id: 'r8-tv',
    tipo: 'gesto',
    inquadratura: 'TELECOMANDO',
    transizione: 0.5,
    bersaglio: 'tasto_on',
    soggetto: 'telecomando',
    gesto: 'tap',
    area: 72,
    aiuti: { a1: 6 },
    dopo: ['dlg.r8.dopo'],
    grande: 'tv',
    fatto: { tv: 2, telecomando: { yaw: 0 } },
  },
  {
    id: 'chiusura',
    tipo: 'fine',
    inquadratura: 'BANCO',
    transizione: 0.8,
    righe: ['dlg.fine.1'],
    dopoPausa: 'dlg.fine.2',
    entra: {
      ettore: { posa: 'alzato', cappello: 1 },
      cartello: 'domani',
      shutter: 0.5,
      fine: 1,
      torcia: { accesa: true, visibile: true, posa: 'lato' },
      telecomando: { visibile: true },
      tv: 2,
    },
  },
];

export function idBattute(elenco = passi) {
  const ids = [];
  const prendi = (valore) => {
    if (!valore) return;
    if (typeof valore === 'string') ids.push(valore);
    else if (Array.isArray(valore)) valore.forEach(prendi);
    else if (typeof valore === 'object') {
      if (valore.testo) ids.push(valore.testo);
      if (valore.riga) ids.push(valore.riga);
      Object.values(valore).forEach((v) => {
        if (typeof v === 'string' && (v.startsWith('dlg.') || v.startsWith('corr.') || v.startsWith('indizio.'))) ids.push(v);
      });
    }
  };
  for (const passo of elenco) {
    prendi(passo.righe);
    prendi(passo.dopo);
    prendi(passo.aiuti?.testo);
    prendi(passo.senza);
    prendi(passo.erroreSenso);
    prendi(passo.erroreTap);
    prendi(passo.erroreLascia);
    prendi(passo.indizi);
    prendi(passo.eventi);
    prendi(passo.dopoPausa);
    prendi(passo.entra?.indizi);
    prendi(passo.fatto?.indizi);
    prendi(passo.fatto?.spunta);
  }
  ids.push('corr.1', 'corr.2', 'corr.3', 'corr.nuda', 'corr.calma', 'dlg.ripresa');
  return [...new Set(ids)];
}

export const corrRotazione = ['corr.1', 'corr.2', 'corr.3'];
