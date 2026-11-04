// Progressive flooding: compartment hydraulics in the style used by naval
// architects for damage stability, applied to every room the structure
// grid produces.
//
//  * Each room holds a water volume and an amount of air. Its free surface is
//    a plane; the level is solved from the room's true (tilted) geometry.
//  * Water moves through every opening as orifice flow, Q = Cd A sqrt(2 dp / rho),
//    driven by the pressure difference at the opening (hydrostatic head plus
//    air pressure on each side).
//  * Air that cannot escape is trapped: it compresses isothermally
//    (p V = const), resists inflow and leaves through openings as bubbles.
//  * Glass, doors, hatch covers and plating burst when the pressure difference
//    across them exceeds their strength - this is what makes deep air pockets
//    implode.

import { CELL, G, P_ATM, RHO_AIR, gaugePressure, seaDensityAtDepth } from './constants.js';
import { MATERIALS, MAT, SPACE, SOLID, OPEN, EMPTY, SIDE, SIDE_INFO } from './materials.js';
import { EXT } from './ship.js';

const CD = 0.62;
const RHO = 1025;

export class Flooding {
  constructor(ship, env) {
    this.ship = ship;
    this.env = env;
    const n = ship.grid.n;
    this.cellWaterFrac = new Float32Array(n);
    this.cellRoom = ship.grid.room;
    this.wx = new Float32Array(n);       // world position cache for room cells
    this.wy = new Float32Array(n);
    this.events = [];
    this.totalInflow = 0;                // m^3/s from the sea
    this.totalAirOut = 0;
    this.bubbleSources = [];             // [x, y, volume] released this step
    this.jets = [];                      // visual jets [x, y, vx, vy, q, inside]
    this.burstQueue = [];
    this.parent = null;
    this.stats = { floodedTonnes: 0, inflowTps: 0 };
  }

  // world positions of all room cells (call after bodies move)
  updatePositions() {
    const sh = this.ship, g = sh.grid, bodies = sh.bodies;
    for (const r of sh.rooms) {
      for (let q = 0; q < r.cells.length; q++) {
        const k = r.cells[q];
        const b = bodies[g.block[k]];
        const gx = sh.cxs[k], gy = sh.cys[k];
        this.wx[k] = b.x + b.c * (gx - b.comX) - b.s * (gy - b.comY);
        this.wy[k] = b.y + b.s * (gx - b.comX) + b.c * (gy - b.comY);
      }
    }
  }

  cellPos(k) {
    const sh = this.ship, g = sh.grid;
    const b = sh.bodies[g.block[k]];
    const gx = sh.cxs[k], gy = sh.cys[k];
    return [b.x + b.c * (gx - b.comX) - b.s * (gy - b.comY), b.y + b.s * (gx - b.comX) + b.c * (gy - b.comY)];
  }

