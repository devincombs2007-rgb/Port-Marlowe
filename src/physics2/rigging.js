// Rigid bodies in the vertical plane with 2.5D hydrostatics, direction-
// dependent drag and anisotropic added mass; tension-only rope tackles with
// stretch, damping, sheave friction and a breaking load. Used for lifeboats
// on their falls (and later for anything that breaks loose).
import { v } from './params.js';

const G = v('constants.g');

export class Body2D {
  constructor({ mass, inertia, cells = [], faces = [], points = [] }) {
    // geometry is stored relative to a reference point; `c` is the local COM
    this.m0 = mass; this.I0 = inertia;
    this.cells = cells;        // [u, z, volume] displacement cells (local)
    this.faces = faces;        // [u, z, nu, nz, area] outward faces for drag
    this.points = points;      // movable point masses: { u, z, m }
    this.x = 0; this.z = 0; this.ang = 0; this.vx = 0; this.vz = 0; this.w = 0;
    this.c = [0, 0];
    this.extF = [0, 0]; this.extT = 0;
    this.Ca = { surge: v('drag.Ca_hull_surge'), heave: v('drag.Ca_hull_heave') };
    this.massProps();
  }
  massProps() {
    let m = this.m0, mu = this.m0 * (this.cg0 ? this.cg0[0] : 0), mz = this.m0 * (this.cg0 ? this.cg0[1] : 0);
    for (const p of this.points) { m += p.m; mu += p.m * p.u; mz += p.m * p.z; }
    const cu = mu / m, cz = mz / m;
    let I = this.I0 + this.m0 * ((this.cg0 ? this.cg0[0] : 0) - cu) ** 2 + this.m0 * ((this.cg0 ? this.cg0[1] : 0) - cz) ** 2;
    for (const p of this.points) I += p.m * ((p.u - cu) ** 2 + (p.z - cz) ** 2);
    // keep the world pose of the geometry when the COM moves
    const du = cu - this.c[0], dz = cz - this.c[1];
    const cs = Math.cos(this.ang), sn = Math.sin(this.ang);
    this.x += cs * du - sn * dz; this.z += sn * du + cs * dz;
    this.vx += -this.w * (sn * du + cs * dz); this.vz += this.w * (cs * du - sn * dz);
    this.c = [cu, cz]; this.m = m; this.I = I;
  }
  wx(u, z) { const cs = Math.cos(this.ang), sn = Math.sin(this.ang); return this.x + cs * (u - this.c[0]) - sn * (z - this.c[1]); }
  wz(u, z) { const cs = Math.cos(this.ang), sn = Math.sin(this.ang); return this.z + sn * (u - this.c[0]) + cs * (z - this.c[1]); }
  pointVel(X, Z) { return [this.vx - this.w * (Z - this.z), this.vz + this.w * (X - this.x)]; }
  applyAt(Fx, Fz, X, Z) { this.fx += Fx; this.fz += Fz; this.tq += (X - this.x) * Fz - (Z - this.z) * Fx; }

  forces(env) {
    this.fx = 0; this.fz = -this.m * G; this.tq = 0;
    const rho = env.rho, sea = env.seaLevel;
    let Vsub = 0;
    for (const [u, z, vol] of this.cells) {
      const X = this.wx(u, z), Z = this.wz(u, z);
      const f = Math.max(0, Math.min(1, (sea - Z) / env.cell + 0.5));
      if (f <= 0) continue;
      Vsub += vol * f;
      this.applyAt(0, rho * G * vol * f, X, Z);
    }
    this.Vsub = Vsub;
    // drag on each outward face: broadside faces push hard, edgewise ones barely
    const Cd = v('drag.Cd_flat_plate_broadside'), Cf = v('drag.Cf_plate_edgewise');
    const cs = Math.cos(this.ang), sn = Math.sin(this.ang);
    for (const [u, z, nu, nz, A] of this.faces) {
      const X = this.wx(u, z), Z = this.wz(u, z);
      const wet = Z < sea, r = wet ? rho : 1.25;
      const nx = cs * nu - sn * nz, nzW = sn * nu + cs * nz;
      const [vx, vz] = this.pointVel(X, Z);
      const vn = vx * nx + vz * nzW;
      const fn = vn > 0 ? -0.5 * r * Cd * A * vn * vn : 0;
      const tx = vx - vn * nx, tz = vz - vn * nzW, vt = Math.hypot(tx, tz);
      const ft = -0.5 * r * Cf * A * vt;
      this.applyAt(fn * nx + ft * tx, fn * nzW + ft * tz, X, Z);
    }
    this.fx += this.extF[0]; this.fz += this.extF[1]; this.tq += this.extT;
  }
  integrate(dt, env) {
    // added mass differs along and across the hull (anisotropic)
    const rho = env.rho, Vs = this.Vsub || 0;
    const mu = this.m + this.Ca.surge * rho * Vs, mn = this.m + this.Ca.heave * rho * Vs;
    const Ie = this.I + this.Ca.heave * rho * Vs * 0.05;
    const cs = Math.cos(this.ang), sn = Math.sin(this.ang);
    const Fu = cs * this.fx + sn * this.fz, Fn = -sn * this.fx + cs * this.fz;
    const au = Fu / mu, an = Fn / mn;
    this.vx += (cs * au - sn * an) * dt; this.vz += (sn * au + cs * an) * dt; this.w += this.tq / Ie * dt;
    this.x += this.vx * dt; this.z += this.vz * dt; this.ang += this.w * dt;
  }
}

