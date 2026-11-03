// The six fundamentals, each a small scenario with checks against analytic
// results. The browser lab animates them; tools/physics-tests.mjs runs them
// headless. Every scenario advances in fixed steps of `dt`.
import { Frame, Compartment, Opening, FluidNet, SEA, ATM } from './fluid.js';
import { HingedDoor } from './door.js';
import { Body2D, Fall, makeLifeboat, boatStability } from './rigging.js';
import { FixedClock, hashDoubles } from './clock.js';
import { v, TITANIC_LEDGER, LONG_TON } from './params.js';

const G = v('constants.g'), PATM = v('constants.p_atm');
const check = (name, pass, value, target, note = '') => ({ name, pass: !!pass, value, target, note });

// ------------------------------------------------------------ 1. connected tanks
export function connectedTanks() {
  const net = new FluidNet({ seaLevel: -100 });
  const F = new Frame();
  const A = net.add(new Compartment({ name: 'Tank A', frame: F, u0: 0, u1: 2, z0: 0, z1: 3, depth: 1, cell: 0.05, water: 4.8 }));
  const B = net.add(new Compartment({ name: 'Tank B', frame: F, u0: 2.2, u1: 4.2, z0: 0, z1: 3, depth: 1, cell: 0.05 }));
  const pipe = net.open(new Opening({ name: 'connecting opening', a: A, b: B, frame: F, u: 2.1, z: 0.35, height: 0.6, width: 0.5, slices: 6 }));
  net.open(new Opening({ name: 'vent A', a: A, b: ATM, frame: F, u: 1, z: 2.95, height: 0.1, width: 0.4, kind: 'wall', slices: 1 }));
  net.open(new Opening({ name: 'vent B', a: B, b: ATM, frame: F, u: 3.2, z: 2.95, height: 0.1, width: 0.4, kind: 'wall', slices: 1 }));
  net.start();
  const S = { net, t: 0, series: [], crossings: [], lastSign: 0 };
  S.step = (dt) => {
    net.step(dt); S.t += dt;
    const d = net.nodes[A].h - net.nodes[B].h;
    const sg = Math.sign(d);
    if (S.lastSign && sg && sg !== S.lastSign) S.crossings.push(S.t);
    if (sg) S.lastSign = sg;
    if (S.series.length === 0 || S.t - S.series[S.series.length - 1][0] >= 0.05) S.series.push([S.t, net.nodes[A].h, net.nodes[B].h, pipe.Q.reduce((a, b) => a + b, 0)]);
  };
  S.checks = () => {
    const a = net.nodes[A], b = net.nodes[B];
    const hEq = 4.8 / (2 + 2);
    const Aop = pipe.fullArea(), Sa = 2, Sb = 2;
    const omega = Math.sqrt(G * Aop * (1 / Sa + 1 / Sb) / pipe.L);
    const Ttheory = 2 * Math.PI / omega;
    const Tmeas = S.crossings.length >= 3 ? (S.crossings[2] - S.crossings[0]) : NaN;
    return [
      check('Water conserved (m³)', Math.abs(net.waterError()) < 1e-9, net.waterError().toExponential(2), '< 1e-9'),
      check('Final levels equal (m)', Math.abs(a.h - b.h) < 0.002, `${a.h.toFixed(4)} / ${b.h.toFixed(4)}`, 'difference < 2 mm'),
      check('Level matches V/(S₁+S₂) (m)', Math.abs(a.h - hEq) < 0.003, a.h.toFixed(4), hEq.toFixed(4)),
      check('Inertia carries flow past equilibrium', S.crossings.length >= 2, `${S.crossings.length} level crossings`, '≥ 2 (overshoot)'),
      check('U-tube period vs linear theory (s)', isFinite(Tmeas) && Math.abs(Tmeas - Ttheory) / Ttheory < 0.2, isFinite(Tmeas) ? Tmeas.toFixed(2) : 'n/a', `${Ttheory.toFixed(2)} ±20%`, 'damped by orifice losses, so only approximately linear'),
    ];
  };
  S.ids = { A, B, pipe };
  return S;
}