  // Solve the free-surface level of every room from its water volume.
  solveLevels(dt) {
    const sh = this.ship, g = sh.grid;
    const half = CELL / 2, binW = CELL / 2;
    for (const r of sh.rooms) {
      const cells = r.cells;
      if (!cells.length) continue;
      // slosh: free surface angle relative to the world horizontal
      const b0 = sh.bodies[g.block[cells[0]]];
      if (r.refA === undefined) r.refA = b0.a;
      let dA = b0.a - r.refA; r.refA = b0.a;
      if (dA > Math.PI) dA -= 2 * Math.PI; if (dA < -Math.PI) dA += 2 * Math.PI;
      const fill = r.cap > 0 ? r.water / r.cap : 0;
      if (fill > 0.001 && fill < 0.995 && dt > 0) {
        const L = Math.max(2, r.span || 10), d = Math.max(0.2, r.depthW || 1);
        const w = Math.sqrt(Math.PI * G / L * Math.tanh(Math.PI * d / L));
        r.ang += dA * 0.6;
        // effective gravity tilt from the container's (filtered) acceleration
        const ax = b0.axS || 0, ay = b0.ayS || 0;
        const target = Math.max(-0.3, Math.min(0.3, Math.atan2(-ax, G + ay)));
        const acc = -w * w * (r.ang - target) - 2 * 0.12 * w * r.angV;
        r.angV += acc * dt;
        r.ang += r.angV * dt;
        if (r.ang > 0.4) { r.ang = 0.4; r.angV *= -0.3; } if (r.ang < -0.4) { r.ang = -0.4; r.angV *= -0.3; }
      } else { r.ang *= 0.5; r.angV = 0; }
      const nx = -Math.sin(r.ang), ny = Math.cos(r.ang);
      r.nx = nx; r.ny = ny;
      // projected heights and bins
      let smin = 1e18, smax = -1e18, xmin = 1e18, xmax = -1e18;
      for (let q = 0; q < cells.length; q++) {
        const k = cells[q];
        const s = nx * this.wx[k] + ny * this.wy[k];
        if (s < smin) smin = s; if (s > smax) smax = s;
        const t = ny * this.wx[k] - nx * this.wy[k];
        if (t < xmin) xmin = t; if (t > xmax) xmax = t;
      }
      r.smin = smin - half; r.smax = smax + half;
      r.span = xmax - xmin + CELL;
      const bins = r.bins;
      const nb = Math.min(bins.length, Math.ceil((r.smax - r.smin) / binW) + 2);
      for (let q = 0; q < nb; q++) bins[q] = 0;
      for (let q = 0; q < cells.length; q++) {
        const k = cells[q];
        const s = nx * this.wx[k] + ny * this.wy[k] - r.smin;   // centre, >= half
        const v = g.vcap[k];
        // cell spans [s-half, s+half] = exactly two bins wide
        const lo = s - half;
        const b0i = Math.floor(lo / binW);
        const frac = lo / binW - b0i;
        if (b0i >= 0 && b0i + 2 < nb) {
          bins[b0i] += v * 0.5 * (1 - frac);
          bins[b0i + 1] += v * 0.5;
          bins[b0i + 2] += v * 0.5 * frac;
        }
      }
      // invert cumulative volume
      const target = Math.min(r.water, r.cap);
      let acc = 0, level = r.smin, area = 1;
      if (target <= 0) { level = r.smin; area = Math.max(0.5, bins[0] / binW); }
      else {
        let found = false;
        for (let q = 0; q < nb; q++) {
          const bv = bins[q];
          if (acc + bv >= target && bv > 0) {
            level = r.smin + (q + (target - acc) / bv) * binW;
            area = Math.max(0.2, bv / binW);
            found = true; break;
          }
          acc += bv;
        }
        if (!found) { level = r.smax; area = 0.2; }
      }
      r.full = r.water >= r.cap * 0.998;
      const Sv = Math.max(0.2, r.cap / 2500);
      if (r.water > r.cap) level = r.smax + (r.water - r.cap) / Sv;
      r.level = level;
      r.surfA = r.full ? Sv : area;
      r.depthW = Math.max(0, Math.min(level, r.smax) - r.smin);
    }
  }

  // per-cell water fraction & per-body floodwater mass sums
  distributeWater() {
    const sh = this.ship, g = sh.grid;
    for (const b of sh.bodies) { b.mw = 0; b.swx = 0; b.swy = 0; b.swq = 0; }
    const half = CELL / 2;
    let total = 0;
    for (const r of sh.rooms) {
      const cells = r.cells;
      const lvl = r.level, nx = r.nx || 0, ny = r.ny || 1;
      const empty = r.water <= 1e-6;
      let wsum = 0;
      for (let q = 0; q < cells.length; q++) {
        const k = cells[q];
        let f = 0;
        if (!empty) {
          const s = nx * this.wx[k] + ny * this.wy[k];
          f = (lvl - s) / CELL + 0.5;
          f = f < 0 ? 0 : f > 1 ? 1 : f;
        }
        this.cellWaterFrac[k] = f;
        if (f > 0) {
          const m = RHO * g.vcap[k] * f;
          wsum += m;
          const b = sh.bodies[g.block[k]];
          const x = sh.cxs[k], y = sh.cys[k];
          b.mw += m; b.swx += m * x; b.swy += m * y; b.swq += m * (x * x + y * y);
        }
      }
      total += wsum;
      r.mass = wsum;
    }
    this.stats.floodedTonnes = total / 1000;
    let vol = 0; for (const r of sh.rooms) vol += r.water;
    this.stats.waterVolume = vol;
  }

