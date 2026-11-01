// The ship structure grid: a 2D array of 0.5 m cells in ship-local
// coordinates (x toward the bow, y up from the keel). Each cell carries a
// material, the local 3D breadth of the ship (for 2.5D mass and volume),
// side-plating openings, and state that the simulation mutates (damage,
// corrosion, room membership).

import { CELL, CELL2, RHO_STEEL } from './constants.js';
import { MATERIALS, matKind, EMPTY, SOLID, SPACE, OPEN, MAT, SIDE } from './materials.js';

export class ShipGrid {
  constructor(w, h, originY = 0) {
    this.w = w; this.h = h; this.n = w * h;
    this.originY = originY;          // local y of the bottom edge of row 0
    this.mat = new Uint8Array(this.n);
    this.kind = new Uint8Array(this.n);
    this.breadth = new Float32Array(this.n);   // full 3D breadth (m) at this cell
    this.mass = new Float32Array(this.n);      // kg
    this.vdisp = new Float32Array(this.n);     // displaced volume when dry (m^3)
    this.vcap = new Float32Array(this.n);      // floodable volume (m^3)
    this.side = new Uint8Array(this.n);        // SIDE.* opening type
    this.sideArea = new Float32Array(this.n);  // current open side area (m^2)
    this.openW = new Float32Array(this.n);     // transverse width of an OPEN passage (m)
    this.gate = new Uint8Array(this.n);        // OPEN: 0 open, 1 closed (door/glass/cover)
    this.room = new Int32Array(this.n).fill(-1);
    this.block = new Int16Array(this.n).fill(-1);
    this.zone = new Uint8Array(this.n);        // watertight compartment index
    this.deck = new Uint8Array(this.n);        // deck band index (for labels)
    this.rust = new Float32Array(this.n);      // 0..1 fraction of plate consumed
    this.dmg = new Uint8Array(this.n);         // 0 intact, 1 cracked, 2 destroyed, 3 crushed
    this.flags = new Uint8Array(this.n);       // bit 1: superstructure, 2: expansion joint, 4: lit
    this.seed = new Float32Array(this.n);      // per-cell random for visual variation
    let s = 1234567;
    for (let i = 0; i < this.n; i++) { s = (s * 16807) % 2147483647; this.seed[i] = s / 2147483647; }
  }
  idx(i, j) { return j * this.w + i; }
  inb(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h; }
  cx(i) { return (i + 0.5) * CELL; }
  cy(j) { return this.originY + (j + 0.5) * CELL; }
  col(x) { return Math.floor(x / CELL); }
  row(y) { return Math.floor((y - this.originY) / CELL); }
  set(i, j, m) {
    if (!this.inb(i, j)) return;
    const k = j * this.w + i;
    this.mat[k] = m; this.kind[k] = matKind[m];
  }
  get(i, j) { return this.inb(i, j) ? this.mat[j * this.w + i] : 0; }
  kindAt(i, j) { return this.inb(i, j) ? this.kind[j * this.w + i] : EMPTY; }

  // Is this cell part of the watertight/floodable envelope?
  isEnvelope(k) {
    const kd = this.kind[k];
    if (kd === EMPTY) return false;
    const m = this.mat[k];
    return !(m === MAT.FUNNEL || m === MAT.MAST || m === MAT.RUDDER || m === MAT.BOAT || m === MAT.ICE);
  }
  // Cells that behave as open water/atmosphere for room connectivity:
  // outside the ship, or inside free-flooding structure (funnels, masts).
  isExteriorLike(k) {
    if (this.kind[k] === EMPTY) return true;
    const m = this.mat[k];
    return m === MAT.FUNNEL || m === MAT.MAST || m === MAT.BOAT;
  }
}

