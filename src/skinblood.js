// Blood on the skin. Bleeding first wells up into a glossy bead at the hole, then pools (a real puddle only where the
// skin faces up) and overflows into rivulets that run downhill over the actual body surface: they follow the curves of
// the skin, meander, branch when the flow is heavy, start a new course when the body changes position, drip off where
// the skin turns to face the floor, soak in where they reach the shorts, and dry from glossy red to matte red-brown.
(function () {
  const G = (window.GSW = window.GSW || {});
  G.skinBlood = (body) => {
    const hm = body.human; if (!hm) return;
    const geo = hm.geometry, P = geo.attributes.position.array, ia = geo.index.array, SI = geo.attributes.skinIndex.array, SW = geo.attributes.skinWeight.array;
    const V3 = THREE.Vector3, nb = body.list.length;

    // spatial hash of the triangles (rest pose) so the surface near a point is found without scanning the whole mesh
    const C = 0.03, cells = new Map(), key = (x, y, z) => (x + 64) + (y + 16) * 128 + (z + 64) * 16384, cl = (v) => Math.floor(v / C);
    for (let t = 0; t < ia.length; t += 3) {
      let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
      for (let k = 0; k < 3; k++) { const i = ia[t + k] * 3; x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]); }
      for (let x = cl(x0 - 0.004); x <= cl(x1 + 0.004); x++) for (let y = cl(y0 - 0.004); y <= cl(y1 + 0.004); y++) for (let z = cl(z0 - 0.004); z <= cl(z1 + 0.004); z++) {
        const k = key(x, y, z); let l = cells.get(k); if (!l) cells.set(k, (l = [])); l.push(t);
      }
    }
    const seen = new Uint32Array(ia.length / 3); let stamp = 1;
    const e1 = new V3(), e2 = new V3(), pv = new V3(), tv = new V3(), qv = new V3(), a = new V3(), hit = { t: 0, tri: 0, u: 0, w: 0 };
    function cast(o, d, maxT) {
      stamp++; let best = maxT, bt = -1, bu = 0, bw = 0;
      for (let s = 0; s <= 3; s++) {
        const f = (maxT * s) / 3, l = cells.get(key(cl(o.x + d.x * f), cl(o.y + d.y * f), cl(o.z + d.z * f))); if (!l) continue;
        for (const t of l) {
          const ti = t / 3; if (seen[ti] === stamp) continue; seen[ti] = stamp;
          a.fromArray(P, ia[t] * 3); e1.fromArray(P, ia[t + 1] * 3).sub(a); e2.fromArray(P, ia[t + 2] * 3).sub(a);
          pv.crossVectors(d, e2); const det = e1.dot(pv); if (Math.abs(det) < 1e-12) continue;
          const inv = 1 / det; tv.subVectors(o, a); const u = tv.dot(pv) * inv; if (u < 0 || u > 1) continue;
          qv.crossVectors(tv, e1); const w = d.dot(qv) * inv; if (w < 0 || u + w > 1) continue;
          const tt = e2.dot(qv) * inv; if (tt > 0 && tt < best) { best = tt; bt = t; bu = u; bw = w; }
        }
      }
      if (bt < 0) return false; hit.t = best; hit.tri = bt; hit.u = bu; hit.w = bw; return true;
    }
    // point and smooth normal of the skin along a ray; returns the nearest mesh vertex (for its skin weights) or -1
    function surface(o, d, maxT, outP, outN) {
      if (!cast(o, d, maxT)) return -1;
      const N = geo.attributes.normal.array, i0 = ia[hit.tri], i1 = ia[hit.tri + 1], i2 = ia[hit.tri + 2], b0 = 1 - hit.u - hit.w;
      outP.copy(o).addScaledVector(d, hit.t);
      outN.set(N[i0 * 3] * b0 + N[i1 * 3] * hit.u + N[i2 * 3] * hit.w, N[i0 * 3 + 1] * b0 + N[i1 * 3 + 1] * hit.u + N[i2 * 3 + 1] * hit.w, N[i0 * 3 + 2] * b0 + N[i1 * 3 + 2] * hit.u + N[i2 * 3 + 2] * hit.w).normalize();
      if (outN.dot(d) > 0) outN.negate();
      // skin weights blended across the triangle, so a trail bends smoothly with the joints instead of in steps
      const acc = new Map();
      for (const [vi, f] of [[i0, b0], [i1, hit.u], [i2, hit.w]]) for (let k = 0; k < 4; k++) { const wt = SW[vi * 4 + k] * f; if (wt > 0) acc.set(SI[vi * 4 + k], (acc.get(SI[vi * 4 + k]) || 0) + wt); }
      const top = [...acc].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = top.reduce((t, x) => t + x[1], 0) || 1;
      lastSkin = { i: [0, 0, 0, 0], w: [0, 0, 0, 0], b: top.length ? top[0][0] : 0 };
      top.forEach((x, k) => { lastSkin.i[k] = x[0]; lastSkin.w[k] = x[1] / sum; });
      return b0 >= hit.u && b0 >= hit.w ? i0 : hit.u >= hit.w ? i1 : i2;
    }
    let lastSkin = null;
    const domBone = () => lastSkin.b;
    const armRe = /^(uarm|farm|hand)/, fabric = (p, b) => p.y > 0.745 && p.y < 1.025 && !armRe.test(body.list[b].name);

    // gravity expressed in each bone's rest frame (the frame the mesh and the rivulets live in)
    const grav = [...Array(nb)].map(() => new V3()), qq = new THREE.Quaternion();
    const updGrav = () => { for (let b = 0; b < nb; b++) { qq.setFromRotationMatrix(body.list[b].g.matrixWorld).invert(); grav[b].set(0, -1, 0).applyQuaternion(qq); } };

    // ---- rivulets: ribbons laid on the skin, skinned to the same skeleton so they bend with the body
    const MAX = 90, STEP = 0.004, COST = 0.02; // a running film takes about 0.005 mL per mm of trail (bead and wetting included)
    const IDX = new Uint16Array((MAX - 1) * 6); for (let i = 0; i < MAX - 1; i++) { const v = i * 2; IDX.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6); }
    const FRESH = new THREE.Color(0x420406), DRY = new THREE.Color(0x220805);
    const dryMat = (m, since) => { const k = Math.min(1, Math.max(0, (since - 15) / 260)); if (Math.abs(k - (m.userData.k || 0)) < 0.01) return; m.userData.k = k; m.color.copy(FRESH).lerp(DRY, k); m.roughness = 0.14 + 0.62 * k; };
    body.rivers = [];
    const dv = new V3(), side = new V3();
    function writePair(R, i) {
      const pt = R.pts[i], prev = R.pts[Math.max(0, i - 1)], next = R.pts[Math.min(R.n - 1, i + 1)];
      dv.subVectors(next.p, prev.p); if (dv.lengthSq() < 1e-10) dv.copy(R.dir.lengthSq() ? R.dir : side.set(0, -1, 0));
      side.crossVectors(pt.n, dv).normalize();
      const head = i === R.n - 1 && R.n > 2 && R.end !== 'soak', hw = pt.wd * 0.5 * (head ? 1.7 : i === 0 ? 0.7 : 1), lift = 0.0011 + (head ? 0.0004 : 0);
      const o = i * 6;
      R.pos[o] = pt.p.x + side.x * hw + pt.n.x * lift; R.pos[o + 1] = pt.p.y + side.y * hw + pt.n.y * lift; R.pos[o + 2] = pt.p.z + side.z * hw + pt.n.z * lift;
      R.pos[o + 3] = pt.p.x - side.x * hw + pt.n.x * lift; R.pos[o + 4] = pt.p.y - side.y * hw + pt.n.y * lift; R.pos[o + 5] = pt.p.z - side.z * hw + pt.n.z * lift;
      for (let k = 0; k < 3; k++) { R.nrm[o + k] = R.nrm[o + 3 + k] = pt.n.getComponent(k); }
      for (let k = 0; k < 4; k++) { R.si[i * 8 + k] = R.si[i * 8 + 4 + k] = pt.sk.i[k]; R.sw[i * 8 + k] = R.sw[i * 8 + 4 + k] = pt.sk.w[k]; }
    }
    function addPoint(R, p, n, v, b) {
      const flow = (R.w.rate || 0) / 60, target = 0.0032 + 0.0034 * Math.min(1, flow / 0.6);
      R.wid += (target - R.wid) * 0.25; R.wid *= 0.94 + Math.random() * 0.12;
      R.pts.push({ p: p.clone(), n: n.clone(), v, b, sk: lastSkin, wd: R.wid }); R.n++;
      for (let i = Math.max(0, R.n - 3); i < R.n; i++) writePair(R, i);
      const at = R.g.attributes; at.position.needsUpdate = at.normal.needsUpdate = at.skinIndex.needsUpdate = at.skinWeight.needsUpdate = true;
      R.g.setDrawRange(0, Math.max(0, R.n - 1) * 6);
    }
    function newRiver(w, p, n, v, b, tg) {
      const g = new THREE.BufferGeometry(), pos = new Float32Array(MAX * 6), nrm = new Float32Array(MAX * 6), si = new Uint16Array(MAX * 8), sw = new Float32Array(MAX * 8);
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      g.setIndex(new THREE.BufferAttribute(IDX, 1)); g.setDrawRange(0, 0);
      const mat = new THREE.MeshStandardMaterial({ color: FRESH, roughness: 0.14, metalness: 0, skinning: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      const mesh = new THREE.SkinnedMesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 4; mesh.bind(hm.skeleton, hm.bindMatrix); hm.parent.add(mesh); mesh.visible = !body.xray;
      const R = { w, mesh, g, pos, nrm, si, sw, pts: [], n: 0, end: null, live: true, vol: 0, adv: 0, fed: body.bt, dir: new V3(), g0: tg.clone(), ph: Math.random() * 6.3, seed: Math.random() * 6.3, wid: 0.0032, sk: null };
      addPoint(R, p, n, v, b);
      body.rivers.push(R); w.rivers.push(R);
      return R;
    }
    const o = new V3(), dn = new V3(), np = new V3(), nn = new V3(), tg = new V3(), dirv = new V3();
    function step(R) {
      const L = R.pts[R.n - 1], gb = grav[L.b], down = gb.dot(L.n);
      if (down > 0.7) { R.end = 'drip'; return false; } // the skin faces the floor here: a drop gathers and falls
      tg.copy(gb).addScaledVector(L.n, -down); const tl = tg.length();
      if (tl > 0.1) tg.divideScalar(tl); else if (R.dir.lengthSq()) tg.copy(R.dir); else { tg.set(1, 0, 0).addScaledVector(L.n, -L.n.x).normalize(); } // flat: it keeps spreading the way it was going
      R.ph += 0.22 + Math.random() * 0.25;
      side.crossVectors(L.n, tg);
      dirv.copy(tg).addScaledVector(side, 0.32 * Math.sin(R.ph + R.seed) + (Math.random() - 0.5) * 0.12);
      if (R.n > 1) dirv.addScaledVector(R.dir, 1.4); // a little inertia: rivulets curve, they don't zigzag
      dirv.addScaledVector(L.n, -dirv.dot(L.n)).normalize();
      if (dirv.dot(tg) < 0.25) dirv.addScaledVector(tg, 0.6).normalize(); // never uphill
      o.copy(L.p).addScaledVector(dirv, STEP).addScaledVector(L.n, 0.012); dn.copy(L.n).negate();
      const v = surface(o, dn, 0.03, np, nn);
      if (v < 0 || nn.dot(L.n) < 0.2) { R.end = 'drip'; return false; } // ran over an edge
      R.dir.copy(dirv);
      const b = domBone(v);
      if (fabric(np, b)) { addPoint(R, np, nn, v, b); R.end = 'soak'; R.sk = { c: np.clone(), n: nn.clone(), ml: 0, soakR: 0, soak: null }; writePair(R, R.n - 1); return false; }
      addPoint(R, np, nn, v, b);
      return true;
    }
    function grow(R, dt) {
      if (R.end === 'soak') {
        // the shorts wick it up; once the cotton is saturated it drips from there
        if (R.vol > 0) { R.sk.ml += R.vol; R.vol = 0; const r = Math.min(0.09, 0.008 + Math.sqrt(R.sk.ml) * 0.0075); if (r - R.sk.soakR > 0.004) { R.sk.soakR = r; body.paintSoak(R.sk, r); } }
        return;
      }
      if (R.end === 'drip') { R.vol = Math.min(R.vol, 0.05); return; }
      const flow = (R.w.rate || 0) / 60, speed = 0.008 + Math.min(0.05, flow * 0.04); // a trickle creeps; a stream runs
      R.adv = Math.min(R.adv + speed * dt, STEP * 4);
      while (R.adv >= STEP && R.vol >= COST && R.n < MAX) { R.adv -= STEP; R.vol -= COST; if (!step(R)) break; }
      if (R.n >= MAX && !R.end) R.end = 'drip';
    }
    const wp = new V3(), tgN = new V3(), sv = new V3(), qi = new THREE.Quaternion();
    body.bloodTick = (dt, alive) => {
      if (!(dt > 0)) return;
      body.bt += dt;
      if (!body.wounds.length) return;
      updGrav();
      for (const w of body.wounds) {
        const age = body.bt - w.t0;
        // contusion around the entry deepens over minutes, but only while blood still circulates
        if (w.bruise && alive) w.bruise.material.opacity = Math.max(w.bruise.material.opacity, Math.min(0.6, 0.12 + (age / 600) * 0.48));
        if (w.cloth) continue;
        if (w.bi == null) w.bi = body.list.indexOf(w.seg);
        const f = w.feed; w.feed = 0;
        const flow = (w.rate || 0) / 60, gW = grav[w.bi], down = gW.dot(w.n);
        tgN.copy(gW).addScaledVector(w.n, -down); const tilt = tgN.length(); if (tilt > 1e-4) tgN.divideScalar(tilt);
        w.down = down;
        // a bead first; a puddle only where the skin faces up (it runs off a slope, and falls off skin that faces down)
        const cap = down > 0.45 ? 0.03 : 0.07 + 0.9 * Math.pow(Math.max(0, 1 - tilt / 0.55), 2) * Math.min(1, -down * 2 + 0.2);
        if (f > 0) { w.pool += f; w.fed = body.bt; }
        let over = Math.max(0, w.pool - cap); w.pool -= over;
        if (w.pool > 0) {
          const r = Math.min(0.04, w.base * 0.45 + Math.sqrt(w.pool) * (tilt > 0.4 ? 0.011 : 0.02)), sl = Math.min(1, tilt * 1.4);
          // on a slope the blood hangs as a bead under the hole; where the skin faces up it spreads round it
          w.stain.scale.set(r * (1 - 0.25 * sl), r * (1 + 0.2 * sl), 1);
          sv.copy(tgN).applyQuaternion(qi.copy(w.g.quaternion).invert()); w.stain.rotation.z = Math.atan2(sv.y, sv.x) + Math.PI / 2;
          w.stain.position.x = sv.x * r * 0.7 * sl; w.stain.position.y = sv.y * r * 0.7 * sl;
        }
        dryMat(w.stain.material, body.bt - (w.fed == null ? body.bt : w.fed));
        w.over = over;
        if (over <= 0 || down > 0.45) continue; // facing down: the main loop drips it straight from the hole
        if (flow > 2.3) over *= 0.25; // an arterial jet throws most of its blood clear of the skin
        let live = w.rivers.filter((R) => R.live);
        // the body moved: the old course stops being fed and dries where it is; a new one starts downhill
        for (const R of live) if (tilt > 0.15 && R.g0.dot(tgN) < 0.7) R.live = false;
        live = w.rivers.filter((R) => R.live);
        if ((!live.length && w.rivers.length < 24) || (flow > 0.9 && live.length < 3 && Math.random() < dt * 0.35)) {
          const r = w.stain.scale.x * 0.85;
          wp.copy(w.g.position).add(w.seg.origin).addScaledVector(tgN, tilt > 0.1 ? r : 0).addScaledVector(w.n, 0.012); dn.copy(w.n).negate();
          const v = surface(wp, dn, 0.03, np, nn);
          if (v >= 0) { live.push(newRiver(w, np, nn, v, domBone(v), tilt > 0.1 ? tgN : nn)); if (live.length > 1) live[live.length - 1].seed += 2; }
        }
        if (live.length) for (const R of live) { R.vol += over / live.length; R.fed = body.bt; }
      }
      for (const R of body.rivers) { if (R.live) grow(R, dt); dryMat(R.mesh.material, body.bt - R.fed); }
    };
    // while the blood is still running down the skin nothing reaches the floor yet
    body.holdDrops = (w) => {
      if (w.cloth || w.down == null || w.down > 0.45) return false;
      const live = w.rivers.filter((R) => R.live);
      if (!live.length) return !(w.over > 0); // the bead is still filling
      return !live.some((R) => R.end === 'drip' || (R.end === 'soak' && R.sk.ml > 25));
    };
    // where the drops fall from: the end of a rivulet that has reached an edge, or a saturated patch of fabric
    body.dripPoint = (w, out) => {
      for (const R of w.rivers) {
        if (!R.live) continue;
        let p, b;
        if (R.end === 'drip') { const L = R.pts[R.n - 1]; p = L.p; b = L.b; }
        else if (R.end === 'soak' && R.sk.ml > 25) { p = R.sk.c; b = R.pts[R.n - 1].b; }
        else continue;
        const s = body.list[b]; out.copy(p).sub(s.origin).applyMatrix4(s.g.matrixWorld); return true;
      }
      return false;
    };
    body.clearBlood = () => {
      for (const R of body.rivers) { R.mesh.parent.remove(R.mesh); R.g.dispose(); R.mesh.material.dispose(); if (R.sk && R.sk.soak) { R.sk.soak.parent.remove(R.sk.soak); R.sk.soak.geometry.dispose(); } }
      body.rivers.length = 0; body.bt = 0;
    };
  };
})();
