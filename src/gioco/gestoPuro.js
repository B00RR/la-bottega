import { gesti, rad } from '../dati/gesti.js';

export function angoloSchermo(pos, centro) {
  return Math.atan2(-(pos.y - centro.y), pos.x - centro.x);
}

export function deltaAngolo(prima, ora) {
  let d = ora - prima;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function vicinoAngolo(yaw, meta, gradi) {
  return Math.abs(deltaAngolo(meta, yaw)) <= rad(gradi);
}

export function eTap(ms, px) {
  return ms <= gesti.tap.ms && px <= gesti.tap.px;
}

/** Il centro arriva già proiettato in questo frame. Fuori dalla corona: pausa. */
export function passoCerchio(stato, pos, centro, cfg) {
  const d = Math.hypot(pos.x - centro.x, pos.y - centro.y);
  if (d < cfg.rMin || d > cfg.rMax) {
    return { ...stato, ultimo: null, pausa: true, errore: 0, fatto: false };
  }
  const ang = angoloSchermo(pos, centro);
  if (stato.ultimo == null) {
    return { ...stato, ultimo: ang, pausa: false, errore: 0, fatto: false };
  }
  const delta = deltaAngolo(stato.ultimo, ang);
  if (Math.abs(delta) > cfg.scarto) {
    return { ...stato, ultimo: ang, pausa: false, errore: 0, fatto: stato.progresso >= cfg.richiesti };
  }
  const utile = cfg.senso === 'antiorario' ? delta : -delta;
  let progresso = stato.progresso;
  let errore = stato.erroreSenso || 0;
  let aggiunto = 0;
  if (utile > 0) {
    progresso += utile;
    aggiunto = utile;
  } else if (utile < 0) {
    errore += -utile;
  }
  const fatto = progresso >= cfg.richiesti;
  return {
    progresso: Math.min(progresso, cfg.richiesti),
    ultimo: ang,
    erroreSenso: errore,
    errore: utile < 0 ? -utile : 0,
    aggiunto,
    pausa: false,
    fatto,
  };
}

export function passoStrofina(stato, pos, centro, cfg) {
  const d = Math.hypot(pos.x - centro.x, pos.y - centro.y);
  if (d > cfg.raggio) return { ...stato, ultimo: null, pausa: true, aggiunto: 0 };
  if (!stato.ultimo) return { ...stato, ultimo: { x: pos.x, y: pos.y, dx: 0, dy: 0 }, pausa: false, aggiunto: 0 };
  const dx = pos.x - stato.ultimo.x;
  const dy = pos.y - stato.ultimo.y;
  const passo = Math.hypot(dx, dy);
  if (passo < 0.4) return { ...stato, pausa: false, aggiunto: 0 };
  let strada = passo;
  let inversione = false;
  const prima = stato.ultimo.dx * dx + stato.ultimo.dy * dy;
  if (stato.ultimo.dx || stato.ultimo.dy) {
    if (prima < 0) {
      strada += cfg.bonus;
      inversione = true;
    }
  }
  const progresso = Math.min(1, stato.progresso + strada / cfg.strada);
  return {
    progresso,
    ultimo: { x: pos.x, y: pos.y, dx, dy },
    pausa: false,
    inversione,
    aggiunto: progresso - stato.progresso,
    fatto: progresso >= 1,
  };
}

export function passoScorri(stato, pos, a, b, corridoio) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby || 1;
  let t = ((pos.x - a.x) * abx + (pos.y - a.y) * aby) / len2;
  const cx = a.x + abx * Math.max(0, Math.min(1, t));
  const cy = a.y + aby * Math.max(0, Math.min(1, t));
  if (Math.hypot(pos.x - cx, pos.y - cy) > corridoio) {
    return { ...stato, pausa: true };
  }
  t = Math.max(0, Math.min(1, t));
  const progresso = Math.max(stato.progresso, t);
  return { progresso, pausa: false, fatto: progresso >= 0.98 };
}

export function statoCerchio() {
  return { progresso: 0, ultimo: null, erroreSenso: 0 };
}

export function statoStrofina(progresso = 0) {
  return { progresso, ultimo: null };
}
