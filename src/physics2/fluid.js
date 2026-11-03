// Connected-compartment model for water and air (2.5D: compartments are
// sections in a vertical plane with a uniform depth into the plane).
//
// State per compartment: water volume V (m^3) and air mass m (kg).
// State per opening slice: water volume flow Q (m^3/s), which has inertia.
//
//   Water momentum through an opening (unsteady orifice / Bernoulli):
//     rho * L/A * dQ/dt = dp - rho/(2 Cd^2 A^2) Q|Q|
//   integrated semi-implicitly; in steady state Q = Cd A sqrt(2 dp / rho).
//   Air: isothermal ideal gas, p = m R T / V_air; flows quasi-steadily through
//   the dry part of each opening (choked above the critical pressure ratio).
//   Every transfer is removed from one store and added to another, so water
//   and air are conserved exactly; the sea and atmosphere are infinite
//   reservoirs whose exchanges are tallied in the ledger.

import { v } from './params.js';

const G = v('constants.g'), PATM = v('constants.p_atm'), RAIR = v('constants.R_air'), TAIR = v('constants.T_air'), GAMMA = v('constants.gamma_air');
const CHOKE = Math.pow(2 / (GAMMA + 1), (GAMMA + 1) / (2 * (GAMMA - 1)));
export const SEA = -1, ATM = -2;

export class Frame {
  // a rigid frame in the vertical plane: world = o + R(ang) (u, z)
  constructor(ox = 0, oz = 0, ang = 0) { this.ox = ox; this.oz = oz; this.ang = ang; this.w = 0; this.alpha = 0; this.ax = 0; this.az = 0; }
  x(u, z) { return this.ox + Math.cos(this.ang) * u - Math.sin(this.ang) * z; }
  z(u, z) { return this.oz + Math.sin(this.ang) * u + Math.cos(this.ang) * z; }
}

export class Compartment {
  constructor({ name, frame, u0, u1, z0, z1, depth = 1, perm = 1, cell = 0.05, solids = [], water = 0, rho = 1025 }) {
    Object.assign(this, { name, frame, u0, u1, z0, z1, depth, perm, cell, rho });
    const us = [], zs = [], vs = [];
    for (let u = u0 + cell / 2; u < u1; u += cell) for (let z = z0 + cell / 2; z < z1; z += cell) {
      let p = perm;
      for (const s of solids) if (u > s.u0 && u < s.u1 && z > s.z0 && z < s.z1) p *= (1 - s.fill);
      if (p <= 0) continue;
      us.push(u); zs.push(z); vs.push(cell * cell * depth * p);
    }
    this.cu = Float64Array.from(us); this.cz = Float64Array.from(zs); this.cv = Float64Array.from(vs);
    this.n = this.cu.length;
    this.Vcap = this.cv.reduce((a, b) => a + b, 0);
    this.wx = new Float64Array(this.n); this.wz = new Float64Array(this.n); this.frac = new Float64Array(this.n);
    this.V = water;
    this.m = PATM * (this.Vcap - water) / (RAIR * TAIR);   // starts at atmospheric pressure
    this.psi = 0; this.psiV = 0;        // free-surface tilt (sloshing) relative to horizontal
    this.h = 0; this.S = 1; this.xc = 0;
    this.Sv = Math.max(1e-3, this.Vcap / (z1 - z0) / 400); // structural compliance when pressed full
    const nb = Math.ceil(2 * Math.hypot(u1 - u0, z1 - z0) / cell) + 8;
    this.bins = new Float64Array(nb);
    this.lastAng = frame.ang;
  }
  get Vair() { return Math.max(this.Vcap * 1e-6, this.Vcap - Math.min(this.V, this.Vcap)); }
  get pAir() { return this.m * RAIR * TAIR / this.Vair; }

  // natural sloshing frequency of the first mode (rectangular tank)
  sloshOmega() {
    const L = Math.max(0.2, this.u1 - this.u0), d = Math.max(0.02, Math.min(this.V / Math.max(1e-9, this.S), this.z1 - this.z0));
    return Math.sqrt(Math.PI * G / L * Math.tanh(Math.PI * d / L));
  }

