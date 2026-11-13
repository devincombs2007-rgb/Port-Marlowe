// Builds the articulated body (skin, skeleton, organs) from ANATOMY and answers
// "what tissue is at this world point" for the ballistics march.
(function () {
  const G = (window.GSW = window.GSW || {});
  const V3 = THREE.Vector3;

  function merge(parts) {
    const pos = [], nor = [], col = [], idx = [];
    let off = 0;
    const c = new THREE.Color();
    for (const { geo, color } of parts) {
      const p = geo.attributes.position, n = geo.attributes.normal, gc = geo.attributes.color;
      c.set(color);
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i));
        if (gc) col.push(gc.getX(i), gc.getY(i), gc.getZ(i)); else col.push(c.r, c.g, c.b);
      }
      const ix = geo.index;
      for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
      off += p.count;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }

  // Catmull-Rom densify ring list so the mesh and the hit test share one smooth shape
  function densify(rings, sub) {
    const R = rings.slice().sort((a, b) => a[0] - b[0]), out = [];
    const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    for (let i = 0; i < R.length - 1; i++) {
      const a = R[Math.max(0, i - 1)], b = R[i], c = R[i + 1], d = R[Math.min(R.length - 1, i + 2)];
      for (let k = 0; k < sub; k++) {
        const t = k / sub, r = [b[0] + (c[0] - b[0]) * t];
        for (let j = 1; j < 5; j++) {
          let v = cr(a[j], b[j], c[j], d[j], t);
          if (j >= 3) v = Math.max(v, Math.min(b[j], c[j]) * 0.9);
          r.push(v);
        }
        out.push(r);
      }
    }
    out.push(R[R.length - 1].slice(0, 5));
    return out;
  }

  function loftGeo(Lf, origin) {
    const R = Lf.rings, N = Math.max(...R.map((r) => r[3])) > 0.1 ? 40 : 22, pos = [], col = [], idx = [], e = 2 / Lf.n, c = new THREE.Color();
    const put = (a, u, v, colr) => {
      if (Lf.axis === 'y') pos.push(u - origin.x, a - origin.y, v - origin.z); else pos.push(u - origin.x, v - origin.y, a - origin.z);
      col.push(colr.r, colr.g, colr.b);
    };
    for (let i = 0; i < R.length; i++) {
      const [a, cu, cv, ru, rv] = R[i];
      c.set(Lf.colorFn ? Lf.colorFn(a) : Lf.color);
      for (let j = 0; j < N; j++) {
        const t = (j / N) * Math.PI * 2, cs = Math.cos(t), sn = Math.sin(t);
        put(a, cu + ru * Math.sign(cs) * Math.abs(cs) ** e, cv + rv * Math.sign(sn) * Math.abs(sn) ** e, c);
      }
    }
    const flip = Lf.axis === 'z';
    const tri = (a, b, d) => (flip ? idx.push(a, d, b) : idx.push(a, b, d));
    for (let i = 0; i < R.length - 1; i++)
      for (let j = 0; j < N; j++) {
        const a = i * N + j, b = (i + 1) * N + j, a2 = i * N + ((j + 1) % N), b2 = (i + 1) * N + ((j + 1) % N);
        tri(a, b, a2); tri(a2, b, b2);
      }
    for (const end of [0, R.length - 1]) {
      const [a, cu, cv] = R[end], ci = pos.length / 3;
      c.set(Lf.colorFn ? Lf.colorFn(a) : Lf.color); put(a, cu, cv, c);
      for (let j = 0; j < N; j++) { const p = end * N + j, q = end * N + ((j + 1) % N); end === 0 ? tri(ci, p, q) : tri(ci, q, p); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function ellGeo(c, r, rot, origin, ws, hs) {
    const g = new THREE.SphereGeometry(1, ws || 14, hs || 10);
    const m = new THREE.Matrix4().compose(new V3(c[0] - origin.x, c[1] - origin.y, c[2] - origin.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new V3(r[0], r[1], r[2]));
    g.applyMatrix4(m);
    // non-uniform scale skews sphere normals: recompute
    g.computeVertexNormals();
    return g;
  }
  function capGeo(a, b, rad, origin) {
    const A = new V3(...a).sub(origin), B = new V3(...b).sub(origin), d = B.clone().sub(A), len = d.length(), out = [];
    const seg = rad < 0.008 ? 6 : 10;
    if (len > 1e-5) {
      const cy = new THREE.CylinderGeometry(rad, rad, len, seg, 1, true);
      cy.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize()), new V3(1, 1, 1)));
      out.push(cy);
    }
    for (const P of [A, B]) { const s = new THREE.SphereGeometry(rad, seg, 5); s.translate(P.x, P.y, P.z); out.push(s); }
    return out;
  }

  // ---- analytic shapes (rest frame)
  function sdEll(pr, x, y, z, r) {
    let qx = x - pr.c[0], qy = y - pr.c[1], qz = z - pr.c[2];
    const R = pr.R;
    if (R) { const a = qx * R[0] + qy * R[1] + qz * R[2], b = qx * R[3] + qy * R[4] + qz * R[5], c = qx * R[6] + qy * R[7] + qz * R[8]; qx = a; qy = b; qz = c; }
    const ax = qx / r[0], ay = qy / r[1], az = qz / r[2], k0 = Math.sqrt(ax * ax + ay * ay + az * az);
    if (k0 < 1e-5) return -Math.min(r[0], r[1], r[2]);
    const bx = ax / r[0], by = ay / r[1], bz = az / r[2];
    return (k0 * (k0 - 1)) / Math.sqrt(bx * bx + by * by + bz * bz);
  }
  function sdCap(pr, x, y, z) {
    const a = pr.a, ba = pr.ba, pax = x - a[0], pay = y - a[1], paz = z - a[2];
    let h = pr.baba > 0 ? (pax * ba[0] + pay * ba[1] + paz * ba[2]) / pr.baba : 0;
    h = h < 0 ? 0 : h > 1 ? 1 : h;
    const dx = pax - ba[0] * h, dy = pay - ba[1] * h, dz = paz - ba[2] * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - pr.rad;
  }
  function sdf(pr, x, y, z) {
    if (pr.type === 'cap') return sdCap(pr, x, y, z);
    if (pr.type === 'ell') return sdEll(pr, x, y, z, pr.r);
    return Math.max(sdEll(pr, x, y, z, pr.r), -sdEll(pr, x, y, z, pr.ri)); // shell
  }
  function inLoft(Lf, x, y, z) {
    let a, u, v;
    if (Lf.axis === 'y') { a = y; u = x; v = z; } else { a = z; u = x; v = y; }
    const R = Lf.rings, n = R.length;
    if (a < R[0][0] || a > R[n - 1][0]) return false;
    let i = 0;
    while (i < n - 2 && a > R[i + 1][0]) i++;
    const r0 = R[i], r1 = R[i + 1], f = (a - r0[0]) / (r1[0] - r0[0] || 1);
    const du = Math.abs(u - (r0[1] + (r1[1] - r0[1]) * f)) / (r0[3] + (r1[3] - r0[3]) * f);
    const dv = Math.abs(v - (r0[2] + (r1[2] - r0[2]) * f)) / (r0[4] + (r1[4] - r0[4]) * f);
    return du ** Lf.n + dv ** Lf.n <= 1;
  }

  G.buildBody = function (scene) {
    const A = G.ANATOMY, T = G.TISSUE;
    const body = { segs: {}, list: [], root: new THREE.Group(), xray: false, wounds: [], contacts: [] };
    scene.add(body.root);
    for (const [name, [parent, o]] of Object.entries(A.segs)) {
      const s = { name, label: A.segLabel[name], parent, g: new THREE.Group(), origin: new V3(...o), inv: new THREE.Matrix4(), prims: [], lofts: [], skins: [], bc: new V3(), br: 0, sp: [], ip: [], ap: [], dp: [] };
      const po = parent ? body.segs[parent].origin : new V3();
      s.g.position.copy(s.origin).sub(po);
      s.rest = s.g.position.clone();
      (parent ? body.segs[parent].g : body.root).add(s.g);
      body.segs[name] = s; body.list.push(s);
    }
    const box = {};
    const grow = (seg, x, y, z, pad) => {
      const b = box[seg] || (box[seg] = new THREE.Box3());
      b.expandByPoint(new V3(x - pad, y - pad, z - pad)); b.expandByPoint(new V3(x + pad, y + pad, z + pad));
    };
    for (const L0 of A.lofts) {
      const s = body.segs[L0.seg], Lf = Object.assign({}, L0, { rings: densify(L0.rings, 5) });
      s.lofts.push(Lf); s.sp.push({ geo: loftGeo(Lf, s.origin), color: Lf.color });
      const R = Lf.rings;
      R.forEach((r, i) => {
        const pts = [[r[1] + r[3], r[2]], [r[1] - r[3], r[2]], [r[1], r[2] + r[4]], [r[1], r[2] - r[4]]];
        for (const [u, v] of pts) {
          const P = Lf.axis === 'y' ? [u, r[0], v] : [u, v, r[0]];
          grow(L0.seg, P[0], P[1], P[2], 0);
          if (i % 5 === 0 || i === R.length - 1) body.contacts.push({ seg: s, p: new V3(...P).sub(s.origin) });
        }
      });
    }
    for (const k of A.skins) {
      const s = body.segs[k.seg];
      s.skins.push({ type: 'ell', c: k.c, r: k.r }); s.sp.push({ geo: ellGeo(k.c, k.r, null, s.origin), color: k.color });
      grow(k.seg, k.c[0], k.c[1], k.c[2], Math.max(...k.r));
    }
    for (const d of A.deco) { const s = body.segs[d.seg]; s.dp.push({ geo: ellGeo(d.c, d.r, null, s.origin), color: d.color }); }
    for (const pr of A.prims) {
      const s = body.segs[pr.seg];
      pr.prio = T[pr.tissue].prio; pr.frag = T[pr.tissue].frag; pr.segObj = s;
      pr.margin = pr.kind === 'vessel' || pr.kind === 'cord' || pr.kind === 'cauda';
      if (pr.type === 'cap') {
        pr.ba = [pr.b[0] - pr.a[0], pr.b[1] - pr.a[1], pr.b[2] - pr.a[2]]; pr.baba = pr.ba[0] ** 2 + pr.ba[1] ** 2 + pr.ba[2] ** 2;
        for (const g of capGeo(pr.a, pr.b, pr.rad, s.origin)) s.ip.push({ geo: g, color: pr.color });
        grow(pr.seg, ...pr.a, pr.rad); grow(pr.seg, ...pr.b, pr.rad);
      } else {
        if (pr.rot) { const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...pr.rot)).elements; pr.R = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]; }
        if (pr.type === 'shell') pr.ri = pr.r.map((v) => v - pr.th);
        (pr.alpha ? s.ap : s.ip).push({ geo: ellGeo(pr.c, pr.r, pr.rot, s.origin, 18, 12), color: pr.color });
        grow(pr.seg, ...pr.c, Math.max(...pr.r));
      }
      s.prims.push(pr);
    }
    body.skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, transparent: false });
    body.innerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02 });
    body.alphaMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, transparent: true, opacity: 0.38, depthWrite: false });
    body.decoMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    body.inner = []; body.decoMeshes = []; body.skinMeshes = [];
    for (const s of body.list) {
      const b = box[s.name];
      b.getCenter(s.bc); s.bbox = b; s.br = b.getSize(new V3()).length() / 2 + 0.03;
      const mk = (parts, mat, order) => {
        if (!parts.length) return null;
        const m = new THREE.Mesh(merge(parts), mat); m.renderOrder = order; s.g.add(m); return m;
      };
      const sk = mk(s.sp, body.skinMat, 3); s.skin = sk; s.skin0 = { pos: sk.geometry.attributes.position.array.slice(), col: sk.geometry.attributes.color.array.slice() }; sk.castShadow = true; sk.receiveShadow = true; body.skinMeshes.push(sk);
      const de = mk(s.dp, body.decoMat, 0); if (de) { de.castShadow = true; body.decoMeshes.push(de); }
      for (const m of [mk(s.ip, body.innerMat, 0), mk(s.ap, body.alphaMat, 1)]) if (m) { m.visible = false; body.inner.push(m); }
      delete s.sp; delete s.ip; delete s.ap; delete s.dp;
    }

    body.setXray = (on) => {
      body.xray = on;
      const m = body.skinMat;
      m.transparent = on; m.opacity = on ? 0.16 : 1; m.depthWrite = !on; m.needsUpdate = true;
      for (const i of body.inner) i.visible = on;
      for (const d of body.decoMeshes) d.visible = !on;
      for (const w of body.wounds) if (w.track) w.track.visible = on;
    };

    const v = new V3();
    body.updateMatrices = () => { body.root.updateMatrixWorld(true); for (const s of body.list) s.inv.copy(s.g.matrixWorld).invert(); };
    // lowest contact point of the current pose (world Y), used to rest the body on the floor
    body.lowest = () => {
      let m = Infinity;
      for (const c of body.contacts) { v.copy(c.p).applyMatrix4(c.seg.g.matrixWorld); if (v.y < m) m = v.y; }
      return m;
    };
    body.toRest = (seg, p, out) => out.set(p.x, p.y, p.z).applyMatrix4(seg.inv).add(seg.origin);

    body.sample = (p, margin, out) => {
      out.inBody = false; out.seg = null; out.prim = null; out.sdf = 0;
      let best = null, bp = 0, bs = 0;
      for (const s of body.list) {
        v.set(p.x, p.y, p.z).applyMatrix4(s.inv).add(s.origin);
        const dx = v.x - s.bc.x, dy = v.y - s.bc.y, dz = v.z - s.bc.z;
        if (dx * dx + dy * dy + dz * dz > s.br * s.br) continue;
        const x = v.x, y = v.y, z = v.z;
        let ins = false;
        for (const Lf of s.lofts) if (inLoft(Lf, x, y, z)) { ins = true; break; }
        if (!ins) for (const k of s.skins) if (sdEll(k, x, y, z, k.r) < 0) { ins = true; break; }
        if (ins && !out.inBody) { out.inBody = true; out.seg = s; }
        for (const pr of s.prims) {
          if (pr.prio <= bp) continue;
          const d = sdf(pr, x, y, z);
          if (d < (pr.margin ? margin : 0)) { best = pr; bp = pr.prio; bs = d; }
        }
      }
      if (out.inBody && best) { out.prim = best; out.sdf = bs; if (best.segObj !== out.seg && best.prio > 1) out.seg = out.seg; }
    };
    // temporary-cavity stretch on friable organs near the track
    body.cavity = (p, rtc, ds, map) => {
      const reach = rtc * 0.7;
      for (const s of body.list) {
        v.set(p.x, p.y, p.z).applyMatrix4(s.inv).add(s.origin);
        const dx = v.x - s.bc.x, dy = v.y - s.bc.y, dz = v.z - s.bc.z, rr = s.br + reach;
        if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
        for (const pr of s.prims) {
          if (!pr.frag) continue;
          const d = Math.max(0, sdf(pr, v.x, v.y, v.z));
          if (d < reach) map.set(pr, (map.get(pr) || 0) + (1 - d / reach) * ds * (rtc - 0.02) * (rtc - 0.02) * pr.frag);
        }
      }
    };

    // human-readable location of a surface point
    body.locate = (seg, p) => {
      body.toRest(seg, p, v);
      const side = v.x > 0.02 ? 'left ' : v.x < -0.02 ? 'right ' : 'mid ', fb = v.z >= 0 ? 'anterior' : 'posterior';
      switch (seg.name) {
        case 'head': return v.y > 1.71 ? (v.z > 0.04 ? 'forehead' : side + 'scalp') : v.z > 0.03 ? 'face' : side + 'side of head';
        case 'neck': return side + 'neck (' + fb + ')';
        case 'thorax': return v.y > 1.22 ? side + (v.z >= 0 ? 'chest' : 'upper back') : side + (v.z >= 0 ? 'upper abdomen' : 'flank / back');
        case 'abdomen': return side + (v.z >= 0 ? 'abdomen' : 'lower back');
        case 'pelvis': return side + (v.z >= 0 ? 'groin / pelvis' : 'buttock');
        default: return seg.label.toLowerCase() + ' (' + fb + ')';
      }
    };

    // ---- surface wounds (decals that ride with their body segment)
    const woundGeo = new THREE.CircleGeometry(1, 20);
    // wound textures drawn procedurally: entry (punched-out hole, abrasion collar, bruise), exit (ragged,
    // stellate, everted edges), powder stippling and soot for close and contact range
    const tex = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.translate(64, 64); draw(x); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
    const dmat = (map, f) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: f });
    const entryMat = dmat(tex((x) => {
      let g = x.createRadialGradient(0, 0, 18, 0, 0, 62); g.addColorStop(0, 'rgba(70,20,55,0.55)'); g.addColorStop(0.5, 'rgba(90,30,60,0.25)'); g.addColorStop(1, 'rgba(90,30,60,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, 62, 0, 7); x.fill();
      x.fillStyle = '#5a1a12'; x.beginPath(); x.arc(0, 0, 27, 0, 7); x.fill(); // abrasion collar
      x.fillStyle = '#2a0606'; x.beginPath(); x.arc(0, 0, 22, 0, 7); x.fill();
      x.fillStyle = '#060101'; x.beginPath(); x.arc(0, 0, 19, 0, 7); x.fill();
    }), -5);
    const exitMats = [0, 1, 2].map((k) => dmat(tex((x) => {
      const n = 5 + k, pts = [];
      for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * 6.283 + k, r = (i % 2 ? 22 : 44 + Math.random() * 16) * (0.8 + Math.random() * 0.4); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      const path = (sc) => { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0] * sc, p[1] * sc) : x.moveTo(p[0] * sc, p[1] * sc))); x.closePath(); };
      x.fillStyle = 'rgba(120,14,16,0.9)'; path(1.05); x.fill(); x.fillStyle = '#4a0507'; path(0.9); x.fill(); x.fillStyle = '#1c0203'; path(0.62); x.fill();
      x.fillStyle = '#070101'; x.beginPath(); x.arc(0, 0, 15, 0, 7); x.fill();
    }), -5));
    const stippleMat = dmat(tex((x) => { for (let i = 0; i < 520; i++) { const a = Math.random() * 6.283, r = 12 + Math.pow(Math.random(), 0.7) * 50; x.fillStyle = 'rgba(40,22,16,' + (0.85 - r / 80) + ')'; x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, 0.6 + Math.random() * 0.9, 0, 7); x.fill(); } }), -4);
    const sootMat = dmat(tex((x) => { const g = x.createRadialGradient(0, 0, 4, 0, 0, 60); g.addColorStop(0, 'rgba(8,8,8,0.85)'); g.addColorStop(0.6, 'rgba(15,14,13,0.4)'); g.addColorStop(1, 'rgba(20,18,16,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 60, 0, 7); x.fill(); }), -4);
    const stainMat = new THREE.MeshStandardMaterial({ color: 0x560709, roughness: 0.25, transparent: true, opacity: 0.88, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false });
    const down = new V3(), bx = new V3(), by = new V3(), bm = new THREE.Matrix4();
    body.addWound = (mark, normal, range) => {
      const seg = mark.seg || body.segs.thorax, g = new THREE.Group();
      const q = new THREE.Quaternion().setFromRotationMatrix(seg.g.matrixWorld).invert();
      const n = new V3(normal.x, normal.y, normal.z).applyQuaternion(q).normalize();
      g.position.set(mark.p.x, mark.p.y, mark.p.z).applyMatrix4(seg.inv).addScaledVector(n, 0.0025);
      // orient the decal so its -Y runs downhill along the skin: blood tracks down from the wound
      down.set(0, -1, 0).applyQuaternion(q); down.addScaledVector(n, -down.dot(n));
      const run = down.length() > 0.3;
      if (run) { by.copy(down).normalize().negate(); bx.crossVectors(by, n); g.quaternion.setFromRotationMatrix(bm.makeBasis(bx, by, n)); }
      else g.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);
      const exit = mark.type === 'exit';
      const hole = new THREE.Mesh(woundGeo, exit ? exitMats[Math.floor(Math.random() * 3)] : entryMat), stain = new THREE.Mesh(woundGeo, stainMat);
      // entry holes are about bullet diameter; the texture's hole is ~1/3 of its radius
      hole.scale.setScalar(exit ? mark.r * 2.0 : mark.r * 3.1); hole.rotation.z = Math.random() * 6.3; hole.position.z = 0.0008; hole.renderOrder = 6;
      if (!exit && range != null && range < 0.75) {
        // unburnt powder tattoos the skin out to roughly 60-75 cm; soot only within a hand's width
        const st = new THREE.Mesh(woundGeo, stippleMat); st.scale.setScalar(0.022 + range * 0.075); st.position.z = 0.0022; st.renderOrder = 5; st.material.opacity = 1; g.add(st);
        if (range < 0.16) { const so = new THREE.Mesh(woundGeo, sootMat); so.scale.setScalar(0.02 + range * 0.14); so.position.z = 0.0024; so.renderOrder = 5; g.add(so); }
      }
      stain.scale.set(mark.r * 1.9, mark.r * 1.9, 1); stain.renderOrder = 4;
      g.add(stain, hole); seg.g.add(g);
      const w = { g, stain, seg, mark, n, ext: 0, base: mark.r * 1.9, track: null, run };
      body.wounds.push(w);
      return w;
    };
    // gouge a crater into the skin mesh: vertices inside the radius sink along the wound normal and turn to
    // exposed tissue. Used for exit wounds and for any wound where the temporary cavity bursts the surface.
    const cA = new THREE.Color(0x3a0507), cRim = new THREE.Color(0x8a1a1c);
    body.crater = (w, radius, depth) => {
      const geo = w.seg.skin.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color, p = w.g.position, n = w.n;
      let hit = 0;
      for (let i = 0; i < pos.count; i++) {
        const dx = pos.getX(i) - p.x, dy = pos.getY(i) - p.y, dz = pos.getZ(i) - p.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > radius * radius * 1.7) continue;
        if (nor.getX(i) * n.x + nor.getY(i) * n.y + nor.getZ(i) * n.z < 0.1) continue; // far side of a thin limb
        const u = Math.sqrt(d2) / radius, f = u < 1 ? (1 - u * u) * (1 - u * u) : 0, jag = 0.75 + 0.5 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1);
        if (f > 0) pos.setXYZ(i, pos.getX(i) - n.x * depth * f * jag, pos.getY(i) - n.y * depth * f * jag, pos.getZ(i) - n.z * depth * f * jag);
        const t = u < 1 ? Math.min(1, 0.35 + f * 1.4) : Math.max(0, 1 - (u - 1) / 0.3) * 0.45, c = u < 0.8 ? cA : cRim;
        col.setXYZ(i, col.getX(i) + (c.r - col.getX(i)) * t, col.getY(i) + (c.g - col.getY(i)) * t, col.getZ(i) + (c.b - col.getZ(i)) * t);
        hit++;
      }
      if (!hit) return;
      pos.needsUpdate = col.needsUpdate = true; geo.computeVertexNormals(); w.seg.dirty = true;
      w.g.position.addScaledVector(n, -depth * 0.8); w.crater = radius;
    };
    body.growStain = (w, ml) => {
      const r = Math.min(0.045, w.base + Math.sqrt(ml) * 0.0022), L = w.run ? Math.min(0.13, Math.sqrt(ml) * 0.012) : 0;
      w.stain.scale.set(r * (L ? 0.8 : 1), r + L / 2, 1); w.stain.position.y = -L / 2;
    };
    const trackMat = new THREE.LineBasicMaterial({ color: 0xfff27a, depthTest: false, transparent: true, opacity: 0.9 });
    body.addTrack = (w, pts) => {
      if (pts.length < 2) return;
      const arr = [];
      for (const p of pts) { v.set(p.x, p.y, p.z).applyMatrix4(w.seg.inv); arr.push(v.x, v.y, v.z); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      w.track = new THREE.Line(g, trackMat); w.track.renderOrder = 10; w.track.visible = body.xray; w.seg.g.add(w.track);
    };
    body.woundWorld = (w, out) => out.copy(w.g.position).applyMatrix4(w.seg.g.matrixWorld);
    body.woundNormal = (w, out) => out.copy(w.n).transformDirection(w.seg.g.matrixWorld);
    body.clearWounds = () => {
      for (const sg of body.list) if (sg.dirty) { const g = sg.skin.geometry; g.attributes.position.array.set(sg.skin0.pos); g.attributes.color.array.set(sg.skin0.col); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; g.computeVertexNormals(); sg.dirty = false; } for (const w of body.wounds) { w.seg.g.remove(w.g); if (w.track) w.seg.g.remove(w.track); } body.wounds.length = 0; };
    body.updateMatrices();
    return body;
  };
})();
