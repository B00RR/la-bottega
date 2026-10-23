import { battute, indizi, nelTutorial, parole } from '../src/dati/testi.js';

const errori = [];
for (const [id, frase] of Object.entries(battute)) {
  const n = parole(frase);
  if (n > 10) errori.push(`${id} ha ${n} parole`);
  if (n > 8 && nelTutorial.includes(id)) errori.push(`${id} nel copione ha ${n} parole (obiettivo 8)`);
}
for (const [id, frase] of Object.entries(indizi)) {
  const n = parole(frase);
  if (n !== 2) errori.push(`${id} dovrebbe avere 2 parole, ne ha ${n}`);
}
let totale = 0;
for (const id of nelTutorial) {
  if (!battute[id]) errori.push(`manca ${id}`);
  else totale += parole(battute[id]);
}
if (totale > 160) errori.push(`totale copione ${totale} > 160`);
if (errori.length) {
  console.error(errori.join('\n'));
  process.exit(1);
}
console.log(`parole del copione: ${totale}`);
