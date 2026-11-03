// Historical replay: the whole sinking as a deterministic function of ship's
// time. Pose of every hull block, flooding of every room, lifeboats, rockets,
// iceberg, the break-up and both sections' descent to the seabed are all
// computed from t, so the timeline can be scrubbed freely.

import * as H from './history.js';
import { CELL } from '../sim/constants.js';
import { MAT, SPACE, EMPTY } from '../sim/materials.js';

const D2R = Math.PI / 180;
const smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

function rot(a, x, y) { const c = Math.cos(a), s = Math.sin(a); return [c * x - s * y, s * x + c * y]; }

export class Replay {
  constructor(world) {
    this.world = world;
    const ship = world.ship, meta = ship.meta;
    this.meta = meta;
    this.bodies = world.bodies;
    // break location: the aft expansion joint, between funnels 3 and 4
    this.xBreak = meta.expansionJoints.reduce((a, b) => (b < a ? b : a));
    const hull = this.bodies.filter(b => b.kind === 'hull');
    this.bow = hull.filter(b => b.comX > this.xBreak);
    this.stern = hull.filter(b => b.comX <= this.xBreak);
    const funnels = this.bodies.filter(b => b.kind === 'funnel').sort((a, b) => b.comX - a.comX);
    this.funnels = funnels;
    const masts = this.bodies.filter(b => b.kind === 'mast');
    this.foremast = masts.find(m => m.comX > this.xBreak);
    this.mainmast = masts.find(m => m.comX <= this.xBreak);
    this.bowSet = new Set([...this.bow, this.foremast].filter(Boolean));
    this.sternSet = new Set([...this.stern, this.mainmast, funnels[3]].filter(Boolean));
    // centres of mass of each section in grid coordinates
    const com = (list) => { let m = 0, x = 0, y = 0; for (const b of list) { m += b.ms; x += b.ms * b.comX; y += b.ms * b.comY; } return [x / m, y / m]; };
    this.bowC = com(this.bow); this.sternC = com(this.stern);
    this.extent = (list) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const b of list) { x0 = Math.min(x0, b.aabb.x0); x1 = Math.max(x1, b.aabb.x1); y0 = Math.min(y0, b.aabb.y0); y1 = Math.max(y1, b.aabb.y1); } return { x0, x1, y0, y1 }; };
    this.bowBox = this.extent(this.bow); this.sternBox = this.extent(this.stern);
    this.hinge = [this.xBreak, 1.0];
    // initial room water (double bottom tanks keep theirs)
    this.tankWater = ship.rooms.map(r => r.water);
    this.classifyRooms();
    this.precompute();
    this.firedEvents = new Set();
  }

  // --------------------------------------------------------------- poses
  intact(t) {
    const K = H.TRIM;
    let i = 0;
    while (i < K.length - 2 && t > K[i + 1][0]) i++;
    const [t0, th0, y0] = K[i], [t1, th1, y1] = K[Math.min(i + 1, K.length - 1)];
    let u = t1 > t0 ? clamp((t - t0) / (t1 - t0), 0, 1) : 1;
    if (t > K[K.length - 1][0]) {
      // extrapolate gently past the last keyframe (only used for lagged flooding)
      const [ta, tha, ya] = K[K.length - 2];
      const dt = t - t1, r = (th1 - tha) / (t1 - ta), ry = (y1 - ya) / (t1 - ta);
      return this.poseFrom(th1 + r * dt, y1 + ry * dt);
    }
    return this.poseFrom(lerp(th0, th1, u), lerp(y0, y1, u));
  }
  // grid -> world mapping { ox, oy, a } for a trim (deg) and midship keel depth
  poseFrom(trimDeg, yMid) {
    const a = -trimDeg * D2R;
    const [rx, ry] = rot(a, 135, 0);
    return { ox: -rx, oy: yMid - ry, a };
  }
  apply(p, gx, gy) { const [x, y] = rot(p.a, gx, gy); return [p.ox + x, p.oy + y]; }
  rotateAbout(p, hx, hy, d) {
    const [x, y] = rot(d, p.ox - hx, p.oy - hy);
    return { ox: hx + x, oy: hy + y, a: p.a + d };
  }
  fromCenter(cx, cy, a, C) { const [x, y] = rot(a, C[0], C[1]); return { ox: cx - x, oy: cy - y, a }; }

  // pose of each section at time t
  sections(t) {
    if (t <= H.BREAK_START) { const p = this.intact(t); return { bow: p, stern: p }; }
    const base = this.intact(H.BREAK_START);
    const [hx, hy0] = this.apply(base, this.hinge[0], this.hinge[1]);
    if (t <= H.BREAK_DONE) {
      const u = smooth((t - H.BREAK_START) / (H.BREAK_DONE - H.BREAK_START));
      const hy = hy0 - 7 * u;
      const b = this.rotateAbout(base, hx, hy0, -9 * u * D2R); b.oy -= 7 * u;
      const s = this.rotateAbout(base, hx, hy0, 8 * u * D2R); s.oy -= 7 * u;
      return { bow: b, stern: s };
    }
    return { bow: this.bowPose(t), stern: this.sternPose(t) };
  }

  sternPose(t) {
    const s0 = this.sternStart;   // pose at BREAK_DONE
    if (t <= H.STERN_GONE) {
      // settles back, floods through the break, swings up to near vertical, slides under
      const k = [[H.BREAK_DONE, s0.trim], [H.T(2, 17, 55), 1.5], [H.T(2, 18, 30), 12], [H.T(2, 19, 15), 78], [H.STERN_GONE, 86]];
      const tail = [[H.BREAK_DONE, s0.tail], [H.T(2, 17, 55), 14], [H.T(2, 18, 30), 24], [H.T(2, 19, 15), 44], [H.T(2, 19, 40), 30], [H.STERN_GONE, -3]];
      const trim = this.keyed(k, t), top = this.keyed(tail, t);
      const a = -trim * D2R;
      // taffrail height = top; break end keeps its x
      const T = [this.sternBox.x0 + 2, 23.5], E = [this.xBreak, 4];
      const [, ty] = rot(a, T[0], T[1]);
      const [ex] = rot(a, E[0], E[1]);
      return { ox: s0.ex - ex, oy: top - ty, a };
    }
    return this.pathPose(this.sternPath, t, this.sternC);
  }
  bowPose(t) { return this.pathPose(this.bowPath, t, this.bowC); }
  keyed(k, t) {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 0; i + 1 < k.length; i++) if (t <= k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], smooth((t - k[i][0]) / (k[i + 1][0] - k[i][0])));
    return k[k.length - 1][1];
  }
  pathPose(P, t, C) {
    const i = clamp((t - P.t0) / P.dt, 0, P.n - 1.001);
    const i0 = i | 0, f = i - i0;
    const x = lerp(P.x[i0], P.x[i0 + 1], f), y = lerp(P.y[i0], P.y[i0 + 1], f), a = lerp(P.a[i0], P.a[i0 + 1], f);
    const p = this.fromCenter(x, y, a, C);
    p.squash = lerp(P.sq[i0], P.sq[i0 + 1], f);
    return p;
  }

  // integrate both descents once (deterministic); speeds are chosen so the
  // impacts land on the historical estimates
  precompute() {
    const env = this.world.env;
    const atDone = this.sections(H.BREAK_DONE);
    const [ex, ey] = this.apply(atDone.stern, this.xBreak, 4);
    const [, tailY] = this.apply(atDone.stern, this.sternBox.x0 + 2, 23.5);
    this.sternStart = { trim: -atDone.stern.a / D2R, ex, tail: tailY };
    const lowest = (pose, box) => {
      let m = 1e9, mx = 0;
      for (const [gx, gy] of [[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]]) { const [x, y] = this.apply(pose, gx, gy); if (y < m) { m = y; mx = x; } }
      return [m, mx];
    };
    const integrate = (t0, pose0, C, box, opts) => {
      const dt = 0.25;
      let [x, y] = this.apply(pose0, C[0], C[1]);
      let a = pose0.a, vx = 0, vy = opts.v0 || -1;
      const xs = [], ys = [], as = [], sq = [];
      let t = t0, impact = null, settle = 0, sqz = 1;
      const a0 = a;
      for (let k = 0; k < 6000; k++) {
        xs.push(x); ys.push(y); as.push(a); sq.push(sqz);
        const tau = t - t0;
        if (!impact) {
          vy += (-opts.V - vy) * dt / 18;
          vx += (opts.glide * Math.abs(vy) - vx) * dt / 18;
          a = opts.angle(tau, a0);
          x += vx * dt; y += vy * dt;
          const [lo, lx] = lowest({ ...this.fromCenter(x, y, a, C) }, box);
          if (lo < env.seabedY(lx)) impact = { t, v: Math.hypot(vx, vy), x, y, a };
        } else {
          settle += dt;
          const u = smooth(settle / opts.settleT);
          a = lerp(impact.a, opts.finalA, u);
          y = impact.y - opts.bury * smooth(settle / 1.6);
          x = impact.x + vx * 0.6 * smooth(settle / 2);
          sqz = lerp(1, opts.squash, smooth(settle / 2.5));
          if (settle > 12) { for (let q = 0; q < 4; q++) { xs.push(x); ys.push(y); as.push(a); sq.push(sqz); } break; }
        }
        t += dt;
      }
      return { t0, dt, n: xs.length, x: xs, y: ys, a: as, sq, impact };
    };
    // bow: dives at ~35-40 deg, planes out toward ~25 deg; glides forward
    const bowDepth = 3800;
    const bowOpts = (V) => ({ V, glide: 0.12, settleT: 5, finalA: -4.5 * D2R, bury: 16, squash: 1,
      angle: (tau, a0) => lerp(a0, -36 * D2R, smooth(tau / 25)) * (1 - smooth((tau - 60) / 200)) + (-24 * D2R) * smooth((tau - 60) / 200) });
    let V = bowDepth / (H.BOW_IMPACT_TARGET - H.BREAK_DONE - 18);
    for (let it = 0; it < 4; it++) {
      this.bowPath = integrate(H.BREAK_DONE, atDone.bow, this.bowC, this.bowBox, bowOpts(V));
      const err = this.bowPath.impact.t - H.BOW_IMPACT_TARGET;
      V *= 1 + err / (H.BOW_IMPACT_TARGET - H.BREAK_DONE);
    }
    // stern: plunges vertically, tumbles back toward level, lands 600 m away, pancaked
    const sGone = this.sternPose(H.STERN_GONE);
    const sternOpts = (V) => ({ V, glide: -0.05, settleT: 4, finalA: 1.5 * D2R, bury: 5, squash: 0.72, v0: -4,
      angle: (tau, a0) => a0 * Math.exp(-tau / 55) * Math.cos(tau / 30) });
    V = 3800 / (H.STERN_IMPACT_TARGET - H.STERN_GONE - 18);
    for (let it = 0; it < 4; it++) {
      this.sternPath = integrate(H.STERN_GONE, sGone, this.sternC, this.sternBox, sternOpts(V));
      const err = this.sternPath.impact.t - H.STERN_IMPACT_TARGET;
      V *= 1 + err / (H.STERN_IMPACT_TARGET - H.STERN_GONE);
    }
  }

  // --------------------------------------------------------------- apply
  setBody(b, p, extra = 0, pivot = null) {
    let pose = p;
    if (extra && pivot) { const [hx, hy] = this.apply(p, pivot[0], pivot[1]); pose = this.rotateAbout(p, hx, hy, extra); }
    const [x, y] = this.apply(pose, b.comX, b.comY);
    b.x = x; b.y = y; b.a = pose.a; b.syncTrig();
    b.squash = pose.squash || 1;
    b.updateWorldBox();
  }
  funnelPose(i, t, sec) {
    const f = this.funnels[i], tf = H.FUNNEL_FALLS[i];
    const base = [this.meta.funnels[i].xBase, this.meta.funnels[i].yBase];
    if (tf === null || t < tf) return { pose: sec, extra: 0, base };
    const fallT = 4.5, dir = i === 2 ? 1 : -1;
    const u = clamp((t - tf) / fallT, 0, 1);
    if (u < 1) return { pose: sec, extra: dir * 95 * D2R * u * u, base };
    // detached: frozen where it hit the water, then sinks
    const secAt = this.sections(tf + fallT)[i < 3 ? 'bow' : 'stern'];
    const [hx, hy] = this.apply(secAt, base[0], base[1]);
    const p = this.rotateAbout(secAt, hx, hy, dir * 95 * D2R);
    const dt = t - tf - fallT;
    const env = this.world.env;
    const sink = Math.min(dt * 2.2 + Math.max(0, dt - 40) * 3, 3780);
    const q = { ox: p.ox + dt * 0.15 * dir, oy: p.oy - sink, a: p.a + Math.sin(dt / 40) * 0.4 * Math.min(1, dt / 30) };
    return { pose: q, extra: 0, base, sunk: true };
  }
  poseAll(t) {
    const sec = this.sections(t);
    for (const b of this.bodies) {
      if (b.kind === 'funnel') {
        const i = this.funnels.indexOf(b);
        const owner = i === 3 || (t > H.BREAK_DONE && i === 3) ? sec.stern : sec.bow;
        const fp = this.funnelPose(i, t, i === 3 ? sec.stern : owner);
        this.setBody(b, fp.pose, fp.extra, fp.base);
        continue;
      }
      this.setBody(b, this.sternSet.has(b) ? sec.stern : sec.bow);
    }
    return sec;
  }

  // --------------------------------------------------------------- flooding
  classifyRooms() {
    const ship = this.world.ship, meta = this.meta;
    const eDeckRow = (r) => r.deck <= 4;   // below E deck (bands DB..F) or E itself
    this.roomInfo = ship.rooms.map(r => {
      const tank = r.mat === MAT.TANK;
      const lower = r.deck <= 3;           // tank top .. F deck: inside the watertight subdivision
      let kind = 'upper';
      if (tank) kind = 'tank';
      else if (lower && r.zone <= 4) kind = 'breached';
      else if (lower && r.zone === 5) kind = 'br5';
      else if (lower) kind = 'spill';
      // E-deck point on the forward bulkhead of this compartment
      const bh = meta.bulkheadX[Math.max(0, r.zone - 1)];
      const gate = bh ? [bh.x, meta.deckZ('E', bh.x)] : null;
      return { kind, gate, sec: r.x0 > this.xBreak ? 'bow' : 'stern' };
    });
  }
  // water volume each room would hold if filled to the sea surface
  submergedVolumes(t, out, filter) {
    const ship = this.world.ship, g = ship.grid;
    this.poseAll(t);
    const rooms = ship.rooms;
    for (let i = 0; i < rooms.length; i++) {
      if (!filter(i)) continue;
      const r = rooms[i];
      let v = 0;
      for (let q = 0; q < r.cells.length; q++) {
        const k = r.cells[q];
        const b = this.bodies[g.block[k]];
        const y = b.y + b.s * (ship.cxs[k] - b.comX) + b.c * (ship.cys[k] - b.comY);
        if (y < 0) v += g.vcap[k];
        else if (y < CELL) v += g.vcap[k] * (1 - y / CELL);
      }
      out[i] = v;
    }
  }
  flood(t) {
    const ship = this.world.ship, rooms = ship.rooms, info = this.roomInfo;
    const n = rooms.length;
    if (!this.vFast || this.vFast.length !== n) { this.vFast = new Float64Array(n); this.vSlow = new Float64Array(n); }
    const deep = this.sections(t);
    const depthOf = (sec) => { const p = deep[sec]; return -(p.oy + Math.sin(p.a) * 135); };
    const fastLag = 75, slowLag = 330;
    const sinceCollision = t - H.T(23, 39, 45);
    this.submergedVolumes(t - fastLag, this.vFast, (i) => info[i].kind !== 'tank');
    this.submergedVolumes(t - slowLag, this.vSlow, (i) => info[i].kind !== 'tank');
    // spill gates at the lagged pose
    const gateOpen = rooms.map((r, i) => {
      const gp = info[i].gate;
      if (!gp) return false;
      const p = this.sections(t - slowLag)[info[i].sec];
      return this.apply(p, gp[0], gp[1])[1] < 0;
    });
    for (let i = 0; i < n; i++) {
      const r = rooms[i], inf = info[i];
      if (inf.kind === 'tank') { r.water = this.tankWater[i]; continue; }
      const sunk = t > H.BREAK_START && depthOf(inf.sec) > 45;
      if (sinceCollision < 0) { r.water = 0; continue; }
      let target;
      if (sunk) target = r.cap;
      else if (inf.kind === 'breached') target = this.vFast[i] * smooth(sinceCollision / 600);
      else if (inf.kind === 'br5') target = this.vFast[i] * (t < H.T(1, 20) ? 0.1 : lerp(0.1, 1, smooth((t - H.T(1, 20)) / 900)));
      else if (inf.kind === 'spill') target = gateOpen[i] ? this.vSlow[i] : 0;
      else target = this.vSlow[i];
      // after the break the open section floods fast
      if (t > H.BREAK_START && !sunk) target = Math.max(target, this.vFast[i]);
      r.water = Math.min(r.cap, target);
    }
    this.poseAll(t);
    const fl = this.world.flooding;
    fl.updatePositions(); fl.solveLevels(0); fl.distributeWater();
  }

  // --------------------------------------------------------------- boats
  boatState(bt, t) {
    const sec = this.sections(Math.min(t, bt.at));
    const xLocal = this.meta.X0 - bt.xb;
    const deckY = this.meta.deckZ('BOAT', xLocal) + 1.6;
    if (t < bt.at - (bt.float ? 0 : 95)) {
      if (bt.float) return null;
      const [x, y] = this.apply(this.sections(t).bow, xLocal, deckY);
      return { x, y, a: this.sections(t).bow.a, mode: 'davit' };
    }
    if (!bt.float && t < bt.at) {
      const [x, y] = this.apply(sec, xLocal, deckY);
      const u = (t - (bt.at - 95)) / 95;
      const jerk = Math.sin(u * 40) * 0.15;
      return { x, y: lerp(y, 0.2, u) + jerk, a: 0, mode: 'lowering' };
    }
    const [x0] = this.apply(sec, xLocal, deckY);
    const tau = t - bt.at;
    const dir = (xLocal > 135 ? 1 : -1) * (bt.side === 'p' ? 1.15 : 1);
    let x = x0 + dir * (bt.float ? 25 * (1 - Math.exp(-tau / 300)) : 380 * (1 - Math.exp(-tau / 900)));
    // rowing toward Carpathia once she arrives
    const pi = H.PICKUP_ORDER.indexOf(bt.id);
    let gone = false;
    if (pi >= 0) {
      const tp = lerp(H.T(4, 10), H.T(8, 30), pi / (H.PICKUP_ORDER.length - 1));
      const appr = smooth((t - (tp - 1500)) / 1500);
      x = lerp(x, this.carpathiaX(t) - 60 + pi * 3, appr);
      if (t > tp) gone = true;
    }
    const bob = Math.sin(t * 0.9 + bt.xb) * 0.15;
    return { x, y: 0.15 + bob, a: Math.sin(t * 0.7 + bt.xb) * 0.03, mode: gone ? 'gone' : 'afloat', flip: bt.flip, swamped: bt.id === 'A' };
  }
  carpathiaX(t) {
    // seen from 03:30, stops among the boats around 04:00
    const u = smooth((t - H.T(3, 25)) / (H.T(4, 5) - H.T(3, 25)));
    return lerp(5200, 900, u);
  }

  // --------------------------------------------------------------- iceberg
  icebergX(t) {
    const tau = t - H.T(23, 39, 40);
    const v0 = 11.6;  // 22.5 knots
    const S = tau <= -5 ? v0 * tau : -5 * v0 + v0 * 150 * (1 - Math.exp(-(tau + 5) / 150));
    const bowX = this.apply(this.intact(t), this.meta.X0 - 22, 0)[0];
    return bowX + 40 - S;
  }
  shipSpeed(t) {
    const tau = t - H.T(23, 39, 40);
    return tau <= -5 ? 11.6 : 11.6 * Math.exp(-(tau + 5) / 150);
  }
}