// ------------------------------------------------------------ 2. sealed vs vented
export function ventTanks() {
  const mk = (ventArea) => {
    const net = new FluidNet({ seaLevel: 0 });
    const F = new Frame();
    const T = net.add(new Compartment({ name: 'tank', frame: F, u0: 0, u1: 2, z0: -4, z1: -1, depth: 1, cell: 0.05 }));
    net.open(new Opening({ name: 'inlet (from the sea)', a: SEA, b: T, frame: F, u: 0, z: -3.85, height: 0.2, width: 0.4, slices: 2 }));
    if (ventArea > 0) net.open(new Opening({ name: 'vent pipe', a: T, b: ATM, frame: F, u: 1, z: -1.05, height: 0.1, width: ventArea / 0.1, slices: 1 }));
    net.start();
    return { net, T, ventArea, series: [], t50: null };
  };
  const S = { runs: [mk(0.02), mk(0.0001), mk(0)], t: 0, labels: ['Vented (200 cm²)', 'Restricted vent (1 cm²)', 'Sealed'] };
  S.step = (dt) => {
    S.t += dt;
    for (const r of S.runs) {
      r.net.step(dt);
      const c = r.net.nodes[r.T];
      if (r.t50 === null && c.V >= 0.5 * c.Vcap) r.t50 = S.t;
      if (r.series.length === 0 || S.t - r.series[r.series.length - 1][0] >= 0.5) r.series.push([S.t, c.V / c.Vcap, c.pAir]);
    }
  };
  S.checks = () => {
    const [vent, slow, sealed] = S.runs;
    const cs = sealed.net.nodes[sealed.T], cv = vent.net.nodes[vent.T];
    // Boyle's law equilibrium for the sealed tank
    const rho = 1025, V0 = cs.Vcap, Sa = V0 / 3;
    let lo = 0, hi = V0;
    for (let i = 0; i < 80; i++) { const Vw = (lo + hi) / 2; const h = -4 + Vw / Sa; const f = PATM * V0 / (V0 - Vw) - PATM - rho * G * (0 - h); if (f > 0) hi = Vw; else lo = Vw; }
    const VwEq = (lo + hi) / 2;
    return [
      check('Water conserved, all three tanks (m³)', S.runs.every(r => Math.abs(r.net.waterError()) < 1e-9), Math.max(...S.runs.map(r => Math.abs(r.net.waterError()))).toExponential(2), '< 1e-9'),
      check('Air conserved incl. vent losses (kg)', S.runs.every(r => Math.abs(r.net.airError()) < 1e-9), Math.max(...S.runs.map(r => Math.abs(r.net.airError()))).toExponential(2), '< 1e-9'),
      check("Sealed tank stops at Boyle's-law volume (m³)", Math.abs(cs.V - VwEq) / VwEq < 0.01, cs.V.toFixed(3), VwEq.toFixed(3) + ' ±1%'),
      check('Sealed tank keeps an air pocket at the top', cs.Vair > 0.7 * V0, (cs.Vair / V0 * 100).toFixed(1) + ' % air', '> 70 %'),
      check('Vented tank floods completely', cv.V / cv.Vcap > 0.99, (cv.V / cv.Vcap * 100).toFixed(1) + ' %', '> 99 %'),
      check('Restricted vent delays flooding', slow.t50 === null || (vent.t50 && slow.t50 > 3 * vent.t50), `half-full at ${slow.t50 ? slow.t50.toFixed(0) + ' s' : 'not yet'} vs ${vent.t50 ? vent.t50.toFixed(0) : '?'} s`, '> 3× slower'),
    ];
  };
  return S;
}

