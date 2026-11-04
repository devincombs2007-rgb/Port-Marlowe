// Ship model: splits the structure grid into rigid blocks joined by welds,
// segments interior spaces into rooms, and builds the network of openings
// that floodwater and air move through.

import { CELL, CELL2, STEEL_UTS, STEEL_YIELD, RHO_SEA } from './constants.js';
import { MATERIALS, MAT, EMPTY, SOLID, SPACE, OPEN, SIDE, SIDE_INFO } from './materials.js';
import { Body } from './body.js';

export const EXT = -1;   // "room id" of the open sea / atmosphere

export class Ship {
  constructor(grid, meta) {
    this.grid = grid;
    this.meta = meta;
    this.bodies = [];
    this.joints = [];
    this.rooms = [];
    this.elements = [];
    this.walls = [];
    this.topologyDirty = false;
    this.cellBlock = grid.block;
    this.brokenBoundary = new Set();  // "a|b" body id pairs whose interface is fully broken
    this.crackedCells = new Set();
    this.version = 0;
    // grid-local centre coordinates of every cell
    const n = grid.n;
    this.cxs = new Float32Array(n); this.cys = new Float32Array(n);
    for (let k = 0; k < n; k++) { const i = k % grid.w, j = (k / grid.w) | 0; this.cxs[k] = grid.cx(i); this.cys[k] = grid.cy(j); }
  }

