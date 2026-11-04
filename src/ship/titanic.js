// RMS Titanic (Harland & Wolff yard no. 401, 1911) as a structure grid.
//
// Dimensions follow the builder's figures: LOA 882 ft 9 in (269.06 m), LBP
// 850 ft (259.08 m), moulded breadth 92 ft 6 in (28.19 m), load draught
// 34 ft 7 in (10.54 m), 15 transverse watertight bulkheads (A-P, no "I"),
// bulkheads A, B and K-P watertight to D deck, C-J only to E deck, double
// bottom 5 ft 3 in deep, four 24.5 x 19 ft funnels raked 2 in per foot,
// top of funnels 175 ft above keel. Deck heights are reconstructed from the
// deck-to-deck spacings given by the yard plans (orlop 21 ft 1 in above keel,
// then 8, 8, 8.5, 9, 10.5, 9, 9, 9.5 ft).
//
// Coordinates used while designing: xb = metres aft of the stem (bow = 0),
// z = metres above the keel. The grid stores x = X0 - xb so the bow faces +x.

import { CELL } from '../sim/constants.js';
import { MAT, SIDE, SIDE_INFO, MATERIALS, SOLID, SPACE, OPEN } from '../sim/materials.js';
import { ShipGrid, assignMassAndVolume } from '../sim/grid.js';

export const X0 = 270.5;                 // grid x of the stem
export const LOA = 269.06, BEAM = 28.19, HB = BEAM / 2;
export const DESIGN_DRAUGHT = 10.54;

const FT = 0.3048;
export const DECK_Z = {                  // midship height above keel, m
  TANK: 1.60, ORLOP: 6.43, G: 8.87, F: 11.31, E: 13.90, D: 17.10, C: 19.85,
  B: 22.60, A: 25.35, BOAT: 28.25, HOUSE: 31.0,
};
const DECK_NAMES = ['DB', 'Orlop', 'G', 'F', 'E', 'D', 'C', 'B', 'A', 'Boat', 'House'];

// Watertight bulkheads (xb, m) and the deck they are watertight to.
export const BULKHEADS = [
  { id: 'A', xb: 14.0, top: 'C' }, { id: 'B', xb: 27.7, top: 'D' },
  { id: 'C', xb: 43.3, top: 'E' }, { id: 'D', xb: 58.8, top: 'E' },
  { id: 'E', xb: 75.3, top: 'E' }, { id: 'F', xb: 92.7, top: 'E' },
  { id: 'G', xb: 110.0, top: 'E' }, { id: 'H', xb: 127.4, top: 'E' },
  { id: 'J', xb: 145.7, top: 'E' }, { id: 'K', xb: 156.7, top: 'D' },
  { id: 'L', xb: 177.7, top: 'D' }, { id: 'M', xb: 195.1, top: 'D' },
  { id: 'N', xb: 211.5, top: 'D' }, { id: 'O', xb: 228.0, top: 'D' },
  { id: 'P', xb: 246.3, top: 'D' },
];
export const COMPARTMENTS = [
  'Fore peak', 'No. 1 hold', 'No. 2 hold', 'No. 3 hold', 'No. 6 boiler room',
  'No. 5 boiler room', 'No. 4 boiler room', 'No. 3 boiler room', 'No. 2 boiler room',
  'No. 1 boiler room', 'Reciprocating engines', 'Turbine room', 'Electric engine room',
  'No. 4-5 holds', 'Shaft tunnel & stores', 'After peak',
];
export const SHORT_COMPARTMENTS = ['FP', 'H1', 'H2', 'H3', 'B6', 'B5', 'B4', 'B3', 'B2', 'B1', 'RE', 'TR', 'EL', 'H4', 'ST', 'AP'];

export const FUNNELS = [76.2, 111.6, 147.0, 182.4];   // xb of base centre
export const FUNNEL_RAKE = 2 / 12;                    // horizontal per vertical
export const FUNNEL_LEN = 24.5 * FT;                  // 7.47 m fore-aft
export const FUNNEL_BREADTH = 19 * FT;                // 5.79 m athwartships
export const FUNNEL_TOP = 175 * FT;                   // 53.3 m above keel
export const EXPANSION_JOINTS = [96.2, 164.6];
const MASTS = [{ xb: 44.6, base: 'C', top: 62.0 }, { xb: 232.8, base: 'C', top: 58.5 }];