// ------------------------------------------------------------ 3. tilting a part-filled container
export function tiltTanks() {
  const mk = (b, d, fill) => {
    const net = new FluidNet({ seaLevel: -100 });
    const F = new Frame();
    const id = net.add(new Compartment({ name: `${b} m wide`, frame: F, u0: -b / 2, u1: b / 2, z0: 0, z1: d, depth: 1, cell: 0.02, water: b * fill }));
    net.start();
    return { net, F, id, b, d, V: b * fill, rec: {} };
  };
  const S = { runs: [mk(4, 1, 0.25), mk(1, 2, 1.0)], t: 0, theta: 0, labels: ['Broad, shallow (4 m)', 'Narrow, deep (1 m)'], psiSeries: [] };
  const deg = Math.PI / 180;
  S.thetaAt = (t) => {
    if (t < 25) return 3 * deg * Math.min(1, t / 20);                // slow tilt to 3 deg, hold
    if (t < 25.4) return 3 * deg + 4 * deg * (t - 25) / 0.4;         // sudden jolt to 7 deg
    return 7 * deg;
  };
  S.step = (dt) => {
    S.t += dt;
    const th = S.thetaAt(S.t);
    for (const r of S.runs) {
      const w = (th - r.F.ang) / dt;
      r.F.ang = th; r.F.w = w;
      r.net.step(dt);
      const c = r.net.nodes[r.id];
      const cg = c.waterCG();
      // water CG in the container's own (tilted) frame
      const cs = Math.cos(th), sn = Math.sin(th);
      r.yb = cs * cg.x + sn * cg.z;
      r.psi = c.psi;
      if (S.t >= 22 && S.t < 22 + dt) { r.rec.y3 = r.yb; r.rec.psi3 = c.psi; r.rec.err = (cg.V - c.V) / c.V; }
    }
    const c0 = S.runs[0].net.nodes[S.runs[0].id];
    S.psiSeries.push([S.t, c0.psi]);
    if (S.psiSeries.length > 4000) S.psiSeries.shift();
  };
  S.checks = () => {
    const out = [];
    const t3 = Math.tan(3 * Math.PI / 180);
    for (const r of S.runs) {
      // tilting the container by +theta lowers its -u side, so water moves toward -u
      const yA = -(Math.pow(r.b, 3) / 12) / r.V * t3;
      out.push(check(`${r.b} m tank: CG shift at 3° vs free-surface theory (m)`, r.rec.y3 !== undefined && Math.abs(r.rec.y3 - yA) / Math.abs(yA) < 0.05, r.rec.y3 !== undefined ? r.rec.y3.toFixed(4) : 'n/a', `${yA.toFixed(4)} ±5%`, 'shift = (b³/12)/V · tanθ'));
    }
    const r0 = S.runs[0], r1 = S.runs[1];
    out.push(check('Surface level with gravity while tilting slowly (rad)', Math.abs(r0.rec.psi3 || 1) < 0.01, (r0.rec.psi3 || 0).toFixed(4), '|ψ| < 0.01'));
    out.push(check('Broad pool: much larger heeling moment than narrow tank', r0.rec.y3 / r1.rec.y3 > 40, (r0.rec.y3 / r1.rec.y3).toFixed(1) + '×', '≈ 64× (b³ ratio)'));
    // sloshing period after the jolt
    const s = S.psiSeries.filter(p => p[0] > 25.5);
    const zc = []; for (let i = 1; i < s.length; i++) if (Math.sign(s[i][1]) !== Math.sign(s[i - 1][1])) zc.push(s[i][0]);
    const c = r0.net.nodes[r0.id];
    const Tth = 2 * Math.PI / c.sloshOmega();
    const Tm = zc.length >= 3 ? zc[2] - zc[0] : NaN;
    out.push(check('First-mode slosh period after a jolt (s)', isFinite(Tm) && Math.abs(Tm - Tth) / Tth < 0.1, isFinite(Tm) ? Tm.toFixed(2) : 'n/a', `${Tth.toFixed(2)} ±10%`, 'linear wave theory for a rectangular tank'));
    out.push(check('Level solver holds the volume (relative)', Math.abs(r0.rec.err) < 0.005, (r0.rec.err * 100).toFixed(3) + ' %', '< 0.5 %'));
    return out;
  };
  return S;
}

