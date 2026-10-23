const CAMPI_PARTE = [
  'aperto',
  'pulizia',
  'scoperta',
  'estratta',
  'inserita',
  'aPosto',
  'avvolto',
  'scoperto',
];

export function mondoVuoto() {
  return {
    oggetti: {
      torcia: { visibile: false, posa: 'ingresso', acceso: false },
      telecomando: { visibile: false, posa: 'ingresso', acceso: false },
    },
    parti: {
      tappo: { aperto: 0 },
      macchia: { pulizia: 0, scoperta: false },
      contatto: { pulizia: 0 },
      pila_a: { estratta: false },
      pila_b: { estratta: false },
      pila_nuova_a: { inserita: false },
      pila_nuova_b: { inserita: false },
      guscio: { aperto: 0 },
      molla: { aPosto: false, scoperta: false },
      filo: { avvolto: 0, scoperto: false },
    },
    indizi: [],
    tv: false,
    cassetto: 0,
  };
}

export function applica(mondo, ops) {
  if (!ops) return;
  for (const op of ops) {
    if (op.op === 'oggetto') {
      const oggetto = mondo.oggetti[op.id];
      if (!oggetto) continue;
      if (op.visibile != null) oggetto.visibile = op.visibile;
      if (op.posa) oggetto.posa = op.posa;
      if (op.acceso != null) oggetto.acceso = op.acceso;
    } else if (op.op === 'parte') {
      const parte = mondo.parti[op.id];
      if (!parte) continue;
      for (const campo of CAMPI_PARTE) {
        if (op[campo] != null) parte[campo] = op[campo];
      }
    } else if (op.op === 'indizio') {
      if (!mondo.indizi.includes(op.testo)) mondo.indizi.push(op.testo);
    } else if (op.op === 'tv') {
      mondo.tv = true;
    } else if (op.op === 'cassetto') {
      mondo.cassetto = op.valore;
    }
  }
}

export function ricostruisci(copione, indice) {
  const mondo = mondoVuoto();
  for (let i = 0; i < indice; i += 1) {
    applica(mondo, copione[i].immediato);
    applica(mondo, copione[i].alCompletamento);
  }
  const corrente = copione[indice];
  if (corrente) applica(mondo, corrente.immediato);
  return mondo;
}