  // world positions, sloshing, and the free-surface level that holds volume V
  update(dt) {
    const f = this.frame, c = Math.cos(f.ang), s = Math.sin(f.ang);
    let xmin = 1e9, xmax = -1e9;
    for (let i = 0; i < this.n; i++) {
      const x = f.ox + c * this.cu[i] - s * this.cz[i], z = f.oz + s * this.cu[i] + c * this.cz[i];
      this.wx[i] = x; this.wz[i] = z;
      if (x < xmin) xmin = x; if (x > xmax) xmax = x;
    }
    this.xc = 0.5 * (xmin + xmax);
    // slosh: the free surface is dragged by the container's rotation and
    // relaxes toward the effective-gravity normal as a damped first mode
    if (dt > 0) {
      const w = this.sloshOmega(), zeta = 0.06;
      let dA = f.ang - this.lastAng; this.lastAng = f.ang;
      const target = Math.atan2(-(f.ax || 0), G + (f.az || 0));
      const fill = this.V / this.Vcap;
      if (fill > 1e-4 && fill < 0.999) {
        this.psi += dA * 0.7;
        this.psiV += (-w * w * (this.psi - target) - 2 * zeta * w * this.psiV) * dt;
        this.psi += this.psiV * dt;
        this.psi = Math.max(-0.7, Math.min(0.7, this.psi));
      } else { this.psi = target; this.psiV = 0; }
    }
    const tp = Math.tan(this.psi);
    const hc = this.cell * (Math.abs(c) + Math.abs(s)), bw = hc / 2;
    let smin = 1e18, smax = -1e18;
    for (let i = 0; i < this.n; i++) { const sv = this.wz[i] - tp * (this.wx[i] - this.xc); if (sv < smin) smin = sv; if (sv > smax) smax = sv; }
    smin -= hc / 2; smax += hc / 2;
    const nb = Math.min(this.bins.length, Math.ceil((smax - smin) / bw) + 2);
    const B = this.bins; B.fill(0, 0, nb);
    for (let i = 0; i < this.n; i++) {
      const lo = (this.wz[i] - tp * (this.wx[i] - this.xc) - hc / 2 - smin) / bw;
      const b0 = Math.floor(lo), fr = lo - b0, v = this.cv[i];
      if (b0 >= 0 && b0 + 2 < nb) { B[b0] += v * 0.5 * (1 - fr); B[b0 + 1] += v * 0.5; B[b0 + 2] += v * 0.5 * fr; }
    }
    const target = Math.min(this.V, this.Vcap);
    let acc = 0, h = smin, S = 1e-3;
    if (target <= 0) { h = smin; S = Math.max(1e-3, B[0] / bw); }
    else {
      let found = false;
      for (let q = 0; q < nb; q++) {
        const bv = B[q];
        if (acc + bv >= target && bv > 0) { h = smin + (q + (target - acc) / bv) * bw; S = bv / bw; found = true; break; }
        acc += bv;
      }
      if (!found) { h = smax; S = 1e-3; }
    }
    if (this.V > this.Vcap) { h = smax + (this.V - this.Vcap) / this.Sv; S = this.Sv; }
    this.h = h; this.S = Math.max(this.Sv, S); this.smax = smax; this.smin = smin; this.tp = tp; this.hc = hc;
    for (let i = 0; i < this.n; i++) {
      const d = (h - (this.wz[i] - tp * (this.wx[i] - this.xc))) / hc + 0.5;
      this.frac[i] = this.V <= 0 ? 0 : d < 0 ? 0 : d > 1 ? 1 : d;
    }
  }
  surfaceZ(x) { return this.h + this.tp * (x - this.xc); }
  pressureAt(x, z) { const d = this.surfaceZ(x) - z; return this.pAir + (d > 0 ? this.rho * G * d : 0); }
  wetAt(x, z, half) { if (this.V <= 0) return 0; const d = (this.surfaceZ(x) - z) / (2 * half) + 0.5; return d < 0 ? 0 : d > 1 ? 1 : d; }
  // water centre of mass (world) and mass
  waterCG() {
    let m = 0, mx = 0, mz = 0;
    for (let i = 0; i < this.n; i++) { const w = this.cv[i] * this.frac[i]; m += w; mx += w * this.wx[i]; mz += w * this.wz[i]; }
    // cell volumes sum to the solved volume up to the level-smoothing error; report true mass
    return { V: m, x: m > 0 ? mx / m : 0, z: m > 0 ? mz / m : 0, mass: this.rho * Math.min(this.V, this.Vcap) };
  }
}