// ------------------------------------------------------------ 4. pressure across a hinged door
export function doorDemo(opensToward = 'b') {
  const net = new FluidNet({ seaLevel: 3 });
  const F = new Frame();
  const L = net.add(new Compartment({ name: 'Flooding side', frame: F, u0: 0, u1: 3, z0: 0, z1: 3, depth: 2, cell: 0.05 }));
  const R = net.add(new Compartment({ name: 'Dry side', frame: F, u0: 3.1, u1: 6.1, z0: 0, z1: 3, depth: 2, cell: 0.05 }));
  net.open(new Opening({ name: 'breach', a: SEA, b: L, frame: F, u: 0, z: 0.3, height: 0.2, width: 0.15, slices: 2 }));
  net.open(new Opening({ name: 'vent L', a: L, b: ATM, frame: F, u: 1, z: 2.95, height: 0.1, width: 0.5, slices: 1 }));
  net.open(new Opening({ name: 'vent R', a: R, b: ATM, frame: F, u: 5, z: 2.95, height: 0.1, width: 0.5, slices: 1 }));
  const doorOpening = net.open(new Opening({ name: 'cabin door', a: L, b: R, frame: F, u: 3.05, z: 0.99, height: 1.98, width: 0.76, slices: 12 }));
  const door = new HingedDoor({ net, opening: doorOpening, opensToward });
  net.start();
  const S = { net, door, t: 0, series: [], failAt: null, ids: { L, R, doorOpening } };
  S.step = (dt) => {
    door.step(dt, S.t);
    net.step(dt); S.t += dt;
    if (door.events.length && !S.failAt) {
      const e = door.events[0];
      // analytic torque from the two hydrostatic profiles at this moment
      const l = net.nodes[L], r = net.nodes[R], rho = net.rho, w = 0.76, h = 1.98;
      let tau = 0;
      const n = 2000;
      for (let i = 0; i < n; i++) {
        const z = (i + 0.5) * h / n;
        const pl = l.pAir + rho * G * Math.max(0, l.h - z), pr = r.pAir + rho * G * Math.max(0, r.h - z);
        tau += (pl - pr) * w * (h / n) * w / 2;
      }
      S.failAt = { t: S.t, depth: l.h, tauEngine: e.tau, tauAnalytic: tau, latch: e.load, type: e.type };
    }
    if (S.series.length === 0 || S.t - S.series[S.series.length - 1][0] >= 0.25) S.series.push([S.t, net.nodes[L].h, net.nodes[R].h, door.theta, door.latchLoad, door.stopLoad]);
  };
  S.checks = () => {
    const out = [check('Water conserved (m³)', Math.abs(net.waterError()) < 1e-9, net.waterError().toExponential(2), '< 1e-9')];
    const latch = v('doors.cabin_latch_strength');
    if (opensToward === 'b') {
      const Hexp = Math.sqrt(2 * 2 * latch / (net.rho * G * 0.76));   // F/2 = latch, F = rho g w H^2 / 2
      out.push(check('Latch gives way (event)', !!S.failAt && S.failAt.type === 'latch', S.failAt ? `at ${S.failAt.t.toFixed(1)} s` : 'not yet', 'latch failure'));
      if (S.failAt) {
        out.push(check('Engine torque = integrated hydrostatics at failure (N·m)', Math.abs(S.failAt.tauEngine - S.failAt.tauAnalytic) / S.failAt.tauAnalytic < 0.02, S.failAt.tauEngine.toFixed(0), `${S.failAt.tauAnalytic.toFixed(0)} ±2%`));
        out.push(check('Failure depth vs hand calculation (m)', Math.abs(S.failAt.depth - Hexp) < 0.05, S.failAt.depth.toFixed(3), `${Hexp.toFixed(3)} ±0.05`, 'dry side at 1 atm; leakage makes it slightly deeper'));
      }
      out.push(check('Door swings open once free', door.theta > 1.0, (door.theta * 180 / Math.PI).toFixed(0) + '°', '> 57°'));
      const l = net.nodes[L], r = net.nodes[R];
      out.push(check('Opening the door equalises the two rooms (m)', Math.abs(l.h - r.h) < 0.15, `${l.h.toFixed(2)} / ${r.h.toFixed(2)}`, 'within 15 cm'));
    } else {
      out.push(check('Door held shut by the frame (opens into the flooding room)', !door.failed && door.theta === 0 && door.latched, door.failed ? 'failed' : 'closed', 'stays closed'));
      out.push(check('Frame reaction = hydrostatic force on the leaf (N)', Math.abs(door.stopLoad - Math.abs(door.F)) < 1, door.stopLoad.toFixed(0), Math.abs(door.F).toFixed(0)));
    }
    return out;
  };
  return S;
}

