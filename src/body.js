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

  // Each long bone (femur, tibia, humerus, forearm) is carried by two segments joined at mid-shaft: the proximal one
  // keeps the original name, the distal one is '<name>X<side>' (thighXL...). While the bone is whole the two halves
  // are locked rigid; a fracture frees the break so the limb angulates there, and an amputation separates them.
  // Lofts (hit volumes), anatomy and skin weights below the break move to the distal half.
  G.SPLIT = {};
  function splitLimbs(A, H) {
    if (A.splitDone) return; A.splitDone = true;
    const order = Object.entries(A.segs), segs = {};
    for (const [name, def] of order) {
      segs[name] = def;
      const m = /^(thigh|shin|uarm|farm)([LR])$/.exec(name); if (!m) continue;
      const child = order.find(([, d]) => d[0] === name); if (!child) continue;
      const o0 = def[1], o1 = child[1][1], mid = [(o0[0] + o1[0]) / 2, (o0[1] + o1[1]) / 2, (o0[2] + o1[2]) / 2], xn = m[1] + 'X' + m[2];
      segs[xn] = [name, mid]; child[1] = [xn, o1]; G.SPLIT[name] = { distal: xn, y: mid[1], len: o0[1] - o1[1] }; A.segLabel[xn] = A.segLabel[name];
    }
    // children whose parent was changed above keep their place after their new parent
    A.segs = {}; for (const [k, v] of Object.entries(segs)) A.segs[k] = v;
    for (const [k, v] of order) if (A.segs[k]) A.segs[k] = v;
    const splitLoft = (list) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const L = list[i], sp = G.SPLIT[L.seg]; if (!sp || L.axis !== 'y') continue;
        const R = L.rings, y = sp.y, lerpRing = (a, b) => { const f = (y - a[0]) / (b[0] - a[0] || 1); return a.map((v, k) => (k === 0 ? y : v + (b[k] - v) * f)); };
        let k = R.findIndex((r) => r[0] >= y); if (k <= 0) continue;
        const cut = lerpRing(R[k - 1], R[k]);
        list.push(Object.assign({}, L, { seg: sp.distal, rings: R.slice(0, k).concat([cut]) }));
        list[i] = Object.assign({}, L, { rings: [cut].concat(R.slice(k)) });
      }
    };
    splitLoft(A.lofts); if (H && H.lofts) splitLoft(H.lofts);
    for (let i = A.prims.length - 1; i >= 0; i--) {
      const pr = A.prims[i], sp = G.SPLIT[pr.seg]; if (!sp) continue;
      if (pr.type === 'cap') {
        const ya = pr.a[1], yb = pr.b[1];
        if (ya < sp.y && yb < sp.y) pr.seg = sp.distal;
        else if ((ya - sp.y) * (yb - sp.y) < 0) {
          const f = (sp.y - ya) / (yb - ya), m = pr.a.map((v, k) => v + (pr.b[k] - v) * f);
          const lo = Object.assign({}, pr, { seg: sp.distal }); if (ya < yb) { lo.b = m; pr.a = m; } else { lo.a = m; pr.b = m; }
          A.prims.push(lo);
        }
      } else if (pr.c && pr.c[1] < sp.y) pr.seg = sp.distal;
    }
  }

  G.buildBody = function (scene) {
    const A = G.ANATOMY, T = G.TISSUE;
    splitLimbs(A, G.HUMAN);
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
    const H = G.HUMAN || null; // sculpted character mesh; when present the lofts are only its fitted hit volumes
    for (const L0 of H ? H.lofts : A.lofts) {
      const s = body.segs[L0.seg], Lf = Object.assign({}, L0, { rings: H ? L0.rings : densify(L0.rings, 5) });
      s.lofts.push(Lf); if (!H) s.sp.push({ geo: loftGeo(Lf, s.origin), color: Lf.color });
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
    for (const k of H ? [] : A.skins) {
      const s = body.segs[k.seg];
      s.skins.push({ type: 'ell', c: k.c, r: k.r }); s.sp.push({ geo: ellGeo(k.c, k.r, null, s.origin), color: k.color });
      grow(k.seg, k.c[0], k.c[1], k.c[2], Math.max(...k.r));
    }
    for (const d of H ? [] : A.deco) { const s = body.segs[d.seg]; s.dp.push({ geo: ellGeo(d.c, d.r, null, s.origin), color: d.color }); }
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
      if (s.sp.length) { const sk = mk(s.sp, body.skinMat, 3); s.skin = sk; s.skin0 = { pos: sk.geometry.attributes.position.array.slice(), col: sk.geometry.attributes.color.array.slice() }; sk.castShadow = true; sk.receiveShadow = true; body.skinMeshes.push(sk); }
      const de = mk(s.dp, body.decoMat, 0); if (de) { de.castShadow = true; body.decoMeshes.push(de); }
      for (const m of [mk(s.ip, body.innerMat, 0), mk(s.ap, body.alphaMat, 1)]) if (m) { m.visible = false; body.inner.push(m); }
      delete s.sp; delete s.ip; delete s.ap; delete s.dp;
    }

    if (H) {
      const dec = (b64, T) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
      const p16 = dec(H.pos, Int16Array), n = H.nv, si = dec(H.si, Uint8Array), sw = dec(H.sw, Uint8Array), TX = !!H.render;
      let pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) pos[i] = p16[i] / 10000;
      const map = H.order.map((nm) => body.list.findIndex((sg) => sg.name === nm));
      let sI = new Uint16Array(n * 4), sW = new Float32Array(n * 4);
      for (let i = 0; i < n * 4; i++) { sI[i] = map[si[i]]; sW[i] = sw[i] / 255; }
      for (let v = 0; v < n; v++) {
        const y = pos[v * 3 + 1], inf = new Map();
        for (let k = 0; k < 4; k++) {
          const b = sI[v * 4 + k], w = sW[v * 4 + k]; if (!(w > 0)) continue;
          const sp = G.SPLIT[body.list[b].name];
          if (!sp) { inf.set(b, (inf.get(b) || 0) + w); continue; }
          const t = Math.min(1, Math.max(0, (sp.y + 0.02 - y) / 0.04)), d = body.list.indexOf(body.segs[sp.distal]);
          if (t < 1) inf.set(b, (inf.get(b) || 0) + w * (1 - t)); if (t > 0) inf.set(d, (inf.get(d) || 0) + w * t);
        }
        const top = [...inf].sort((a, c) => c[1] - a[1]).slice(0, 4), sum = top.reduce((a, c) => a + c[1], 0) || 1;
        for (let k = 0; k < 4; k++) { sI[v * 4 + k] = top[k] ? top[k][0] : 0; sW[v * 4 + k] = top[k] ? top[k][1] / sum : 0; }
      }
      const skin = new THREE.Color(0xc99878), cloth = new THREE.Color(TX ? 0x2e4466 : 0x262b33), hair = new THREE.Color(0x2c2018), c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], dom = H.order[si[i * 4]];
        if (TX) c.setRGB(1, 1, 1); else c.copy(skin); // with the photographic skin texture the vertex colour is only a tint
        // slight natural variation: redder at joints and extremities, paler on the trunk
        if (!TX) { const v = 0.035 * Math.sin(x * 40 + y * 31) * Math.sin(z * 37 + y * 17); c.r += v; c.g += v * 0.8; c.b += v * 0.7; }
        if (!/^(uarm|farm|hand)/.test(dom) && y > 0.74 && y < 1.03) c.lerp(cloth, Math.min(1, Math.min(y - 0.74, 1.03 - y) / 0.008)); // shorts
        if (!TX && dom === 'head') { const line = 1.712 + 0.42 * Math.max(-0.05, z) - 0.9 * Math.max(0, Math.abs(x) - 0.045); if (y > line) c.lerp(hair, Math.min(0.9, (y - line) / 0.01)); } // cropped hair
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      const geo = new THREE.BufferGeometry();
      let index = dec(H.idx, Uint16Array);
      const loader = new THREE.TextureLoader(), texOf = (uri, srgb) => { const t = loader.load(uri); if (srgb) t.encoding = THREE.sRGBEncoding; t.flipY = true; t.anisotropy = 4; return t; };
      if (TX) {
        // split along UV seams: every render vertex copies its source vertex
        const R = H.render, src = dec(R.src, Uint16Array), uv16 = dec(R.uv, Uint16Array), m = src.length;
        const p2 = new Float32Array(m * 3), c2 = new Float32Array(m * 3), i2 = new Uint16Array(m * 4), w2 = new Float32Array(m * 4), uv = new Float32Array(m * 2);
        for (let i = 0; i < m; i++) { const k = src[i]; for (let a = 0; a < 3; a++) { p2[i * 3 + a] = pos[k * 3 + a]; c2[i * 3 + a] = col[k * 3 + a]; } for (let a = 0; a < 4; a++) { i2[i * 4 + a] = sI[k * 4 + a]; w2[i * 4 + a] = sW[k * 4 + a]; } uv[i * 2] = uv16[i * 2] / 65535; uv[i * 2 + 1] = uv16[i * 2 + 1] / 65535; }
        pos = p2; col = c2; sI = i2; sW = w2; index = dec(R.idx, Uint16Array);
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        body.skinMat.map = texOf(R.skin, true);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(sI, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sW, 4));
      geo.setIndex(new THREE.BufferAttribute(index, 1)); geo.computeVertexNormals();
      body.skinMat.skinning = true; body.skinMat.roughness = 0.55;
      const mesh = new THREE.SkinnedMesh(geo, body.skinMat); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true; mesh.renderOrder = 3;
      scene.add(mesh);
      mesh.bind(new THREE.Skeleton(body.list.map((sg) => sg.g), body.list.map((sg) => new THREE.Matrix4().makeTranslation(-sg.origin.x, -sg.origin.y, -sg.origin.z))), new THREE.Matrix4());
      body.human = mesh; body.skinMeshes.push(mesh); body.skin0 = { pos: pos.slice(), col: col.slice() };
      // hair and eyebrows: fitted MakeHuman proxy meshes, skinned to the same skeleton
      const skel = mesh.skeleton;
      body.hairs = []; body.skinTex = (H.skins || []).map((k, i) => (i === 0 ? body.skinMat.map : null));
      const parts = (H.hairs || (H.hair ? [H.hair] : [])).map((h) => ['hair', 0.75, h]).concat(H.brows ? [['brows', 0.9, H.brows]] : []);
      for (const [key, rough, Hp] of parts) {
        const q16 = dec(Hp.pos, Int16Array), u16 = dec(Hp.uv, Uint16Array), s8 = dec(Hp.si, Uint8Array), w8 = dec(Hp.sw, Uint8Array), k = Hp.nv;
        const pp = new Float32Array(k * 3), uu = new Float32Array(k * 2), ii = new Uint16Array(k * 4), ww = new Float32Array(k * 4);
        for (let i = 0; i < k * 3; i++) pp[i] = q16[i] / 10000;
        for (let i = 0; i < k * 2; i++) uu[i] = u16[i] / 65535;
        for (let i = 0; i < k * 4; i++) { ii[i] = map[s8[i]]; ww[i] = w8[i] / 255; }
        const g2 = new THREE.BufferGeometry();
        g2.setAttribute('position', new THREE.BufferAttribute(pp, 3)); g2.setAttribute('uv', new THREE.BufferAttribute(uu, 2));
        g2.setAttribute('skinIndex', new THREE.BufferAttribute(ii, 4)); g2.setAttribute('skinWeight', new THREE.BufferAttribute(ww, 4));
        g2.setIndex(new THREE.BufferAttribute(dec(Hp.idx, Uint16Array), 1)); g2.computeVertexNormals();
        const m2 = new THREE.MeshStandardMaterial({ map: texOf(Hp.tex, true), skinning: true, transparent: true, alphaTest: 0.35, roughness: rough, side: THREE.DoubleSide, depthWrite: true });
        const sm = new THREE.SkinnedMesh(g2, m2); sm.frustumCulled = false; sm.castShadow = key === 'hair'; sm.renderOrder = 4;
        scene.add(sm); sm.bind(skel, new THREE.Matrix4()); body.decoMeshes.push(sm);
        if (key === 'hair') { sm.visible = body.hairs.length === 0; body.hairs.push(sm); }
      }
      // eyes
      const irisTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.translate(64, 64);
        let g = x.createRadialGradient(0, 0, 10, 0, 0, 64); g.addColorStop(0, '#2a1a10'); g.addColorStop(0.35, '#5a3a20'); g.addColorStop(0.8, '#3d2715'); g.addColorStop(1, '#120b06');
        x.fillStyle = g; x.beginPath(); x.arc(0, 0, 63, 0, 7); x.fill();
        for (let i = 0; i < 160; i++) { const a = Math.random() * 6.283, r0 = 18 + Math.random() * 10, r1 = 40 + Math.random() * 20; x.strokeStyle = 'rgba(' + (120 + Math.random() * 60) + ',' + (80 + Math.random() * 40) + ',40,0.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); x.stroke(); }
        x.fillStyle = '#050403'; x.beginPath(); x.arc(0, 0, 20, 0, 7); x.fill();
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
      body.pupils = []; const pupilMat = new THREE.MeshBasicMaterial({ color: 0x030303, polygonOffset: true, polygonOffsetFactor: -3 });
      const irisMat = new THREE.MeshStandardMaterial({ map: irisTex, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
      const corneaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.12 });
      const hd = body.segs.head, white = new THREE.MeshStandardMaterial({ color: 0xe6e0d8, roughness: 0.3 }), iris = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.2 }), pupil = new THREE.MeshBasicMaterial({ color: 0x050505 });
      body.eyes = [];
      for (const e of H.eyes) {
        const g = new THREE.Group(); g.position.set(e.c[0] - hd.origin.x, e.c[1] - hd.origin.y, e.c[2] - hd.origin.z - e.r * 0.15);
        // eyeball plus a painted iris disc (radial fibres, darker limbal ring, pupil) on its front surface
        const ball = new THREE.Mesh(new THREE.SphereGeometry(e.r, 20, 14), white.clone());
        // iris and pupil are caps on the eyeball's own curve (a flat disc inside the sphere showed only as a ring up close)
        const cap = (R, th) => { const g = new THREE.SphereGeometry(R, 28, 8, 0, Math.PI * 2, 0, th); g.rotateX(Math.PI / 2); const a = g.attributes.position, uv = g.attributes.uv, w = R * Math.sin(th); for (let i = 0; i < a.count; i++) uv.setXY(i, 0.5 + a.getX(i) / (2 * w), 0.5 + a.getY(i) / (2 * w)); return g; };
        const disc = new THREE.Mesh(cap(e.r * 1.004, 0.52), irisMat.clone()); disc.renderOrder = 2;
        const cornea = new THREE.Mesh(new THREE.SphereGeometry(e.r * 0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), corneaMat); cornea.rotation.x = Math.PI / 2; cornea.position.z = e.r * 0.86; cornea.scale.y = 0.35;
        const pupil = new THREE.Mesh(cap(e.r * 1.008, 0.16), pupilMat); pupil.renderOrder = 3; body.pupils.push(pupil);
        g.add(ball, disc, pupil, cornea); hd.g.add(g); body.decoMeshes.push(g);
        body.eyes.push({ g, ball, disc, pupil, cornea, c: new V3(e.c[0], e.c[1], e.c[2]), r: e.r, p0: g.position.clone(), side: e.c[0] > 0 ? 'L' : 'R' });
      }
      // nearest point of the real skin along a wound's normal (rest pose), so decals sit on the mesh, not the hit volume
      const ia = geo.index.array, e1 = new V3(), e2 = new V3(), pv = new V3(), tv = new V3(), qv = new V3(), a = new V3(), o = new V3(), d = new V3();
      body.snapN = new V3();
      body.snap = (seg, local, nrm) => {
        o.copy(local).add(seg.origin).addScaledVector(nrm, 0.07); d.copy(nrm).negate();
        let best = 0.16, bt = -1;
        for (let t = 0; t < ia.length; t += 3) {
          a.fromArray(pos, ia[t] * 3);
          if (Math.abs(a.x - o.x) > 0.2 || Math.abs(a.y - o.y) > 0.2 || Math.abs(a.z - o.z) > 0.2) continue;
          e1.fromArray(pos, ia[t + 1] * 3).sub(a); e2.fromArray(pos, ia[t + 2] * 3).sub(a);
          pv.crossVectors(d, e2); const det = e1.dot(pv); if (Math.abs(det) < 1e-10) continue;
          const inv = 1 / det; tv.subVectors(o, a); const u = tv.dot(pv) * inv; if (u < 0 || u > 1) continue;
          qv.crossVectors(tv, e1); const w = d.dot(qv) * inv; if (w < 0 || u + w > 1) continue;
          const tt = e2.dot(qv) * inv; if (tt > 0 && tt < best) { best = tt; bt = t; }
        }
        if (best >= 0.16) return null;
        a.fromArray(pos, ia[bt] * 3); e1.fromArray(pos, ia[bt + 1] * 3).sub(a); e2.fromArray(pos, ia[bt + 2] * 3).sub(a);
        body.snapN.crossVectors(e1, e2).normalize(); if (body.snapN.dot(nrm) < 0) body.snapN.negate();
        return local.copy(o).addScaledVector(d, best).sub(seg.origin);
      };
    }

    // pupil diameter as a fraction of the iris: ~0.32 normal in room light, wider with shock and adrenaline,
    // fixed and fully dilated once the brainstem stops working
    body.setPupil = (f) => { for (const p of body.pupils || []) { const k = Math.max(0.6, Math.min(2.6, f / 0.32)); p.scale.set(k, k, 1); } };
    // skin colour follows the circulation: pallor with blood loss, blue-grey with low oxygen, waxy grey after death
    const tint = new THREE.Color();
    body.setPerfusion = (lossFrac, spo2, dead, deadT) => {
      const pale = Math.min(1, Math.max(0, (lossFrac - 0.12) / 0.3)), cy = Math.min(1, Math.max(0, (88 - spo2) / 30)), d = dead ? Math.min(1, 0.4 + deadT / 600) : 0;
      tint.setRGB(1 - 0.16 * pale - 0.2 * cy - 0.14 * d, 1 - 0.12 * pale - 0.1 * cy - 0.13 * d, 1 - 0.06 * pale + 0.04 * cy - 0.08 * d);
      body.skinMat.color.copy(tint);
    };
    // a different person: skin texture (loaded on first use), hairstyle and hair colour
    body.looks = H && H.skins ? H.skins.length : 1;
    // decode every skin up front, so a new subject never appears untextured while its skin loads
    if (H && H.skins) H.skins.forEach((k, i) => { if (!body.skinTex[i]) { const t = new THREE.TextureLoader().load(k.tex); t.encoding = THREE.sRGBEncoding; t.flipY = true; t.anisotropy = 4; body.skinTex[i] = t; } });
    body.setLook = (skin, hair, hairTint) => {
      if (H && H.skins && H.skins[skin]) {
        if (!body.skinTex[skin]) { const t = new THREE.TextureLoader().load(H.skins[skin].tex); t.encoding = THREE.sRGBEncoding; t.flipY = true; t.anisotropy = 4; body.skinTex[skin] = t; }
        body.skinMat.map = body.skinTex[skin]; body.skinMat.needsUpdate = true; body.lookName = H.skins[skin].name;
      }
      body.hairIdx = (body.hairs || []).length ? hair % body.hairs.length : 0;
      (body.hairs || []).forEach((m, i) => { m.visible = i === body.hairIdx && !body.xray; if (hairTint != null) m.material.color.set(hairTint); });
    };
    body.setXray = (on) => {
      body.xray = on;
      const m = body.skinMat;
      m.transparent = on; m.opacity = on ? 0.16 : 1; m.depthWrite = !on; m.needsUpdate = true;
      for (const i of body.inner) i.visible = on;
      for (const d of body.decoMeshes) d.visible = !on;
      (body.hairs || []).forEach((m, i) => { m.visible = !on && i === (body.hairIdx || 0); });
      if (body.soakMat) body.soakMat.opacity = on ? 0.3 : 1;
      for (const r of body.rivers || []) r.mesh.visible = !on;
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
    const tex = (draw, S = 128) => { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.translate(S / 2, S / 2); x.scale(S / 128, S / 128); draw(x); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
    // lit, so a wound sits in the same light as the skin around it (the wet centre is glossier than the collar)
    const dmat = (map, f, rough = 0.42, nmap, ns = 1) => new THREE.MeshStandardMaterial({ map, normalMap: nmap || null, normalScale: new THREE.Vector2(ns, ns), transparent: true, depthWrite: false, roughness: rough, metalness: 0, polygonOffset: true, polygonOffsetFactor: f, polygonOffsetUnits: f });
    // tangent-space normal map from a height function h(u, v) on [-1, 1]^2, so a decal shades like a dent or a bulge
    const nmapOf = (h, S = 128) => {
      const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), im = x.createImageData(S, S), e = 2 / S;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const u = (i + 0.5) / S * 2 - 1, v = 1 - (j + 0.5) / S * 2, dx = (h(u + e, v) - h(u - e, v)) / (2 * e), dy = (h(u, v + e) - h(u, v - e)) / (2 * e);
        const m = Math.hypot(dx, dy, 1), o = (j * S + i) * 4; im.data[o] = 128 - (dx / m) * 127; im.data[o + 1] = 128 - (dy / m) * 127; im.data[o + 2] = 128 + 127 / m; im.data[o + 3] = 255;
      }
      x.putImageData(im, 0, 0); return new THREE.CanvasTexture(c);
    };
    const jitter = (x, r, n, amp, seed) => { x.beginPath(); for (let i = 0; i <= n; i++) { const a = (i / n) * 6.283, k = r * (1 + amp * Math.sin(a * 7 + seed) * Math.sin(a * 3 + seed * 2.3) + amp * 0.5 * Math.sin(a * 17 + seed)); i ? x.lineTo(Math.cos(a) * k, Math.sin(a) * k) : x.moveTo(Math.cos(a) * k, Math.sin(a) * k); } x.closePath(); };
    // entry: the bullet punches out a round hole a little smaller than itself (skin stretches, then recoils), rubbing a
    // 1-2 mm reddish-brown abrasion collar into the margin. Hit at an angle, the hole is oval and the collar is wide on
    // the side the bullet came from and nearly absent on the other.
    const entryTex = (ecc) => tex((x) => {
      // texture radius 64 px; the hole is 26 px, the collar a thin band, wider on the side the bullet came from
      x.fillStyle = 'rgba(120,52,40,0.55)'; jitter(x, 33, 48, 0.05, 1); x.save(); x.translate(ecc * 6, 0); x.fill(); x.restore(); // abrasion collar
      x.fillStyle = 'rgba(70,14,12,0.9)'; jitter(x, 29, 40, 0.05, 2); x.fill(); // the inverted, bruised margin
      x.fillStyle = '#060101'; jitter(x, 25, 40, 0.07, 3); x.fill(); // the hole
      const g = x.createRadialGradient(-6, -8, 1, 0, 0, 22); g.addColorStop(0, 'rgba(95,8,10,0.75)'); g.addColorStop(1, 'rgba(25,2,2,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 22, 0, 7); x.fill(); // blood glinting inside
    });
    // the skin is drawn inward around the hole: a funnel
    const entryN = nmapOf((u, v) => { const r = Math.hypot(u, v); return r < 0.4 ? -0.75 : r < 0.85 ? -0.75 * Math.pow(1 - (r - 0.4) / 0.45, 1.6) : 0; });
    const entryMat = dmat(entryTex(0), -5, 0.55, entryN, 0.7), entryObMat = dmat(entryTex(1), -5, 0.55, entryN, 0.7);
    // a contusion ring that is barely there at first and darkens over minutes while the heart still pumps
    const bruiseTex = tex((x) => { const g = x.createRadialGradient(0, 0, 14, 0, 0, 62); g.addColorStop(0, 'rgba(105,25,45,0.95)'); g.addColorStop(0.45, 'rgba(95,30,60,0.55)'); g.addColorStop(1, 'rgba(90,35,65,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 62, 0, 7); x.fill(); });
    // exit: no collar, the skin bursts outward from inside. Stellate tears where the bullet is tumbling or expanded,
    // a short slit or crescent where it leaves slowly, nose first.
    const exitN = nmapOf((u, v) => { const r = Math.hypot(u, v); return r < 0.25 ? -0.6 : r < 0.75 ? Math.sin((r - 0.25) / 0.5 * Math.PI) * 0.35 : 0; }); // a ragged rim pushed outward
    const exitMats = [0, 1, 2].map((k) => dmat(tex((x) => {
      const n = 5 + k, pts = [];
      for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * 6.283 + k, r = (i % 2 ? 22 : 44 + Math.random() * 16) * (0.8 + Math.random() * 0.4); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      const path = (sc) => { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0] * sc, p[1] * sc) : x.moveTo(p[0] * sc, p[1] * sc))); x.closePath(); };
      x.fillStyle = 'rgba(150,60,55,0.5)'; path(1.12); x.fill(); // everted, swollen edges
      x.fillStyle = 'rgba(120,14,16,0.92)'; path(1.0); x.fill(); x.fillStyle = '#4a0507'; path(0.85); x.fill(); x.fillStyle = '#1c0203'; path(0.6); x.fill();
      for (let i = 0; i < 9; i++) { const a = Math.random() * 6.283, r = 6 + Math.random() * 14; x.fillStyle = 'rgba(' + (150 + Math.random() * 60) + ',' + (40 + Math.random() * 50) + ',40,0.85)'; x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, 2 + Math.random() * 3, 0, 7); x.fill(); } // fat and muscle pushed out
      x.fillStyle = '#070101'; x.beginPath(); x.arc(0, 0, 11, 0, 7); x.fill();
    }), -5, 0.3, exitN, 1.3));
    const slitMats = [0, 1].map((k) => dmat(tex((x) => {
      const L = 46, W = 9 + k * 5, pts = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24, xx = -L + 2 * L * u, half = W * Math.pow(Math.sin(u * Math.PI), 0.7) * (0.75 + Math.random() * 0.5); pts.push([xx + (k ? 10 * Math.sin(u * Math.PI) ** 2 : 0), half]); }
      const path = (sc, sw) => { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0] * sc, p[1] * sw + (k ? -p[0] * p[0] * 0.006 : 0)) : x.moveTo(p[0] * sc, p[1] * sw))); for (let i = pts.length - 1; i >= 0; i--) x.lineTo(pts[i][0] * sc, -pts[i][1] * sw + (k ? -pts[i][0] * pts[i][0] * 0.006 : 0)); x.closePath(); };
      x.fillStyle = 'rgba(130,60,55,0.22)'; path(1.08, 1.7); x.fill(); x.fillStyle = 'rgba(95,22,20,0.85)'; path(1.0, 1.15); x.fill(); x.fillStyle = '#1a0303'; path(0.92, 0.8); x.fill();
    }), -5, 0.3, exitN, 0.8));
    const stippleMat = dmat(tex((x) => { for (let i = 0; i < 520; i++) { const a = Math.random() * 6.283, r = 12 + Math.pow(Math.random(), 0.7) * 50; x.fillStyle = 'rgba(40,22,16,' + (0.85 - r / 80) + ')'; x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, 0.6 + Math.random() * 0.9, 0, 7); x.fill(); } }, 256), -4, 0.8);
    const sootMat = dmat(tex((x) => { const g = x.createRadialGradient(0, 0, 4, 0, 0, 60); g.addColorStop(0, 'rgba(8,8,8,0.85)'); g.addColorStop(0.6, 'rgba(15,14,13,0.4)'); g.addColorStop(1, 'rgba(20,18,16,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 60, 0, 7); x.fill(); }), -4, 0.9);
    // the blood that wells up at the hole: a glossy bead that grows into a pool where the skin faces up
    const poolTex = tex((x) => { x.fillStyle = '#fff'; jitter(x, 58, 64, 0.06, 4); x.fill(); });
    const beadN = nmapOf((u, v) => { const r = Math.min(1, Math.hypot(u, v)); return Math.sqrt(Math.max(0, 1 - r * r)) * 0.9; });
    const stainMat = new THREE.MeshPhysicalMaterial({ color: 0x4a0507, alphaMap: poolTex, normalMap: beadN, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0, transparent: true, opacity: 0.97, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false });
    const down = new V3(), bx = new V3(), by = new V3(), bm = new THREE.Matrix4(), tv2 = new V3();
    body.bt = 0; // body clock (s), advanced by bloodTick
    body.addWound = (mark, normal, range) => {
      const seg = mark.seg || body.segs.thorax, g = new THREE.Group();
      const q = new THREE.Quaternion().setFromRotationMatrix(seg.g.matrixWorld).invert();
      const dir = new V3(normal.x, normal.y, normal.z).applyQuaternion(q).normalize(); // outward along the track (toward the shooter for an entry)
      const n = dir.clone();
      g.position.set(mark.p.x, mark.p.y, mark.p.z).applyMatrix4(seg.inv).addScaledVector(n, 0.0025);
      if (body.snap) { g.position.addScaledVector(n, -0.0025); if (body.snap(seg, g.position, n)) { n.copy(body.snapN); g.position.addScaledVector(n, 0.003); } else g.position.addScaledVector(n, 0.0025); }
      // orient the decal on the real skin; its -Y runs downhill (rest pose)
      down.set(0, -1, 0).applyQuaternion(q); down.addScaledVector(n, -down.dot(n));
      const run = down.length() > 0.3;
      if (run) { by.copy(down).normalize().negate(); bx.crossVectors(by, n); g.quaternion.setFromRotationMatrix(bm.makeBasis(bx, by, n)); }
      else { g.quaternion.setFromUnitVectors(new V3(0, 0, 1), n); bx.set(1, 0, 0).applyQuaternion(g.quaternion); by.crossVectors(n, bx); }
      const exit = mark.type === 'exit', cos = Math.min(1, Math.max(0.05, dir.dot(n)));
      // the track's direction along the skin, in decal coordinates
      tv2.copy(dir).addScaledVector(n, -dir.dot(n)); const ang = tv2.lengthSq() > 1e-6 ? Math.atan2(tv2.dot(by), tv2.dot(bx)) : Math.random() * 6.3;
      const slit = exit && (mark.v || 0) < 260, oblique = !exit && cos < 0.88;
      const hole = new THREE.Mesh(woundGeo, exit ? (slit ? slitMats[Math.random() < 0.6 ? 0 : 1] : exitMats[Math.floor(Math.random() * 3)]) : oblique ? entryObMat : entryMat), stain = new THREE.Mesh(woundGeo, stainMat.clone());
      // entry holes are about bullet diameter (the texture's hole is ~0.3 of its radius); stretched by 1/cos at an angle
      if (exit) { hole.scale.setScalar(slit ? mark.r * 1.7 : mark.r * 2.0); hole.rotation.z = slit ? ang + (Math.random() - 0.5) * 1.2 : Math.random() * 6.3; }
      else { const e = Math.min(2.3, 1 / Math.max(0.43, cos)); hole.scale.set(mark.r * 1.9 * e, mark.r * 1.9, 1); hole.rotation.z = ang; }
      hole.position.z = 0.0008; hole.renderOrder = 6; if (mark.type === 'ooze') hole.visible = false;
      let bruise = null;
      if (!exit && mark.type !== 'ooze') { bruise = new THREE.Mesh(woundGeo, dmat(bruiseTex, -2, 0.6)); bruise.scale.setScalar(mark.r * 4.2 + 0.006); bruise.material.opacity = 0.0; bruise.position.z = 0.0004; bruise.renderOrder = 4; g.add(bruise); }
      if (!exit && mark.type !== 'ooze' && range != null && range < 0.75) {
        // unburnt powder tattoos the skin out to roughly 60-75 cm (an oval pattern when the muzzle is at an angle); soot only within a hand's width
        const st = new THREE.Mesh(woundGeo, stippleMat); st.scale.set((0.022 + range * 0.075) / Math.max(0.5, cos), 0.022 + range * 0.075, 1); st.rotation.z = ang; st.position.z = 0.0022; st.renderOrder = 5; g.add(st);
        if (range < 0.16) { const so = new THREE.Mesh(woundGeo, sootMat); so.scale.set((0.02 + range * 0.14) / Math.max(0.5, cos), 0.02 + range * 0.14, 1); so.rotation.z = ang; so.position.z = 0.0024; so.renderOrder = 5; g.add(so); }
      }
      stain.scale.set(0.0001, 0.0001, 1); stain.renderOrder = 5; stain.position.z = 0.0012; // no blood showing yet: it wells up over the next seconds
      g.add(stain, hole); seg.g.add(g);
      // on the shorts, blood soaks into the fabric: it wicks outward as a dark, matte, widening patch instead of running
      const ry = g.position.y + seg.origin.y, cloth = !/^(uarm|farm|hand)/.test(seg.name) && ry > 0.745 && ry < 1.025;
      if (cloth) stain.visible = false; // fabric soak is a decal cut from the mesh (see paintSoak), so it follows the curved surface
      const w = { g, stain, seg, mark, n, ext: 0, base: mark.r * 1.2, track: null, run, cloth, bruise, t0: body.bt, pool: 0, seen: 0, feed: 0, rivers: [] };
      body.wounds.push(w);
      return w;
    };
    // gouge a crater into the skin mesh: vertices inside the radius sink along the wound normal and turn to
    // exposed tissue. Used for exit wounds and for any wound where the temporary cavity bursts the surface.
    const cA = new THREE.Color(0x3a0507), cRim = new THREE.Color(0x8a1a1c);
    body.crater = (w, radius, depth) => {
      const hm = body.human, geo = (hm || w.seg.skin).geometry, pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color, n = w.n;
      const p = hm ? w.g.position.clone().add(w.seg.origin) : w.g.position; // the skinned mesh lives in rest-pose coordinates
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
      pos.needsUpdate = col.needsUpdate = true; geo.computeVertexNormals(); w.seg.dirty = true; body.dirty = true;
      w.g.position.addScaledVector(n, -depth * 0.8); w.crater = radius;
    };
    // fabric soak: a skinned decal cut from the body mesh under the wound, so the patch wraps the curved
    // surface and moves with the limb. Its texture is a soft, irregular wicking blot, darkest at the hole.
    const soakTex = (() => {
      const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), im = x.createImageData(S, S);
      const lobes = [[0.4, 0.07, 2], [2.1, 0.06, 3], [4.0, 0.045, 5], [1.3, 0.03, 7], [5.2, 0.02, 11]];
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const u = (i + 0.5) / S * 2 - 1, v = (j + 0.5) / S * 2 - 1, d = Math.hypot(u, v), a = Math.atan2(v, u);
        let e = 0.82; for (const [ph, amp, k] of lobes) e += amp * Math.sin(a * k + ph) * 0.5;
        e += 0.008 * Math.sin(a * 19 + 1.3) + 0.004 * Math.sin(a * 37 + d * 9);
        const t = Math.max(0, Math.min(1, (e - d) / 0.035)), core = Math.max(0, 1 - d / e), o = (j * S + i) * 4;
        // the wet front is a touch darker where blood pools against the dry fibres (tide line)
        const tide = Math.exp(-Math.pow((e - d - 0.03) / 0.03, 2)) * 0.35;
        im.data[o] = 60 - 30 * core - 25 * tide; im.data[o + 1] = 6; im.data[o + 2] = 8; im.data[o + 3] = 255 * t * Math.min(1, 0.72 + 0.3 * core + tide);
      }
      x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
    })();
    const soakMat = body.soakMat = new THREE.MeshStandardMaterial({ map: soakTex, skinning: true, transparent: true, depthWrite: false, roughness: 0.97, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const tA = new THREE.Vector3(), tB = new THREE.Vector3(), dV = new THREE.Vector3();
    function paintSoak(w, r) {
      const hm = body.human; if (!hm) return;
      const geo = hm.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index.array;
      const n = w.n, c = w.c ? w.c.clone() : w.g.position.clone().add(w.seg.origin);
      c.y -= r * 0.22; // gravity drags the wet front downward
      tA.set(0, 1, 0).cross(n); if (tA.lengthSq() < 1e-6) tA.set(1, 0, 0); tA.normalize(); tB.copy(n).cross(tA).normalize(); // tA horizontal, tB up
      const R = r * 1.05, R2 = (R + 0.02) * (R + 0.02), P = [], N = [], I = [], W = [], U = [], ix = [], remap = new Map();
      const fab = (k) => { const y = pos.getY(k); return y > 0.742 && y < 1.028; }; // the shorts end at the waistband and hems
      const near = (k) => { dV.set(pos.getX(k) - c.x, pos.getY(k) - c.y, pos.getZ(k) - c.z); return dV.lengthSq() < R2 && nor.getX(k) * n.x + nor.getY(k) * n.y + nor.getZ(k) * n.z > 0.15; };
      for (let f = 0; f < idx.length; f += 3) {
        const a = idx[f], b = idx[f + 1], d = idx[f + 2];
        if (!(near(a) || near(b) || near(d)) || !(fab(a) || fab(b) || fab(d))) continue;
        for (const k of [a, b, d]) {
          if (!remap.has(k)) {
            remap.set(k, P.length / 3);
            const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), nx = nor.getX(k), ny = nor.getY(k), nz = nor.getZ(k);
            const yc = Math.min(1.028, Math.max(0.742, y)); // pull overhanging vertices onto the hem so the edge runs straight
            P.push(x + nx * 0.0012, yc + ny * 0.0012, z + nz * 0.0012); N.push(nx, ny, nz);
            dV.set(x - c.x, y - c.y, z - c.z);
            U.push(0.5 + dV.dot(tA) / (2 * R), 0.5 + dV.dot(tB) / (2 * R));
            for (let q = 0; q < 4; q++) { I.push(si.getComponent ? si.getComponent(k, q) : si.array[k * 4 + q]); W.push(sw.array[k * 4 + q]); }
          }
          ix.push(remap.get(k));
        }
      }
      if (!ix.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(I, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4));
      g.setIndex(ix);
      if (w.soak) { w.soak.geometry.dispose(); w.soak.geometry = g; }
      else { w.soak = new THREE.SkinnedMesh(g, soakMat); w.soak.frustumCulled = false; w.soak.renderOrder = 4; w.soak.bind(hm.skeleton, hm.bindMatrix); hm.parent.add(w.soak); }
    }
    // the colour of the shorts (a tint over the cloth texture); kept through wound resets
    let shortsIdx = null;
    body.setShorts = (hex) => {
      const hm = body.human; if (!hm) return;
      const geo = hm.geometry, P = geo.attributes.position, col = geo.attributes.color, SI4 = geo.attributes.skinIndex.array, SW4 = geo.attributes.skinWeight.array, c = new THREE.Color(hex);
      if (!shortsIdx) { shortsIdx = []; for (let i = 0; i < P.count; i++) { const y = body.skin0.pos[i * 3 + 1]; if (y < 0.742 || y > 1.028) continue; let m = -1, b = 0; for (let q = 0; q < 4; q++) if (SW4[i * 4 + q] > m) { m = SW4[i * 4 + q]; b = SI4[i * 4 + q]; } if (/^(uarm|farm|hand)/.test(body.list[b].name)) continue; shortsIdx.push(i); } }
      for (const i of shortsIdx) { col.setXYZ(i, c.r, c.g, c.b); body.skin0.col[i * 3] = c.r; body.skin0.col[i * 3 + 1] = c.g; body.skin0.col[i * 3 + 2] = c.b; }
      col.needsUpdate = true;
    };
    body.paintSoak = paintSoak;
    // ---- traumatic amputation. Every skin vertex near the cut is given wholly to one side (the separated part and
    // everything beyond it, or the body); triangles that would span the gap are removed; both open ends get a stump
    // face (skin, fat, muscle round the cut bone ends). Partial: the part hangs by a strip of tissue, so the skin is
    // left whole and only the wound region is torn and bloodied.
    const stumpTex = (bones) => tex((x) => {
      x.fillStyle = '#5a1810'; x.beginPath(); x.arc(0, 0, 63, 0, 7); x.fill(); // the cut skin edge, bloodied
      x.fillStyle = '#d8b65a'; x.beginPath(); x.arc(0, 0, 58, 0, 7); x.fill(); // subcutaneous fat
      x.fillStyle = '#7a1414'; x.beginPath(); x.arc(0, 0, 52, 0, 7); x.fill(); // muscle
      for (let i = 0; i < 70; i++) { const a = Math.random() * 6.283, r = Math.random() * 50; x.fillStyle = 'rgba(' + (60 + Math.random() * 70) + ',8,10,0.6)'; x.beginPath(); x.ellipse(Math.cos(a) * r, Math.sin(a) * r, 3 + Math.random() * 6, 1.5 + Math.random() * 3, a, 0, 7); x.fill(); }
      for (const [bx, by, br] of bones) { x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); x.fillStyle = '#b07a5a'; x.beginPath(); x.arc(bx, by, br * 0.55, 0, 7); x.fill(); } // cortex and marrow
      x.fillStyle = 'rgba(40,0,0,0.85)'; for (const [vx, vy] of [[18, 22], [-20, 18], [10, -24]]) { x.beginPath(); x.arc(vx, vy, 3.5, 0, 7); x.fill(); } // vessel ends
    });
    // torn tissue: irregular lumps (value noise), not a pattern; the cut skin edge rolls in a little
    const hsh = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
    const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf); const a = hsh(xi, yi), b = hsh(xi + 1, yi), c = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
    const stumpN = nmapOf((u, v) => { const r = Math.hypot(u, v); return (0.35 * vnoise(u * 9 + 3, v * 9 + 7) + 0.15 * vnoise(u * 23, v * 23)) * (1 - r * 0.6) - (r > 0.88 ? (r - 0.88) * 4 : 0); });
    const STUMP_BONES = { hand: [[0, -6, 9], [0, 14, 7]], farmX: [[0, -12, 9], [2, 14, 8]], foot: [[0, 0, 13]], shinX: [[-4, 6, 15], [22, -14, 7]], uarmX: [[0, 0, 14]], thighX: [[0, 0, 17]] };
    body.amputate = (segName, partial) => {
      const hm = body.human, sg = body.segs[segName]; if (!hm || !sg) return null;
      const geo = hm.geometry, P = geo.attributes.position, SIa = geo.attributes.skinIndex, SWa = geo.attributes.skinWeight;
      if (!body.cut0) body.cut0 = { si: SIa.array.slice(), sw: SWa.array.slice(), idx: geo.index.array.slice() };
      const sub = new Set(); const addSub = (s2) => { sub.add(body.list.indexOf(s2)); for (const c of body.list) if (c.parent === s2.name) addSub(c); }; addSub(sg);
      const par = body.segs[sg.parent], dir = sg.origin.clone().sub(par.origin).normalize(), o = sg.origin;
      // the stump's size: the hit volume (loft) of this limb at the cut
      let rad = 0.035; for (const L of (G.HUMAN && G.HUMAN.lofts) || []) if ((L.seg === segName || L.seg === sg.parent) && L.axis === 'y') for (const r of L.rings) if (Math.abs(r[0] - o.y) < 0.03) rad = Math.max(0.02, Math.min(0.07, (r[3] + r[4]) / 2));
      if (!partial) {
        const side = new Int8Array(P.count);
        for (let i = 0; i < P.count; i++) {
          const SI4 = SIa.array, SW4 = SWa.array; let ws = 0; for (let k = 0; k < 4; k++) if (sub.has(SI4[i * 4 + k])) ws += SW4[i * 4 + k];
          if (ws <= 0.0001) { side[i] = -1; continue; } if (ws >= 0.9999) { side[i] = 1; continue; }
          const dist = (P.getX(i) - o.x) * dir.x + (P.getY(i) - o.y) * dir.y + (P.getZ(i) - o.z) * dir.z, mine = dist < 0 ? -1 : 1; side[i] = mine;
          let sum = 0; const w = [0, 0, 0, 0]; for (let k = 0; k < 4; k++) { const inS = sub.has(SI4[i * 4 + k]); if ((mine > 0) === inS) { w[k] = SW4[i * 4 + k]; sum += w[k]; } }
          if (sum < 1e-4) { SIa.setXYZW(i, mine > 0 ? body.list.indexOf(sg) : body.list.indexOf(par), 0, 0, 0); SWa.setXYZW(i, 1, 0, 0, 0); } else SWa.setXYZW(i, w[0] / sum, w[1] / sum, w[2] / sum, w[3] / sum);
        }
        const idx = geo.index.array, keep = [];
        for (let t = 0; t < idx.length; t += 3) { const a = side[idx[t]], b = side[idx[t + 1]], c = side[idx[t + 2]]; if (a === b && b === c) keep.push(idx[t], idx[t + 1], idx[t + 2]); }
        geo.setIndex(keep); SIa.needsUpdate = SWa.needsUpdate = true; body.dirty = true;
        // the two raw ends
        const mat = new THREE.MeshStandardMaterial({ map: stumpTex(STUMP_BONES[segName.replace(/[LR]$/, '')] || [[0, 0, 12]]), normalMap: stumpN, roughness: 0.4, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
        const cap = (seg, sign) => { const m = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.86, 28), mat); /* a little inside the skin, so no rim shows */ m.position.copy(o).sub(seg.origin).addScaledVector(dir, sign * 0.004); m.quaternion.setFromUnitVectors(new V3(0, 0, 1), dir.clone().multiplyScalar(sign)); m.renderOrder = 2; seg.g.add(m); (body.stumps = body.stumps || []).push(m); return m; };
        cap(par, -1); cap(sg, 1);
      }
      // bloodied, torn tissue round the cut
      const col = geo.attributes.color, red = new THREE.Color(0x3a0405);
      for (let i = 0; i < P.count; i++) { const dx = P.getX(i) - o.x, dy = P.getY(i) - o.y, dz = P.getZ(i) - o.z, d = Math.abs(dx * dir.x + dy * dir.y + dz * dir.z), r = Math.hypot(dx, dy, dz); if (r < rad * 2.2 && d < (partial ? 0.05 : 0.04)) { const t = Math.min(1, Math.max(0, 1 - d / 0.05) * 1.1); col.setXYZ(i, col.getX(i) + (red.r - col.getX(i)) * t, col.getY(i) + (red.g - col.getY(i)) * t, col.getZ(i) + (red.b - col.getZ(i)) * t); } }
      col.needsUpdate = true; body.dirty = true;
      return { at: o.clone(), dir, rad, parent: par };
    };
    // ---- eyes. A bullet through the globe ruptures it: it collapses, dark with blood. Passing close behind it, the
    // bleeding in the orbit pushes it forward (proptosis) and floods the white with blood. A powerful round through
    // the orbit can push it right out of the socket (then it is drawn by viscera.js, hanging by the optic nerve).
    body.eyeWorld = (e, out) => out.copy(e.g.position).applyMatrix4(body.segs.head.g.matrixWorld);
    body.eyeRupture = (e) => { if (e.state === 'out') return; e.state = 'ruptured'; e.ball.scale.set(0.9, 0.7, 0.45); e.ball.material.color.set(0x4a0c0c); e.ball.material.roughness = 0.25; e.disc.material.color.set(0x2a1010); e.disc.scale.setScalar(0.8); e.pupil.visible = false; e.cornea.visible = false; e.g.position.z = e.p0.z - e.r * 0.35; };
    body.eyeBlood = (e, k) => { if (e.state === 'ruptured' || e.state === 'out') return; e.ball.material.color.setRGB(0.9 - 0.25 * k, 0.86 - 0.78 * k, 0.82 - 0.74 * k); }; // the white floods with blood (subconjunctival haemorrhage)
    body.eyeForward = (e, mm) => { if (e.state === 'ruptured' || e.state === 'out') return; e.state = 'proptosed'; e.g.position.z = e.p0.z + Math.min(5, mm) / 1000; };
    body.eyeOut = (e) => { e.state = 'out'; e.g.visible = false; };
    body.resetEyes = () => { for (const e of body.eyes || []) { e.state = null; e.g.visible = true; e.g.position.copy(e.p0); e.ball.scale.set(1, 1, 1); e.ball.material.color.set(0xe6e0d8); e.ball.material.roughness = 0.3; e.disc.material.color.set(0xffffff); e.disc.scale.setScalar(1); e.pupil.visible = true; e.cornea.visible = true; } };
    // blood on a hand: palm and fingers first (they did the pressing), creeping onto the back of the hand and wrist
    const handCache = {}, bloodC2 = new THREE.Color(0x3a0405);
    body.bloodyHand = (side, k) => {
      const hm = body.human; if (!hm) return;
      const geo = hm.geometry, P = geo.attributes.position, col = geo.attributes.color, SI4 = geo.attributes.skinIndex.array, SW4 = geo.attributes.skinWeight.array;
      if (!handCache[side]) {
        const hi = body.list.indexOf(body.segs['hand' + side]), fi = body.list.indexOf(body.segs['farmX' + side]), lst = [], sg = side === 'L' ? 1 : -1;
        for (let i = 0; i < P.count; i++) {
          let wh = 0, wf = 0; for (let q = 0; q < 4; q++) { if (SI4[i * 4 + q] === hi) wh += SW4[i * 4 + q]; if (SI4[i * 4 + q] === fi) wf += SW4[i * 4 + q]; }
          if (wh + wf < 0.3) continue;
          const palm = Math.max(0, -(P.getX(i) - sg * 0.2) * sg * 30 + 0.5), noise = 0.75 + 0.5 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1);
          const reach = wh > 0.5 ? Math.min(1, 0.55 + 0.6 * palm) : Math.max(0, (0.87 + 0.08 - P.getY(i)) / 0.08) * 0.6; // wrist and lower forearm only a little
          lst.push([i, reach * noise, col.getX(i), col.getY(i), col.getZ(i)]);
        }
        handCache[side] = lst;
      }
      for (const [i, wgt, r, g, b] of handCache[side]) { const t = Math.min(0.92, k * wgt * 1.2); col.setXYZ(i, r + (bloodC2.r - r) * t, g + (bloodC2.g - g) * t, b + (bloodC2.b - b) * t); }
      col.needsUpdate = true; body.dirty = true;
    };
    // fingers closing: the skin has no finger bones, so the finger vertices of the rest-pose mesh are bent toward the
    // palm about the three finger joints (knuckle, middle, end), from the tip in, so each bend carries the joints
    // beyond it. In the rest pose the hand hangs palm-in: the fingers run down from the knuckle line (y ~ 0.775) in a
    // row front to back, and close toward the body's midline. k: 0 open, ~0.2 relaxed, 1 a full grip round a handle.
    const gripCache = {}, gripK = { L: 0, R: 0 };
    const JOINTS = [[0, 1.0], [0.045, 1.35], [0.072, 0.85]]; // distance below the knuckle line, full-grip angle (rad)
    body.setGrip = (side, k) => {
      const hm = body.human; if (!hm) return;
      k = Math.round(Math.max(0, Math.min(1, k)) * 10) / 10; if (k === gripK[side] && !body.gripDirty) return; gripK[side] = k;
      const geo = hm.geometry, Pa = geo.attributes.position, R0 = body.skin0.pos, sg = side === 'L' ? 1 : -1, yK = 0.776;
      if (!gripCache[side]) {
        const SI4 = geo.attributes.skinIndex.array, SW4 = geo.attributes.skinWeight.array, hi = body.list.indexOf(body.segs['hand' + side]), lst = [];
        for (let i = 0; i < Pa.count; i++) { let wh = 0; for (let q = 0; q < 4; q++) if (SI4[i * 4 + q] === hi) wh += SW4[i * 4 + q]; if (wh < 0.5) continue; const x = R0[i * 3] * sg, y = R0[i * 3 + 1]; if (y < yK + 0.004 && x > 0.163) lst.push(i); } // the four fingers, not the thumb (it sits further in and higher)
        gripCache[side] = lst;
      }
      const cx = 0.2 * sg, th = sg * -1; // bend toward the midline: about +z for the right hand, -z for the left
      for (const i of gripCache[side]) {
        let x = R0[i * 3], y = R0[i * 3 + 1]; const s = yK - y;
        for (let j = JOINTS.length - 1; j >= 0; j--) {
          const [d, A] = JOINTS[j]; if (s <= d) continue; const a = th * A * k * Math.min(1, (s - d) / 0.012), py = yK - d, c = Math.cos(a), sn = Math.sin(a), dx = x - cx, dy = y - py;
          x = cx + dx * c - dy * sn; y = py + dx * sn + dy * c;
        }
        Pa.array[i * 3] = x; Pa.array[i * 3 + 1] = y;
      }
      Pa.needsUpdate = true; geo.computeVertexNormals(); body.gripDirty = false;
    };
    // bruising round both eyes from a fractured skull base ("raccoon eyes"): painted into the skin, deepening with k
    let orb = null; const purple = new THREE.Color(0x3c1a30);
    body.periorbital = (k) => {
      const hm = body.human; if (!hm || !body.eyes) return;
      const col = hm.geometry.attributes.color, pos = hm.geometry.attributes.position;
      if (!orb) { orb = []; for (let i = 0; i < pos.count; i++) for (const e of body.eyes) { const dx = pos.getX(i) - e.c.x, dy = (pos.getY(i) - e.c.y) * (pos.getY(i) < e.c.y ? 0.8 : 1.6), dz = pos.getZ(i) - e.c.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < 0.03 && pos.getZ(i) > e.c.z - 0.02) { orb.push([i, Math.min(1, (0.03 - d) / 0.012), col.getX(i), col.getY(i), col.getZ(i)]); break; } } }
      for (const [i, w, r, g, b] of orb) { const t = Math.min(1, k * w); col.setXYZ(i, r + (purple.r - r) * t, g + (purple.g - g) * t, b + (purple.b - b) * t); }
      col.needsUpdate = true; body.dirty = true;
    };
    // ---- a skull burst open by a high-energy round: the temporary cavity in the closed skull blows the bone out.
    // A large ragged defect with brain and blood inside and the edge of the skull showing; around it the scalp and
    // bone fragments are pushed outward; scalp tears radiate from the defect.
    const brainC = new THREE.Color(0x8a6a66), bloodC = new THREE.Color(0x2e0304), boneC = new THREE.Color(0xc9bba0), tearC = new THREE.Color(0x250203), darkC = new THREE.Color(0x120101);
    body.burst = (w, R, tears) => {
      const hm = body.human; if (!hm) return;
      const geo = hm.geometry, pos = geo.attributes.position, col = geo.attributes.color, SIa = geo.attributes.skinIndex.array, SWa = geo.attributes.skinWeight.array, hi = body.list.indexOf(body.segs.head);
      const p = w.g.position.clone().add(w.seg.origin), hc = new V3(0, 1.69, -0.005), rad = new V3(), q = new V3();
      const rays = []; const t0 = new V3().subVectors(p, hc).normalize(), a1 = new V3(0, 1, 0).cross(t0).normalize(), a2 = new V3().crossVectors(t0, a1);
      for (let k = 0; k < tears; k++) { const an = (k / tears) * 6.283 + Math.random() * 0.8; rays.push({ d: a1.clone().multiplyScalar(Math.cos(an)).addScaledVector(a2, Math.sin(an)), L: R * (0.8 + Math.random() * 1.2) }); }
      for (let i = 0; i < pos.count; i++) {
        let m = 0, bd = 0; for (let k = 0; k < 4; k++) if (SWa[i * 4 + k] > m) { m = SWa[i * 4 + k]; bd = SIa[i * 4 + k]; }
        if (bd !== hi) continue;
        q.set(pos.getX(i), pos.getY(i), pos.getZ(i)); const d = q.distanceTo(p); if (d > R * 2.4) continue;
        rad.subVectors(q, hc).normalize(); const jag = 0.7 + 0.6 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1), c0 = new THREE.Color(col.getX(i), col.getY(i), col.getZ(i));
        if (d < R * jag) {
          const u = d / R; q.addScaledVector(rad, -R * 0.55 * (1 - u * u) * jag); // the open defect
          c0.copy(u < 0.35 ? darkC : u < 0.8 ? (Math.random() < 0.5 ? brainC : bloodC) : boneC).lerp(bloodC, Math.random() * 0.5);
        } else if (d < R * 1.8) {
          const u = (d - R) / (R * 0.8); q.addScaledVector(rad, 0.016 * (1 - u) * jag * jag); // bone and scalp everted round the edge, in ragged pieces
          c0.lerp(bloodC, 0.97 * (1 - u * 0.25));
        } else {
          // radiating scalp tears
          for (const r of rays) { q.sub(p); const along = q.dot(r.d), off = Math.sqrt(Math.max(0, q.lengthSq() - along * along)); q.add(p); if (along > 0 && along < R + r.L && off < 0.004 * (1 - along / (R + r.L) * 0.5)) { q.addScaledVector(rad, -0.003); c0.lerp(tearC, 0.9); break; } }
          if (d < R * 2.4) c0.lerp(bloodC, 0.6 * (1 - (d - R * 1.8) / (R * 0.6)));
        }
        pos.setXYZ(i, q.x, q.y, q.z); col.setXYZ(i, c0.r, c0.g, c0.b);
      }
      pos.needsUpdate = col.needsUpdate = true; geo.computeVertexNormals(); body.dirty = true; w.crater = R; w.burst = true;
      // the geometry is the wound now: no flat decal or pool painted over it
      for (const ch of w.g.children) ch.visible = false;
      // the hair over the defect goes with the scalp (tucked inside the skull, out of sight)
      for (const hm2 of body.hairs || []) {
        const hp = hm2.geometry.attributes.position; if (!hm2.userData.pos0) hm2.userData.pos0 = hp.array.slice();
        for (let i = 0; i < hp.count; i++) { q.set(hp.getX(i), hp.getY(i), hp.getZ(i)); if (q.distanceTo(p) < R * 1.2) hp.setXYZ(i, hc.x, hc.y, hc.z); }
        hp.needsUpdate = true;
      }
    };
    body.growStain = (w, ml) => {
      if (w.cloth) {
        // cotton holds roughly 1 mL per 4-5 cm^2 before it drips: the patch spreads with the square root of the volume
        const r = Math.min(0.11, w.base * Math.min(1, ml / 0.3) + Math.sqrt(ml) * 0.0075);
        if (r - (w.soakR || 0) > 0.004) { w.soakR = r; paintSoak(w, r); }
        return;
      }
      // with the skin-blood model (skinblood.js) the volume feeds the pool and the rivulets there
      if (body.bloodTick) { w.feed += ml - w.seen; w.seen = ml; return; }
      // fallback: a rim first, then a trickle that runs downhill
      const r = Math.min(0.045, w.base * Math.min(1, ml / 0.4) + Math.sqrt(ml) * 0.0022), L = w.run && ml > 0.6 ? Math.min(0.13, Math.sqrt(ml - 0.6) * 0.012) : 0;
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
      if (body.resetEyes) body.resetEyes();
      if (body.cut0 && body.human) { const g = body.human.geometry; g.attributes.skinIndex.array.set(body.cut0.si); g.attributes.skinWeight.array.set(body.cut0.sw); g.attributes.skinIndex.needsUpdate = g.attributes.skinWeight.needsUpdate = true; g.setIndex(new THREE.BufferAttribute(body.cut0.idx.slice(), 1)); body.cut0 = null; }
      for (const m of body.stumps || []) m.parent && m.parent.remove(m); body.stumps = [];
      for (const hm2 of body.hairs || []) if (hm2.userData.pos0) { hm2.geometry.attributes.position.array.set(hm2.userData.pos0); hm2.geometry.attributes.position.needsUpdate = true; }
      if (body.human && body.dirty) { body.gripDirty = true; const g = body.human.geometry; g.attributes.position.array.set(body.skin0.pos); g.attributes.color.array.set(body.skin0.col); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; g.computeVertexNormals(); body.dirty = false; }
      for (const sg of body.list) if (sg.dirty && sg.skin) { const g = sg.skin.geometry; g.attributes.position.array.set(sg.skin0.pos); g.attributes.color.array.set(sg.skin0.col); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; g.computeVertexNormals(); sg.dirty = false; } for (const w of body.wounds) { w.seg.g.remove(w.g); if (w.track) w.seg.g.remove(w.track); if (w.soak) { w.soak.parent.remove(w.soak); w.soak.geometry.dispose(); } } body.wounds.length = 0; if (body.clearBlood) body.clearBlood(); };
    body.updateMatrices();
    if (G.skinBlood) G.skinBlood(body);
    return body;
  };
})();