// Mass and volume assignment for the 2.5D model.
//   SOLID plates seen edge-on (decks, bulkheads, bottom): plate area = t x breadth
//   Side shell (the plane we look at) covers every envelope cell up to the
//   shell top, mass = 2 sides x t_side x cell area.
// Frames, beams and stiffeners add ~45% to bare plate weight.
export function assignMassAndVolume(grid, opts) {
  const { sideShellTop, superSideT = 0.0095, sideT = 0.025, framing = 1.45 } = opts;
  const { w, h } = grid;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const kd = grid.kind[k];
      if (kd === EMPTY) { grid.mass[k] = 0; grid.vdisp[k] = 0; grid.vcap[k] = 0; continue; }
      const m = grid.mat[k];
      const mi = MATERIALS[m];
      const br = grid.breadth[k];
      const x = grid.cx(i), y = grid.cy(j);
      let mass = 0;
      const env = grid.isEnvelope(k);
      // side plating (both sides) on envelope cells
      if (env) {
        const isSuper = (grid.flags[k] & 1) !== 0;
        const st = isSuper ? superSideT : (y <= sideShellTop(x) + 0.01 ? sideT : superSideT);
        mass += 2 * st * CELL2 * RHO_STEEL * framing;
      }
      if (kd === SOLID) {
        if (m === MAT.FUNNEL || m === MAT.MAST || m === MAT.RUDDER || m === MAT.MACHINE || m === MAT.BOAT || m === MAT.ICE) {
          // handled by the designer (explicit masses)
          mass += grid.mass[k];
        } else {
          mass += mi.t * CELL * br * RHO_STEEL * framing;
        }
      } else if (kd === SPACE) {
        mass += mi.outfit * CELL2 * br;
        mass += grid.mass[k]; // designer extras (machinery, coal)
      } else if (kd === OPEN) {
        mass += 0.25 * MATERIALS[MAT.DECK].t * CELL * br * RHO_STEEL;
      }
      grid.mass[k] = mass;
    }
  }
  // Volumes. Envelope cells displace h^2 x breadth. SOLID cells only hold
  // steel; their remaining void volume is shared out to neighbouring SPACE
  // cells so that rooms have their true capacity.
  grid.vcap.fill(0); grid.vdisp.fill(0);
  for (let k = 0; k < grid.n; k++) {
    const kd = grid.kind[k];
    if (kd === EMPTY) continue;
    const m = grid.mat[k];
    if (!grid.isEnvelope(k)) {
      // free-flooding or solid appendages: displace their own material only
      if (m === MAT.BOAT) grid.vdisp[k] = CELL2 * grid.breadth[k] * 0.75; // air tanks & wood
      else if (m === MAT.ICE) grid.vdisp[k] = CELL2 * grid.breadth[k];
      else grid.vdisp[k] = grid.mass[k] / RHO_STEEL;
      continue;
    }
    const full = CELL2 * grid.breadth[k];
    if (kd === SPACE) {
      grid.vdisp[k] += full;
      grid.vcap[k] += full * MATERIALS[m].perm;
    } else {
      grid.vdisp[k] += full; // provisional; redistributed below
    }
  }
  const nb = [1, -1, w, -w];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const kd = grid.kind[k];
      if (kd !== SOLID && kd !== OPEN) continue;
      if (!grid.isEnvelope(k)) continue;
      const full = CELL2 * grid.breadth[k];
      const steel = Math.min(full * 0.9, grid.mass[k] / RHO_STEEL);
      const voidV = full - steel;
      // share to SPACE neighbours
      let cnt = 0;
      for (let d = 0; d < 4; d++) {
        const ii = i + (d === 0 ? 1 : d === 1 ? -1 : 0), jj = j + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (!grid.inb(ii, jj)) continue;
        if (grid.kind[k + nb[d]] === SPACE) cnt++;
      }
      if (cnt === 0) continue; // keep full displacement (solid region)
      grid.vdisp[k] = steel;
      for (let d = 0; d < 4; d++) {
        const ii = i + (d === 0 ? 1 : d === 1 ? -1 : 0), jj = j + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (!grid.inb(ii, jj)) continue;
        const kk = k + nb[d];
        if (grid.kind[kk] !== SPACE) continue;
        const share = voidV / cnt;
        grid.vdisp[kk] += share;
        grid.vcap[kk] += share * MATERIALS[grid.mat[kk]].perm;
      }
    }
  }
}

export { EMPTY, SOLID, SPACE, OPEN, MAT, SIDE };