// ------------------------------------------------------------ 5. lowering a loaded boat unevenly
export function boatDemo() {
  const env = { rho: 1025, seaLevel: 0, cell: 0.1 };
  const boat = makeLifeboat();
  const b = boat.body;
  const people = [];
  const n = 40, pm = v('lifeboat_30ft.person_mass');
  for (let i = 0; i < n; i++) { const p = { u: -3.6 + 7.2 * (i + 0.5) / n, z: 0.6, m: pm, u0: -3.6 + 7.2 * (i + 0.5) / n }; people.push(p); b.points.push(p); }
  b.massProps();
  const hookU = 3.9, hookZ = 0.9, headZ = 19.5;
  b.x = 0; b.z = 15.5; // will settle
  b.massProps();
  // place so hooks are under the davit heads
  const falls = [
    new Fall({ name: 'Forward fall', head: [hookU, headZ], body: b, hook: [hookU, hookZ], length: 3.0 }),
    new Fall({ name: 'After fall', head: [-hookU, headZ], body: b, hook: [-hookU, hookZ], length: 3.0 }),
  ];
  // start at the unstretched geometry: hooks 3 m below the heads
  b.x = 0 + b.c[0]; b.z = headZ - 3.0 - hookZ + b.c[1];
  const S = { env, boat, b, falls, people, t: 0, series: [], events: [], phase: 'Hanging', rec: {} };
  const W = () => b.m * G;
  const statics = () => {
    const xb = b.wx(hookU, hookZ), xs = b.wx(-hookU, hookZ);
    return { Tb: W() * (b.x - xs) / (xb - xs), Ts: W() * (xb - b.x) / (xb - xs) };
  };
  S.statics = statics;
  S.step = (dt) => {
    const t = S.t;
    // script: hang (0-8 s); lower forward fall faster (8-16); hold (16-26);
    // passengers move aft (26-30); hold (30-40); lower both to the sea (40+)
    if (t < 8) { S.phase = 'Hanging level'; falls[0].rate = 0; falls[1].rate = 0; }
    else if (t < 16) { S.phase = 'Forward fall paid out faster'; falls[0].rate = 0.12; falls[1].rate = 0.04; }
    else if (t < 26) { S.phase = 'Holding (uneven)'; falls[0].rate = 0; falls[1].rate = 0; }
    else if (t < 30) { S.phase = 'Passengers crowd aft'; for (const p of people) p.u = p.u0 + (-1.6 - 0) * Math.min(1, (t - 26) / 4) * (p.u0 > -2 ? 1 : 0.3); b.massProps(); }
    else if (t < 40) { S.phase = 'Holding'; falls[0].rate = 0; falls[1].rate = 0; }
    else { S.phase = 'Lowering to the sea'; falls[0].rate = 0.45; falls[1].rate = 0.45; }
    b.forces(env);
    for (const f of falls) f.step(dt, t, S.events);
    b.integrate(dt, env);
    S.t += dt;
    if (t > 15.9 && t <= 15.9 + dt) { const s = statics(); S.rec.uneven = { Tb: falls[0].T * falls[0].parts, Ts: falls[1].T * falls[1].parts, TbS: s.Tb, TsS: s.Ts, ang: b.ang }; }
    if (t > 25.9 && t <= 25.9 + dt) { const s = statics(); S.rec.hold = { Tb: falls[0].T * falls[0].parts, Ts: falls[1].T * falls[1].parts, TbS: s.Tb, TsS: s.Ts, ang: b.ang }; }
    if (t > 39.9 && t <= 39.9 + dt) { const s = statics(); S.rec.aft = { Tb: falls[0].T * falls[0].parts, Ts: falls[1].T * falls[1].parts, TbS: s.Tb, TsS: s.Ts }; }
    if (t > 7.9 && t <= 7.9 + dt) S.rec.level = { Tb: falls[0].T * falls[0].parts, Ts: falls[1].T * falls[1].parts, W: W() };
    if (S.series.length === 0 || S.t - S.series[S.series.length - 1][0] >= 0.1) S.series.push([S.t, falls[0].T, falls[1].T, b.ang, b.z]);
  };
  S.checks = () => {
    const out = [];
    const r = S.rec, kN = (x) => (x / 1e3).toFixed(1);
    if (r.level) out.push(check('Hanging level: falls share the weight equally (kN)', Math.abs(r.level.Tb - r.level.Ts) / r.level.W < 0.02 && Math.abs(r.level.Tb + r.level.Ts - r.level.W) / r.level.W < 0.02, `${kN(r.level.Tb)} + ${kN(r.level.Ts)}`, `${kN(r.level.W)} total, equal`));
    if (r.hold) {
      out.push(check('Uneven lowering tilts the boat (deg)', r.hold.ang < -0.5 * Math.PI / 180, (-r.hold.ang * 180 / Math.PI).toFixed(2) + ' bow down', '> 0.5°'));
      out.push(check('Tilted: fall loads match statics (kN)', rel(r.hold.Tb, r.hold.TbS) < 0.03 && rel(r.hold.Ts, r.hold.TsS) < 0.03, `${kN(r.hold.Tb)} / ${kN(r.hold.Ts)}`, `${kN(r.hold.TbS)} / ${kN(r.hold.TsS)} \u00b13%`));
    }
    if (r.aft) out.push(check('Passengers move aft: load shifts to the after fall (kN)', rel(r.aft.Tb, r.aft.TbS) < 0.03 && rel(r.aft.Ts, r.aft.TsS) < 0.03 && r.aft.Ts > r.aft.Tb, `${kN(r.aft.Tb)} / ${kN(r.aft.Ts)}`, `${kN(r.aft.TbS)} / ${kN(r.aft.TsS)} ±3%`));
    if (S.t > 75) {
      // afloat: falls slack, draught from hydrostatics
      const W = b.m * G;
      const slack = S.falls.every(f => f.T * f.parts < 0.01 * W);
      out.push(check('Afloat: falls go slack (tension-only rope)', slack, S.falls.map(f => kN(f.T * f.parts)).join(' / ') + ' kN', '< 1 % of weight'));
      // hydrostatic draught for this mass, solved independently
      const cells = b.cells;
      let lo = 0, hi = boat.D;
      for (let it = 0; it < 60; it++) { const d = (lo + hi) / 2; let V = 0; for (const c of cells) V += c[2] * Math.max(0, Math.min(1, (d - c[1]) / env.cell + 0.5)); if (V * env.rho > b.m) hi = d; else lo = d; }
      const dEq = (lo + hi) / 2;
      // engine draught: depth of the keel midships below the sea
      const keel = -b.wz(0, 0);
      out.push(check('Afloat: draught matches hydrostatics (m)', Math.abs(keel - dEq) < 0.03, keel.toFixed(3), `${dEq.toFixed(3)} ±0.03`, `freeboard ${(boat.D - keel).toFixed(2)} m with ${S.people.length} aboard`));
      const st = boatStability(boat, b.m, b.c[1], dEq);
      const heel = Math.atan(10 * v('lifeboat_30ft.person_mass') * 0.8 / (b.m * st.GM)) * 180 / Math.PI;
      out.push(check('Transverse stability positive (GM, m)', st.GM > 0, st.GM.toFixed(2), '> 0', `10 people moving 0.8 m to one side heel her ${heel.toFixed(1)}°`));
    }
    return out;
  };
  return S;
}
function rel(a, b) { return Math.abs(a - b) / Math.max(1e-9, Math.abs(b)); }

