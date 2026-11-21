// Dealey Plaza, Dallas, as it was at 12:30 pm on Friday 22 November 1963: a reconstruction for the forensic replay.
// Layout fitted to the Warren Commission survey figures: the sixth-floor south-east window of the Texas School Book
// Depository about 18-20 m above Elm Street; the presidential limousine about 52 m (horizontal) from the window at
// the second shot (Zapruder frames ~210-225) and about 79 m at the third (Z313), at about 11 mph (4.9 m/s), going
// almost directly away from the window down Elm Street. North is -z, east is +x. The street is drawn level (Elm
// falls about 3 m toward the underpass; the window height is set against the street at the shots instead).
(function () {
  const G = (window.GSW = window.GSW || {});
  const V3 = THREE.Vector3;
  G.buildDealey = function (scene, renderer) {
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    let seed = 1963; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const canvasTex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
    const noise = (x, w, h, n, a, dark) => { for (let i = 0; i < n; i++) { const g = dark ? 0 : 255; x.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + a * rnd() + ')'; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } };
    const D = { root, colliders: [] };
    const add = (m, shadow = true) => { if (shadow) m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); root.add(m); return m; };
    const box = (w, h, d, mat, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; return add(m); };
    const solid = (b) => D.colliders.push({ box: b });
    // ---- the route: north up Houston Street, a slow 120-degree left turn at the Depository, then down Elm Street
    const d = new V3(-0.867, 0, 0.498).normalize(), P210 = new V3(-37.0, 0, 36.5);
    const R = 9, cornerC = new V3(1, 0, 25.1), T1 = new V3(10, 0, 25.1), T2 = new V3(-3.5, 0, 17.3);
    const sA = 120 - 25.1, sArc = R * (2 * Math.PI / 3), sE0 = sA + sArc;
    D.sAt = { e0: sE0, z210: sE0 + new V3().subVectors(P210, T2).dot(d) };
    D.sAt.z313 = D.sAt.z210 + 27.6;
    D.path = (s) => {
      if (s < sA) return { p: new V3(10, 0, 120 - s), ry: Math.PI };
      if (s < sE0) { const u = (s - sA) / sArc, ph = -u * (2 * Math.PI / 3); return { p: new V3(cornerC.x + R * Math.cos(ph), 0, cornerC.z + R * Math.sin(ph)), ry: Math.PI + u * (2 * Math.PI / 3) }; }
      return { p: T2.clone().addScaledVector(d, s - sE0), ry: Math.atan2(d.x, d.z) };
    };
    D.dir = d; D.P210 = P210;
    // the sixth-floor window: the easternmost window on the south face, lower sash raised
    D.window = new V3(-1.6, 19.6, 0.55);
    // ---- materials
    const grassTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#5f7a3a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { x.fillStyle = 'rgba(' + (70 + rnd() * 50) + ',' + (95 + rnd() * 50) + ',' + (40 + rnd() * 25) + ',0.6)'; x.fillRect(rnd() * w, rnd() * h, 1, 2); } }, true); grassTex.repeat.set(60, 60);
    const grass = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 });
    const asphTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#55575a'; x.fillRect(0, 0, w, h); noise(x, w, h, 6000, 0.12); noise(x, w, h, 5000, 0.2, true); }, true); asphTex.repeat.set(8, 8);
    const asph = new THREE.MeshStandardMaterial({ map: asphTex, roughness: 0.9 });
    const concrete = new THREE.MeshStandardMaterial({ color: 0xc8c2b4, roughness: 0.9 });
    const brick = (base) => canvasTex(256, 512, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { x.fillStyle = 'rgba(40,20,10,0.18)'; x.fillRect(0, y, w, 1); } noise(x, w, h, 6000, 0.08, true); });
    const facade = (base, floors, cols, arched) => canvasTex(256, 512, (x, w, h) => {
      x.fillStyle = base; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 3) { x.fillStyle = 'rgba(40,20,10,0.12)'; x.fillRect(0, y, w, 1); } noise(x, w, h, 6000, 0.08, true);
      const fh = h / floors, cw = w / cols;
      for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) { const wx = c * cw + cw * 0.2, wy = f * fh + fh * 0.2, ww = cw * 0.6, wh = fh * 0.62; x.fillStyle = '#d8d2c2'; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6); x.fillStyle = '#26323a'; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(200,215,225,0.25)'; x.fillRect(wx, wy, ww, wh * 0.45); x.fillStyle = '#d8d2c2'; x.fillRect(wx, wy + wh * 0.48, ww, 3); }
      if (arched) { x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(0, h - fh, w, fh); }
    });
    const bldg = (x0, x1, z0, z1, h, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), mat); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); add(m); solid(new THREE.Box3(new V3(x0, 0, z0), new V3(x1, h, z1))); return m; };
    // ---- ground: grass everywhere, streets on top
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), grass); gnd.rotation.x = -Math.PI / 2; gnd.position.set(-40, -0.01, 60); gnd.receiveShadow = true; root.add(gnd);
    const strip = (pts, hw, mat, y) => { // a road along a polyline
      const P = [], I = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = new V3().subVectors(b, a).normalize(), n = new V3(-t.z, 0, t.x); P.push(pts[i].x + n.x * hw, y, pts[i].z + n.z * hw, pts[i].x - n.x * hw, y, pts[i].z - n.z * hw); if (i) { const k = i * 2; I.push(k - 2, k, k - 1, k - 1, k, k + 1); } } // (wound to face up)
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); const uv = []; for (let i = 0; i < pts.length; i++) uv.push(i * 0.5, 0, i * 0.5, 1); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(I); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; root.add(m); return m;
    };
    const elmPts = []; for (let s = sA - 18; s <= sE0 + 160; s += 2) elmPts.push(D.path(s).p);
    strip(elmPts, 6.2, asph, 0.03); strip(elmPts, 8.4, concrete, 0.015); // Elm Street with its sidewalks
    const hou = new THREE.Mesh(new THREE.PlaneGeometry(16, 190), asph); hou.rotation.x = -Math.PI / 2; hou.position.set(10.5, 0.03, 40); hou.receiveShadow = true; root.add(hou);
    const houS = new THREE.Mesh(new THREE.PlaneGeometry(21, 190), concrete); houS.rotation.x = -Math.PI / 2; houS.position.set(10.5, 0.015, 40); houS.receiveShadow = true; root.add(houS);
    // Main and Commerce: from Houston west across the plaza, converging on the triple underpass with Elm
    const under = new V3(-128, 0, 96);
    const curve = (a, b, bend) => { const out = []; for (let i = 0; i <= 40; i++) { const u = i / 40, p = a.clone().lerp(b, u); p.z += Math.sin(u * Math.PI) * bend; out.push(p); } return out; };
    const mainPts = curve(new V3(25, 0, 64), new V3(under.x, 0, under.z + 6), 4), comPts = curve(new V3(25, 0, 112), new V3(under.x, 0, under.z + 16), -3);
    strip(mainPts, 6.5, asph, 0.03); strip(comPts, 6.5, asph, 0.03);
    // reflecting pools and the peristyles at the plaza's east end
    for (const [x, z] of [[-6, 54], [-6, 104]]) { const pool = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ color: 0x4f7f8a, roughness: 0.1, metalness: 0.3 })); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.05, z); root.add(pool); box(15, 0.5, 0.4, concrete, x, 0.25, z - 3.2); box(15, 0.5, 0.4, concrete, x, 0.25, z + 3.2); }
    // ---- the grassy knoll: the slope north of Elm rising to the pergola and the picket fence
    { const P = [], I = [], NX = 30, NZ = 10; for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const s = D.sAt.z210 - 34 + i * 4.2, base = D.path(s).p, off = 8.6 + j * 3.2, ends = Math.min(1, Math.max(0, i / 4), Math.max(0, (NX - i) / 4)), h = ends * Math.min(3.4, Math.max(0, (off - 9) * 0.22)); const p = base.clone().addScaledVector(new V3(-d.z, 0, d.x), off); P.push(p.x, h, p.z); }
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, e = c + 1; I.push(a, c, b, b, c, e); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); const uv = []; for (let k = 0; k < P.length / 3; k++) uv.push(P[k * 3] / 4, P[k * 3 + 2] / 4); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(I); g.computeVertexNormals();
      const knoll = new THREE.Mesh(g, grass.clone()); knoll.material.side = THREE.DoubleSide; knoll.receiveShadow = true; root.add(knoll); }
    const nrm = new V3(-d.z, 0, d.x); // the north side of Elm (the knoll side; the car's right)
    D.knollH = (p) => { const s = new V3().subVectors(p, P210).dot(d), base = P210.clone().addScaledVector(d, s), off = new V3().subVectors(p, base).dot(nrm); return Math.min(3.4, Math.max(0, (off - 9) * 0.22)); };
    // the concrete pergola (a curved colonnade) and Abraham Zapruder's pedestal at its west end
    const zap = D.path(D.sAt.z313).p.clone().addScaledVector(nrm, 21); zap.y = 3.0;
    D.zapruder = new V3(zap.x, 3.0 + 1.25 + 1.5, zap.z);
    box(1.2, 1.25, 1.2, concrete, zap.x, 3.0 + 0.62, zap.z);
    { const pc = zap.clone().addScaledVector(d, -10).addScaledVector(nrm, 3); for (let k = 0; k < 9; k++) { const a = -0.3 + k * 0.22, p = pc.clone().add(new V3(Math.cos(a) * 9 * d.x + Math.sin(a) * 9 * nrm.x, 0, Math.cos(a) * 9 * d.z + Math.sin(a) * 9 * nrm.z)); box(0.45, 3.2, 0.45, concrete, p.x, 3.4 + 1.6, p.z); }
      const beam = box(16, 0.5, 1.2, concrete, pc.x + nrm.x * 6, 3.4 + 3.4, pc.z + nrm.z * 6, Math.atan2(d.x, d.z) + Math.PI / 2); }
    // the stockade picket fence along the top of the knoll toward the railroad yards
    { const fenceMat = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#d9d3c4'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 8) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(i, 0, 1, h); } }, true), roughness: 0.9 });
      const a = zap.clone().addScaledVector(nrm, 6).addScaledVector(d, 4), b = a.clone().addScaledVector(d, 45).addScaledVector(nrm, 5), L = a.distanceTo(b); const f = box(L, 1.55, 0.08, fenceMat, (a.x + b.x) / 2, 3.4 + 0.78, (a.z + b.z) / 2, Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2); f.material.map.repeat.set(L / 2, 1); }
    // ---- buildings
    const tsbdMat = new THREE.MeshStandardMaterial({ map: facade('#8a4a33', 7, 7, true), roughness: 0.85 });
    const tsbd = bldg(-31, 0.4, -30, 0.4, 23.2, tsbdMat); // Texas School Book Depository: seven storeys of red brick
    box(32, 0.9, 31, new THREE.MeshStandardMaterial({ color: 0x6a3a28, roughness: 0.9 }), -15.3, 23.6, -14.8);
    // the Hertz rent-a-car sign and clock on the roof
    { const s = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 0.3), new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#e8c33a'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.fillText('Hertz', w / 2, 47); }), roughness: 0.6 })); s.position.set(-8, 26.2, -2); add(s); }
    const dalTex = bldg(18.5, 46, -32, 1.5, 25, new THREE.MeshStandardMaterial({ map: facade('#9a6a4c', 7, 6), roughness: 0.85 }));
    bldg(18.5, 52, 22, 58, 33, new THREE.MeshStandardMaterial({ map: facade('#b8ad98', 9, 6), roughness: 0.85 })); // County Records
    bldg(18.5, 52, 72, 106, 30, new THREE.MeshStandardMaterial({ map: facade('#c2b59c', 8, 6), roughness: 0.85 })); // Criminal Courts
    bldg(-120, -60, 136, 170, 18, new THREE.MeshStandardMaterial({ map: facade('#b9b1a0', 5, 7), roughness: 0.85 })); // post office annex
    bldg(-31, -10, -60, -32, 14, new THREE.MeshStandardMaterial({ map: facade('#8b5a3e', 4, 5), roughness: 0.85 }));
    // ---- the triple underpass: the railroad bridge across Elm, Main and Commerce
    { const ub = box(11, 1.6, 62, concrete, under.x - 4, 6.6, under.z + 4, Math.atan2(d.x, d.z)); const rail = box(10, 0.5, 62, new THREE.MeshStandardMaterial({ color: 0x5b5148, roughness: 0.9 }), under.x - 4, 7.65, under.z + 4, Math.atan2(d.x, d.z));
      for (const k of [-24, -8, 8, 24]) { const p = new V3(under.x - 4, 0, under.z + 4).addScaledVector(nrm, k * 0.8); box(1, 6, 1.5, concrete, p.x, 3, p.z); } }
    // ---- trees: the live oaks; the one in front of the Depository hid Elm Street from the window around Z166-210
    const oak = (x, z, r, h) => { const g = new THREE.Group(); g.position.set(x, 0, z); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h * 0.55, 8), new THREE.MeshStandardMaterial({ color: 0x4d3b2a, roughness: 0.95 })); tr.position.y = h * 0.27; g.add(tr);
      const leaf = new THREE.MeshStandardMaterial({ color: 0x3f5a2a, roughness: 0.9 }); for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.55 + rnd() * 0.35), 1), leaf); b.position.set((rnd() - 0.5) * r, h * 0.62 + (rnd() - 0.2) * r * 0.6, (rnd() - 0.5) * r); g.add(b); } add(g); return g; };
    D.oak = oak(-20.5, 21.5, 4.6, 11.5);
    D.oakBox = new THREE.Box3(new V3(-25, 5.5, 17), new V3(-16, 12.5, 26));
    for (const [x, z, r, h] of [[-48, 18, 4, 10], [-90, 50, 4.5, 10], [-30, 70, 4, 9], [-60, 90, 5, 11], [-15, 80, 4, 9], [-80, 115, 4, 9], [-100, 70, 4, 10]]) oak(x, z, r, h);
    // ---- the Stemmons Freeway sign on the north side of Elm (it hid the car from Zapruder around Z210-225)
    { const p = D.path(D.sAt.z210 + 4).p.clone().addScaledVector(nrm, 6.5); const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(256, 140, (x, w, h) => { x.fillStyle = '#1f5f3a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#eee'; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = '#eee'; x.textAlign = 'center'; x.font = 'bold 26px sans-serif'; x.fillText('KEEP RIGHT', w / 2, 44); x.fillText('STEMMONS FWY', w / 2, 82); x.font = 'bold 20px sans-serif'; x.fillText('EXIT ONLY', w / 2, 116); }), roughness: 0.6 }));
      sign.position.set(p.x, 2.55, p.z); sign.rotation.y = Math.atan2(nrm.x, nrm.z); add(sign); for (const k of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x777, metalness: 0.6, roughness: 0.4 })); post.position.copy(p).addScaledVector(d, k * 1.1); post.position.y = 1.3; add(post); } }
    // street lamps (the plaza's tall light standards) along Elm
    for (let s = D.sAt.e0 + 6; s < D.sAt.e0 + 130; s += 22) for (const k of [-1, 1]) { const p = D.path(s).p.clone().addScaledVector(nrm, k * 7.8); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 7, 8), new THREE.MeshStandardMaterial({ color: 0x5a5d5e, metalness: 0.5, roughness: 0.5 })); pole.position.set(p.x, 3.5 + (k > 0 ? D.knollH(p) : 0), p.z); add(pole); }
    // ---- the sniper's nest: book cartons stacked round the window, and the rifle resting on one
    { const card = new THREE.MeshStandardMaterial({ color: 0xb7955f, roughness: 0.9 }), w = D.window; for (const [x, y, z] of [[-0.9, 0, -0.9], [-2.2, 0, -0.9], [-0.9, 0.36, -1.0], [-3.4, 0, -1.4], [-1.5, 0, -2.4], [-2.6, 0.36, -2.3], [-1.1, 0, -0.45]]) box(0.45, 0.36, 0.33, card, w.x + x + 1.5, 16.95 + y + 0.18, w.z + z); }
    // the open window (lower sash raised)
    { const frame = new THREE.MeshStandardMaterial({ color: 0x3b3027, roughness: 0.8 }); box(1.3, 0.08, 0.15, frame, D.window.x, D.window.y - 0.75, 0.42); box(1.3, 0.08, 0.15, frame, D.window.x, D.window.y + 0.35, 0.42); }
    // Mannlicher-Carcano M91/38: walnut stock, 21-inch barrel, a 4x Ordnance Optics scope mounted to the left
    { const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.55 }), steel = new THREE.MeshStandardMaterial({ color: 0x1d1f21, roughness: 0.35, metalness: 0.8 });
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.75), wood); stock.position.z = 0.12; const butt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.26), wood); butt.position.set(0, -0.04, 0.55); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.6, 10), steel); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.45);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 12), steel); scope.rotation.x = Math.PI / 2; scope.position.set(-0.035, 0.06, 0.02); const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), steel); bolt.rotation.z = Math.PI / 2; bolt.position.set(0.04, 0.03, 0.15);
      g.add(stock, butt, barrel, scope, bolt); g.traverse((o) => { o.castShadow = true; }); g.position.copy(D.window).add(new V3(0, -0.55, -0.35)); root.add(g); D.rifle = g; D.muzzle = () => g.localToWorld(new V3(0, 0.02, -0.76)); }
    // ---- the cars. SS-100-X: the presidential 1961 Lincoln Continental, a 21.5-ft stretched four-door convertible in
    // midnight blue, top down, two flags on the front fenders, a steel hand bar across behind the front seat
    const mkCar = (o) => {
      const g = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.22, metalness: 0.55 }), chrome = new THREE.MeshStandardMaterial({ color: 0xd7dadc, roughness: 0.12, metalness: 1 }), tyre = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }), white = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.6 }), seat = new THREE.MeshStandardMaterial({ color: o.seat || 0x2a2a30, roughness: 0.7 });
      const L = o.L, W = o.W;
      // the body: solid under the hood and the rear deck, an open tub between them (floor, sides) so the people sit in it
      const fz = L * 0.17, rz = -L * 0.32, mid = (fz + rz) / 2, ml = fz - rz;
      const front = new THREE.Mesh(new THREE.BoxGeometry(W, 0.55, L / 2 - fz), paint); front.position.set(0, 0.55, (L / 2 + fz) / 2); g.add(front);
      const rear = new THREE.Mesh(new THREE.BoxGeometry(W, 0.55, L / 2 + rz), paint); rear.position.set(0, 0.55, (-L / 2 + rz) / 2); g.add(rear);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.1, ml), new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.95 })); floor.position.set(0, 0.11, mid); g.add(floor);
      for (const sx of [-1, 1]) { const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, ml), paint); door.position.set(sx * (W / 2 - 0.03), 0.46, mid); g.add(door); }
      const hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.12, L * 0.3), paint); hood.position.set(0, 0.86, L * 0.34); g.add(hood);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.1, L * 0.18), paint); deck.position.set(0, 0.86, -L * 0.41); g.add(deck);
      for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, L * 0.52), paint); side.position.set(sx * (W / 2 - 0.04), 0.98, -L * 0.04); g.add(side); const trim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, L * 0.97), chrome); trim.position.set(sx * (W / 2 + 0.005), 0.72, 0); g.add(trim); }
      for (const [z, s] of [[L / 2, 1], [-L / 2, -1]]) { const bump = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.14, 0.12), chrome); bump.position.set(0, 0.42, z + s * 0.04); g.add(bump); }
      const grille = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.22, 0.03), chrome); grille.position.set(0, 0.62, L / 2 + 0.01); g.add(grille);
      const ws = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.42, 0.02), new THREE.MeshStandardMaterial({ color: 0x9fb4bd, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 })); ws.position.set(0, 1.12, L * 0.17); ws.rotation.x = -0.35; g.add(ws);
      for (const [x, z] of [[W / 2, L * 0.33], [-W / 2, L * 0.33], [W / 2, -L * 0.3], [-W / 2, -L * 0.3]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 20), tyre); t.rotation.z = Math.PI / 2; t.position.set(x * 0.93, 0.38, z); const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.27, 20), white); wall.rotation.z = Math.PI / 2; wall.position.copy(t.position); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 14), chrome); hub.rotation.z = Math.PI / 2; hub.position.copy(t.position); g.add(t, wall, hub); }
      g.userData.seats = [];
      for (const r of o.seats || []) { const cush = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.14, 0.5), seat); cush.position.set(r.x, r.y - 0.07, r.z); const back = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.bh || 0.5, 0.12), seat); back.position.set(r.x, r.y + (r.bh || 0.5) / 2, r.z - 0.3); const base = new THREE.Mesh(new THREE.BoxGeometry(r.w * 0.9, Math.max(0.05, r.y - 0.2), 0.42), seat); base.position.set(r.x, (r.y - 0.14 + 0.16) / 2, r.z); g.add(cush, back, base); g.userData.seats.push({ cush, back, base }); }
      if (o.flags) for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6), chrome); pole.position.set(sx * (W / 2 - 0.15), 1.12, L / 2 - 0.35); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshStandardMaterial({ map: canvasTex(64, 40, (x, w, h) => { if (sx < 0) { for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? '#fff' : '#b22234'; x.fillRect(0, i * h / 13, w, h / 13); } x.fillStyle = '#3c3b6e'; x.fillRect(0, 0, w * 0.45, h * 0.54); } else { x.fillStyle = '#1d2f6f'; x.fillRect(0, 0, w, h); x.fillStyle = '#d8c070'; x.beginPath(); x.arc(w / 2, h / 2, 9, 0, 6.283); x.fill(); } }), side: THREE.DoubleSide })); fl.position.set(pole.position.x, 1.28, pole.position.z - 0.17); fl.rotation.y = Math.PI / 2; g.add(pole, fl); }
      if (o.bar) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, W * 0.9, 8), chrome); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.55, o.bar); g.add(bar); for (const sx of [-1, 1]) { const up = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 8), chrome); up.position.set(sx * W * 0.45, 1.24, o.bar); g.add(up); } }
      g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); root.add(g); return g;
    };
    // seats in the car's own frame (forward +z, the car's right is -x): rear seat for the President (right) and Mrs
    // Kennedy (left), jump seats for Governor and Mrs Connally, front seat for agents Greer (driving) and Kellerman
    D.limoSeats = { jfk: { x: -0.45, y: 0.7, z: -1.75 }, jackie: { x: 0.45, y: 0.7, z: -1.75 }, connally: { x: -0.36, y: 0.64, z: -1.05 }, nellie: { x: 0.38, y: 0.58, z: -1.0 }, greer: { x: 0.42, y: 0.62, z: 0.42 }, kellerman: { x: -0.42, y: 0.62, z: 0.42 } };
    D.limo = mkCar({ color: 0x141c33, seat: 0x1e2433, L: 6.5, W: 2.02, flags: true, bar: -0.3, seats: [{ x: 0, y: 0.7, z: -1.75, w: 1.7, bh: 0.55 }, { x: -0.36, y: 0.64, z: -1.05, w: 0.46, bh: 0.32 }, { x: 0.38, y: 0.58, z: -1.0, w: 0.46, bh: 0.32 }, { x: 0, y: 0.62, z: 0.42, w: 1.7, bh: 0.5 }] });
    D.leadCar = mkCar({ color: 0xe9e9e4, L: 5.3, W: 1.95, seats: [{ x: 0, y: 0.62, z: -0.9, w: 1.6 }, { x: 0, y: 0.62, z: 0.4, w: 1.6 }] });
    D.followCar = mkCar({ color: 0x15171a, L: 5.9, W: 2.0, seats: [{ x: 0, y: 0.62, z: -1.1, w: 1.6 }, { x: 0, y: 0.62, z: 0.4, w: 1.6 }] });
    D.vpCar = mkCar({ color: 0x5d6366, L: 5.6, W: 2.0, seats: [{ x: 0, y: 0.62, z: -1.1, w: 1.6 }, { x: 0, y: 0.62, z: 0.4, w: 1.6 }] });
    // the agents on the follow-up car's running boards, and simple figures for the crowd, motorcycle officers, Zapruder
    // people at a distance: torso, legs, arms, head and hair, sharing geometry; tone and hair vary
    const FG = { torso: new THREE.CylinderGeometry(0.17, 0.14, 1, 10), leg: new THREE.CylinderGeometry(0.068, 0.055, 1, 8), arm: new THREE.CylinderGeometry(0.048, 0.04, 1, 8), head: new THREE.SphereGeometry(0.1, 14, 10), hair: new THREE.SphereGeometry(0.104, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), shoe: new THREE.BoxGeometry(0.09, 0.06, 0.24) }, MC = {};
    const mat = (c, r) => MC[c + ':' + r] || (MC[c + ':' + r] = new THREE.MeshStandardMaterial({ color: c, roughness: r }));
    const SKIN = [0xd8ad8f, 0xc69a7c, 0xb07a5a, 0x8a5a3c, 0xe2bca0], HAIR = [0x2a1e18, 0x4a3426, 0x6a4a30, 0x9a9690, 0x1a1412];
    const figure = (col, h) => {
      const g = new THREE.Group(), k = h / 1.75, cloth = mat(col, 0.85), skin = mat(SKIN[Math.floor(rnd() * SKIN.length)], 0.7), pants = mat(rnd() < 0.5 ? 0x2c2c30 : col, 0.9), M = (geo, m, x, y, z, sx, sy, sz, rz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); if (rz) o.rotation.z = rz; o.castShadow = true; g.add(o); return o; };
      M(FG.torso, cloth, 0, h * 0.63, 0, k, h * 0.32, k * 0.75);
      for (const sx of [-1, 1]) { M(FG.leg, pants, sx * 0.085 * k, h * 0.24, 0, k, h * 0.47, k); M(FG.shoe, mat(0x18140f, 0.6), sx * 0.085 * k, 0.03, 0.04, k, 1, k); M(FG.arm, cloth, sx * 0.205 * k, h * 0.6, 0, k, h * 0.34, k, sx * 0.08); M(FG.head, skin, sx * 0.205 * k + sx * 0.012, h * 0.42, 0, 0.42 * k, 0.5 * k, 0.42 * k); }
      M(FG.head, skin, 0, h * 0.895, 0.005, k, 1.12 * k, k); M(FG.hair, mat(HAIR[Math.floor(rnd() * HAIR.length)], 0.9), 0, h * 0.9, -0.004, k, 1.1 * k, k);
      root.add(g); return g;
    };
    D.agents = [-1, 1].flatMap((sx) => [0.9, -0.6].map((z) => ({ g: figure(0x2a2c30, 1.8), x: sx * 1.12, z })));
    D.motor = [[-1.6, -2.4], [1.6, -2.4], [-1.6, -4.4], [1.6, -4.4]].map(([x, z]) => { const g = new THREE.Group(), blk = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.4 }), wht = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.5 }); const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.5), blk); body.position.y = 0.55; const tank = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.6), wht); tank.position.set(0, 0.8, 0.25); const shield = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.02), new THREE.MeshStandardMaterial({ color: 0xbfd0d8, transparent: true, opacity: 0.4 })); shield.position.set(0, 1.15, 0.62); shield.rotation.x = -0.25; const bags = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.4), wht); bags.position.set(0, 0.62, -0.62); g.add(tank, shield, bags); for (const z2 of [-0.75, 0.75]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.12, 14), blk); w.rotation.z = Math.PI / 2; w.position.set(0, 0.33, z2 * 1.0); g.add(w); } const rider = figure(0x2a3a5a, 1.75); rider.scale.set(0.95, 0.62, 0.95); rider.position.set(0, 0.5, -0.1); g.add(body, rider); root.add(g); return { g, x, z }; });
    const crowdCol = [0x6b6058, 0x2d3a4c, 0x8a7a5a, 0x5a2a2a, 0xc8b89a, 0x3a3a3a, 0x7a8a9a, 0xb06040];
    for (let s = D.sAt.e0 - 2; s < D.sAt.e0 + 90; s += 3.5 + rnd() * 6) for (const k of [-1, 1]) { if (rnd() < 0.45) continue; const p = D.path(s).p.clone().addScaledVector(nrm, k * (7.4 + rnd() * 1.2)); const f = figure(crowdCol[Math.floor(rnd() * crowdCol.length)], 1.6 + rnd() * 0.2); f.position.set(p.x, k > 0 ? D.knollH(p) : 0, p.z); f.rotation.y = Math.atan2(-nrm.x * k, -nrm.z * k); }
    for (let z = 30; z < 115; z += 2.5 + rnd() * 3) for (const x of [1.5, 19.5]) { if (rnd() < 0.3) continue; const f = figure(crowdCol[Math.floor(rnd() * crowdCol.length)], 1.6 + rnd() * 0.2); f.position.set(x + (rnd() - 0.5), 0, z); f.rotation.y = x < 10 ? Math.PI / 2 : -Math.PI / 2; }
    { const f = figure(0x3a3a40, 1.7); f.position.set(zap.x, 3.0 + 1.25, zap.z); f.rotation.y = Math.atan2(-nrm.x, -nrm.z); D.zapFig = f; }
    // ---- sky: clear and bright, the sun high in the south at half past noon in late November
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: 'varying vec3 vd; void main(){ float h = clamp(vd.y, 0.0, 1.0); vec3 c = mix(vec3(0.78,0.84,0.9), vec3(0.24,0.47,0.8), pow(h, 0.5)); gl_FragColor = vec4(c, 1.0); }' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), skyMat); sky.frustumCulled = false; root.add(sky);
    const sunDir = new V3(-0.05, 0.62, 0.78).normalize(), sun = new THREE.DirectionalLight(0xfff3e0, 1.7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 }); root.add(sun, sun.target);
    root.add(new THREE.HemisphereLight(0xb8d0ec, 0x7c7262, 0.62));
    D.follow = (p) => { sun.position.set(p.x + sunDir.x * 80, sunDir.y * 80, p.z + sunDir.z * 80); sun.target.position.set(p.x, 0, p.z); sun.target.updateMatrixWorld(); };
    { const es = new THREE.Scene(), eg = new THREE.SphereGeometry(50, 24, 12), pa = eg.attributes.position, col = []; for (let i = 0; i < pa.count; i++) { const h = Math.max(0, pa.getY(i) / 50), c = new THREE.Color(0.78, 0.82, 0.86).lerp(new THREE.Color(0.24, 0.47, 0.8), Math.pow(h, 0.5)); if (pa.getY(i) < 0) c.setRGB(0.4, 0.42, 0.33); col.push(c.r, c.g, c.b); } eg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); es.add(new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }))); const pm = new THREE.PMREMGenerator(renderer); D.env = pm.fromScene(es, 0.04).texture; pm.dispose(); }
    D.fog = new THREE.Fog(0xc8d2da, 120, 420);
    // bullets against the plaza: the ground, the buildings, the oak's canopy
    D.ray = (o0, d0, maxT) => { const o = new V3(o0.x, o0.y, o0.z), dir = new V3(d0.x, d0.y, d0.z); let best = maxT == null ? Infinity : maxT, n = null; const r = new THREE.Ray(o, dir), pt = new V3();
      if (dir.y < -1e-4) { const t = -o.y / dir.y; if (t > 1e-4 && t < best) { best = t; n = new V3(0, 1, 0); } }
      for (const c of D.colliders) if (r.intersectBox(c.box, pt)) { const t = pt.distanceTo(o); if (t > 0.5 && t < best) { best = t; const b = c.box, e = 0.02; n = new V3(Math.abs(pt.x - b.min.x) < e ? -1 : Math.abs(pt.x - b.max.x) < e ? 1 : 0, Math.abs(pt.y - b.max.y) < e ? 1 : 0, Math.abs(pt.z - b.min.z) < e ? -1 : Math.abs(pt.z - b.max.z) < e ? 1 : 0); if (!n.lengthSq()) n.set(0, 1, 0); } }
      return n ? { t: best, p: o.clone().addScaledVector(dir, best), n } : null; };
    return D;
  };
})();