export class Opening {
  // kind 'wall': opening in a vertical boundary (door, breach, porthole); sliced in height.
  // kind 'floor': opening in a horizontal boundary (hatch, stairwell, skylight).
  constructor({ name, a, b, frame, u, z, height, width, kind = 'wall', Cd = v('openings.Cd_doorway'), slices = 6, areaScale = 1 }) {
    Object.assign(this, { name, a, b, frame, u, z, height, width, kind, Cd, areaScale });
    this.ns = kind === 'wall' ? slices : 1;
    this.Q = new Float64Array(this.ns);      // water flow a -> b per slice (m^3/s)
    this.mAir = new Float64Array(this.ns);   // air mass flow a -> b per slice (kg/s), diagnostic
    this.dp = new Float64Array(this.ns);
    const A = this.fullArea();
    this.L = v('openings.Leff_factor') * Math.sqrt(A) * 2;
  }
  fullArea() { return this.kind === 'wall' ? this.height * this.width : this.height * this.width; }
  sliceArea() { return this.fullArea() / this.ns * this.areaScale; }
  // world position of slice i (centre) and its half-height
  slicePos(i) {
    const f = this.frame;
    const dz = this.kind === 'wall' ? -this.height / 2 + (i + 0.5) * this.height / this.ns : 0;
    return [f.x(this.u, this.z + dz), f.z(this.u, this.z + dz), this.kind === 'wall' ? this.height / this.ns / 2 : 0.02];
  }
}

export class FluidNet {
  constructor({ seaLevel = 0, rhoSea = 1025 } = {}) {
    this.nodes = []; this.openings = []; this.seaLevel = seaLevel; this.rho = rhoSea;
    this.ledger = { seaIn: 0, atmAirIn: 0, V0: 0, m0: 0, steps: 0, clamps: 0 };
    this.t = 0;
  }
  add(c) { this.nodes.push(c); return this.nodes.length - 1; }
  open(o) { this.openings.push(o); return o; }
  start() { for (const c of this.nodes) c.update(0); this.ledger.V0 = this.totalWater(); this.ledger.m0 = this.totalAir(); }
  totalWater() { return this.nodes.reduce((s, c) => s + c.V, 0); }
  totalAir() { return this.nodes.reduce((s, c) => s + c.m, 0); }
  waterError() { return this.totalWater() - (this.ledger.V0 + this.ledger.seaIn); }
  airError() { return this.totalAir() - (this.ledger.m0 + this.ledger.atmAirIn); }

  pAt(id, x, z) {
    if (id === SEA) { const d = this.seaLevel - z; return PATM + (d > 0 ? this.rho * G * d : 0); }
    if (id === ATM) return PATM;
    return this.nodes[id].pressureAt(x, z);
  }
  wetAt(id, x, z, half) {
    if (id === SEA) { const d = (this.seaLevel - z) / (2 * half) + 0.5; return d < 0 ? 0 : d > 1 ? 1 : d; }
    if (id === ATM) return 0;
    return this.nodes[id].wetAt(x, z, half);
  }
  dpdV(id) {
    if (id < 0) return 0;
    const c = this.nodes[id];
    return this.rho * G / Math.max(1e-6, c.S) + c.pAir / c.Vair;
  }

  // one physics step (sub-stepped automatically when an opening is stiff)
  step(dt) {
    for (const c of this.nodes) c.update(dt);
    // stiffness of each opening's U-tube oscillation -> substeps
    let wmax = 0;
    for (const o of this.openings) {
      const A = o.sliceArea() * o.ns; if (A <= 0) continue;
      const k = this.dpdV(o.a) + this.dpdV(o.b);
      wmax = Math.max(wmax, Math.sqrt(A / (this.rho * o.L) * k));
    }
    const n = Math.min(400, Math.max(1, Math.ceil(dt * wmax / 0.5)));
    const h = dt / n;
    for (let s = 0; s < n; s++) { if (s) for (const c of this.nodes) c.update(0); this.substep(h); }
    this.t += dt; this.ledger.steps++;
  }