  // pressure inside room r at world point (x, y)
  roomP(r, x, y) {
    // a completely full room has no free surface: its pressure is set by the
    // network (solved in solveFullRooms) and varies hydrostatically with height
    if (r.pressed) return r.pTop + RHO * G * (r.smax - (r.nx * x + r.ny * y));
    const d = r.level - (r.nx * x + r.ny * y);
    return r.pAir + (d > 0 ? RHO * G * d : 0);
  }
  roomWet(r, x, y) {
    if (r.water <= 1e-6) return 0;
    const d = (r.level - (r.nx * x + r.ny * y)) / CELL + 0.5;
    return d < 0 ? 0 : d > 1 ? 1 : d;
  }
  extP(x, y) {
    const s = this.env.surface(x);
    return P_ATM + gaugePressure(s - y);
  }
  extWet(x, y) {
    const d = (this.env.surface(x) - y) / CELL + 0.5;
    return d < 0 ? 0 : d > 1 ? 1 : d;
  }

  find(i) { const p = this.parent; while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; }
  union(a, b) { a = this.find(a); b = this.find(b); if (a !== b) this.parent[a] = b; }

  // determine vented / trapped air groups and their pressure
  solveAir() {
    const sh = this.ship, rooms = sh.rooms, n = rooms.length;
    const ATM = n; // virtual node for the atmosphere
    if (!this.parent || this.parent.length !== n + 1) this.parent = new Int32Array(n + 1);
    for (let i = 0; i <= n; i++) this.parent[i] = i;
    const g = sh.grid;
    for (const e of sh.elements) {
      if (!this.elementOpen(e)) continue;
      const [x, y] = this.cellPos(e.k);
      const ra = e.a >= 0 ? rooms[e.a] : null, rb = e.b >= 0 ? rooms[e.b] : null;
      const wa = ra ? this.roomWet(ra, x, y) : this.extWet(x, y);
      const wb = rb ? this.roomWet(rb, x, y) : this.extWet(x, y);
      e.wa = wa; e.wb = wb; e.x = x; e.y = y;
      if (wa < 0.5 && wb < 0.5) this.union(e.a >= 0 ? e.a : ATM, e.b >= 0 ? e.b : ATM);
    }
    // group totals
    const gn = new Float64Array(n + 1), gv = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
      const r = rooms[i];
      const vAir = Math.max(r.cap * 1e-4, r.cap - Math.min(r.water, r.cap));
      r.vAir = vAir;
      const root = this.find(i);
      gn[root] += r.air; gv[root] += vAir;
    }
    const atmRoot = this.find(ATM);
    // a trapped pocket can never be pressurised beyond what the water feeding
    // it can supply: cap each group at the highest outside pressure among its
    // openings (otherwise flow-limiter lag would ratchet it up numerically)
    const gcap = new Float64Array(n + 1).fill(-1);
    for (const e of sh.elements) {
      if (!this.elementOpen(e) || e.x === undefined) continue;
      for (let side = 0; side < 2; side++) {
        const me = side === 0 ? e.a : e.b, other = side === 0 ? e.b : e.a;
        if (me < 0) continue;
        const root = this.find(me);
        if (root === atmRoot) continue;
        if (other >= 0 && this.find(other) === root) continue;
        const ro = other >= 0 ? rooms[other] : null;
        const po = ro ? this.roomP(ro, e.x, e.y) : this.extP(e.x, e.y);
        const rm = rooms[me];
        const head = Math.max(0, rm.level - (rm.nx * e.x + rm.ny * e.y));
        const pc = po - RHO * G * head;
        if (pc > gcap[root]) gcap[root] = pc;
      }
    }
    for (let i = 0; i < n; i++) {
      const r = rooms[i];
      const root = this.find(i);
      r.group = root;
      if (root === atmRoot) {
        r.vented = true; r.trapped = false;
        r.pAir = P_ATM; r.air = r.vAir;
      } else {
        r.vented = false; r.trapped = true;
        let p = P_ATM * gn[root] / Math.max(1e-6, gv[root]);
        if (gcap[root] > 0 && p > gcap[root] * 1.02) {
          // excess air escapes (it would have bubbled out through the openings)
          p = Math.max(P_ATM * 0.5, gcap[root]);
        }
        r.pAir = Math.min(p, 6e7);
        r.air = p * r.vAir / P_ATM;
        if (r.full && r.vAir < r.cap * 2e-3) { r.air = 0; r.pAir = Math.max(P_ATM, Math.min(r.pAir, gcap[root] > 0 ? gcap[root] : r.pAir)); }
      }
    }
  }

  elementOpen(e) {
    const g = this.ship.grid;
    if (e.type === 'open') return g.gate[e.k] === 0 && g.kind[e.k] === OPEN;
    if (e.type === 'side') return g.sideArea[e.k] > 0 || !!(SIDE_INFO[g.side[e.k]] && SIDE_INFO[g.side[e.k]].leak);
    return true;
  }

  // compliance of a room: dp per m^3 of water added
  K(r) {
    if (!r || r.pressed) return 0;     // pressure of a full room comes from the network solve
    let k = RHO * G / Math.max(0.05, r.surfA);
    if (r.trapped) k += r.pAir / Math.max(0.01, r.vAir);
    return k;
  }

  // Full rooms are incompressible nodes: find the pressure at which what
  // flows in equals what flows out (Gauss-Seidel over rooms, bisection each).
  solveFullRooms(dt) {
    const sh = this.ship, rooms = sh.rooms, els = sh.elements, g = sh.grid;
    const full = [];
    for (const r of rooms) {
      r.pressed = r.full && r.vAir <= r.cap * 2e-3 && r.cells.length > 0;
      if (r.pressed) { if (r.pTop === undefined || !isFinite(r.pTop)) r.pTop = r.pAir; full.push(r); }
    }
    if (!full.length) return;
    const netFlow = (r, pTop) => {
      const save = r.pTop; r.pTop = pTop;
      let q = 0;
      for (const idx of r.els) {
        const e = els[idx];
        if (!this.elementOpen(e)) continue;
        const A = e.type === 'side' ? (g.sideArea[e.k] > 0 ? g.sideArea[e.k] : (SIDE_INFO[g.side[e.k]] ? SIDE_INFO[g.side[e.k]].leak || 0 : 0)) : e.area;
        if (A <= 0) continue;
        const mine = e.a === r.id;
        const other = mine ? e.b : e.a;
        const ro = other >= 0 ? rooms[other] : null;
        const pm = this.roomP(r, e.x, e.y);
        const po = ro ? this.roomP(ro, e.x, e.y) : this.extP(e.x, e.y);
        const dp = po - pm;                       // > 0: flows into r
        const wo = mine ? e.wb : e.wa;
        const up = dp > 0 ? (wo === undefined ? 1 : wo) : 1;
        q += Math.sign(dp) * CD * A * up * Math.sqrt(2 * Math.abs(dp) / RHO);
      }
      r.pTop = save;
      return q;
    };
    for (let sweep = 0; sweep < 14; sweep++) {
      for (const r of full) {
        // net inflow wanted: zero, plus a correction that pushes out any
        // volume above capacity (or draws in a deficit) within ~2 steps
        const target = dt > 0 ? -(r.water - r.cap) / (2 * dt) : 0;
        let lo = 0.2 * P_ATM, hi = Math.max(r.pTop, P_ATM) + 4e5;
        let qlo = netFlow(r, lo) - target, qhi = netFlow(r, hi) - target;
        let guard = 0;
        while (qhi > 0 && guard++ < 20) { hi += 1e6; qhi = netFlow(r, hi) - target; }
        if (qlo < 0) { r.pTop = lo; continue; }
        for (let it = 0; it < 32; it++) {
          const mid = 0.5 * (lo + hi), qm = netFlow(r, mid) - target;
          if (qm > 0) lo = mid; else hi = mid;
        }
        r.pTop = 0.5 * (lo + hi);
      }
    }
  }

  step(dt) {
    const sh = this.ship, g = sh.grid, rooms = sh.rooms;
    this.updatePositions();
    this.solveLevels(dt);
    this.solveAir();
    this.solveFullRooms(dt);
    this.bubbleSources.length = 0;
    this.jets.length = 0;
    let inflow = 0, airOut = 0;
    const dW = new Float64Array(rooms.length);
    const dA = new Float64Array(rooms.length);
    const els = sh.elements;
    for (const r of rooms) r.inflow = 0;
    // 1. flows per element
    for (let idx = 0; idx < els.length; idx++) {
      const e = els[idx];
      e.q = 0; e.qa = 0;
      if (!this.elementOpen(e)) continue;
      let A = e.area;
      if (e.type === 'side') A = g.sideArea[e.k] > 0 ? g.sideArea[e.k] : (SIDE_INFO[g.side[e.k]] ? SIDE_INFO[g.side[e.k]].leak || 0 : 0);
      if (A <= 0) continue;
      const x = e.x, y = e.y;
      const ra = e.a >= 0 ? rooms[e.a] : null, rb = e.b >= 0 ? rooms[e.b] : null;
      const pa = ra ? this.roomP(ra, x, y) : this.extP(x, y);
      const pb = rb ? this.roomP(rb, x, y) : this.extP(x, y);
      const wa = e.wa, wb = e.wb;
      const dp = pa - pb;
      const fromA = dp > 0;
      const ws = fromA ? wa : wb;            // wetness at the source side
      const wt = fromA ? wb : wa;
      const adp = Math.abs(dp);
      let q = 0, qa = 0;
      if (adp > 0) {
        const v = Math.sqrt(2 * adp / RHO);
        q = CD * A * ws * v;
        // trapped air pushed out through a submerged opening (bubbling)
        if (ws < 1 && wt > 0.05) {
          const ps = fromA ? (ra ? ra.pAir : P_ATM) : (rb ? rb.pAir : P_ATM);
          const rhoA = RHO_AIR * ps / P_ATM;
          qa = CD * A * (1 - ws) * Math.min(60, Math.sqrt(2 * adp / rhoA)) * 0.35;
        }
      }
      // exchange flow through a deck opening: water above falls, air rises
      if (e.vert) {
        const upper = rb, lower = ra;   // a = below (nb[3]), b = above (nb[2])
        const wu = wb, wl = wa;
        if (wu > 0.5 && wl < 0.5 && lower && !lower.full) {
          let qx = CD * A * 0.5 * Math.sqrt(G * Math.min(2, Math.sqrt(A))) * (wu - wl);
          // water down (b -> a), the same volume of air up (a -> b): pressure-neutral,
          // so it can never exceed the air the lower space still holds
          qx = Math.min(qx, 0.25 * lower.vAir / dt / Math.max(1, lower.els.length));
          if (upper) qx = Math.min(qx, upper.water / dt / Math.max(1, upper.els.length));
          e.qx = qx;
        } else e.qx = 0;
      } else e.qx = 0;
      // signed water flow a->b
      e.q = fromA ? q : -q;
      e.qa = fromA ? qa : -qa;
    }
    // 2. limit transfers per room pair by pressure equalisation (no overshoot)
    const pairs = sh.pairs;
    for (const P of pairs) { P.sum = 0; P.dp = 0; P.qmax = 0; }
    for (let idx = 0; idx < els.length; idx++) {
      const e = els[idx];
      const w = e.q - (e.qx || 0);
      if (!w) continue;
      const P = pairs[e.pair];
      P.sum += w;
      const aw = Math.abs(w);
      if (aw > P.qmax) {
        P.qmax = aw;
        const ra = e.a >= 0 ? rooms[e.a] : null, rb = e.b >= 0 ? rooms[e.b] : null;
        const pa = ra ? this.roomP(ra, e.x, e.y) : this.extP(e.x, e.y);
        const pb = rb ? this.roomP(rb, e.x, e.y) : this.extP(e.x, e.y);
        P.dp = Math.abs(pa - pb) + (e.qx ? RHO * G * CELL : 0);
      }
    }
    for (const P of pairs) {
      P.scale = 1;
      if (!P.sum) continue;
      const ra = P.a >= 0 ? rooms[P.a] : null, rb = P.b >= 0 ? rooms[P.b] : null;
      // flows through a full (incompressible) room were balanced by the pressure solve
      if ((ra && ra.pressed) || (rb && rb.pressed)) continue;
      const kk = this.K(ra) + this.K(rb);
      if (kk > 0) {
        const vmax = 0.45 * P.dp / kk;
        const dv = Math.abs(P.sum) * dt;
        if (dv > vmax) P.scale = vmax / dv;
      }
    }
    // per-room drain limit
    const out = new Float64Array(rooms.length);
    for (const e of els) {
      const w = (e.q - (e.qx || 0)) * pairs[e.pair].scale;
      if (w > 0 && e.a >= 0) out[e.a] += w; else if (w < 0 && e.b >= 0) out[e.b] -= w;
    }
    const drain = new Float64Array(rooms.length).fill(1);
    for (let i = 0; i < rooms.length; i++) if (out[i] * dt > rooms[i].water) drain[i] = rooms[i].water / (out[i] * dt + 1e-12);
    for (let idx = 0; idx < els.length; idx++) {
      const e = els[idx];
      if (!e.q && !e.qx && !e.qa) continue;
      const ra = e.a >= 0 ? rooms[e.a] : null, rb = e.b >= 0 ? rooms[e.b] : null;
      let wnet = (e.q - (e.qx || 0)) * pairs[e.pair].scale;      // + means a -> b
      if (wnet > 0 && ra) wnet *= drain[e.a]; else if (wnet < 0 && rb) wnet *= drain[e.b];
      const qx = Math.max(0, -(wnet - e.q * pairs[e.pair].scale)) ;
      e.flow = wnet;
      if (ra) dW[e.a] -= wnet * dt; else inflow += wnet;
      if (rb) dW[e.b] += wnet * dt; else inflow -= wnet;
      if (ra && !rb && wnet < 0) ra.inflow += -wnet;
      if (rb && !ra && wnet > 0) rb.inflow += wnet;
      // air: exchange volume rises (a -> b) at the lower room's pressure, bubbling a->b or b->a
      const qxs = (e.qx || 0) * pairs[e.pair].scale;
      if (qxs > 0 && ra) {
        const nMove = Math.min(ra.air, qxs * dt * ra.pAir / P_ATM);
        dA[e.a] -= nMove; if (rb) dA[e.b] += nMove; else { airOut += nMove; this.bubbleSources.push(e.x, e.y, nMove); }
      }
      if (e.qa) {
        const src = e.qa > 0 ? ra : rb, dst = e.qa > 0 ? rb : ra;
        const si = e.qa > 0 ? e.a : e.b, di = e.qa > 0 ? e.b : e.a;
        if (src) {
          const pd = dst ? dst.pAir : this.extP(e.x, e.y);
          const nMin = pd * src.vAir / P_ATM;
          const nMove = Math.max(0, Math.min(Math.abs(e.qa) * dt * src.pAir / P_ATM, (src.air - nMin) * 0.5));
          dA[si] -= nMove;
          if (dst) dA[di] += nMove; else { airOut += nMove; this.bubbleSources.push(e.x, e.y, nMove); }
        }
      }
      // visual jets where the sea enters through an opening
      if (Math.abs(wnet) > 0.02 && (!ra || !rb)) {
        const into = !ra ? e.b : e.a;
        const qIn = !ra ? wnet : -wnet;
        if (qIn > 0) this.jets.push(e.x, e.y, qIn, e.k, into);
      }
    }
    // ventilation trunks, cable runs and imperfect hatch covers let compressed
    // air bleed upward (rooms are never truly airtight - tanks excepted)
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (!r.trapped || r.mat === MAT.TANK || r.pAir <= P_ATM * 1.01 || r.air <= 0) continue;
      const leak = r.air * (1 - P_ATM / r.pAir) * Math.min(1, dt / 35);
      dA[i] -= leak;
      if (Math.random() < 0.05) this.bubbleSources.push(this.wx[r.cells[r.cells.length - 1]], this.wy[r.cells[r.cells.length - 1]], leak * 10);
    }
    // 3. apply
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      r.water = Math.max(0, r.water + dW[i]);
      const maxW = r.cap * 1.5;   // safety only; the full-room solve keeps excess near zero
      if (r.water > maxW) { this.lost = (this.lost || 0) + (r.water - maxW); r.water = maxW; }
      if (r.trapped) r.air = Math.max(0, r.air + dA[i]);
      r.inflowF = (r.inflowF || 0) * 0.95 + r.inflow * 0.05;
    }
    this.totalInflow = inflow;
    this.ledger = this.ledger || { seaIn: 0 };
    this.ledger.seaIn += inflow * dt;
    this.totalAirOut = airOut / Math.max(1e-6, dt);
    this.stats.inflowTps = (this.stats.inflowTps || 0) * 0.97 + inflow * RHO / 1000 * 0.03;
    // 4. bursts: glass, doors, covers, plating
    this.checkBursts();
    this.solveLevels(0);
    this.distributeWater();
  }

  checkBursts() {
    const sh = this.ship, g = sh.grid, rooms = sh.rooms;
    // side openings with glass/doors
    for (const e of sh.elements) {
      if (e.type !== 'side') continue;
      const k = e.k;
      const st = g.side[k];
      if (g.sideArea[k] > 0) continue;
      const info = SIDE_INFO[st];
      if (!info) continue;
      const r = rooms[e.a];
      const [x, y] = this.cellPos(k);
      const pin = this.roomP(r, x, y), pout = this.extP(x, y);
      const strength = info.burst * (1 - 0.8 * g.rust[k]);
      if (Math.abs(pin - pout) > strength) {
        g.sideArea[k] = info.area;
        this.events.push({ type: pout > pin ? 'implode-glass' : 'burst-glass', k, x, y, dp: pout - pin, st, room: r.id });
      }
    }
    // closed passages (watertight doors, skylights, hatch covers)
    for (const e of sh.elements) {
      if (e.type !== 'open') continue;
      if (g.gate[e.k] === 0) continue;
      const [x, y] = this.cellPos(e.k);
      const ra = e.a >= 0 ? rooms[e.a] : null, rb = e.b >= 0 ? rooms[e.b] : null;
      const pa = ra ? this.roomP(ra, x, y) : this.extP(x, y);
      const pb = rb ? this.roomP(rb, x, y) : this.extP(x, y);
      const mi = MATERIALS[g.mat[e.k]];
      if (Math.abs(pa - pb) > mi.burst * (1 - 0.8 * g.rust[e.k])) {
        if (this.debug) console.log('GATE', mi.key, ra && [ra.label, ra.level.toFixed(2), ra.pAir.toFixed(0), ra.trapped, ra.water.toFixed(1), ra.cap.toFixed(1), ra.full], rb && [rb.label, rb.level.toFixed(2), rb.pAir.toFixed(0), rb.trapped, rb.water.toFixed(1), rb.cap.toFixed(1), rb.full], 'pa', pa.toFixed(0), 'pb', pb.toFixed(0), 'y', y.toFixed(2));
        g.gate[e.k] = 0;
        this.events.push({ type: 'burst-open', k: e.k, x, y, dp: pa - pb, mat: g.mat[e.k] });
      }
    }
    // glazed tops of casings (engine-room skylight)
    for (const e of sh.elements) {
      if (e.type !== 'link' || !e.trunk || e.trunk.open || !(e.trunk.burst > 0)) continue;
      const [x, y] = this.cellPos(e.k);
      const dp = Math.abs(this.roomP(rooms[e.a], x, y) - this.extP(x, y));
      if (dp > e.trunk.burst) {
        e.trunk.open = true; e.area += e.trunk.burstArea;
        this.events.push({ type: 'burst-open', k: e.k, x, y, dp, mat: MAT.SKYLIGHT });
      }
    }
    // structural panels: walls/decks between regions & side shell of rooms
    let burstCount = 0;
    const pairHits = new Map();
    for (const w of sh.walls) {
      const k = w.k;
      if (g.kind[k] !== SOLID) continue;
      const ra = w.a >= 0 ? rooms[w.a] : null, rb = w.b >= 0 ? rooms[w.b] : null;
      if (!ra && !rb) continue;
      if ((ra && !ra.trapped && rb && !rb.trapped) && Math.abs((ra.level) - (rb.level)) < 2) continue;
      const [x, y] = this.cellPos(k);
      const pa = ra ? this.roomP(ra, x, y) : this.extP(x, y);
      const pb = rb ? this.roomP(rb, x, y) : this.extP(x, y);
      const mi = MATERIALS[g.mat[k]];
      const dp = Math.abs(pa - pb);
      const cap = mi.burst * Math.max(0.05, 1 - g.rust[k]) * (0.75 + 0.5 * g.seed[k]);
      if (dp > cap) {
        const key = w.a + ',' + w.b;
        const hits = pairHits.get(key) || 0;
        if (hits >= 3) continue;
        pairHits.set(key, hits + 1);
        if (this.debug) console.log('BURST', g.mat[k], 'a', w.a, ra && [ra.label, ra.level.toFixed(2), ra.pAir.toFixed(0), ra.trapped, ra.water.toFixed(1), ra.cap.toFixed(1)], 'b', w.b, rb && [rb.label, rb.level.toFixed(2), rb.pAir.toFixed(0), rb.trapped, rb.water.toFixed(1), rb.cap.toFixed(1)], 'pa', pa.toFixed(0), 'pb', pb.toFixed(0), 'y', y.toFixed(2));
        this.burstQueue.push({ k, x, y, dp, implode: (pa > pb) === (w.a === -1) || (pb > pa) === (w.b === -1), a: w.a, b: w.b });
        burstCount++;
        if (burstCount > 24) break;
      }
    }
    // side shell of air-filled rooms deep underwater
    for (const r of rooms) {
      if (!r.trapped || r.cells.length === 0) continue;
      // lowest air cell in the room
      let best = -1, by = 1e9;
      for (let q = 0; q < r.cells.length; q += 3) {
        const k = r.cells[q];
        if (this.cellWaterFrac[k] > 0.5) continue;
        const y = this.wy[k];
        if (y < by) { by = y; best = k; }
      }
      if (best < 0) continue;
      const x = this.wx[best];
      const pout = this.extP(x, by), pin = r.pAir;
      r.dpOut = pout - pin;
      const isSuper = (g.flags[best] & 1) !== 0;
      const cap = (isSuper ? 2.2e5 : 1.4e6) * Math.max(0.05, 1 - g.rust[best]) * (0.8 + 0.4 * g.seed[best]);
      if (r.dpOut > cap) {
        if (this.debug) console.log('SHELL', r.label, r.level.toFixed(2), r.pAir.toFixed(0), r.water.toFixed(1), r.cap.toFixed(1), r.full, 'pout', pout.toFixed(0), 'y', by.toFixed(2), 'vAir', r.vAir.toFixed(2), 'air', r.air.toFixed(2));
        g.side[best] = SIDE.BREACH;
        g.sideArea[best] = Math.min(6, 0.02 * r.cap + 0.5);
        this.events.push({ type: 'implode', k: best, x, y: by, dp: r.dpOut, room: r.id, vol: r.vAir });
        this.ship.needElements = true;
      }
    }
  }
}