// ------------------------------------------------------------ 6. frame-rate independence & convergence
// A combined scenario (connected tanks + door + boat on its falls) run through
// the fixed-step clock under very different rendering frame sequences.
function combined(dt) {
  const T = connectedTanks(), D = doorDemo('b'), B = boatDemo();
  return { step: (h) => { T.step(h); D.step(h); B.step(h); }, state: () => [...T.net.stateVector(), ...D.net.stateVector(), D.door.theta, B.b.x, B.b.z, B.b.ang, B.b.vx, B.b.vz, B.b.w], T, D, B };
}
export function frameRateTest(simTime = 20, dt = 1 / 240) {
  const runs = [];
  const seqs = [
    ['24 fps', () => 1 / 24], ['60 fps', () => 1 / 60], ['144 fps', () => 1 / 144],
    ['jittery 15-120 fps', (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return 1 / (15 + (s % 106)); }; })()],
  ];
  for (const [label, next] of seqs) {
    const sim = combined(dt), clock = new FixedClock(dt);
    let frames = 0;
    while (clock.steps < Math.round(simTime / dt)) {
      const remaining = Math.round(simTime / dt) - clock.steps;
      const f = Math.min(next(), remaining * dt + 1e-12);
      clock.advance(f, sim.step); frames++;
    }
    runs.push({ label, frames, steps: clock.steps, hash: hashDoubles(sim.state()), state: sim.state() });
  }
  return runs;
}
export function convergenceTest(simTime = 12) {
  // maximum deviation from a fine-step reference over the whole run (sampled
  // every 0.1 s) - a single instant can mislead for oscillating systems
  const dts = [1 / 60, 1 / 120, 1 / 240, 1 / 480];
  const pick = (s) => [s.T.net.nodes[0].h, s.D.net.nodes[0].h, s.B.b.z, s.B.b.ang];
  const traj = (dt) => {
    const s = combined(dt), out = [], per = Math.round(0.1 / dt);
    for (let i = 1; i <= Math.round(simTime / dt); i++) { s.step(dt); if (i % per === 0) out.push(pick(s)); }
    return out;
  };
  const R = traj(1 / 960);
  return dts.map(dt => {
    const P = traj(dt);
    const m = [0, 0, 0, 0];
    for (let i = 0; i < Math.min(P.length, R.length); i++) for (let k = 0; k < 4; k++) m[k] = Math.max(m[k], Math.abs(P[i][k] - R[i][k]));
    return { dt, errTankLevel: m[0], errDoorRoom: m[1], errBoatZ: m[2], errBoatAng: m[3] };
  });
}
export function repeatabilityTest(simTime = 10, dt = 1 / 240) {
  const h = () => { const s = combined(dt); for (let i = 0; i < Math.round(simTime / dt); i++) s.step(dt); return hashDoubles(s.state()); };
  return [h(), h()];
}

