// Parameter access: every number used by the physics core comes from the
// editable JSON data files, with units and provenance alongside.
import P from './data/physics.json' with { type: 'json' };
import LEDGER from './data/titanic_ledger.json' with { type: 'json' };

export const DATA = P;
export const TITANIC_LEDGER = LEDGER;
export function v(path) {
  const parts = path.split('.');
  let o = P;
  for (const p of parts) { o = o[p]; if (o === undefined) throw new Error('missing parameter ' + path); }
  return o.value;
}
export const LONG_TON = 1016.0469;
