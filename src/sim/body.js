// A rigid structural block (a slice of hull girder, a funnel, a mast, a
// lifeboat, an iceberg...). Geometry lives in the ship grid; the body keeps
// the list of its cells in grid coordinates and its world transform.

import { CELL } from './constants.js';

let nextBodyId = 0;

export class Body {
  constructor(kind, name) {
    this.id = nextBodyId++;
    this.kind = kind;           // 'hull' | 'funnel' | 'mast' | 'boat' | 'ice' | 'debris'
    this.name = name;
    this.cells = null;          // Int32Array of grid indices (null for non-grid bodies)
    this.gx = null; this.gy = null; // grid-local cell centres
    // structural mass sums (grid coordinates)
    this.ms = 0; this.sx = 0; this.sy = 0; this.sq = 0;
    // floodwater sums, refreshed by the flooding solver
    this.mw = 0; this.swx = 0; this.swy = 0; this.swq = 0;
    // mass properties
    this.m = 1; this.invM = 1; this.I = 1; this.invI = 1;
    this.comX = 0; this.comY = 0;
    this.addedM = 0; this.addedI = 0;
    // state
    this.x = 0; this.y = 0; this.a = 0;
    this.vx = 0; this.vy = 0; this.w = 0;
    this.px = 0; this.py = 0; this.pa = 0;  // previous (XPBD)
    this.c = 1; this.s = 0;
    // forces for this step (world), torque about COM
    this.fx = 0; this.fy = 0; this.tq = 0;
    this.cfx = 0; this.cfy = 0; this.ctq = 0; // contact forces accumulated (for stress analysis)
    this.v0x = 0; this.v0y = 0; this.w0 = 0;
    // geometry caches
    this.aabb = { x0: 0, y0: 0, x1: 0, y1: 0 };       // grid-local
    this.wbox = { x0: 0, y0: 0, x1: 0, y1: 0 };       // world
    this.contacts = null;      // Float32Array [gx, gy, nx, ny, area] * n
    this.faces = null;         // Float32Array [gx, gy, nx, ny, area] * n
    this.sdf = null;           // { x0, y0, w, h, d: Float32Array }
    this.alive = true;
    this.sleeping = false;
    this.submergedFrac = 0;
    this.depth = 0;
    this.inMud = 0;
    this.squash = 1;           // vertical crush factor (seabed impact)
    this.maxImpact = 0;
    this.dispVol = 0;
    this.piece = -1;           // connected component id
    this.color = null;
  }

  setCells(grid, list) {
    this.cells = Int32Array.from(list);
    const n = list.length;
    this.gx = new Float32Array(n); this.gy = new Float32Array(n);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let q = 0; q < n; q++) {
      const k = list[q];
      const i = k % grid.w, j = (k / grid.w) | 0;
      const x = grid.cx(i), y = grid.cy(j);
      this.gx[q] = x; this.gy[q] = y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    this.aabb = { x0: x0 - CELL / 2, y0: y0 - CELL / 2, x1: x1 + CELL / 2, y1: y1 + CELL / 2 };
    this.recomputeStructMass(grid);
  }

  recomputeStructMass(grid) {
    let ms = 0, sx = 0, sy = 0, sq = 0;
    const cellI = CELL * CELL / 6;
    for (let q = 0; q < this.cells.length; q++) {
      const k = this.cells[q];
      const m = grid.mass[k];
      if (m <= 0) continue;
      const x = this.gx[q], y = this.gy[q];
      ms += m; sx += m * x; sy += m * y; sq += m * (x * x + y * y + cellI);
    }
    this.ms = ms; this.sx = sx; this.sy = sy; this.sq = sq;
  }

  // Recompute COM/inertia from structure + water; keep world pose of cells.
  updateMassProps() {
    const m = this.ms + this.mw;
    if (m <= 0) { this.alive = false; return; }
    const cx = (this.sx + this.swx) / m, cy = (this.sy + this.swy) / m;
    const I = Math.max(1, (this.sq + this.swq) - m * (cx * cx + cy * cy));
    const dx = cx - this.comX, dy = cy - this.comY;
    if (dx !== 0 || dy !== 0) {
      const wx = this.c * dx - this.s * dy, wy = this.s * dx + this.c * dy;
      this.x += wx; this.y += wy;
      this.px += wx; this.py += wy;
      this.vx += -this.w * wy; this.vy += this.w * wx;
      this.comX = cx; this.comY = cy;
    }
    this.m = m; this.I = I;
    this.refreshInverse();
  }
  refreshInverse() {
    const me = this.m + this.addedM, Ie = this.I + this.addedI;
    this.invM = 1 / me; this.invI = 1 / Ie;
  }

  syncTrig() { this.c = Math.cos(this.a); this.s = Math.sin(this.a); }

  // grid-local -> world
  wx(gx, gy) { return this.x + this.c * (gx - this.comX) - this.s * (gy - this.comY); }
  wy(gx, gy) { return this.y + this.s * (gx - this.comX) + this.c * (gy - this.comY); }
  // world -> grid-local
  lx(x, y) { const dx = x - this.x, dy = y - this.y; return this.comX + this.c * dx + this.s * dy; }
  ly(x, y) { const dx = x - this.x, dy = y - this.y; return this.comY - this.s * dx + this.c * dy; }

  // velocity of a world point attached to the body
  pvx(wy) { return this.vx - this.w * (wy - this.y); }
  pvy(wx) { return this.vy + this.w * (wx - this.x); }

  updateWorldBox() {
    const b = this.aabb;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]];
    for (const [gx, gy] of pts) {
      const X = this.wx(gx, gy), Y = this.wy(gx, gy);
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
    this.wbox.x0 = x0; this.wbox.y0 = y0; this.wbox.x1 = x1; this.wbox.y1 = y1;
  }
}