// ------------------------------------------------------------ extras
// 12. detachment velocity: a fitting released from a rotating, moving deck
export function detachmentTest() {
  const w = 0.05, vx = 0.3, vz = -0.4, r = [30, 12];      // deck rotating at 0.05 rad/s about a moving origin
  const vExpected = [vx - w * r[1], vz + w * r[0]];
  // the fitting's motion while attached, differentiated numerically
  const pos = (t) => { const a = w * t; return [vx * t + Math.cos(a) * r[0] - Math.sin(a) * r[1], vz * t + Math.sin(a) * r[0] + Math.cos(a) * r[1]]; };
  const h = 1e-5, p0 = pos(0), p1 = pos(h);
  const vNum = [(p1[0] - p0[0]) / h, (p1[1] - p0[1]) / h];
  return [check('Released object keeps the deck’s motion incl. rotation (m/s)', Math.hypot(vNum[0] - vExpected[0], vNum[1] - vExpected[1]) < 1e-3, `(${vNum[0].toFixed(3)}, ${vNum[1].toFixed(3)})`, `(${vExpected[0].toFixed(3)}, ${vExpected[1].toFixed(3)})`, 'v = v_origin + ω × r')];
}
// 21. glass: failure pressure from plate bending (Roark), pane size and thickness
export function glassFailurePressure({ shape, r, a, b, t }) {
  const s = v('glass.plate_glass_strength'), nu = 0.22;
  if (shape === 'circle') return 8 * s * t * t / (3 * (3 + nu) * r * r);          // simply supported circular plate
  const ratio = Math.max(a, b) / Math.min(a, b);
  const beta = 0.2874 + (0.4872 - 0.2874) * Math.min(1, (ratio - 1) / 1);     // Roark table 11.4 (simply supported)
  return s * t * t / (beta * Math.min(a, b) ** 2);
}
export function glassTest() {
  const port = glassFailurePressure({ shape: 'circle', r: v('glass.porthole_diameter') / 2, t: v('glass.porthole_glass_thickness') });
  const [wa, wb] = v('glass.window_size');
  const win = glassFailurePressure({ shape: 'rect', a: wa, b: wb, t: v('glass.window_glass_thickness') });
  const head = (p) => p / (1025 * G);
  return [
    check('Porthole (16 in, 1 in glass) bursts at (kPa)', port > win, (port / 1e3).toFixed(0), 'stronger than a window', `≈ ${head(port).toFixed(0)} m of water`),
    check('B-deck window (1.0 × 0.9 m, 3/8 in) bursts at (kPa)', win > 0, (win / 1e3).toFixed(1), '', `≈ ${head(win).toFixed(1)} m of water`),
  ];
}
// 28. mass ledger: displacement is a mass; gross tonnage is a volume
export function ledgerTest() {
  const L = TITANIC_LEDGER;
  const sum = L.items.reduce((s, i) => s + i.value, 0);
  const disp = L.displacement_night.value;
  return [
    check('Ledger items sum to the displacement on the night (long tons)', Math.abs(sum - disp) / disp < 0.01, sum.toLocaleString('en-GB'), `${disp.toLocaleString('en-GB')} ±1%`, `design load displacement ${L.displacement_load.value.toLocaleString('en-GB')} t at 34 ft 7 in`),
    check('Gross tonnage kept as a volume, not a mass', /VOLUME/.test(L.gross_register_tonnage.unit), `${L.gross_register_tonnage.value.toLocaleString('en-GB')} GRT = ${(L.gross_register_tonnage.value * 2.832).toLocaleString('en-GB', { maximumFractionDigits: 0 })} m³`, 'not added to masses'),
  ];
}
