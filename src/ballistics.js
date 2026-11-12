// Terminal ballistics. A projectile is marched through tissue in 1 mm steps:
//   F = 1/2 * rho * Cd * A * v^2  (inertial drag)  +  sigma * A  (tissue strength)
// Expansion (JHP / soft point), yaw + tumbling (spitzer FMJ), fragmentation and bone
// deformation change the presented area A along the track. The energy lost per cm
// sets the temporary-cavity radius; the presented area sets the permanent cavity.
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const G = (root.GSW = root.GSW || {});

  // rho kg/m3, sig Pa, prio = which structure wins where volumes overlap,
  // frag = vulnerability to temporary-cavity stretch (0 elastic .. 1 friable)
  G.TISSUE = {
    soft: { rho: 1050, sig: 1.0e6, prio: 1, frag: 0 },
    lung: { rho: 320, sig: 0.15e6, prio: 3, frag: 0.08 },
    hollow: { rho: 900, sig: 0.5e6, prio: 3, frag: 0.25 },
    organ: { rho: 1060, sig: 0.6e6, prio: 4, frag: 1 },
    brain: { rho: 1040, sig: 0.15e6, prio: 4, frag: 1 },
    heart: { rho: 1060, sig: 1.0e6, prio: 5, frag: 0.5 },
    vessel: { rho: 1050, sig: 1.0e6, prio: 6, frag: 0 },
    cartilage: { rho: 1100, sig: 8e6, prio: 7, frag: 0, bone: true },
    cancellous: { rho: 1300, sig: 35e6, prio: 8, frag: 0, bone: true },
    bone: { rho: 1900, sig: 110e6, prio: 8, frag: 0, bone: true },
    cord: { rho: 1040, sig: 0.3e6, prio: 9, frag: 0.7 },
  };
  const SKIN_J_M2 = 2.0e5; // ~20 J/cm^2 to perforate skin

  // world: { sample(p, margin, out), cavity(p, rtc, ds, map), maxDist }
  G.simulate = function (b, o, d, world, rand) {
    rand = rand || Math.random;
    const out = { inBody: false, seg: null, prim: null, sdf: 0 };
    const p = { x: o.x, y: o.y, z: o.z }, dir = { x: d.x, y: d.y, z: d.z };
    let m = b.m, E = 0.5 * m * b.v * b.v, v = b.v;
    const A0 = (Math.PI / 4) * b.d * b.d;
    let kBone = 1, e = 0, soft = 0, yawOn = b.yawOn == null ? Infinity : b.yawOn * (0.8 + 0.4 * rand());
    let fragmented = false, shed = false, extraLeft = 0, extraTot = 0, extraLen = 0.09, fragR = 0;
    let inside = false, ever = false, gap = 0, wasBone = false, t = 0, stepN = 0, rpc = b.d / 2;
    const res = {
      bullet: b, E0: E, hits: new Map(), softSeg: new Map(), cav: new Map(), marks: [], track: [], order: [],
      depth: 0, stopped: false, exited: false, noPen: false, expanded: false, fragmented: false, yawed: false,
      vExit: 0, endPoint: null, endDir: null, Edep: 0, hitBody: false, t: 0,
    };
    const maxD = world.maxDist || 30;
    const adv = (s) => { p.x += dir.x * s; p.y += dir.y * s; p.z += dir.z * s; t += s; };
    while (t < maxD) {
      const ds = inside ? 0.001 : 0.006;
      adv(ds);
      world.sample(p, rpc * 0.7, out);
      if (!inside) {
        if (!out.inBody) { if (ever) { gap += ds; if (gap > 1.2) break; } continue; }
        // refine the entry point by bisection
        let lo = 0, hi = ds; // distance to step back: lo is inside, hi is outside
        const q = { x: 0, y: 0, z: 0 };
        for (let i = 0; i < 6; i++) {
          const mid = (lo + hi) / 2;
          q.x = p.x - dir.x * mid; q.y = p.y - dir.y * mid; q.z = p.z - dir.z * mid;
          world.sample(q, 0, out);
          if (out.inBody) lo = mid; else hi = mid;
        }
        adv(-lo); world.sample(p, 0, out);
        const need = SKIN_J_M2 * A0;
        if (E < need) { res.noPen = true; res.marks.push({ type: 'graze', p: { ...p }, seg: out.seg, r: b.d / 2 }); break; }
        E -= need; v = Math.sqrt((2 * E) / m);
        res.marks.push({ type: 'entry', p: { ...p }, seg: out.seg, r: b.d / 2, dir: { ...dir } });
        inside = ever = true; res.hitBody = true; gap = 0; wasBone = false;
        continue;
      }
      if (!out.inBody) {
        // leaving the body: skin is tough to exit
        const A = Math.PI * rpc * rpc, need = SKIN_J_M2 * Math.min(A, A0 * 6);
        if (E < need) { adv(-0.004); res.stopped = true; res.underSkin = true; break; }
        E -= need; v = Math.sqrt((2 * E) / m);
        res.marks.push({ type: 'exit', p: { ...p }, seg: res._lastSeg, r: Math.min(0.03, rpc * (fragmented ? 1.6 : 1.25)), dir: { ...dir }, v });
        inside = false; gap = 0;
        continue;
      }
      // ---- in tissue
      res._lastSeg = out.seg;
      const prim = out.prim, tis = G.TISSUE[prim ? prim.tissue : 'soft'], isBone = !!tis.bone;
      if (isBone && !wasBone) {
        if (kBone === 1) kBone = b.boneDeform || 1.1;
        if (b.yawOn != null) yawOn = Math.min(yawOn, soft + 0.004);
        const ang = 0.1 * Math.min(1, 350 / E) * (tis === G.TISSUE.bone ? 1 : 0.4);
        dir.x += (rand() - 0.5) * 2 * ang; dir.y += (rand() - 0.5) * 2 * ang; dir.z += (rand() - 0.5) * 2 * ang;
        const n = Math.hypot(dir.x, dir.y, dir.z); dir.x /= n; dir.y /= n; dir.z /= n;
      }
      wasBone = isBone;
      if (!isBone) soft += ds;
      if (b.expMax && !isBone && e < 1 && v > b.vExp) { e = Math.min(1, e + ds / (b.expLen || 0.03)); if (e > 0.5) res.expanded = true; }
      const kd = Math.max(kBone, 1 + ((b.expMax || 1) - 1) * e);
      let A = A0 * kd * kd, Cd = b.cd, y = 0;
      const ph = (soft - yawOn) / (b.yawLen || 0.08);
      if (ph > 0) {
        const s = Math.sin((Math.PI / 2) * Math.min(ph, 2)); y = s * s; if (y > 0.5) res.yawed = true;
        // past the first tumble the bullet travels base-first / deformed and never regains a clean nose-on attitude
        if (ph > 1) y = Math.max(y, fragmented ? 0.75 : b.yawRest == null ? 0.3 : b.yawRest);
      }
      if (y > 0) { const As = Math.max(A, b.len * b.d); A += (As - A) * y; Cd += ((b.cdYaw || 0.5) - Cd) * y; }
      if (b.vFrag && !fragmented && y > 0.6 && v > b.vFrag) {
        fragmented = res.fragmented = true; extraTot = (1 - b.retain) * E; m *= b.retain; E -= extraTot; extraLeft = extraLen = 0.09; fragR = b.fragR || 0.03;
      }
      if (b.expMax && b.retain && !b.vFrag && !shed && e >= 1) {
        shed = true; extraTot = (1 - b.retain) * E; m *= b.retain; E -= extraTot; extraLeft = extraLen = 0.06; fragR = b.fragR || 0.01;
      }
      const F = (isBone ? 0.3 : 1) * 0.5 * tis.rho * Cd * A * v * v + tis.sig * A;
      const dE = Math.min(E, F * ds);
      let extra = 0;
      if (extraLeft > 0) { extra = (extraTot * ds) / extraLen; extraLeft -= ds; }
      E -= dE; v = Math.sqrt((2 * Math.max(E, 0)) / m);
      rpc = Math.sqrt(A / Math.PI) + (extraLeft > 0 ? fragR * Math.sin((Math.PI * extraLeft) / extraLen) : 0);
      const rtc = isBone ? 0 : 0.005 * Math.sqrt((dE + extra) / ds / 100);
      res.depth += ds; res.Edep += dE + extra;
      const vol = Math.PI * rpc * rpc * ds;
      if (prim) {
        let h = res.hits.get(prim);
        if (!h) { h = { prim, len: 0, E: 0, vol: 0, rpc: 0, dmin: 1, seg: out.seg, p: { ...p } }; res.hits.set(prim, h); res.order.push(prim); }
        h.len += ds; h.E += dE + extra; h.vol += vol; if (rpc > h.rpc) h.rpc = rpc; if (out.sdf < h.dmin) h.dmin = out.sdf;
      } else {
        let h = res.softSeg.get(out.seg);
        if (!h) { h = { seg: out.seg, len: 0, E: 0, vol: 0, rpc: 0, p: { ...p } }; res.softSeg.set(out.seg, h); }
        h.len += ds; h.E += dE + extra; h.vol += vol; if (rpc > h.rpc) h.rpc = rpc;
      }
      if (++stepN % 4 === 0) {
        if (rtc > 0.024 && world.cavity) world.cavity(p, rtc, 0.004, res.cav);
        if (stepN % 8 === 0) res.track.push({ x: p.x, y: p.y, z: p.z, rpc, rtc });
      }
      if (E <= 0.3) { res.stopped = true; break; }
    }
    delete res._lastSeg;
    res.exited = !res.stopped && !res.noPen && ever && !inside;
    res.vExit = res.stopped || res.noPen ? 0 : v;
    res.Eexit = res.stopped ? 0 : E;
    res.endPoint = { ...p }; res.endDir = { ...dir }; res.t = t;
    return res;
  };
})();
