// The simulation world: rigid structural blocks (XPBD with substeps),
// hydrostatics in 2.5D, hydrodynamic drag, seabed soil mechanics, hull
// girder stress analysis and progressive fracture, flooding, corrosion.

import { CELL, CELL2, G, RHO_SEA, RHO_AIR, P_ATM, STEEL_UTS, STEEL_YIELD, seaDensityAtDepth } from './constants.js';
import { MATERIALS, MAT, EMPTY, SOLID, SPACE, OPEN, SIDE } from './materials.js';
import { Flooding } from './flooding.js';
import { EXT } from './ship.js';

const cross = (ax, ay, bx, by) => ax * by - ay * bx;

export class World {
  constructor(ship, env, opts = {}) {
    this.ship = ship;
    this.env = env;
    this.bodies = ship.bodies;
    this.joints = ship.joints;
    this.flooding = new Flooding(ship, env);
    this.time = 0;
    this.substeps = opts.substeps ?? 12;
    this.events = [];
    this.drag = null;            // user grab
    this.steelTemp = env.surfaceTemp;
    this.brittle = true;         // 1911 steel below its transition temperature
    this.stats = { maxRatio: 0, maxRatioJoint: -1, trim: 0, draughtF: 0, draughtA: 0 };
    this.pendingDestroy = [];
    this.settleTimer = 0;
    this.hydroScale = 1;
    this.corrosionYears = 0;
    this.collisionsOn = true;
    this.mudPlume = [];          // [x, y, amount]
    this.impacts = [];
    this.bodyVolCache();
  }

  bodyVolCache() {
    const g = this.ship.grid;
    for (const b of this.bodies) {
      let V = 0, Vx = 0, Vy = 0;
      for (let q = 0; q < b.cells.length; q++) {
        const v = g.vdisp[b.cells[q]];
        V += v; Vx += v * b.gx[q]; Vy += v * b.gy[q];
      }
      b.V = V; b.Vx = Vx; b.Vy = Vy;
      b.L = b.aabb.x1 - b.aabb.x0; b.H = b.aabb.y1 - b.aabb.y0;
    }
  }

  // Place the whole intact ship: grid point (gx, gy) -> (ox, oy) + R(theta) (gx, gy)
  placeShip(ox, oy, theta = 0) {
    const c = Math.cos(theta), s = Math.sin(theta);
    for (const b of this.bodies) {
      b.x = ox + c * b.comX - s * b.comY;
      b.y = oy + s * b.comX + c * b.comY;
      b.a = theta; b.syncTrig();
      b.vx = b.vy = b.w = 0;
      b.px = b.x; b.py = b.y; b.pa = b.a;
    }
    for (const j of this.joints) this.initJointRest(j);
    this.flooding.updatePositions();
    this.flooding.solveLevels(0);
    this.flooding.solveAir();
    this.flooding.distributeWater();
    for (const b of this.bodies) b.updateMassProps();
  }
  initJointRest(j) {
    const A = this.bodies[j.a], B = this.bodies[j.b];
    j.rest = B.a - A.a;
    j.lamA = 0;
  }

