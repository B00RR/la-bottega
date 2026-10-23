/** Parametri unici dei gesti. Il dito che esce dall'area mette in pausa, non azzera. */
export const gesti = {
  tap: { ms: 250, px: 12, area: 56, bottone: 72 },
  girare: { gradiPerPx: 0.6, scatto: 25, molla: 0.25, tiltMax: 5 },
  lente: { offsetY: -70, raggio: 55, conferma: 0.4, vaga: 8 },
  cerchio: { rMin: 24, rMax: 180, scarto: 45, svita: 540, avvita: 360, nastro: 720, aggancio: 80 },
  strofinare: { raggio: 90, strada: 1400, bonus: 70 },
  trascinare: { presa: 60, sopra: 30, scatto: 70 },
  scorri: { corridoio: 45, ganci: [0.25, 0.5, 0.75] },
  pinzette: { presa: 60, lascia: 60 },
};

export const rad = (gradi) => (gradi * Math.PI) / 180;