// A tackle (block and fall): `parts` lengths of rope share the load. The
// crew control how much rope is paid out; the rope only pulls, stretches
// elastically, and parts at its breaking load.
export class Fall {
  constructor({ name, head, body, hook, length, parts = v('ropes.fall_parts'), EA = v('ropes.manila_EA'), breakLoad = v('ropes.manila_3in_breaking_load'), efficiency = v('ropes.sheave_efficiency'), zeta = v('ropes.manila_damping') }) {
    Object.assign(this, { name, head, body, hook, L0: length, parts, EA, breakLoad, efficiency, zeta });
    this.T = 0; this.broken = false; this.rate = 0; this.haul = 0; this.slack = false;
  }
  step(dt, t, events) {
    this.L0 = Math.max(0.3, this.L0 + this.rate * dt);
    const b = this.body;
    const X = b.wx(this.hook[0], this.hook[1]), Z = b.wz(this.hook[0], this.hook[1]);
    const dx = this.head[0] - X, dz = this.head[1] - Z, d = Math.hypot(dx, dz);
    if (this.broken) { this.T = 0; return; }
    const ux = dx / d, uz = dz / d;
    const [vx, vz] = b.pointVel(X, Z);
    const ddot = -(vx * ux + vz * uz);                         // rate of lengthening
    const k = this.parts * this.EA / this.L0;                   // stiffness at the hook
    const c = 2 * this.zeta * Math.sqrt(k * b.m * 0.5);
    let Fhook = k * (d - this.L0) + c * ddot;
    this.slack = Fhook <= 0;
    if (Fhook < 0) Fhook = 0;
    this.T = Fhook / this.parts;                                // tension in each part
    // the hauling part at the cleat: sheave friction helps the crew when lowering
    const n = this.parts;
    this.haul = this.rate >= 0 ? this.T * Math.pow(this.efficiency, n) : this.T / Math.pow(this.efficiency, n);
    if (this.T > this.breakLoad) { this.broken = true; events && events.push({ t, type: 'rope', name: this.name, T: this.T }); this.T = 0; return; }
    b.applyAt(Fhook * ux, Fhook * uz, X, Z);
  }
}

// 30 ft Harland & Wolff lifeboat as displacement cells, drag faces and mass.
export function makeLifeboat(opts = {}) {
  const L = v('lifeboat_30ft.length'), B = v('lifeboat_30ft.beam'), D = v('lifeboat_30ft.depth');
  const cell = 0.1;
  const cells = [], faces = [];
  const breadth = (u, z) => B * Math.pow(Math.max(0, 1 - Math.pow(2 * u / L, 2)), 0.5) * Math.pow(Math.max(0.02, z / D), 0.38);
  for (let u = -L / 2 + cell / 2; u < L / 2; u += cell) for (let z = cell / 2; z < D; z += cell) {
    const b = breadth(u, z); if (b < 0.05) continue;
    cells.push([u, z, cell * cell * b]);
  }
  for (let u = -L / 2 + 0.25; u < L / 2; u += 0.5) faces.push([u, 0, 0, -1, 0.5 * breadth(u, 0.3)]);
  for (let z = 0.1; z < D; z += 0.2) { faces.push([L / 2, z, 1, 0, 0.2 * 0.6]); faces.push([-L / 2, z, -1, 0, 0.2 * 0.6]); }
  const mass = v('lifeboat_30ft.hull_mass');
  const I = mass * (L * L) / 12 * 0.8;
  const body = new Body2D({ mass, inertia: I, cells, faces });
  body.cg0 = [0, 0.45]; body.massProps();
  const Vtot = cells.reduce((s, c) => s + c[2], 0);
  return { body, L, B, D, breadth, Vtot };
}

// transverse metacentric height and heel from a sideways shift of weight
export function boatStability(boat, mTotal, kg, draft, rho = 1025) {
  const { L, breadth } = boat;
  let V = 0, IT = 0, mom = 0;
  for (let u = -L / 2; u < L / 2; u += 0.05) {
    const bw = breadth(u, Math.max(0.01, draft));
    IT += Math.pow(bw, 3) / 12 * 0.05;
    for (let z = 0.025; z < draft; z += 0.05) { const a = breadth(u, z) * 0.05 * 0.05; V += a; mom += a * z; }
  }
  const KB = mom / V, BM = IT / V;
  return { V, KB, BM, GM: KB + BM - kg, displacement: rho * V };
}