  substep(dt) {
    const rho = this.rho, N = this.nodes.length;
    const outW = new Float64Array(N);
    // 1. water: inertial orifice flow per slice
    for (const o of this.openings) {
      const A = o.sliceArea();
      for (let i = 0; i < o.ns; i++) {
        const [x, z, half] = o.slicePos(i);
        const pa = this.pAt(o.a, x, z), pb = this.pAt(o.b, x, z);
        const dp = pa - pb; o.dp[i] = dp;
        const fa = this.wetAt(o.a, x, z, half), fb = this.wetAt(o.b, x, z, half);
        let Q = o.Q[i];
        const up = Q > 0 ? fa : Q < 0 ? fb : dp > 0 ? fa : fb;
        const Aw = A * up;
        if (Aw < 1e-9) { o.Q[i] = 0; o.fa = fa; continue; }
        Q = (Q + dt * Aw / (rho * o.L) * dp) / (1 + dt * Math.abs(Q) / (2 * o.Cd * o.Cd * Aw * o.L));
        // floor openings: heavier water above lighter air falls through even
        // at equal pressure (exchange flow); the same volume of air rises
        if (o.kind === 'floor') {
          // convention: a is below, b is above
          if (fb > 0.5 && fa < 0.5 && Q <= 0) Q = Math.min(Q, -0.3 * o.Cd * A * Math.sqrt(G * Math.sqrt(A)));
        }
        o.Q[i] = Q;
        if (Q > 0 && o.a >= 0) outW[o.a] += Q * dt;
        if (Q < 0 && o.b >= 0) outW[o.b] -= Q * dt;
      }
    }
    // 2. conservation: no store gives more water than it holds
    const scale = new Float64Array(N).fill(1);
    for (let k = 0; k < N; k++) if (outW[k] > this.nodes[k].V) { scale[k] = this.nodes[k].V / outW[k]; this.ledger.clamps++; }
    const dV = new Float64Array(N);
    for (const o of this.openings) for (let i = 0; i < o.ns; i++) {
      let Q = o.Q[i]; if (!Q) continue;
      const src = Q > 0 ? o.a : o.b;
      if (src >= 0 && scale[src] < 1) { Q *= scale[src]; o.Q[i] = Q; }
      const vol = Q * dt;                       // moves from a to b
      if (o.a >= 0) dV[o.a] -= vol; else this.ledger.seaIn += vol;   // from outside into the ship
      if (o.b >= 0) dV[o.b] += vol; else this.ledger.seaIn -= vol;   // from the ship to outside
    }
    for (let k = 0; k < N; k++) this.nodes[k].V = Math.max(0, this.nodes[k].V + dV[k]);
    // 3. air: through the dry part of each slice, plus air displaced by exchange
    const dm = new Float64Array(N);
    for (const o of this.openings) {
      const A = o.sliceArea();
      for (let i = 0; i < o.ns; i++) {
        const [x, z, half] = o.slicePos(i);
        const pa = this.pAt(o.a, x, z), pb = this.pAt(o.b, x, z);
        const fwd = pa >= pb;
        const fup = fwd ? this.wetAt(o.a, x, z, half) : this.wetAt(o.b, x, z, half);
        const Aair = A * (1 - fup);
        let mdot = 0;
        if (Aair > 1e-9 && pa !== pb) {
          const pu = fwd ? pa : pb, pd = fwd ? pb : pa;
          const rhoU = pu / (RAIR * TAIR);
          if (pd / pu < 0.528) mdot = o.Cd * Aair * pu * Math.sqrt(GAMMA / (RAIR * TAIR)) * CHOKE;
          else mdot = o.Cd * Aair * Math.sqrt(2 * rhoU * (pu - pd));
          // never overshoot equilibrium between the two stores
          const lim = this.airEqualize(fwd ? o.a : o.b, fwd ? o.b : o.a, dt);
          mdot = Math.min(mdot, lim);
          if (!fwd) mdot = -mdot;
        }
        // exchange flow in floor openings carries air up
        if (o.kind === 'floor' && o.Q[i] < 0 && o.a >= 0) {
          const ca = this.nodes[o.a];
          mdot += Math.min(ca.m / dt * 0.5, -o.Q[i] * ca.pAir / (RAIR * TAIR));
        }
        o.mAir[i] = mdot;
        const mass = mdot * dt;                  // moves from a to b
        // air pushed out into the sea leaves as bubbles; both count as outside
        if (o.a >= 0) dm[o.a] -= mass; else this.ledger.atmAirIn += mass;
        if (o.b >= 0) dm[o.b] += mass; else this.ledger.atmAirIn -= mass;
      }
    }
    for (let k = 0; k < N; k++) this.nodes[k].m = Math.max(0, this.nodes[k].m + dm[k]);
  }
  // largest air mass flow (kg/s) from store s to store d that cannot overshoot
  airEqualize(s, d, dt) {
    if (s < 0 && d < 0) return 0;
    const RT = RAIR * TAIR;
    if (s >= 0 && d >= 0) {
      const A = this.nodes[s], B = this.nodes[d];
      const pEq = (A.pAir * A.Vair + B.pAir * B.Vair) / (A.Vair + B.Vair);
      return Math.max(0, (A.pAir - pEq) * A.Vair / RT) * 0.5 / dt;
    }
    if (s >= 0) { const A = this.nodes[s]; return Math.max(0, (A.pAir - PATM) * A.Vair / RT) * 0.5 / dt; }
    const B = this.nodes[d]; return Math.max(0, (PATM - B.pAir) * B.Vair / RT) * 0.5 / dt;
  }
  stateVector() {
    const out = [];
    for (const c of this.nodes) out.push(c.V, c.m, c.psi);
    for (const o of this.openings) for (let i = 0; i < o.ns; i++) out.push(o.Q[i]);
    return out;
  }
}