  // ---------------------------------------------------------------- blocks
  buildBlocks() {
    const g = this.grid, W = g.w, H = g.h;
    const cuts = this.meta.blockCuts;
    const hullLists = Array.from({ length: cuts.length + 1 }, () => []);
    const special = new Uint8Array(g.n);
    for (let k = 0; k < g.n; k++) {
      const m = g.mat[k];
      if (g.kind[k] === EMPTY) continue;
      if (m === MAT.FUNNEL || m === MAT.MAST || m === MAT.BOAT) { special[k] = 1; continue; }
      const x = this.cxs[k];
      let b = 0;
      while (b < cuts.length && x >= cuts[b]) b++;
      hullLists[b].push(k);
    }
    const bodies = [];
    hullLists.forEach((list, b) => {
      if (!list.length) return;
      const body = new Body('hull', `Hull section ${b + 1}`);
      body.order = b;
      body.setCells(g, list);
      bodies.push(body);
    });
    // funnels and masts: connected components of their material
    const seen = new Uint8Array(g.n);
    const comps = [];
    for (let k = 0; k < g.n; k++) {
      if (!special[k] || seen[k]) continue;
      const m = g.mat[k];
      const stack = [k]; seen[k] = 1; const list = [];
      while (stack.length) {
        const c = stack.pop(); list.push(c);
        const i = c % W, j = (c / W) | 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
          const kk = jj * W + ii;
          if (!seen[kk] && special[kk] && g.mat[kk] === m) { seen[kk] = 1; stack.push(kk); }
        }
      }
      comps.push({ m, list });
    }
    let fN = 0, mN = 0;
    comps.sort((a, b) => this.cxs[b.list[0]] - this.cxs[a.list[0]]);
    for (const c of comps) {
      const kind = c.m === MAT.FUNNEL ? 'funnel' : c.m === MAT.MAST ? 'mast' : 'boat';
      const name = kind === 'funnel' ? `No. ${++fN} funnel` : kind === 'mast' ? (mN++ === 0 ? 'Foremast' : 'Mainmast') : 'Lifeboat';
      const body = new Body(kind, name);
      body.setCells(g, c.list);
      bodies.push(body);
    }
    for (const b of bodies) for (const k of b.cells) g.block[k] = bodies.indexOf(b);
    this.bodies = bodies;
    bodies.forEach((b, i) => { b.index = i; });
    for (const b of bodies) { b.comX = b.sx / b.ms; b.comY = b.sy / b.ms; b.updateMassProps(); }
    this.buildJoints();
    for (const b of bodies) this.rebuildBodyGeometry(b);
  }

  buildJoints() {
    const g = this.grid;
    const hull = this.bodies.filter(b => b.kind === 'hull').sort((a, b) => a.order - b.order);
    this.joints = [];
    for (let q = 0; q + 1 < hull.length; q++) {
      const A = hull[q], B = hull[q + 1];
      const xCut = this.meta.blockCuts[A.order];
      const j = { id: this.joints.length, a: A.index, b: B.index, kind: 'weld', xCut, state: 0, crack: 0, hinge: 0,
        lamA: 0, lamP: 0, M: 0, N: 0, V: 0, Mf: 0, Nf: 0, Vf: 0, ratio: 0, ratioF: 0, ductility: 1, history: 0,
        expansion: this.meta.expansionJoints.some(x => Math.abs(x - xCut) < 0.6) };
      this.computeSection(j);
      j.ax = xCut; j.ay = j.na;
      this.joints.push(j);
    }
    // funnels & masts to the hull block beneath them
    for (const b of this.bodies) {
      if (b.kind !== 'funnel' && b.kind !== 'mast') continue;
      let ymin = 1e9, xAt = 0;
      for (let q = 0; q < b.cells.length; q++) if (b.gy[q] < ymin) { ymin = b.gy[q]; xAt = b.gx[q]; }
      // average x of the base row
      let sx = 0, n = 0;
      for (let q = 0; q < b.cells.length; q++) if (b.gy[q] < ymin + 0.01) { sx += b.gx[q]; n++; }
      xAt = sx / n;
      const i = g.col(xAt), jrow = g.row(ymin) - 1;
      const k = g.idx(i, Math.max(0, jrow));
      let host = g.block[k];
      if (host < 0 || this.bodies[host].kind !== 'hull') {
        // search downward
        for (let jj = jrow; jj >= 0; jj--) { const kk = g.idx(i, jj); if (g.block[kk] >= 0 && this.bodies[g.block[kk]].kind === 'hull') { host = g.block[kk]; break; } }
      }
      if (host < 0) continue;
      const isF = b.kind === 'funnel';
      const j = { id: this.joints.length, a: host, b: b.index, kind: isF ? 'funnel' : 'mast', state: 0, crack: 0, hinge: 0,
        lamA: 0, lamP: 0, M: 0, N: 0, V: 0, Mf: 0, Nf: 0, Vf: 0, ratio: 0, ratioF: 0, ductility: 1, history: 0,
        ax: xAt, ay: ymin - CELL / 2,
        // funnel held by guy wires + base ring; masts by stays
        Mcap: isF ? 9e6 : 5e6, Fcap: isF ? 4e6 : 2.5e6 };
      this.joints.push(j);
    }
  }

  // Hull girder section properties at a weld (A-side column of the cut).
  computeSection(j) {
    const g = this.grid;
    const i = g.col(j.xCut) - 1;
    const fibers = [];
    for (let r = 0; r < g.h; r++) {
      const k = g.idx(i, r);
      if (g.kind[k] === EMPTY) continue;
      const m = g.mat[k];
      const mi = MATERIALS[m];
      if (!g.isEnvelope(k)) continue;
      const y = g.cy(r);
      const isSuper = (g.flags[k] & 1) !== 0;
      const expansionGap = (g.flags[k] & 2) !== 0 && j.expansion;
      let area = 0;
      // side shell, both sides (superstructure sides: little effective)
      if (!isSuper) area += 2 * 0.025 * CELL;
      else if (!expansionGap) area += 2 * 0.0095 * CELL * 0.35;
      // horizontal plates seen edge-on
      if (g.kind[k] === SOLID && (mi.strength || m === MAT.SUPER) && !expansionGap) {
        const eff = isSuper ? 0.35 : 1;
        area += mi.t * g.breadth[k] * eff;
      } else if ((g.flags[k] & 8) && !expansionGap) {
        // deck plating continues outboard of a casing, hatch or stairwell
        const eff = isSuper ? 0.35 : 1;
        const open = g.kind[k] === OPEN ? g.openW[k] : g.breadth[k] * 0.35;
        area += MATERIALS[MAT.DECK].t * Math.max(0, g.breadth[k] - open) * eff;
      }
      if (area <= 0) continue;
      const rust = Math.max(g.rust[k], g.rust[k + 1] || 0);
      area *= Math.max(0.02, 1 - rust);
      fibers.push({ k, y, area, failed: g.dmg[k] === 1 || g.dmg[k] === 2 });
    }
    j.fibers = fibers;
    this.sectionProps(j);
    j.scf = j.expansion ? 1.9 : 1.15;     // stress concentration at expansion joints / openings
  }
  sectionProps(j) {
    let A = 0, Ay = 0;
    for (const f of j.fibers) if (!f.failed) { A += f.area; Ay += f.area * f.y; }
    if (A <= 0) { j.A = 0; j.I = 0; j.na = 0; return; }
    const na = Ay / A;
    let I = 0, yTop = -1e9, yBot = 1e9, Zp = 0;
    for (const f of j.fibers) if (!f.failed) {
      I += f.area * ((f.y - na) * (f.y - na) + CELL * CELL / 12);
      if (f.y > yTop) yTop = f.y; if (f.y < yBot) yBot = f.y;
    }
    // plastic neutral axis: half the area above
    const sorted = j.fibers.filter(f => !f.failed).sort((a, b) => a.y - b.y);
    let acc = 0, pna = na;
    for (const f of sorted) { acc += f.area; if (acc >= A / 2) { pna = f.y; break; } }
    for (const f of sorted) Zp += f.area * Math.abs(f.y - pna);
    j.A = A; j.I = Math.max(I, 1e-6); j.na = na; j.yTop = yTop; j.yBot = yBot; j.pna = pna;
    j.Mp = STEEL_YIELD * Zp;              // fully plastic moment
    j.Mu = STEEL_UTS * j.I / Math.max(yTop - na, na - yBot, 0.5);
  }

  // per-body outline faces (drag), contact samples (seabed), SDF (collisions)
  rebuildBodyGeometry(b) {
    const g = this.grid, W = g.w;
    const faces = [], contacts = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const own = b.index;
    for (let q = 0; q < b.cells.length; q++) {
      const k = b.cells[q];
      if (g.kind[k] === EMPTY) continue;
      const i = k % W, jj = (k / W) | 0;
      for (const [di, dj] of dirs) {
        const ii = i + di, j2 = jj + dj;
        let outside;
        if (!g.inb(ii, j2)) outside = true;
        else {
          const kk = j2 * W + ii;
          if (g.kind[kk] === EMPTY) outside = true;
          else if (g.block[kk] !== own) {
            const other = this.bodies[g.block[kk]];
            outside = (b.kind !== 'hull' || !other || other.kind !== 'hull') ? true : this.isBroken(own, g.block[kk]);
          }
          else outside = false;
        }
        if (!outside) continue;
        const x = b.gx[q] + di * CELL / 2, y = b.gy[q] + dj * CELL / 2;
        const area = CELL * Math.max(0.5, g.breadth[k]);
        faces.push(x, y, di, dj, area);
        contacts.push(x, y, di, dj, area);
      }
    }
    b.faces = Float32Array.from(faces);
    b.contacts = Float32Array.from(contacts);
    // profile area (for skin friction on the sides)
    let prof = 0;
    for (let q = 0; q < b.cells.length; q++) if (g.kind[b.cells[q]] !== EMPTY) prof += CELL2;
    b.profileArea = prof;
    this.buildSDF(b);
  }
  buildSDF(b) {
    const g = this.grid;
    const pad = 2;
    const x0 = b.aabb.x0 - pad * CELL, y0 = b.aabb.y0 - pad * CELL;
    const w = Math.ceil((b.aabb.x1 - b.aabb.x0) / CELL) + 2 * pad, h = Math.ceil((b.aabb.y1 - b.aabb.y0) / CELL) + 2 * pad;
    const inside = new Uint8Array(w * h);
    for (let q = 0; q < b.cells.length; q++) {
      if (g.kind[b.cells[q]] === EMPTY) continue;
      const i = Math.floor((b.gx[q] - x0) / CELL), j = Math.floor((b.gy[q] - y0) / CELL);
      if (i >= 0 && j >= 0 && i < w && j < h) inside[j * w + i] = 1;
    }
    // chamfer distance (in cells) inside and outside
    const INF = 1e6;
    const din = new Float32Array(w * h), dout = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) { din[k] = inside[k] ? INF : 0; dout[k] = inside[k] ? 0 : INF; }
    const pass = (d) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = j * w + i; let v = d[k];
        if (i > 0) v = Math.min(v, d[k - 1] + 1);
        if (j > 0) v = Math.min(v, d[k - w] + 1);
        if (i > 0 && j > 0) v = Math.min(v, d[k - w - 1] + 1.414);
        if (i < w - 1 && j > 0) v = Math.min(v, d[k - w + 1] + 1.414);
        d[k] = v;
      }
      for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) {
        const k = j * w + i; let v = d[k];
        if (i < w - 1) v = Math.min(v, d[k + 1] + 1);
        if (j < h - 1) v = Math.min(v, d[k + w] + 1);
        if (i < w - 1 && j < h - 1) v = Math.min(v, d[k + w + 1] + 1.414);
        if (i > 0 && j < h - 1) v = Math.min(v, d[k + w - 1] + 1.414);
        d[k] = v;
      }
    };
    pass(din); pass(dout);
    const d = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) d[k] = (inside[k] ? -(din[k] - 0.5) : (dout[k] - 0.5)) * CELL;
    b.sdf = { x0, y0, w, h, d };
  }

  isBroken(a, b) {
    if (a === b || a < 0 || b < 0) return false;
    return this.brokenBoundary.has(a < b ? a + '|' + b : b + '|' + a);
  }
  markBroken(a, b) { this.brokenBoundary.add(a < b ? a + '|' + b : b + '|' + a); }

  // ----------------------------------------------------------------- rooms
  // Flood-fill SPACE cells into rooms (4-connected, never across a broken
  // block interface). Water and air are carried over from the previous
  // segmentation cell by cell.
  segmentRooms(prev = null) {
    const g = this.grid, W = g.w, H = g.h, n = g.n;
    // carry-over: per-cell water & air from old rooms
    let cellWater = null, cellAir = null;
    if (prev) {
      cellWater = new Float32Array(n); cellAir = new Float32Array(n);
      for (const r of prev.rooms) {
        if (!r.cells.length) continue;
        const wf = prev.cellWaterFrac;
        let airVol = 0;
        for (const k of r.cells) airVol += g.vcap[k] * (1 - (wf ? wf[k] : 0));
        for (const k of r.cells) {
          const f = wf ? wf[k] : 0;
          const scale = r.water > 0 && wf ? 1 : 0;
          cellWater[k] = g.vcap[k] * f * scale;
          cellAir[k] = airVol > 0 ? r.air * (g.vcap[k] * (1 - f)) / airVol : 0;
        }
        // correct rounding so totals are exact
        let sw = 0; for (const k of r.cells) sw += cellWater[k];
        if (sw > 0) for (const k of r.cells) cellWater[k] *= r.water / sw;
        else if (r.water > 0) { const per = r.water / r.cells.length; for (const k of r.cells) cellWater[k] = per; }
      }
    }
    g.room.fill(-1);
    const rooms = [];
    const stack = new Int32Array(n);
    for (let start = 0; start < n; start++) {
      if (g.kind[start] !== SPACE || g.room[start] !== -1) continue;
      const id = rooms.length;
      let sp = 0; stack[sp++] = start; g.room[start] = id;
      const cells = [];
      while (sp) {
        const k = stack[--sp]; cells.push(k);
        const i = k % W, j = (k / W) | 0;
        const bk = g.block[k];
        // 4 neighbours
        if (i + 1 < W) { const kk = k + 1; if (g.kind[kk] === SPACE && g.room[kk] === -1 && !this.isBroken(bk, g.block[kk])) { g.room[kk] = id; stack[sp++] = kk; } }
        if (i > 0) { const kk = k - 1; if (g.kind[kk] === SPACE && g.room[kk] === -1 && !this.isBroken(bk, g.block[kk])) { g.room[kk] = id; stack[sp++] = kk; } }
        if (j + 1 < H) { const kk = k + W; if (g.kind[kk] === SPACE && g.room[kk] === -1 && !this.isBroken(bk, g.block[kk])) { g.room[kk] = id; stack[sp++] = kk; } }
        if (j > 0) { const kk = k - W; if (g.kind[kk] === SPACE && g.room[kk] === -1 && !this.isBroken(bk, g.block[kk])) { g.room[kk] = id; stack[sp++] = kk; } }
      }
      rooms.push(this.makeRoom(id, cells));
    }
    // initial water/air
    for (const r of rooms) {
      if (prev) {
        let w = 0, a = 0;
        for (const k of r.cells) { w += cellWater[k]; a += cellAir[k]; }
        r.water = Math.min(w, r.cap * 1.02); r.air = a;
        r.ang = 0; r.angV = 0;
        // inherit slosh state & air pressure from the dominant previous room
        let best = -1, bestN = 0; const cnt = new Map();
        for (const k of r.cells) { const o = prev.cellRoom[k]; if (o >= 0) cnt.set(o, (cnt.get(o) || 0) + 1); }
        for (const [o, c] of cnt) if (c > bestN) { bestN = c; best = o; }
        if (best >= 0 && prev.rooms[best]) { r.ang = prev.rooms[best].ang; r.angV = prev.rooms[best].angV; r.vented = prev.rooms[best].vented; }
        if (cnt.size === 0) { r.water = 0; r.air = r.cap; }
      } else {
        r.water = r.mat === MAT.TANK ? r.cap * 0.5 : 0;
        r.air = r.cap - r.water;
      }
    }
    this.rooms = rooms;
    this.buildElements();
    this.version++;
    this.topologyDirty = false;
  }

  makeRoom(id, cells) {
    const g = this.grid;
    let cap = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const matCount = new Map(); const zoneCount = new Map(); const deckCount = new Map();
    for (const k of cells) {
      cap += g.vcap[k];
      const x = this.cxs[k], y = this.cys[k];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      matCount.set(g.mat[k], (matCount.get(g.mat[k]) || 0) + g.vcap[k]);
      zoneCount.set(g.zone[k], (zoneCount.get(g.zone[k]) || 0) + 1);
      deckCount.set(g.deck[k], (deckCount.get(g.deck[k]) || 0) + 1);
    }
    const top = (m) => { let b = 0, bv = -1; for (const [k, v] of m) if (v > bv) { bv = v; b = k; } return b; };
    const mat = top(matCount), zone = top(zoneCount), deck = top(deckCount);
    const diag = Math.hypot(x1 - x0, y1 - y0) + 2;
    const nb = Math.ceil(diag / (CELL / 2)) + 8;
    const meta = this.meta;
    const deckName = meta.deckNames[deck] || '';
    const zname = meta.compartments[zone] || '';
    const label = deck <= 2 && (mat === MAT.BOILER || mat === MAT.ENGINE || mat === MAT.HOLD || mat === MAT.BUNKER)
      ? zname : `${MATERIALS[mat].name}, ${deckName === 'Boat' ? 'Boat deck' : deckName === 'House' ? 'deckhouse' : deckName + ' deck'}`;
    return {
      id, cells: Int32Array.from(cells), cap, water: 0, air: cap, level: -1e9, levelLocal: 0,
      pAir: 101325, vented: true, full: false, surfA: 1, mat, zone, deck, label,
      x0, x1, y0, y1, bins: new Float64Array(nb), smin: 0, ang: 0, angV: 0,
      inflow: 0, lastLevel: 0, submerged: false, trapped: false, dpOut: 0, lit: true,
      group: id, sinkTimer: 0,
    };
  }

  // Openings between regions (rooms / outside).
  buildElements() {
    const g = this.grid, W = g.w, H = g.h;
    const els = [];
    const walls = [];
    const regionOf = (from, kk) => {
      // region id of neighbour cell kk as seen from cell `from`
      if (kk < 0) return EXT;
      if (g.isExteriorLike(kk)) return EXT;
      if (this.isBroken(g.block[from], g.block[kk])) return EXT;
      if (g.kind[kk] === SPACE) return g.room[kk];
      return null; // solid or opening
    };
    const nbrs = (k) => {
      const i = k % W, j = (k / W) | 0;
      return [
        i + 1 < W ? k + 1 : -1, i > 0 ? k - 1 : -1,
        j + 1 < H ? k + W : -1, j > 0 ? k - W : -1,
      ];
    };
    for (let k = 0; k < g.n; k++) {
      const kd = g.kind[k];
      if (kd === EMPTY) continue;
      if (kd === OPEN) {
        const nb = nbrs(k);
        // pairs: horizontal (left/right) and vertical (up/down)
        const pairs = [[nb[1], nb[0], 0], [nb[3], nb[2], 1]];
        for (const [p, q, vert] of pairs) {
          const ra = regionOf(k, p), rb = regionOf(k, q);
          if (ra === null || rb === null || ra === rb) continue;
          els.push({ type: 'open', k, a: ra, b: rb, ka: p, kb: q, vert, area: CELL * Math.max(0.3, g.openW[k]) });
        }
        continue;
      }
      if (kd === SPACE) {
        const r = g.room[k];
        if (g.side[k]) els.push({ type: 'side', k, a: r, b: EXT, ka: k, kb: k, vert: 0, area: 0 });
        // faces to outside (damage, broken interfaces)
        const nb = nbrs(k);
        for (let d = 0; d < 4; d++) {
          const kk = nb[d];
          const rg = regionOf(k, kk);
          if (rg === EXT) els.push({ type: 'face', k, a: r, b: EXT, ka: k, kb: kk, vert: d >= 2 ? 1 : 0, area: CELL * Math.max(0.5, g.breadth[k]) });
        }
        continue;
      }
      // SOLID: wall between two regions (for burst checks)
      if (kd === SOLID && g.isEnvelope(k)) {
        const nb = nbrs(k);
        const ra = regionOf(k, nb[1]), rb = regionOf(k, nb[0]);
        if (ra !== null && rb !== null && ra !== rb) walls.push({ k, a: ra, b: rb, ka: nb[1], kb: nb[0] });
        const rc = regionOf(k, nb[3]), rd = regionOf(k, nb[2]);
        if (rc !== null && rd !== null && rc !== rd) walls.push({ k, a: rc, b: rd, ka: nb[3], kb: nb[2] });
      }
    }
    // vertical trunks (casings) from a space straight up to the open air
    for (const t of this.meta.trunks || []) {
      const kb = t.kBottom, kt = t.kTop;
      if (g.kind[kb] !== SPACE || g.kind[kt] === EMPTY) continue;
      const a = g.room[kb];
      if (!(a >= 0)) continue;
      const area = t.area + (t.open ? t.burstArea : 0);
      if (area <= 0) continue;
      els.push({ type: 'link', k: kt, a, b: EXT, ka: kb, kb: kt, vert: 1, area, trunk: t });
    }
    const pairMap = new Map();
    this.pairs = [];
    for (const e of els) {
      e.flow = 0; e.airFlow = 0; e.q = 0;
      const lo = Math.min(e.a, e.b), hi = Math.max(e.a, e.b);
      const key = lo * 100003 + hi;
      let pi = pairMap.get(key);
      if (pi === undefined) { pi = this.pairs.length; pairMap.set(key, pi); this.pairs.push({ a: e.a, b: e.b, sum: 0, dp: 0, qmax: 0, scale: 1 }); }
      e.pair = pi;
    }
    this.elements = els;
    this.walls = walls;
    // room -> element index lists
    for (const r of this.rooms) r.els = [];
    els.forEach((e, idx) => {
      if (e.a >= 0) this.rooms[e.a].els.push(idx);
      if (e.b >= 0) this.rooms[e.b].els.push(idx);
    });
  }
}
