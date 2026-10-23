/** Android ha navigator.vibrate. Su iPhone non c'è: il suono e l'animazione bastano. */
export function vibra(schema) {
  const fn = typeof navigator !== 'undefined' ? navigator.vibrate : null;
  if (typeof fn !== 'function') return false;
  try {
    return fn.call(navigator, schema) !== false;
  } catch {
    return false;
  }
}
