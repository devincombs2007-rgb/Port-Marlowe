// Scenario construction: build the ship, calibrate its weight so it floats at
// the observed draught and trim, place it in the ocean, apply damage.

import { CELL, CELL2, RHO_SEA, G } from './constants.js';
import { MAT, SPACE, SOLID, SIDE, SIDE_INFO, MATERIALS } from './materials.js';
import { buildTitanic, X0 } from '../ship/titanic.js';
import { Ship } from './ship.js';
import { Environment } from './environment.js';
import { World } from './world.js';

// Scale cell masses so displacement at `draught` (level keel) equals the
// weight, and shift longitudinally so the centre of gravity sits over the
// centre of buoyancy. Tank water (rooms) is counted as weight.
export function calibrate(grid, meta, draught, trimBowDown = 0) {
  // displaced volume & LCB at the target waterline
  let V = 0, Vx = 0;
  const yWL = draught;
  for (let k = 0; k < grid.n; k++) {
    const v = grid.vdisp[k];
    if (v <= 0) continue;
    const i = k % grid.w, j = (k / grid.w) | 0;
    const x = grid.cx(i), y = grid.cy(j);
    const xr = x, yr = y + (x - 135) * Math.tan(trimBowDown);
    let f = (yWL - yr) / CELL + 0.5; f = f < 0 ? 0 : f > 1 ? 1 : f;
    V += v * f; Vx += v * f * xr;
  }
  const lcb = Vx / V;
  // tank water at 50%
  let tankW = 0, tankWx = 0;
  for (let k = 0; k < grid.n; k++) if (grid.mat[k] === MAT.TANK) { const m = grid.vcap[k] * 0.5 * RHO_SEA; tankW += m; tankWx += m * grid.cx(k % grid.w); }
  const target = RHO_SEA * V - tankW;
  // solve ramp k so LCG == LCB, then uniform scale
  const xs = new Float32Array(grid.n);
  for (let k = 0; k < grid.n; k++) xs[k] = grid.cx(k % grid.w);
  const lcgFor = (kk) => {
    let M = tankW, Mx = tankWx;
    for (let k = 0; k < grid.n; k++) {
      const m = grid.mass[k]; if (m <= 0) continue;
      const mm = m * Math.max(0.2, 1 + kk * (xs[k] - 135));
      M += mm; Mx += mm * xs[k];
    }
    return Mx / M;
  };
  let lo = -0.006, hi = 0.006;
  for (let it = 0; it < 40; it++) {
    const mid = 0.5 * (lo + hi);
    if (lcgFor(mid) < lcb) lo = mid; else hi = mid;
  }
  const kk = 0.5 * (lo + hi);
  let M = 0;
  for (let k = 0; k < grid.n; k++) { if (grid.mass[k] <= 0) continue; grid.mass[k] *= Math.max(0.2, 1 + kk * (xs[k] - 135)); M += grid.mass[k]; }
  const s = target / M;
  let steel = 0;
  for (let k = 0; k < grid.n; k++) grid.mass[k] *= s;
  return { displacement: (target + tankW) / 1000, lcb, scale: s, ramp: kk, volume: V };
}

export function createWorld(opts = {}) {
  const { grid, meta } = buildTitanic(opts);
  const draught = opts.draught ?? 10.2;      // 14 April: ~3 days' coal burned
  const cal = calibrate(grid, meta, draught, opts.trim ?? 0.0006);
  const ship = new Ship(grid, meta);
  ship.buildBlocks();
  ship.segmentRooms();
  const env = new Environment(opts.env || {});
  const world = new World(ship, env, opts);
  world.calibration = cal;
  world.placeShip(-135, -draught, 0);
  // watertight doors closed by Murdoch at 23:40
  return world;
}

// The iceberg's glancing blow on the starboard bow, 23:39:40 on 14 April 1912.
// Openings follow Edward Wilding's estimate to the British Inquiry ("somewhere
// about 12 square feet" in total, ~1.1 m^2) spread over ~300 ft of the hull,
// from the fore peak back to the forward end of No. 5 boiler room.
export const ICEBERG_DAMAGE = [
  // [xb from stem (m), z above keel (m), area m^2, length m]
  { xb: 9.5, z: 4.6, area: 0.07, len: 4 },     // fore peak
  { xb: 21.0, z: 4.2, area: 0.17, len: 8 },    // No. 1 hold
  { xb: 35.5, z: 3.7, area: 0.24, len: 10 },   // No. 2 hold
  { xb: 51.0, z: 3.3, area: 0.22, len: 9 },    // No. 3 hold
  { xb: 66.5, z: 2.6, area: 0.33, len: 11 },   // No. 6 boiler room
  { xb: 76.3, z: 2.4, area: 0.055, len: 1.2 }, // No. 5 boiler room (bunker, 2 ft from bhd E)
];

export function iceDamagePlan(world) {
  const g = world.ship.grid;
  const out = [];
  for (const d of ICEBERG_DAMAGE) {
    // a seam opening: several short slits along the length
    const n = Math.max(1, Math.round(d.len / 1.5));
    for (let q = 0; q < n; q++) {
      const xb = d.xb - d.len / 2 + (q + 0.5) * d.len / n;
      const z = d.z + Math.sin(q * 1.7) * 0.45;
      const i = g.col(X0 - xb), j = g.row(z);
      let k = g.idx(i, j);
      // find nearest SPACE cell
      for (let r = 0; r < 4 && g.kind[k] !== SPACE; r++) k = g.idx(i, j + r);
      out.push({ k, area: d.area / n, xb, t: (90 - xb) / 90 });
    }
  }
  return out;
}

export function applyBreach(world, k, area) {
  const g = world.ship.grid;
  if (g.kind[k] !== SPACE) return false;
  if (g.side[k] !== SIDE.BREACH) { g.side[k] = SIDE.BREACH; world.ship.needElements = true; }
  g.sideArea[k] += area;
  return true;
}
