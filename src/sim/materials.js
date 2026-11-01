// Cell materials of the ship structure grid.
//
// Every cell of the 0.5 m grid is one of three kinds:
//   SOLID - plating, decks, bulkheads, machinery foundations, masts...
//   SPACE - an interior volume that can hold air or floodwater (a "room" cell)
//   OPEN  - a passage through a deck or wall (hatch, stair, door, skylight)
// EMPTY cells are outside the ship.
//
// Plate thickness `t` (m) is used for the 2.5D mass model and for hull girder
// section properties; `burst` is the pressure difference (Pa) a panel of this
// material survives before it ruptures; `rustRate` is the fraction of the
// plate consumed per year on the abyssal seabed (rusticle-accelerated).

export const EMPTY = 0, SOLID = 1, SPACE = 2, OPEN = 3;

const M = [];
let nextId = 0;
function def(key, props) {
  const id = nextId++;
  const m = Object.assign({
    id, key, kind: SOLID, t: 0.012, burst: 4e5, strength: false,
    rustRate: 0.004, perm: 1, outfit: 0, color: '#555', name: key,
  }, props);
  M[id] = m;
  return id;
}

export const MAT = {};
MAT.NONE      = def('none',      { kind: EMPTY, name: 'Open sea' });
// --- structure ---------------------------------------------------------
MAT.HULL      = def('hull',      { t: 0.028, burst: 2.6e6, strength: true, rustRate: 0.0036, name: 'Shell plating', color: '#2b2f33' });
MAT.KEEL      = def('keel',      { t: 0.045, burst: 4e6, strength: true, rustRate: 0.0025, name: 'Keel & bottom shell', color: '#23272b' });
MAT.DECK      = def('deck',      { t: 0.016, burst: 5.5e5, strength: true, rustRate: 0.0055, name: 'Steel deck', color: '#5c5f63' });
MAT.WDECK     = def('wdeck',     { t: 0.018, burst: 5.5e5, strength: true, rustRate: 0.0055, name: 'Weather deck (pine planking)', color: '#8a7a5c' });
MAT.TANKTOP   = def('tanktop',   { t: 0.026, burst: 1.6e6, strength: true, rustRate: 0.003, name: 'Inner bottom (tank top)', color: '#4a4d50' });
MAT.BHD       = def('bhd',       { t: 0.0127, burst: 9e5, strength: false, rustRate: 0.004, name: 'Watertight bulkhead', color: '#6b6f74' });
MAT.PART      = def('part',      { t: 0.006, burst: 6e4, strength: false, rustRate: 0.012, name: 'Light steel/wood partition', color: '#7c7468' });
MAT.SUPER     = def('super',     { t: 0.0095, burst: 1.8e5, strength: false, rustRate: 0.008, name: 'Superstructure plating', color: '#e8e4da' });
MAT.CASING    = def('casing',    { t: 0.008, burst: 1.2e5, strength: false, rustRate: 0.01, name: 'Boiler/engine casing', color: '#6d6a66' });
MAT.FUNNEL    = def('funnel',    { t: 0.008, burst: 1e9, strength: false, rustRate: 0.011, name: 'Funnel (free-flooding)', color: '#c48a3a' });
MAT.MAST      = def('mast',      { t: 0.012, burst: 1e9, strength: false, rustRate: 0.007, name: 'Steel mast', color: '#c9a36b' });
MAT.RUDDER    = def('rudder',    { t: 0.05, burst: 1e9, strength: false, rustRate: 0.0015, name: 'Rudder (cast steel)', color: '#3a2a22' });
MAT.MACHINE   = def('machine',   { t: 0.05, burst: 1e9, strength: false, rustRate: 0.0012, name: 'Machinery', color: '#3d3a37' });
MAT.ICE       = def('ice',       { t: 1, burst: 1e9, strength: false, rustRate: 0, name: 'Glacial ice', color: '#d8eef7' });
MAT.BOAT      = def('boat',      { t: 0.02, burst: 1e9, strength: false, rustRate: 0, name: 'Lifeboat (yellow pine)', color: '#f2efe6' });
// --- spaces (perm = permeability: fraction of volume floodwater can occupy)
MAT.HOLD      = def('hold',      { kind: SPACE, perm: 0.60, outfit: 60, name: 'Cargo hold', color: '#6e5b45' });
MAT.BOILER    = def('boiler',    { kind: SPACE, perm: 0.85, outfit: 0, name: 'Boiler room (stokehold)', color: '#4a3b33' });
MAT.ENGINE    = def('engine',    { kind: SPACE, perm: 0.85, outfit: 0, name: 'Engine room', color: '#4b4540' });
MAT.BUNKER    = def('bunker',    { kind: SPACE, perm: 0.45, outfit: 0, name: 'Coal bunker', color: '#262422' });
MAT.CABIN     = def('cabin',     { kind: SPACE, perm: 0.95, outfit: 55, name: 'Cabins', color: '#cdb995' });
MAT.PUBLIC    = def('public',    { kind: SPACE, perm: 0.95, outfit: 45, name: 'Public rooms', color: '#d8c49a' });
MAT.CREW      = def('crew',      { kind: SPACE, perm: 0.95, outfit: 50, name: 'Crew quarters', color: '#b9a888' });
MAT.STAIR     = def('stair',     { kind: SPACE, perm: 0.98, outfit: 25, name: 'Stairway', color: '#c7a26a' });
MAT.CORRIDOR  = def('corridor',  { kind: SPACE, perm: 0.98, outfit: 20, name: 'Working passage', color: '#b5aa96' });
MAT.TANK      = def('tank',      { kind: SPACE, perm: 0.98, outfit: 0, name: 'Double-bottom tank', color: '#3e4a52' });
MAT.STORE     = def('store',     { kind: SPACE, perm: 0.70, outfit: 120, name: 'Stores / mail', color: '#8d7a5e' });
MAT.TUNNEL    = def('tunnel',    { kind: SPACE, perm: 0.90, outfit: 30, name: 'Shaft tunnel', color: '#56514a' });
MAT.PROMENADE = def('promenade', { kind: SPACE, perm: 0.99, outfit: 10, name: 'Promenade', color: '#d9d2bf' });
MAT.WHEEL     = def('wheel',     { kind: SPACE, perm: 0.95, outfit: 40, name: 'Bridge & officers', color: '#d4c7a7' });
MAT.GALLEY    = def('galley',    { kind: SPACE, perm: 0.85, outfit: 90, name: 'Galley / pantry', color: '#bfae8c' });
MAT.CASEIN    = def('casein',    { kind: SPACE, perm: 0.98, outfit: 5, name: 'Boiler casing (uptake)', color: '#3b3632' });
// --- openings (passages within a deck or wall)
MAT.HATCH     = def('hatch',     { kind: OPEN, burst: 1e9, name: 'Cargo hatch' });
MAT.STAIRWELL = def('stairwell', { kind: OPEN, burst: 1e9, name: 'Stairwell' });
MAT.DOOR      = def('door',      { kind: OPEN, burst: 1e9, name: 'Door' });
MAT.WTDOOR    = def('wtdoor',    { kind: OPEN, burst: 1.2e6, name: 'Watertight door' });
MAT.SKYLIGHT  = def('skylight',  { kind: OPEN, burst: 4e4, name: 'Glass dome / skylight' });
MAT.COVER     = def('cover',     { kind: OPEN, burst: 2.5e4, name: 'Hatch cover (tarpaulin)' });
MAT.GRATING   = def('grating',   { kind: OPEN, burst: 1e9, name: 'Grating / fiddley' });

export const MATERIALS = M;
export const matKind = M.map(m => m.kind);

// Side openings: things in the side plating (the plane we look at).
export const SIDE = {
  NONE: 0,
  PORTHOLE: 1,      // 16" sidelight, closed, thick glass
  WINDOW: 2,        // large rectangular window (B/A decks)
  PROMENADE: 3,     // open promenade bay
  GANGWAY: 4,       // shell door, closed
  BREACH: 5,        // damage: a hole in the shell
  OPENPORT: 6,      // porthole left open
};
export const SIDE_INFO = [
  null,
  { area: 0.13, burst: 3.5e5, name: 'Porthole (closed)' },
  { area: 1.0, burst: 6e4, name: 'Window' },
  { area: 1.0, burst: 0, name: 'Open promenade' },
  { area: 3.0, burst: 1.5e5, name: 'Gangway door' },
  { area: 0, burst: 0, name: 'Hull breach' },
  { area: 0.13, burst: 0, name: 'Open porthole' },
];