  // ------------------------------------------------------------------ step
  step(dt) {
    const ship = this.ship;
    this.time += dt; this.env.time = this.time;
    if (ship.topologyDirty || this.pendingDestroy.length) this.applyTopology();
    if (ship.needElements) { ship.buildElements(); ship.needElements = false; }

    // flooding (sub-stepped for large dt)
    const nf = Math.max(1, Math.ceil(dt / 0.08));
    for (let i = 0; i < nf; i++) this.flooding.step(dt / nf);
    this.handleFloodEvents();
    for (const b of this.bodies) if (b.alive) b.updateMassProps();

    // forces
    for (const b of this.bodies) {
      if (!b.alive) continue;
      b.v0x = b.vx; b.v0y = b.vy; b.w0 = b.w;
      b.cfx = 0; b.cfy = 0; b.ctq = 0;
      this.hydro(b, dt);
      b.refreshInverse();
    }
    this.userForce(dt);

    const n = this.substeps;
    const h = dt / n;
    for (let s = 0; s < n; s++) {
      for (const b of this.bodies) {
        if (!b.alive) continue;
        b.px = b.x; b.py = b.y; b.pa = b.a;
        b.vx += h * b.fx * b.invM; b.vy += h * b.fy * b.invM; b.w += h * b.tq * b.invI;
        b.x += h * b.vx; b.y += h * b.vy; b.a += h * b.w;
        b.syncTrig();
      }
      for (let it = 0; it < 2; it++) this.solveJoints(h, it);
      if (this.collisionsOn) this.solveCollisions(h);
      for (const b of this.bodies) {
        if (!b.alive) continue;
        b.vx = (b.x - b.px) / h; b.vy = (b.y - b.py) / h; b.w = (b.a - b.pa) / h;
      }
      this.seabed(h);
    }
    for (const b of this.bodies) {
      if (!b.alive) continue;
      b.syncTrig(); b.updateWorldBox();
      // filtered acceleration (for sloshing and stress)
      const ax = (b.vx - b.v0x) / dt, ay = (b.vy - b.v0y) / dt;
      b.axF = (b.axF || 0) * 0.8 + ax * 0.2; b.ayF = (b.ayF || 0) * 0.8 + ay * 0.2;
      const ks = Math.min(1, dt / 0.6);
      b.axS = (b.axS || 0) + (ax - (b.axS || 0)) * ks; b.ayS = (b.ayS || 0) + (ay - (b.ayS || 0)) * ks;
      if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.a)) this.rescue(b);
    }
    this.analyzeStress(dt);
    this.updateStats();
  }

  rescue(b) {
    b.x = b.px; b.y = b.py; b.a = b.pa; b.vx = b.vy = b.w = 0; b.syncTrig();
    if (!isFinite(b.x)) { b.x = 0; b.y = -50; b.a = 0; }
  }

  // --------------------------------------------------------------- hydro
  hydro(b, dt) {
    const env = this.env, g = this.ship.grid;
    const m = b.m;
    // ---- buoyancy (hydrostatic pressure integrated over the 2.5D envelope)
    let bF = 0, bT = 0;
    const wb = b.wbox;
    const sMax = 14 + env.swellAmp * 2, sMin = -14 - env.swellAmp * 2;
    let Vsub = 0;
    const depthC = Math.max(0, env.surface(b.x) - b.y);
    const rho = seaDensityAtDepth(depthC);
    if (wb.y1 < sMin) {
      Vsub = b.V;
      const cxV = b.Vx / Math.max(1e-9, b.V), cyV = b.Vy / Math.max(1e-9, b.V);
      const X = b.wx(cxV, cyV);
      bF = rho * G * b.V; bT = (X - b.x) * bF;
    } else if (wb.y0 < sMax) {
      const cells = b.cells, gx = b.gx, gy = b.gy;
      const c = b.c, s = b.s, cx = b.comX, cy = b.comY, bx = b.x, by = b.y;
      let F = 0, T = 0;
      let lastX = 1e9, surf = 0;
      for (let q = 0; q < cells.length; q++) {
        const v = g.vdisp[cells[q]];
        if (v <= 0) continue;
        const dx = gx[q] - cx, dy = gy[q] - cy;
        const X = bx + c * dx - s * dy, Y = by + s * dx + c * dy;
        if (Math.abs(X - lastX) > 0.25) { surf = env.surface(X); lastX = X; }
        let f = (surf - Y) / CELL + 0.5;
        if (f <= 0) continue;
        if (f > 1) f = 1;
        const dF = v * f;
        F += dF; T += (X - bx) * dF;
      }
      Vsub = F;
      bF = F * rho * G; bT = T * rho * G;
    }
    bF *= this.hydroScale; bT *= this.hydroScale;
    b.Vsub = Vsub;
    b.submergedFrac = b.V > 0 ? Vsub / b.V : 0;
    b.depth = depthC;
    // ---- drag & lift on outline faces (2.5D: face area = edge length x breadth)
    let dx_ = 0, dy_ = 0, dT = 0;
    const faces = b.faces;
    let dampK = 0, dampKw = 0;
    if (faces && faces.length) {
      const c = b.c, s = b.s, cx = b.comX, cy = b.comY;
      const cur = env.current;
      let lastX = 1e9, surf = 0;
      for (let q = 0; q < faces.length; q += 5) {
        const dx = faces[q] - cx, dy = faces[q + 1] - cy;
        const rx = c * dx - s * dy, ry = s * dx + c * dy;
        const X = b.x + rx, Y = b.y + ry;
        const nx = c * faces[q + 2] - s * faces[q + 3], ny = s * faces[q + 2] + c * faces[q + 3];
        const A = faces[q + 4];
        if (Math.abs(X - lastX) > 0.5) { surf = env.surface(X); lastX = X; }
        const wet = Y < surf;
        const rhoF = wet ? rho : RHO_AIR;
        const vx = b.vx - b.w * ry - (wet ? cur : 0), vy = b.vy + b.w * rx;
        const vn = vx * nx + vy * ny;
        let f;
        if (vn > 0) f = -0.5 * rhoF * 1.05 * A * vn * vn;        // windward pressure
        else f = 0.5 * rhoF * 0.28 * A * vn * vn;                // leeward suction
        const vtx = vx - vn * nx, vty = vy - vn * ny;
        const vt = Math.hypot(vtx, vty);
        const ft = -0.5 * rhoF * 0.004 * A * vt;
        const Fx = f * nx + ft * vtx, Fy = f * ny + ft * vty;
        dx_ += Fx; dy_ += Fy; dT += cross(rx, ry, Fx, Fy);
        const kk = rhoF * 1.05 * A * Math.abs(vn);
        dampK += kk; dampKw += kk * (rx * rx + ry * ry);
      }
    }
    {
      const wetArea = 2 * (b.profileArea || 0) * Math.min(1, b.submergedFrac * 1.2);
      const v = Math.hypot(b.vx, b.vy);
      const k = 0.5 * rho * 0.0035 * wetArea * v;
      dx_ -= k * b.vx; dy_ -= k * b.vy;
      const kw = 0.5 * rho * 0.0035 * wetArea * Math.abs(b.w) * (b.L * b.L) / 8;
      dT -= kw * b.w;
      dampK += k; dampKw += kw;
    }
    // ---- added mass (Ca ~ 0.45 of displaced water for an elongated hull)
    const envelope = b.kind === 'hull' || b.kind === 'ice' || b.kind === 'boat';
    const Vam = envelope ? Vsub : (b.profileArea || 0) * 3 * b.submergedFrac;
    b.addedM = 0.45 * rho * Vam;
    b.addedI = b.addedM * (b.L * b.L + b.H * b.H) / 12 * 0.5;
    const me = b.m + b.addedM, Ie = b.I + b.addedI;
    // semi-implicit stabilisation of the quadratic drag
    const stab = 1 / (1 + dt * dampK / me);
    const stabW = 1 / (1 + dt * dampKw / Ie);
    b.fx = dx_ * stab;
    b.fy = -m * G + bF + dy_ * stab;
    b.tq = bT + dT * stabW;
    b.buoy = bF;
    b.extFx = b.fx; b.extFy = b.fy; b.extTq = b.tq;
  }

  userForce(dt) {
    const d = this.drag;
    if (!d) return;
    const b = this.bodies[d.body];
    if (!b || !b.alive) { this.drag = null; return; }
    const X = b.wx(d.gx, d.gy), Y = b.wy(d.gx, d.gy);
    const me = b.m + b.addedM;
    const k = me * 0.6 * d.strength, c = me * 1.2 * Math.sqrt(d.strength);
    const vx = b.pvx(Y), vy = b.pvy(X);
    const Fx = k * (d.tx - X) - c * vx, Fy = k * (d.ty - Y) - c * vy;
    b.fx += Fx; b.fy += Fy; b.tq += cross(X - b.x, Y - b.y, Fx, Fy);
    b.extFx += Fx; b.extFy += Fy; b.extTq += cross(X - b.x, Y - b.y, Fx, Fy);
  }

  // -------------------------------------------------------------- joints
  solveJoints(h, it) {
    const bodies = this.bodies;
    const js = this.joints;
    const order = it % 2 === 0 ? 1 : -1;
    const N = js.length;
    for (let q = 0; q < N; q++) {
      const j = js[order > 0 ? q : N - 1 - q];
      if (j.state >= 2) continue;
      const A = bodies[j.a], B = bodies[j.b];
      if (!A.alive || !B.alive) continue;
      // anchor offsets (world)
      const rax0 = j.ax - A.comX, ray0 = j.ay - A.comY;
      const rbx0 = (j.bx ?? j.ax) - B.comX, rby0 = (j.by ?? j.ay) - B.comY;
      let ca = Math.cos(A.a), sa = Math.sin(A.a), cb = Math.cos(B.a), sb = Math.sin(B.a);
      const rax = ca * rax0 - sa * ray0, ray = sa * rax0 + ca * ray0;
      const rbx = cb * rbx0 - sb * rby0, rby = sb * rbx0 + cb * rby0;
      const dx = (B.x + rbx) - (A.x + rax), dy = (B.y + rby) - (A.y + ray);
      const C = Math.hypot(dx, dy);
      if (C > 1e-9) {
        const nx = dx / C, ny = dy / C;
        const ra = cross(rax, ray, nx, ny), rb = cross(rbx, rby, nx, ny);
        const w = A.invM + B.invM + A.invI * ra * ra + B.invI * rb * rb;
        const dl = -C / w;
        const px = dl * nx, py = dl * ny;
        A.x -= px * A.invM; A.y -= py * A.invM; A.a -= A.invI * cross(rax, ray, px, py);
        B.x += px * B.invM; B.y += py * B.invM; B.a += B.invI * cross(rbx, rby, px, py);
      }
      // angular
      let Ca = (B.a - A.a) - j.rest;
      const w2 = A.invI + B.invI;
      let dl = -Ca / w2;
      if (j.state === 1 || j.kind !== 'weld') {
        // plastic hinge: angular impulse limited by the remaining section's capacity
        const cap = (j.kind === 'weld' ? j.Mp : j.Mcap * 1.2) * h * h;
        const lam0 = j.lamA;
        let lam = lam0 + dl;
        if (lam > cap) lam = cap; else if (lam < -cap) lam = -cap;
        dl = lam - lam0;
        j.lamA = lam;
      }
      A.a -= A.invI * dl; B.a += B.invI * dl;
    }
    if (it === 1) for (const j of js) j.lamA = 0;
  }

  // ------------------------------------------------------------- seabed
  seabed(h) {
    const env = this.env;
    const top = -env.seabedDepth + 14;
    for (const b of this.bodies) {
      if (!b.alive || b.wbox.y0 > top) continue;
      const cs = b.contacts;
      if (!cs) continue;
      const c = b.c, s = b.s;
      let maxPen = 0;
      for (let q = 0; q < cs.length; q += 5) {
        const dx = cs[q] - b.comX, dy = cs[q + 1] - b.comY;
        const rx = c * dx - s * dy, ry = s * dx + c * dy;
        const X = b.x + rx, Y = b.y + ry;
        const ys = env.seabedY(X);
        if (Y >= ys) continue;
        const d = ys - Y;
        if (d > maxPen) maxPen = d;
        const [nx, ny] = env.seabedNormal(X);
        const fnx = c * cs[q + 2] - s * cs[q + 3], fny = s * cs[q + 2] + c * cs[q + 3];
        const bear = Math.max(0.12, -(fnx * nx + fny * ny));
        const A = cs[q + 4] * bear;
        let vx = b.vx - b.w * ry, vy = b.vy + b.w * rx;
        const vn = vx * nx + vy * ny;
        // soft abyssal clay: strength grows with depth (+ strain-rate effect)
        const q0 = 16e3, q1 = 14e3;
        const qd = (q0 + q1 * d) * (1 + 0.35 * Math.min(25, Math.abs(vn)));
        let jn = 0;
        if (vn < 0) {
          const rn = cross(rx, ry, nx, ny);
          const meff = 1 / (b.invM + b.invI * rn * rn);
          jn = Math.min(-vn * meff, qd * A * h);
          b.vx += jn * nx * b.invM; b.vy += jn * ny * b.invM; b.w += b.invI * rn * jn;
          if (-vn > 2 && jn > 0) this.mudPlume.push(X, ys, jn * 1e-6 * -vn);
        }
        // tangential: mud friction + cohesion
        vx = b.vx - b.w * ry; vy = b.vy + b.w * rx;
        const tx = -ny, ty = nx;
        const vt = vx * tx + vy * ty;
        const rt = cross(rx, ry, tx, ty);
        const meffT = 1 / (b.invM + b.invI * rt * rt);
        const lim = 0.45 * jn + 6e3 * cs[q + 4] * h * Math.min(1, d);
        let jt = -vt * meffT;
        if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
        b.vx += jt * tx * b.invM; b.vy += jt * ty * b.invM; b.w += b.invI * rt * jt;
        const Fx = (jn * nx + jt * tx) / h, Fy = (jn * ny + jt * ty) / h;
        b.cfx += Fx / this.substeps; b.cfy += Fy / this.substeps; b.ctq += cross(rx, ry, Fx, Fy) / this.substeps;
        if (jn > 0 && -vn > 0.4) env.pushMud(X, Math.min(0.4, -vn * h * 0.4), 5 + Math.random() * 6);
      }
      if (maxPen > 0) {
        b.inMud = maxPen;
        const vImp = Math.hypot(b.vx, b.vy);
        if (!b.landed && maxPen > 0.3) {
          b.landed = true;
          this.events.push({ type: 'seabed', body: b.index, v: Math.hypot(b.v0x, b.v0y), x: b.x, y: b.y });
        }
      }
    }
  }

  // ---------------------------------------------------------- collisions
  // Point samples of one body against the signed distance field of another.
  solveCollisions(h) {
    const bodies = this.bodies;
    const N = bodies.length;
    for (let i = 0; i < N; i++) {
      const A = bodies[i];
      if (!A.alive || !A.sdf) continue;
      for (let k = i + 1; k < N; k++) {
        const B = bodies[k];
        if (!B.alive || !B.sdf) continue;
        const wa = A.wbox, wb = B.wbox;
        if (wa.x1 < wb.x0 || wb.x1 < wa.x0 || wa.y1 < wb.y0 || wb.y1 < wa.y0) continue;
        if (this.jointed(i, k)) continue;
        this.collidePair(A, B, h);
        this.collidePair(B, A, h);
      }
    }
  }
  jointed(i, k) {
    if (!this._jset || this._jver !== this.ship.version) {
      this._jset = new Set();
      for (const j of this.joints) if (j.state < 2) { this._jset.add(j.a + ',' + j.b); this._jset.add(j.b + ',' + j.a); }
      // appendages never collide with the hull block they sit on, nor neighbours of it
      this._jver = this.ship.version;
    }
    if (this._jset.has(i + ',' + k)) return true;
    // blocks adjacent through a cracked/intact chain within 1 link and same piece
    const A = this.bodies[i], B = this.bodies[k];
    if (A.piece >= 0 && A.piece === B.piece && (A.kind !== 'hull' || B.kind !== 'hull')) return true;
    if (A.piece >= 0 && A.piece === B.piece && Math.abs((A.order ?? -9) - (B.order ?? 9)) <= 1) return true;
    return false;
  }
  collidePair(A, B, h) {
    const cs = A.contacts; if (!cs) return;
    const sdf = B.sdf;
    const ca = A.c, sa = A.s;
    const step = cs.length > 600 ? 10 : 5;
    for (let q = 0; q < cs.length; q += step) {
      const dx = cs[q] - A.comX, dy = cs[q + 1] - A.comY;
      const rax = ca * dx - sa * dy, ray = sa * dx + ca * dy;
      const X = A.x + rax, Y = A.y + ray;
      // into B grid-local
      const lx = B.lx(X, Y), ly = B.ly(X, Y);
      const u = (lx - sdf.x0) / CELL - 0.5, v = (ly - sdf.y0) / CELL - 0.5;
      if (u < 0 || v < 0 || u >= sdf.w - 1 || v >= sdf.h - 1) continue;
      const i0 = u | 0, j0 = v | 0, fu = u - i0, fv = v - j0;
      const d = sdf.d, w = sdf.w;
      const d00 = d[j0 * w + i0], d10 = d[j0 * w + i0 + 1], d01 = d[(j0 + 1) * w + i0], d11 = d[(j0 + 1) * w + i0 + 1];
      const dist = (d00 * (1 - fu) + d10 * fu) * (1 - fv) + (d01 * (1 - fu) + d11 * fu) * fv;
      if (dist >= 0) continue;
      let gx = (d10 - d00) * (1 - fv) + (d11 - d01) * fv, gy = (d01 - d00) * (1 - fu) + (d11 - d10) * fu;
      const gl = Math.hypot(gx, gy); if (gl < 1e-6) continue;
      gx /= gl; gy /= gl;
      // normal to world (pointing out of B)
      const nx = B.c * gx - B.s * gy, ny = B.s * gx + B.c * gy;
      const pen = -dist;
      const rbx = X - B.x, rby = Y - B.y;
      const ra = cross(rax, ray, nx, ny), rb = cross(rbx, rby, nx, ny);
      const wsum = A.invM + B.invM + A.invI * ra * ra + B.invI * rb * rb;
      const dl = pen / wsum * 0.6;
      const px = dl * nx, py = dl * ny;
      A.x += px * A.invM; A.y += py * A.invM; A.a += A.invI * cross(rax, ray, px, py);
      B.x -= px * B.invM; B.y -= py * B.invM; B.a -= B.invI * cross(rbx, rby, px, py);
      // friction (position level)
      const vax = (A.x - A.px), vay = (A.y - A.py);
      const vbx = (B.x - B.px), vby = (B.y - B.py);
      const rvx = vax - vbx, rvy = vay - vby;
      const tx = -ny, ty = nx;
      const vt = rvx * tx + rvy * ty;
      const ft = Math.max(-dl * 0.5, Math.min(dl * 0.5, -vt / wsum));
      A.x += ft * tx * A.invM; A.y += ft * ty * A.invM;
      B.x -= ft * tx * B.invM; B.y -= ft * ty * B.invM;
      const F = dl / (h * h);
      A.cfx += px / (h * h) / this.substeps; A.cfy += py / (h * h) / this.substeps;
      B.cfx -= px / (h * h) / this.substeps; B.cfy -= py / (h * h) / this.substeps;
      const relV = Math.abs((A.vx - B.vx) * nx + (A.vy - B.vy) * ny);
      if (relV > 1.5 && F > 2e7) this.impacts.push({ a: A.index, b: B.index, x: X, y: Y, v: relV, F });
    }
  }

  // ------------------------------------------------------- stress analysis
  // Shear force and bending moment at every weld from Newton's law applied to
  // the sub-tree of blocks on one side (classic longitudinal strength method).
  analyzeStress(dt) {
    const bodies = this.bodies, joints = this.joints;
    const N = bodies.length;
    const Dx = new Float64Array(N), Dy = new Float64Array(N), Dm = new Float64Array(N);
    for (const b of bodies) {
      if (!b.alive) continue;
      const me = b.m + b.addedM, Ie = b.I + b.addedI;
      const ax = (b.vx - b.v0x) / dt, ay = (b.vy - b.v0y) / dt, al = (b.w - b.w0) / dt;
      const Fx = b.extFx + b.cfx, Fy = b.extFy + b.cfy, T = b.extTq + b.ctq;
      Dx[b.index] = me * ax - Fx; Dy[b.index] = me * ay - Fy;
      Dm[b.index] = Ie * al - T + cross(b.x, b.y, Dx[b.index], Dy[b.index]);
    }
    // adjacency over intact/cracked joints
    const adj = Array.from({ length: N }, () => []);
    for (const j of joints) if (j.state < 2) { adj[j.a].push([j.b, j]); adj[j.b].push([j.a, j]); }
    const visited = new Int32Array(N).fill(-1);
    const parentJ = new Array(N).fill(null);
    const order = [];
    let piece = 0;
    for (let r = 0; r < N; r++) {
      if (visited[r] >= 0 || !bodies[r].alive) continue;
      const stack = [r]; visited[r] = piece;
      while (stack.length) {
        const u = stack.pop(); order.push(u);
        bodies[u].piece = piece;
        for (const [v, j] of adj[u]) if (visited[v] < 0) { visited[v] = piece; parentJ[v] = j; stack.push(v); }
      }
      piece++;
    }
    this.pieceCount = piece;
    const SFx = Float64Array.from(Dx), SFy = Float64Array.from(Dy), SM = Float64Array.from(Dm);
    for (let q = order.length - 1; q >= 0; q--) {
      const u = order[q];
      const j = parentJ[u];
      if (!j) continue;
      const p = j.a === u ? j.b : j.a;
      SFx[p] += SFx[u]; SFy[p] += SFy[u]; SM[p] += SM[u];
    }
    let maxR = 0, maxJ = -1;
    const tau = 0.15;
    const kf = Math.min(1, dt / tau);
    for (const j of joints) {
      if (j.state >= 2) continue;
      const A = bodies[j.a], B = bodies[j.b];
      // which side is the child?
      const child = parentJ[j.b] === j ? j.b : parentJ[j.a] === j ? j.a : -1;
      if (child < 0) continue;
      const Px = A.wx(j.ax, j.ay), Py = A.wy(j.ax, j.ay);
      let Fx = SFx[child], Fy = SFy[child];
      let M = SM[child] - cross(Px, Py, Fx, Fy);
      if (child !== j.b) { Fx = -Fx; Fy = -Fy; M = -M; }
      // into A's frame: x along hull
      const ux = A.c, uy = A.s;
      const Nt = -(Fx * ux + Fy * uy);         // tension on the B side
      const V = -Fx * uy + Fy * ux;
      j.N = Nt; j.V = V; j.M = M;
      j.Nf += (Nt - j.Nf) * kf; j.Vf += (V - j.Vf) * kf; j.Mf += (M - j.Mf) * kf;
      if (j.kind === 'weld') this.checkWeld(j, dt);
      else this.checkAppendage(j, dt);
      if (j.ratioF > maxR) { maxR = j.ratioF; maxJ = j.id; }
    }
    this.stats.maxRatio = maxR; this.stats.maxRatioJoint = maxJ;
  }

  fiberStrength(f, j) {
    const g = this.ship.grid;
    const rust = g.rust[f.k];
    // steel below its ductile-brittle transition cracks at lower nominal stress
    const cold = this.brittle && this.env.surfaceTemp < 20 ? 0.86 : 1;
    return STEEL_UTS * Math.max(0.03, 1 - rust) * cold;
  }

  checkWeld(j, dt) {
    if (j.A <= 0) { this.breakJoint(j, 'section consumed'); return; }
    const M = j.Mf, N = j.Nf;
    let worst = 0;
    const evalFiber = (f) => {
      const sigma = N / j.A + M * (f.y - j.na) / j.I;
      const topZone = f.y > j.na + 0.5 * (j.yTop - j.na);
      const scf = topZone ? j.scf : 1.1;
      const s = sigma * scf;
      const lim = this.fiberStrength(f, j);
      // compression: buckling of stiffened plating ~0.7 of yield
      const r = s >= 0 ? s / lim : -s / (0.78 * STEEL_YIELD * Math.max(0.03, 1 - this.ship.grid.rust[f.k]));
      return r;
    };
    for (const f of j.fibers) if (!f.failed) { const r = evalFiber(f); if (r > worst) worst = r; }
    // hinge rotation tears the remaining fibers
    if (j.state === 1) {
      const A = this.bodies[j.a], B = this.bodies[j.b];
      let phi = (B.a - A.a) - j.rest;
      j.hinge = phi;
      const failAng = this.brittle ? 0.09 : 0.22;
      worst = Math.max(worst, Math.abs(phi) / failAng);
    }
    j.ratio = worst;
    j.ratioF = j.ratioF * 0.9 + worst * 0.1;
    if (worst <= 1) return;
    // progressive failure: crack the most-stressed fibers, recompute, repeat
    let changed = false;
    for (let pass = 0; pass < 6; pass++) {
      let failedNow = 0;
      const stressed = [];
      for (const f of j.fibers) if (!f.failed) stressed.push([evalFiber(f), f]);
      stressed.sort((a, b) => b[0] - a[0]);
      for (const [r, f] of stressed) {
        if (r <= 1 && !(j.state === 1 && Math.abs(j.hinge) > (this.brittle ? 0.09 : 0.22))) break;
        f.failed = true; failedNow++; changed = true;
        if (failedNow >= Math.max(2, Math.ceil(j.fibers.length * (this.brittle ? 0.25 : 0.08)))) break;
      }
      if (!failedNow) break;
      this.ship.sectionProps(j);
      if (j.A <= 0.04 * (j.A0 || j.A + 1e-9) || j.fibers.every(f => f.failed)) { this.breakJoint(j, 'hull girder failure'); return; }
      if (j.state === 1 && Math.abs(j.hinge) > (this.brittle ? 0.09 : 0.22)) j.hinge *= 0.5;
    }
    if (changed) {
      if (!j.A0) j.A0 = j.fibers.reduce((s, f) => s + f.area, 0);
      if (j.state === 0) {
        j.state = 1;
        this.events.push({ type: 'crack', joint: j.id, x: this.bodies[j.a].wx(j.ax, j.ay), y: this.bodies[j.a].wy(j.ax, j.ay) });
      }
      // move the hinge to the remaining material
      const A = this.bodies[j.a], B = this.bodies[j.b];
      const X = A.wx(j.ax, j.na), Y = A.wy(j.ax, j.na);
      j.ay = j.na; j.bx = B.lx(X, Y); j.by = B.ly(X, Y);
      this.markCrackCells(j);
    }
  }

  markCrackCells(j) {
    const g = this.ship.grid;
    for (const f of j.fibers) {
      if (!f.failed) continue;
      const k = f.k;
      if (g.dmg[k] === 0) g.dmg[k] = 1;
      if (g.dmg[k + 1] === 0) g.dmg[k + 1] = 1;
      for (const kk of [k, k + 1]) {
        if (g.kind[kk] === SPACE && g.side[kk] !== SIDE.BREACH) {
          g.side[kk] = SIDE.BREACH; g.sideArea[kk] = 0.6; this.ship.needElements = true;
        }
      }
    }
    j.crackOpen = true;
  }

  checkAppendage(j, dt) {
    const M = Math.abs(j.Mf), F = Math.hypot(j.Nf, j.Vf);
    const g = this.ship.grid;
    // corrosion of the base
    const B = this.bodies[j.b];
    let rust = 0; if (B.cells.length) rust = g.rust[B.cells[0]];
    const capM = j.Mcap * Math.max(0.02, 1 - rust), capF = j.Fcap * Math.max(0.02, 1 - rust);
    const r = Math.max(M / capM, F / capF);
    j.ratio = r; j.ratioF = j.ratioF * 0.9 + r * 0.1;
    if (r > 1) this.breakJoint(j, j.kind === 'funnel' ? 'funnel stays parted' : 'mast stays parted');
  }

  breakJoint(j, why) {
    if (j.state >= 2) return;
    j.state = 2;
    const A = this.bodies[j.a], B = this.bodies[j.b];
    const X = A.wx(j.ax, j.ay), Y = A.wy(j.ax, j.ay);
    this.events.push({ type: 'break', joint: j.id, kind: j.kind, why, x: X, y: Y, a: j.a, b: j.b, name: B.name });
    if (j.kind === 'weld') {
      this.ship.markBroken(j.a, j.b);
      const g = this.ship.grid;
      for (const f of j.fibers) { g.dmg[f.k] = 2; if (g.dmg[f.k + 1] !== 2) g.dmg[f.k + 1] = 1; }
      this.ship.topologyDirty = true;
      this.ship.rebuildBodyGeometry(A); this.ship.rebuildBodyGeometry(B);
    }
    this._jver = -1;
  }

  // ------------------------------------------------------------ topology
  destroyCell(k, why = 'damage') {
    this.pendingDestroy.push(k);
  }
  applyTopology() {
    const ship = this.ship, g = ship.grid;
    const touched = new Set();
    for (const k of this.pendingDestroy) {
      if (g.kind[k] === EMPTY) continue;
      const bi = g.block[k];
      if (bi >= 0) touched.add(bi);
      g.mat[k] = MAT.NONE; g.kind[k] = EMPTY; g.dmg[k] = 2;
      g.side[k] = 0; g.sideArea[k] = 0;
      g.mass[k] = 0; g.vdisp[k] = 0; g.vcap[k] = 0;
      ship.destroyedLog = ship.destroyedLog || []; ship.destroyedLog.push(k);
    }
    this.pendingDestroy.length = 0;
    for (const bi of touched) {
      const b = this.bodies[bi];
      b.recomputeStructMass(g);
      ship.rebuildBodyGeometry(b);
      if (b.ms < 50) b.alive = false;
    }
    // re-segment rooms, carrying water over cell by cell
    const prev = { rooms: ship.rooms, cellWaterFrac: this.flooding.cellWaterFrac.slice(), cellRoom: g.room.slice() };
    ship.segmentRooms(prev);
    this.bodyVolCache();
    this.flooding.parent = null;
    this.flooding.updatePositions();
    this.flooding.solveLevels(0);
    this.flooding.distributeWater();
    for (const b of this.bodies) if (b.alive) b.updateMassProps();
    this._jver = -1;
  }

  // ---------------------------------------------------------- events
  handleFloodEvents() {
    const f = this.flooding;
    if (f.events.length) {
      for (const e of f.events) this.events.push(e);
      f.events.length = 0;
    }
    if (f.burstQueue.length) {
      for (const bq of f.burstQueue) {
        const k = bq.k;
        const g = this.ship.grid;
        if (g.kind[k] !== SOLID) continue;
        // panel tears: becomes open space (internal) or a hole (shell)
        const toSea = bq.a === EXT || bq.b === EXT;
        if (toSea) this.pendingDestroy.push(k);
        else { g.mat[k] = MAT.CORRIDOR; g.kind[k] = SPACE; g.dmg[k] = 2; this.ship.topologyDirty = true; }
        this.events.push({ type: bq.implode ? 'implode' : 'panel', k, x: bq.x, y: bq.y, dp: bq.dp });
      }
      f.burstQueue.length = 0;
    }
  }

  updateStats() {
    // trim & draughts of the piece holding the stem
    const ship = this.ship;
    const meta = ship.meta;
    const hull = this.bodies.filter(b => b.kind === 'hull' && b.alive);
    if (!hull.length) return;
    const bow = hull.reduce((a, b) => (b.order > a.order ? b : a));
    const stern = hull.reduce((a, b) => (b.order < a.order ? b : a));
    const yBow = bow.wy(meta.stemX(2) - 1, 0.3), yStern = stern.wy(meta.sternX(2) + 2, 0.3);
    this.stats.draughtF = this.env.surface(bow.wx(meta.stemX(2), 0)) - yBow;
    this.stats.draughtA = this.env.surface(stern.wx(meta.sternX(2), 0)) - yStern;
    const mid = hull[Math.floor(hull.length / 2)];
    this.stats.trim = -mid.a;   // + = bow down
    this.stats.bowAngle = -bow.a; this.stats.sternAngle = -stern.a;
  }
}
