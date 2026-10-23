/**
 * Battute per id. In gioco non si scrivono frasi sparse.
 * `nelTutorial` è il copione (sezione 3): il totale deve restare ≤ 160 parole.
 * Le correzioni a rotazione e la ripresa non fanno parte di quella somma,
 * ma nessuna battuta può superare le 10 parole.
 */
export const battute = {
  'dlg.b3.1': 'Ah, sei tu. Puntuale, quasi.',
  'dlg.b3.2': 'Questa non si accende.',
  'dlg.b4.dopo': 'Appunto. Morta.',
  'dlg.b4.a3': 'Il bottone. Prova, non morde.',
  'dlg.b5.1': 'Girala. Gli oggetti parlano.',
  'dlg.b5.scatto': 'Mh. Vedi quel verdino?',
  'dlg.b5.a3': 'Trascina col dito. Falla girare.',
  'dlg.b6.1': 'La lente. Prima si guarda.',
  'dlg.b6.dopo': 'Ossido. Le pile hanno pianto.',
  'dlg.b6.a3': 'Lì, sul tappo. Avvicina.',
  'dlg.b6.nuda': 'Prima la lente, ragazzo.',
  'dlg.b7.1': 'Apriamo. Cacciavite a croce.',
  'dlg.b7.a3': 'Gira. Come per aprire un barattolo.',
  'dlg.b7.senso': 'Al contrario. A sinistra si svita.',
  'dlg.b8.1': 'Due guasti. Del 2019, pure.',
  'dlg.b8.2': 'Prima il contatto. Pennellino.',
  'dlg.b8.a3': 'Avanti e indietro. Senza paura.',
  'dlg.b8.tap': 'Strofina, non bussare.',
  'dlg.b8.dopo': 'Ecco. Brilla.',
  'dlg.b9.1': 'Ora quelle due. Fuori.',
  'dlg.b9.a3': 'Tirala, dai. Non è incollata.',
  'dlg.b10.1': 'Nuove. Dal cassetto.',
  'dlg.b10.fuori': 'Dentro il tubo, ragazzo.',
  'dlg.b11.1': 'Richiudi. Stavolta a destra.',
  'dlg.b11.a3': 'Il cacciavite. Giro al contrario.',
  'dlg.b12.1': 'E adesso, il momento.',
  'dlg.b12.dopo1': 'Ahi! Non in faccia!',
  'dlg.b12.dopo2': 'Mh. Mani buone.',
  'dlg.r1.1': 'Il mio telecomando. Meno chiacchiere.',
  'dlg.r1.dopo': 'Niente. Come sempre.',
  'dlg.r3.1': 'La leva. Segui la fessura.',
  'dlg.r4.1': 'Guarda dentro.',
  'dlg.r5.1': 'Le pinzette. La molla a casa.',
  'dlg.r6.1': 'Nastro. Gira a sinistra.',
  'dlg.r8.dopo': 'Ah. Il derby.',
  'dlg.fine.1': 'La base ce l\u2019hai.',
  'dlg.fine.2': 'Domani ti mando dalla signora del terzo piano.',
  'corr.1': 'Con quello? Mh. No.',
  'corr.2': 'Quello serve dopo, forse.',
  'corr.3': 'Bello, ma non c\u2019entra.',
  'corr.nuda': 'A mani nude? Coraggioso.',
  'corr.calma': 'Calma. Guarda cosa pulsa.',
  'corr.verso': 'A sinistra. Si avvolge così.',
  'corr.destra': 'A destra, stavolta.',
  'dlg.ripresa': 'Dov\u2019eravamo? Ah, s\u00ec.',
};

export const nelTutorial = [
  'dlg.b3.1', 'dlg.b3.2', 'dlg.b4.dopo', 'dlg.b4.a3',
  'dlg.b5.1', 'dlg.b5.scatto', 'dlg.b5.a3',
  'dlg.b6.1', 'dlg.b6.dopo', 'dlg.b6.a3', 'dlg.b6.nuda',
  'dlg.b7.1', 'dlg.b7.a3', 'dlg.b7.senso',
  'dlg.b8.1', 'dlg.b8.2', 'dlg.b8.a3', 'dlg.b8.tap', 'dlg.b8.dopo',
  'dlg.b9.1', 'dlg.b9.a3',
  'dlg.b10.1', 'dlg.b10.fuori',
  'dlg.b11.1', 'dlg.b11.a3',
  'dlg.b12.1', 'dlg.b12.dopo1', 'dlg.b12.dopo2',
  'dlg.r1.1', 'dlg.r1.dopo',
  'dlg.r3.1', 'dlg.r4.1', 'dlg.r5.1', 'dlg.r6.1', 'dlg.r8.dopo',
  'dlg.fine.1', 'dlg.fine.2',
];

export const indizi = {
  'indizio.contatto': 'contatto ossidato',
  'indizio.pile': 'pile morte',
  'indizio.filo': 'filo scoperto',
  'indizio.molla': 'molla spostata',
};

export const ui = {
  'ui.audio.on': 'Audio acceso',
  'ui.audio.off': 'Audio spento',
  'ui.movimento': 'Riduci movimento',
  'ui.movimento.on': 'Movimento ridotto',
  'ui.testo': 'Testo pi\u00f9 grande',
  'ui.testo.on': 'Testo grande',
  'ui.chiudi': 'Chiudi',
  'ui.salta': 'Salta tutorial',
  'ui.continua': 'Continua domani',
  'ui.rigioca': 'Rigioca',
  'ui.pina': 'Sig.ra Pina \u00b7 3\u00b0 piano',
  'ui.cartello': 'La Bottega \u00b7 Riparazioni',
  'ui.domani': 'Domani',
  'ui.timbro': 'RIPARATO',
  'ui.taccuino': 'Taccuino',
  'ui.impostazioni': 'Impostazioni',
  'ui.webgl': 'Questo telefono non riesce ad aprire la bottega in 3D.',
};

const mancanti = new Set();

export function parole(frase) {
  return String(frase).trim().split(/\s+/).filter(Boolean).length;
}

export function t(id) {
  if (battute[id]) return battute[id];
  if (indizi[id]) return indizi[id];
  if (ui[id]) return ui[id];
  if (!mancanti.has(id)) {
    mancanti.add(id);
    console.error(`Battuta mancante: ${id}`);
  }
  return '\u2026';
}

export function battuteMancanti() {
  return [...mancanti];
}

export function validaId(ids) {
  for (const id of ids) t(id);
  return battuteMancanti();
}