// ----- hull geometry ---------------------------------------------------
export function sheer(xb) {
  const m = 128;
  if (xb < m) { const u = (m - xb) / m; return 2.35 * u * u; }
  const u = (xb - m) / (LOA - m); return 1.20 * u * u;
}
export function deckZ(name, xb) {
  const z0 = DECK_Z[name];
  const f = Math.min(1, Math.max(0, (z0 - DECK_Z.TANK) / (DECK_Z.C - DECK_Z.TANK)));
  return z0 + sheer(xb) * (name === 'TANK' ? 0.15 : 0.35 + 0.65 * f);
}
export function stemXb(z) {          // xb of the stem at height z
  const R = 3.6;
  const straight = (zz) => 1.55 - zz * 0.052;
  if (z >= R) return straight(z);
  return straight(R) + R - Math.sqrt(Math.max(0, R * R - (R - z) * (R - z)));
}
export const POST = 252.6;          // sternpost
export function sternXb(z) {        // aft-most xb of hull at height z (counter stern)
  if (z < 8.2) return POST;
  const t = Math.min(1, (z - 8.2) / 12.4);
  return POST + (LOA - 0.15 - POST) * Math.sqrt(1 - (1 - t) * (1 - t));
}
export function hullTop(xb) {           // top of the black-painted shell
  if (xb < 39.0) return deckZ('B', xb);           // forecastle
  if (xb < 57.6) return deckZ('C', xb);           // forward well deck
  if (xb < 225.6) return deckZ('B', xb);          // bridge deck amidships
  if (xb < 237.0) return deckZ('C', xb);          // after well deck
  return deckZ('B', xb);                          // poop
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function wlHalf(xb) {                    // design waterline half-breadth
  if (xb < 1.2) return 0;
  if (xb < 92) { const u = (xb - 1.2) / 90.8; return HB * Math.pow(1 - Math.pow(1 - u, 1.85), 1.12); }
  if (xb < 166) return HB;
  if (xb < 257.5) { const v = (xb - 166) / 91.5; return HB * Math.pow(Math.max(0, 1 - Math.pow(v, 1.55)), 1.05); }
  return 0;
}
function counterHalf(xb) {               // half-breadth at upper deck aft (elliptical stern)
  if (xb < 186) return HB;
  const u = (xb - 186) / (LOA + 0.4 - 186);
  return HB * Math.sqrt(Math.max(0, 1 - u * u));
}
// Half-breadth of the hull at (xb, z): 2.5D volume model.
export function halfBreadth(xb, z) {
  const T = DESIGN_DRAUGHT;
  const bw = wlHalf(xb);
  const k = smooth(0.35, 0.985, bw / HB);           // section fullness
  let below;
  const R = 2.3;                                   // bilge radius
  const zz = Math.min(z, T);
  const box = zz < R ? (bw - R + Math.sqrt(Math.max(0, R * R - (R - zz) * (R - zz)))) : bw;
  const vee = Math.max(0.35, bw * Math.pow(Math.max(0, zz) / T, 0.78));
  below = Math.max(0.35, k * box + (1 - k) * vee);
  if (z <= T) return Math.min(below, HB);
  // above the waterline
  if (xb < 70) {                                   // bow flare
    const flare = 0.30 * Math.pow(1 - xb / 70, 1.3);
    const atDeck = Math.min(HB, bw + (z - T) * flare + (z - T) * 0.02);
    return Math.max(0.35, atDeck);
  }
  if (xb > 170) {
    const up = smooth(T - 1, T + 7, z);
    return Math.max(0.35, Math.min(HB, bw * (1 - up) + counterHalf(xb) * up));
  }
  return HB;
}

// ----- design ------------------------------------------------------------
export function buildTitanic(opts = {}) {
  const W = Math.ceil(272 / CELL), H = Math.ceil(66 / CELL);
  const grid = new ShipGrid(W, H, -1.0);
  const xbOf = (i) => X0 - grid.cx(i);
  const zOf = (j) => grid.cy(j);
  const colOf = (xb) => grid.col(X0 - xb);
  const rowOf = (z) => grid.row(z);
  const meta = {
    name: 'RMS Titanic', short: 'Titanic', X0, loa: LOA, beam: BEAM, draught: DESIGN_DRAUGHT,
    compartments: COMPARTMENTS, shortCompartments: SHORT_COMPARTMENTS, bulkheads: BULKHEADS,
    deckNames: DECK_NAMES, funnels: [], masts: [], portholes: [], lifeboats: [],
    expansionJoints: EXPANSION_JOINTS.map(xb => X0 - xb), heavy: [],
  };

  const inHull = (xb, z) => z >= 0 && z <= hullTop(xb) + 0.26 && xb >= stemXb(z) && xb <= sternXb(z);

  // superstructure houses: [xb0, xb1, zBottomDeck, zTopDeck, halfBreadth, type]
  const houses = [
    { a: 57.6, b: 225.6, lo: 'B', hi: 'A', hb: HB, type: MAT.CABIN },        // B deck
    { a: 58.6, b: 216.5, lo: 'A', hi: 'BOAT', hb: HB - 0.15, type: MAT.PUBLIC }, // A deck
    { a: 59.4, b: 71.8, lo: 'BOAT', hi: 'HOUSE', hb: 8.6, type: MAT.WHEEL },  // officers & bridge
    { a: 84.2, b: 93.0, lo: 'BOAT', hi: 'HOUSE', hb: 6.0, type: MAT.STAIR },  // grand staircase entrance
    { a: 98.0, b: 107.6, lo: 'BOAT', hi: 'HOUSE', hb: 5.0, type: MAT.PUBLIC }, // gymnasium
    { a: 120.5, b: 140.5, lo: 'BOAT', hi: 'HOUSE', hb: 6.5, type: MAT.PUBLIC }, // lounge roof
    { a: 151.9, b: 159.2, lo: 'BOAT', hi: 'HOUSE', hb: 6.0, type: MAT.STAIR }, // aft 1st class entrance
    { a: 166.0, b: 178.0, lo: 'BOAT', hi: 'HOUSE', hb: 6.5, type: MAT.PUBLIC }, // smoke room roof
    { a: 196.0, b: 212.0, lo: 'BOAT', hi: 'HOUSE', hb: 7.0, type: MAT.PUBLIC }, // 2nd class entrance
  ];
  const houseAt = (xb, z) => {
    for (const hs of houses) {
      if (xb >= hs.a && xb <= hs.b && z > deckZ(hs.lo, xb) - 0.26 && z <= deckZ(hs.hi, xb) + 0.26) return hs;
    }
    return null;
  };
  const deckBand = (xb, z) => {
    const order = ['TANK', 'ORLOP', 'G', 'F', 'E', 'D', 'C', 'B', 'A', 'BOAT', 'HOUSE'];
    let b = 0;
    for (let d = 0; d < order.length; d++) if (z >= deckZ(order[d], xb) - 0.01) b = d;
    return b;
  };
  const zoneOf = (xb) => { let z = 0; for (const b of BULKHEADS) if (xb > b.xb) z++; return z; };

  // 1. envelope + breadth + space typing
  for (let j = 0; j < H; j++) {
    const z = zOf(j);
    for (let i = 0; i < W; i++) {
      const xb = xbOf(i);
      const k = grid.idx(i, j);
      if (inHull(xb, z)) {
        grid.breadth[k] = 2 * halfBreadth(xb, z);
        grid.set(i, j, spaceType(xb, z));
        grid.zone[k] = zoneOf(xb);
        grid.deck[k] = deckBand(xb, z);
      } else {
        const hs = houseAt(xb, z);
        if (hs) {
          grid.breadth[k] = 2 * Math.min(hs.hb, halfBreadth(xb, Math.min(z, 21)));
          grid.set(i, j, hs.type === MAT.CABIN ? houseSpace(xb, z, hs) : hs.type);
          grid.flags[k] |= 1;
          grid.zone[k] = zoneOf(xb);
          grid.deck[k] = deckBand(xb, z);
        }
      }
    }
  }

  function spaceType(xb, z) {
    const tank = deckZ('TANK', xb), orlop = deckZ('ORLOP', xb), G = deckZ('G', xb), F = deckZ('F', xb);
    const E = deckZ('E', xb), D = deckZ('D', xb), C = deckZ('C', xb);
    if (xb < 14.0) {                                  // fore peak
      if (z < G) return MAT.TANK;
      if (z < E) return MAT.STORE;
      return MAT.CREW;
    }
    if (z < tank) return MAT.TANK;                    // double bottom
    if (xb < 58.8) {                                  // holds 1-3, 3rd class above
      if (z < G) return MAT.HOLD;
      if (z < F) return xb < 27.7 ? MAT.STORE : MAT.HOLD;
      if (z < C) return MAT.CABIN;
      return MAT.CREW;
    }
    if (xb < 156.7) {                                 // boiler rooms
      if (z < F) {
        // coal bunkers against the bulkheads (both ends of each stokehold)
        for (const b of BULKHEADS) if (b.xb >= 58.8 && b.xb <= 156.7 && Math.abs(xb - b.xb) < 2.6) return MAT.BUNKER;
        return MAT.BOILER;
      }
      if (z < E) return MAT.CORRIDOR;
      return MAT.CABIN;
    }
    if (xb < 195.1) {                                 // engine rooms
      if (z < E) return MAT.ENGINE;
      return MAT.CABIN;
    }
    if (xb < 211.5) {
      if (z < F) return MAT.ENGINE;                   // electric engine room
      return MAT.CABIN;
    }
    if (xb < 246.3) {
      if (z < orlop) return xb < 228 ? MAT.STORE : MAT.TUNNEL;
      if (z < F) return MAT.HOLD;
      return MAT.CABIN;
    }
    if (z < G) return MAT.TANK;                        // after peak tank
    if (z < E) return MAT.STORE;
    return MAT.CABIN;
  }
  function houseSpace(xb, z, hs) {
    if (xb > 160 && xb < 192) return MAT.PUBLIC;       // a la carte restaurant & cafe
    if (xb > 82 && xb < 95) return MAT.STAIR;
    return MAT.CABIN;
  }

  // helpers to draw structure in design coordinates
  const deckLine = (name, a, b, m) => {
    const i0 = colOf(b), i1 = colOf(a);
    for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i++) {
      const xb = xbOf(i);
      if (xb < a || xb > b) continue;
      const j = rowOf(deckZ(name, xb));
      const k = grid.idx(i, j);
      if (grid.kind[k] === 0) continue;               // outside the envelope
      grid.set(i, j, m);
      grid.flags[k] |= 8;                             // deck row (keeps strength under casings/hatches)
    }
  };
  const vLine = (xb, z0, z1, m, onlyEnvelope = true) => {
    const i = colOf(xb);
    for (let j = rowOf(z0); j <= rowOf(z1); j++) {
      const k = grid.idx(i, j);
      if (onlyEnvelope && grid.kind[k] === 0) continue;
      grid.set(i, j, m);
    }
  };
  const openDeck = (name, a, b, m, width) => {        // passage through a deck
    for (let i = colOf(b); i <= colOf(a); i++) {
      const xb = xbOf(i);
      if (xb < a || xb > b) continue;
      const j = rowOf(deckZ(name, xb));
      const k = grid.idx(i, j);
      if (grid.kind[k] !== SOLID) continue;
      grid.set(i, j, m); grid.openW[k] = width;
      if (m === MAT.SKYLIGHT || m === MAT.COVER) grid.gate[k] = 1;
    }
  };
  const openWall = (xb, z0, z1, m, width, closed = 0) => {
    const i = colOf(xb);
    for (let j = rowOf(z0); j <= rowOf(z1); j++) {
      const k = grid.idx(i, j);
      if (grid.kind[k] !== SOLID) continue;
      grid.set(i, j, m); grid.openW[k] = width; grid.gate[k] = closed;
    }
  };

  // 2. decks
  deckLine('TANK', 14.0, 246.3, MAT.TANKTOP);
  deckLine('ORLOP', 14.0, 58.8, MAT.DECK);
  deckLine('ORLOP', 211.5, 252, MAT.DECK);
  deckLine('G', 0, 58.8, MAT.DECK);
  deckLine('G', 211.5, 262, MAT.DECK);
  deckLine('F', 0, 156.7, MAT.DECK);
  deckLine('F', 195.1, 262, MAT.DECK);
  deckLine('E', 0, 266, MAT.DECK);
  deckLine('D', 0, 268, MAT.DECK);
  deckLine('C', 0, 269, MAT.DECK);
  deckLine('B', 0, 39.0, MAT.WDECK);                   // forecastle deck
  deckLine('B', 57.6, 225.6, MAT.DECK);
  deckLine('B', 237.0, 269, MAT.WDECK);                // poop deck
  deckLine('A', 58.6, 216.5, MAT.DECK);
  deckLine('BOAT', 58.6, 216.5, MAT.WDECK);

  // 3. watertight bulkheads from the keel to their top deck
  for (const b of BULKHEADS) vLine(b.xb, 0.3, deckZ(b.top, b.xb) - 0.01, MAT.BHD);
  // peak tank tops and double bottom longitudinal floors
  vLine(5.5, 0.3, deckZ('G', 5.5), MAT.BHD);

  // 4. non-watertight partitions (fire screens / cabin blocks) on upper decks
  const partitions = [
    { xb: 39.0, z0: 'C', z1: 'B' }, { xb: 57.6, z0: 'C', z1: 'A' },
    { xb: 225.6, z0: 'C', z1: 'A' }, { xb: 237.0, z0: 'C', z1: 'B' },
  ];
  for (const xb of [36, 50, 66, 84, 101, 118, 136, 151, 166, 186, 203, 220, 236, 252]) {
    partitions.push({ xb, z0: 'E', z1: 'D' });
    partitions.push({ xb: xb + 3.1, z0: 'D', z1: 'C' });
  }
  for (const xb of [70, 96.2, 120, 150, 164.6, 190, 210]) {
    partitions.push({ xb, z0: 'B', z1: 'A' });
    partitions.push({ xb: xb + 1.5, z0: 'A', z1: 'BOAT' });
  }
  for (const p of partitions) {
    const z0 = deckZ(p.z0, p.xb), z1 = deckZ(p.z1, p.xb);
    vLine(p.xb, z0 + 0.25, z1 - 0.25, MAT.PART);
    // a door in each partition (corridor)
    openWall(p.xb, z0 + 0.3, z0 + 2.2, MAT.DOOR, 1.4);
  }

  // 5. boiler casings and engine casing. Each casing is a shaft about 8 m wide
  // on the centreline; the decks carry on past it on both sides (Scotland
  // Road to port, the working alley and cabins to starboard). A 2.5D section
  // holds one room per cell, so the casing is drawn as uptake cells inside
  // each deck space, and its connection from the stokeholds to the boat deck
  // is a vertical trunk (meta.trunks) that bypasses the decks in between.
  meta.trunks = [];
  const casingCells = (a, b, z0Deck) => {
    for (let i = colOf(b); i <= colOf(a); i++) {
      const xb = xbOf(i);
      if (xb < a || xb > b) continue;
      for (let j = rowOf(deckZ(z0Deck, xb)) + 1; j < rowOf(deckZ('BOAT', xb)); j++) {
        const k = grid.idx(i, j);
        if (grid.kind[k] === SPACE) grid.set(i, j, MAT.CASEIN);
      }
    }
  };
  for (let f = 0; f < 3; f++) {
    const xc = FUNNELS[f] + 1.0, half = 3.2;
    casingCells(xc - half, xc + half, 'F');
    // each funnel takes the uptakes of the two boiler rooms either side of
    // the bulkhead it straddles; the fiddley gratings round the funnel base
    // (~10 m^2) stay open to the air
    const bh = BULKHEADS.find(b => b.xb > xc - half && b.xb < xc + half);
    for (const xb of [bh.xb - 1.2, bh.xb + 1.2]) {
      meta.trunks.push({ name: `No. ${f + 1} funnel casing`, xb, zBottom: deckZ('F', xb) - 0.75, zTop: deckZ('BOAT', xc), xTop: xc, area: 5, burstArea: 0, burst: 0 });
    }
  }
  {
    const a = 160.5, b = 172.5;                        // engine room casing & skylight
    casingCells(a, b, 'E');
    // ventilators always open (~4 m^2); the glazed skylight (~20 m^2) opens
    // when the pressure across it exceeds what the glass can carry
    meta.trunks.push({ name: 'Engine room casing', xb: 166.5, zBottom: deckZ('E', 166.5) - 0.75, zTop: deckZ('BOAT', 163.5), xTop: 163.5, area: 4, burstArea: 20, burst: MATERIALS[MAT.SKYLIGHT].burst });
  }

  // 6. passages through decks: hatches, stairs, grand staircases
  const hatch = (xb, len, decks, w = 5.5) => { for (const d of decks) openDeck(d, xb - len / 2, xb + len / 2, MAT.HATCH, w); };
  hatch(20.5, 5.0, ['ORLOP', 'G', 'F', 'E', 'D']);
  hatch(35.0, 5.0, ['ORLOP', 'G', 'F', 'E', 'D']);
  hatch(50.5, 5.0, ['ORLOP', 'G', 'F', 'E', 'D']);
  openDeck('C', 18.0, 23.0, MAT.COVER, 5.5);           // under forecastle: still covered
  openDeck('C', 48.0, 53.0, MAT.COVER, 5.5);           // forward well deck hatch
  hatch(230.0, 5.0, ['ORLOP', 'G', 'F', 'E', 'D']);
  openDeck('C', 227.5, 232.5, MAT.COVER, 5.5);
  hatch(240.0, 4.0, ['ORLOP', 'G', 'F', 'E', 'D']);
  hatch(218.0, 4.0, ['ORLOP', 'G', 'F', 'E']);
  const stair = (xb, len, decks, w = 2.5) => { for (const d of decks) openDeck(d, xb - len / 2, xb + len / 2, MAT.STAIRWELL, w); };
  stair(31.5, 2.0, ['G', 'F', 'E', 'D', 'C']);        // forward 3rd class / crew
  stair(10.0, 1.5, ['G', 'F', 'E', 'D', 'C', 'B']);   // spiral stair to crew quarters
  stair(88.6, 6.5, ['E', 'D', 'C', 'B', 'A'], 8);    // forward grand staircase
  openDeck('BOAT', 85.6, 91.6, MAT.SKYLIGHT, 8);       // wrought-iron & glass dome
  stair(154.4, 5.0, ['C', 'B', 'A'], 7);              // aft grand staircase
  openDeck('BOAT', 151.9, 156.9, MAT.SKYLIGHT, 6.5);
  stair(201.5, 3.0, ['F', 'E', 'D', 'C', 'B', 'A'], 4); // 2nd class main stair
  stair(242.0, 2.0, ['G', 'F', 'E', 'D', 'C'], 2.5); // aft 3rd class
  for (const xb of [64, 70, 81, 87, 98, 104, 115, 121, 133, 140, 150]) {
    // stokers' escape ladders & fiddleys from each stokehold to E deck
    if (xb > 150) continue;
    openDeck('F', xb - 0.6, xb + 0.6, MAT.GRATING, 1.2);
  }
  // each stokehold's escape trunk comes out on E deck, in the working alleyway
  for (const xb of [70, 87, 104, 121, 140, 150]) openDeck('E', xb - 0.6, xb + 0.6, MAT.STAIRWELL, 1.2);
  stair(66.0, 1.5, ['E', 'D', 'C'], 2);                // firemen's passage stair (BR6)
  stair(180.0, 2.0, ['D', 'C', 'B'], 2.5);
  stair(126.5, 2.0, ['E', 'D', 'C', 'B'], 2.5);
  stair(60.4, 1.4, ['C', 'B', 'A', 'BOAT'], 2);        // crew stair to bridge

  // 7. watertight doors at tank-top level (vertical sliding, closed from bridge)
  const wtd = [];
  for (const b of BULKHEADS) {
    if (b.xb < 58.8 || b.xb > 228) continue;
    const z0 = deckZ('TANK', b.xb) + 0.25;
    openWall(b.xb, z0, z0 + 1.9, MAT.WTDOOR, 1.1, 1);
    wtd.push(b.id);
  }
  // watertight doors on E deck in the forward bulkheads (left open, Scotland Road)
  meta.wtDoors = wtd;

  // 8. funnels, masts, rudder (separate structure)
  for (let f = 0; f < 4; f++) {
    const xbBase = FUNNELS[f];
    const zBase = deckZ('BOAT', xbBase) + 0.25;
    const zTop = FUNNEL_TOP + sheer(xbBase) * 0.3;
    const cells = [];
    for (let j = rowOf(zBase); j <= rowOf(zTop); j++) {
      const z = zOf(j);
      const xc = xbBase + (z - zBase) * FUNNEL_RAKE;
      for (let i = colOf(xc + FUNNEL_LEN / 2); i <= colOf(xc - FUNNEL_LEN / 2); i++) {
        const xb = xbOf(i);
        const u = (xb - xc) / (FUNNEL_LEN / 2);
        if (Math.abs(u) > 1) continue;
        const k = grid.idx(i, j);
        if (grid.kind[k] !== 0) continue;
        grid.set(i, j, MAT.FUNNEL);
        grid.breadth[k] = FUNNEL_BREADTH;
        cells.push(k);
      }
    }
    // ~62 t per funnel incl. uptake & stays
    for (const k of cells) grid.mass[k] = 62000 / cells.length;
    meta.funnels.push({ index: f, xBase: X0 - xbBase, yBase: zBase, yTop: zTop, rake: FUNNEL_RAKE, len: FUNNEL_LEN, dummy: f === 3 });
  }
  for (const m of MASTS) {
    const zBase = deckZ(m.base, m.xb) + 0.25;
    const cells = [];
    for (let j = rowOf(zBase); j <= rowOf(m.top); j++) {
      const z = zOf(j);
      const xc = m.xb + (z - zBase) * (1 / 12);
      const r = z > m.top - 8 ? 0.28 : 0.48;
      for (let i = colOf(xc + r); i <= colOf(xc - r); i++) {
        const k = grid.idx(i, j);
        if (grid.kind[k] !== 0) continue;
        grid.set(i, j, MAT.MAST); grid.breadth[k] = 0.9; cells.push(k);
      }
    }
    for (const k of cells) grid.mass[k] = 27000 / cells.length;
    meta.masts.push({ xBase: X0 - m.xb, yBase: zBase, yTop: m.top, rake: 1 / 12 });
  }
  {
    // rudder: 78 ft 8 in x 15 ft 3 in, 101 tons
    const cells = [];
    for (let j = rowOf(0.35); j <= rowOf(13.5); j++) {
      const z = zOf(j);
      for (let i = colOf(259.4); i <= colOf(254.7); i++) {
        const xb = xbOf(i);
        const k = grid.idx(i, j);
        if (grid.kind[k] !== 0) continue;
        if (z < 1.2 && xb > 258.2) continue;
        grid.set(i, j, MAT.RUDDER); grid.breadth[k] = 0.9; cells.push(k);
      }
    }
    for (const k of cells) grid.mass[k] = 101000 / cells.length;
    // the skeg/sternpost foot connecting keel to rudder heel
    for (let i = colOf(254.7); i <= colOf(POST); i++) {
      for (let j = rowOf(0.1); j <= rowOf(1.1); j++) {
        const k = grid.idx(i, j);
        if (grid.kind[k] === 0) { grid.set(i, j, MAT.KEEL); grid.breadth[k] = 1.0; }
      }
    }
  }

  // 9. outline: envelope cells touching the outside become shell plating
  const W_ = grid.w;
  const isOutsideish = (k) => grid.kind[k] === 0 || grid.mat[k] === MAT.FUNNEL || grid.mat[k] === MAT.MAST || grid.mat[k] === MAT.RUDDER;
  const outline = [];
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W_ + i;
      if (grid.kind[k] === 0 || !grid.isEnvelope(k)) continue;
      const up = j + 1 < H ? isOutsideish(k + W_) : true;
      const dn = j > 0 ? isOutsideish(k - W_) : true;
      const lf = i > 0 ? isOutsideish(k - 1) : true;
      const rt = i + 1 < W ? isOutsideish(k + 1) : true;
      if (up || dn || lf || rt) outline.push([k, up, dn, lf, rt]);
    }
  }
  for (const [k, up, dn] of outline) {
    const i = k % W_, j = (k / W_) | 0;
    const isSuper = (grid.flags[k] & 1) !== 0;
    if (grid.kind[k] === OPEN) continue;
    const z = zOf(j);
    let m;
    if (dn && z < 1.0) m = MAT.KEEL;
    else if (up && !dn) m = isSuper ? (grid.mat[k] === MAT.WDECK ? MAT.WDECK : MAT.SUPER) : MAT.WDECK;
    else m = isSuper ? MAT.SUPER : MAT.HULL;
    if (grid.mat[k] === MAT.WDECK && up) m = MAT.WDECK;
    grid.set(i, j, m);
  }
  // keep weather-deck hatch covers & skylights (re-assert after outline)
  openDeck('C', 48.0, 53.0, MAT.COVER, 5.5);
  openDeck('C', 227.5, 232.5, MAT.COVER, 5.5);
  openDeck('BOAT', 85.6, 91.6, MAT.SKYLIGHT, 8);
  openDeck('BOAT', 151.9, 156.9, MAT.SKYLIGHT, 6.5);

  // non-watertight doors in the outer walls: third-class entrances from the
  // well decks, the deckhouse doors on the boat deck. They are open passages
  // for water once the sea reaches them.
  const outerDoor = (xb, deck, width = 1.2, height = 2.0) => {
    const z0 = deckZ(deck, xb) + 0.3;
    for (let j = rowOf(z0); j <= rowOf(z0 + height - 0.3); j++) {
      for (let di = -3; di <= 3; di++) {
        const i = colOf(xb) + di;
        if (!grid.inb(i, j)) continue;
        const k = grid.idx(i, j);
        if (grid.kind[k] !== SOLID || !grid.isEnvelope(k)) continue;
        const lf = grid.kind[k - 1] === 0, rt = grid.kind[k + 1] === 0;
        if (!lf && !rt) continue;
        grid.set(i, j, MAT.DOOR); grid.openW[k] = width; grid.gate[k] = 0;
        break;
      }
    }
  };
  outerDoor(39.0, 'C'); outerDoor(57.6, 'C'); outerDoor(225.6, 'C'); outerDoor(237.0, 'C');
  outerDoor(84.2, 'BOAT'); outerDoor(71.8, 'BOAT'); outerDoor(98.0, 'BOAT'); outerDoor(151.9, 'BOAT'); outerDoor(196.0, 'BOAT');
  outerDoor(58.6, 'A', 1.6); outerDoor(216.5, 'A', 1.6);

  // expansion joint flags (superstructure above B deck has a gap here)
  for (const xb of EXPANSION_JOINTS) {
    const i = colOf(xb);
    for (let j = 0; j < H; j++) {
      const k = grid.idx(i, j);
      if (zOf(j) > deckZ('B', xb) + 0.3) grid.flags[k] |= 2;
    }
  }

  // 10. side openings: portholes, windows, promenade, gangway doors
  const sideAt = (xb, z, type) => {
    const i = colOf(xb), j = rowOf(z);
    if (!grid.inb(i, j)) return;
    const k = grid.idx(i, j);
    if (grid.kind[k] !== SPACE) return;
    grid.side[k] = type;
    grid.sideArea[k] = 0;
    meta.portholes.push({ k, x: X0 - xb, y: z, type });
  };
  const rowOfPorts = (deck, a, b, spacing, type, dz = 1.25, skip = null) => {
    for (let xb = a; xb <= b; xb += spacing) {
      if (skip && skip(xb)) continue;
      sideAt(xb, deckZ(deck, xb) + dz, type);
    }
  };
  const nearBhd = (xb) => BULKHEADS.some(b => Math.abs(b.xb - xb) < 1.2);
  rowOfPorts('G', 16, 56, 3.1, SIDE.PORTHOLE, 1.15, nearBhd);
  rowOfPorts('G', 213, 244, 3.1, SIDE.PORTHOLE, 1.15, nearBhd);
  rowOfPorts('F', 6, 262, 2.6, SIDE.PORTHOLE, 1.2, (xb) => nearBhd(xb) || (xb > 156.7 && xb < 195.1));
  rowOfPorts('E', 4, 264, 2.4, SIDE.PORTHOLE, 1.25, nearBhd);
  rowOfPorts('D', 3, 266, 2.4, SIDE.PORTHOLE, 1.35, (xb) => (xb > 86 && xb < 90.5));
  rowOfPorts('C', 2, 268, 2.25, SIDE.PORTHOLE, 1.3, (xb) => (xb > 39 && xb < 57.6) || (xb > 225.6 && xb < 237));
  rowOfPorts('B', 59, 224, 2.0, SIDE.WINDOW, 1.3);
  rowOfPorts('A', 60, 120, 1.9, SIDE.WINDOW, 1.3);         // enclosed forward promenade
  rowOfPorts('A', 121, 215, 1.6, SIDE.PROMENADE, 1.4);      // open promenade
  rowOfPorts('BOAT', 60, 71.5, 1.6, SIDE.WINDOW, 1.4);
  rowOfPorts('BOAT', 99, 107, 1.4, SIDE.WINDOW, 1.4);
  rowOfPorts('BOAT', 121, 140, 1.8, SIDE.WINDOW, 1.6);
  rowOfPorts('BOAT', 166, 178, 1.8, SIDE.WINDOW, 1.6);
  rowOfPorts('BOAT', 197, 211, 1.6, SIDE.WINDOW, 1.4);
  sideAt(83.5, deckZ('D', 83.5) + 1.2, SIDE.GANGWAY);      // 1st class entrance doors
  sideAt(85.5, deckZ('D', 85.5) + 1.2, SIDE.GANGWAY);
  sideAt(55.5, deckZ('E', 55.5) + 1.2, SIDE.GANGWAY);
  sideAt(205, deckZ('E', 205) + 1.2, SIDE.GANGWAY);
  for (const p of meta.portholes) grid.sideArea[p.k] = (p.type === SIDE.PROMENADE) ? SIDE_INFO[SIDE.PROMENADE].area : 0;

  // 11. heavy items: 29 boilers, two 4-cyl triple-expansion engines, LP turbine,
  // dynamos, coal remaining at the time of collision.
  const addMass = (a, b, z0, z1, tonnes, matFilter) => {
    const cells = [];
    for (let i = colOf(b); i <= colOf(a); i++) for (let j = rowOf(z0); j <= rowOf(z1); j++) {
      const k = grid.idx(i, j);
      if (grid.kind[k] !== SPACE) continue;
      if (matFilter && grid.mat[k] !== matFilter) continue;
      cells.push(k);
    }
    for (const k of cells) grid.mass[k] += tonnes * 1000 / cells.length;
    meta.heavy.push({ x0: X0 - b, x1: X0 - a, y0: z0, y1: z1, tonnes });
  };
  // boiler rooms 6..2: five double-ended boilers each (~150 t wet); BR1: five single-ended
  const brs = [[58.8, 75.3, 4], [75.3, 92.7, 5], [92.7, 110, 5], [110, 127.4, 5], [127.4, 145.7, 5], [145.7, 156.7, 5]];
  brs.forEach(([a, b, n], idx) => addMass(a + 2.8, b - 2.8, 1.8, 6.6, n * (idx === 5 ? 92 : 150), MAT.BOILER));
  addMass(158, 176.5, 1.8, 11.0, 2 * 1000 + 300, MAT.ENGINE);  // reciprocating engines + condensers
  addMass(179, 194, 1.8, 8.5, 420 + 300, MAT.ENGINE);           // turbine + condensers
  addMass(196, 211, 1.8, 6.0, 450, MAT.ENGINE);                 // dynamos
  addMass(213, 246, 1.8, 5.5, 380, null);                       // shafting & tunnel
  addMass(240, 252, 1.8, 6.0, 130, null);                       // propellers (wing 38 t x2, centre 22 t) & bossing
  // coal ~3,800 t remaining in bunkers on 14 April
  {
    const cells = [];
    for (let k = 0; k < grid.n; k++) if (grid.mat[k] === MAT.BUNKER) cells.push(k);
    for (const k of cells) grid.mass[k] += 3800e3 / cells.length;
  }
  addMass(14, 58.8, 1.8, 9.0, 560, MAT.HOLD);                   // cargo
  addMass(213, 246, 6.5, 11.0, 300, MAT.HOLD);

  // final mass & volume
  assignMassAndVolume(grid, { sideShellTop: (x) => hullTop(X0 - x) });

  // lifeboats on the starboard side: 1,3,5,7 forward, 9,11,13,15 aft (+ collapsibles C)
  const boatXb = [64.0, 72.5, 79.5, 87.5, 184.5, 192.0, 199.5, 207.0];
  meta.lifeboats = boatXb.map((xb, n) => ({ x: X0 - xb, y: deckZ('BOAT', xb) + 1.6, len: 9.1, h: 1.25, num: [1, 3, 5, 7, 9, 11, 13, 15][n] }));

  meta.deckZ = (name, x) => deckZ(name, X0 - x);
  meta.hullTop = (x) => hullTop(X0 - x);
  meta.halfBreadth = (x, z) => halfBreadth(X0 - x, z);
  meta.sternX = (z) => X0 - sternXb(z);
  meta.stemX = (z) => X0 - stemXb(z);
  meta.houses = houses.map(h => ({ x0: X0 - h.b, x1: X0 - h.a, lo: h.lo, hi: h.hi, type: h.type }));
  meta.blockCuts = blockCuts().map(xb => X0 - xb).sort((a, b) => a - b);
  meta.designDraught = DESIGN_DRAUGHT;
  meta.bulkheadX = BULKHEADS.map(b => ({ id: b.id, x: X0 - b.xb, top: b.top }));
  for (const t of meta.trunks) {
    t.kBottom = grid.idx(colOf(t.xb), rowOf(t.zBottom));
    t.kTop = grid.idx(colOf(t.xTop), rowOf(t.zTop));
    t.open = false;
  }
  return { grid, meta };
}

function blockCuts() {
  // hull girder blocks, ~9 m long; cuts at both superstructure expansion joints
  const cuts = [8, 17, 26, 35, 44, 53, 62, 71, 80, 88.5, 96.2, 104, 112, 120, 128, 136, 144, 151, 158, 164.6, 171, 178.5, 186, 194, 202, 210, 218, 226, 234, 243, 252, 261];
  return cuts;
}
