// Port Marlowe: a few sun-baked blocks of an original coastal town for the open-world mode. Built procedurally:
// asphalt streets with lane markings and crossings, pale concrete sidewalks, pastel stucco buildings with
// window grids, awnings and rooftop units, palm trees, street lamps, parked cars, benches and bins, a beach
// and the sea on the east side, under an afternoon sky. Everything solid is also a box collider (for the
// ragdolls, for line of sight and for bullets). Coordinates: metres, Y up.
(function () {
  const G = (window.GSW = window.GSW || {});
  const V3 = THREE.Vector3;
  G.buildCity = function (scene, renderer) {
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    let seed = 1337; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const canvasTex = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; };
    const noise = (x, w, h, n, a, dark) => { for (let i = 0; i < n; i++) { const g = dark ? 0 : 255; x.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + a * rnd() + ')'; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } };
    // ---- layout: a 3x3 grid of blocks separated by 12 m streets; sidewalks 3.5 m wide round every block
    const BLOCK = 40, ROAD = 12, SIDE = 3.5, N = 3, PITCH = BLOCK + SIDE * 2 + ROAD, HALF = (N * PITCH) / 2;
    const C = { root, colliders: [], walk: [], spawns: [], roads: [], bounds: { x0: -HALF - 6, x1: HALF + 40, z0: -HALF - 6, z1: HALF + 6 }, block: BLOCK, pitch: PITCH };
    const blockC = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) blockC.push([(i - 1) * PITCH, (j - 1) * PITCH]);
    // ---- ground: asphalt everywhere, sidewalks laid on top
    const asphalt = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#3b3d40'; x.fillRect(0, 0, w, h); noise(x, w, h, 9000, 0.12); noise(x, w, h, 6000, 0.25, true); for (let i = 0; i < 14; i++) { x.strokeStyle = 'rgba(20,20,22,0.35)'; x.lineWidth = 1 + rnd() * 2; x.beginPath(); let px = rnd() * w, py = rnd() * h; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (rnd() - 0.5) * 60; py += (rnd() - 0.5) * 60; x.lineTo(px, py); } x.stroke(); } }, true);
    asphalt.repeat.set(40, 40);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 40, HALF * 2 + 12), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.002, 0); ground.receiveShadow = true; root.add(ground);
    const pave = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#c9c2b4'; x.fillRect(0, 0, w, h); noise(x, w, h, 4000, 0.1, true); noise(x, w, h, 2000, 0.15); x.strokeStyle = 'rgba(90,85,78,0.55)'; x.lineWidth = 2; for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(0, k * 64); x.lineTo(w, k * 64); x.stroke(); x.beginPath(); x.moveTo(k * 64, 0); x.lineTo(k * 64, h); x.stroke(); } }, true);
    const paveMat = new THREE.MeshStandardMaterial({ map: pave, roughness: 0.85 });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xb5ad9e, roughness: 0.8 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xece6d2, roughness: 0.7 }), yellowMat = new THREE.MeshStandardMaterial({ color: 0xe0b433, roughness: 0.7 });
    const flat = (w, d, mat, x, z, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
    for (const [bx, bz] of blockC) {
      const s = BLOCK + SIDE * 2; const sw = flat(s, s, paveMat.clone(), bx, bz, 0.004); sw.material.map = pave.clone(); sw.material.map.needsUpdate = true; sw.material.map.repeat.set(s / 2, s / 2);
      // a low curb strip round the sidewalk edge (visual only: flush enough to walk over)
      for (const [w2, d2, ox, oz] of [[s, 0.18, 0, s / 2], [s, 0.18, 0, -s / 2], [0.18, s, s / 2, 0], [0.18, s, -s / 2, 0]]) { const cb = new THREE.Mesh(new THREE.BoxGeometry(w2, 0.03, d2), curbMat); cb.position.set(bx + ox, 0.015, bz + oz); cb.receiveShadow = true; root.add(cb); }
      // walking loop on the sidewalk, 1.4 m in from the kerb
      const r = BLOCK / 2 + SIDE - 1.4; C.walk.push([[bx - r, bz - r], [bx + r, bz - r], [bx + r, bz + r], [bx - r, bz + r]]);
    }
    // lane markings: dashed white centre lines, solid edge lines, zebra crossings at every junction
    const centres = [-PITCH / 2, PITCH / 2];
    for (const c of centres) {
      for (let t = -HALF; t < HALF; t += 4) { if (centres.some((o) => Math.abs(t + 1 - o) < ROAD / 2 + 1)) continue; flat(0.15, 2, yellowMat, c, t + 1, 0.006); flat(2, 0.15, yellowMat, t + 1, c, 0.006); }
      C.roads.push({ axis: 'z', c }, { axis: 'x', c });
      for (const o of centres) for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        // zebra crossing on each arm of each junction
        for (let s2 = -ROAD / 2 + 1; s2 < ROAD / 2 - 0.5; s2 += 1.1) { const along = ROAD / 2 + 1.6; if (dx) flat(2.6, 0.55, lineMat, c + dx * along, o + s2, 0.007); else flat(0.55, 2.6, lineMat, o + s2, c + dz * along, 0.007); }
      }
    }
    // ---- buildings: pastel stucco, window grids, awnings, roof units
    const PALETTE = ['#e9cfc0', '#f1e3c6', '#bfe0dc', '#f2c4c7', '#e5e1d8', '#cfe1ef', '#f3d8a8', '#d9c9e6', '#efefea', '#c8dcc2'];
    const facadeTex = (base, floors, cols, style) => canvasTex(256, 512, (x, w, h) => {
      x.fillStyle = base; x.fillRect(0, 0, w, h); noise(x, w, h, 5000, 0.06, true);
      const fh = h / floors, cw = w / cols;
      for (let f = 0; f < floors; f++) {
        if (style === 1) { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, f * fh + fh - 6, w, 4); } // deco bands
        for (let c = 0; c < cols; c++) {
          const wx = c * cw + cw * 0.18, wy = f * fh + fh * 0.22, ww = cw * 0.64, wh = fh * 0.56;
          x.fillStyle = 'rgba(40,40,40,0.3)'; x.fillRect(wx - 2, wy - 2, ww + 4, wh + 4); // frame shadow
          const g = x.createLinearGradient(wx, wy, wx + ww, wy + wh); const lit = rnd() < 0.12;
          g.addColorStop(0, lit ? '#f6e3b4' : '#2c4656'); g.addColorStop(0.5, lit ? '#e8c98e' : '#5f8aa0'); g.addColorStop(1, lit ? '#d9b46c' : '#1d3341');
          x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
          x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(wx + ww * 0.08, wy, ww * 0.12, wh); // reflection streak
          x.fillStyle = 'rgba(230,230,225,0.9)'; x.fillRect(wx + ww / 2 - 1, wy, 2, wh); // mullion
          if (style === 2 && rnd() < 0.5) { x.fillStyle = 'rgba(245,245,240,0.95)'; x.fillRect(wx - 4, wy + wh, ww + 8, 5); } // balcony ledge
        }
      }
      // ground floor: a shopfront
      x.fillStyle = 'rgba(30,30,30,0.85)'; x.fillRect(0, h - fh, w, fh); x.fillStyle = '#6f97a8'; x.fillRect(w * 0.06, h - fh * 0.9, w * 0.88, fh * 0.8);
      x.fillStyle = 'rgba(255,255,255,0.2)'; x.fillRect(w * 0.1, h - fh * 0.9, w * 0.1, fh * 0.8);
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.95 }), unitMat = new THREE.MeshStandardMaterial({ color: 0xb8bab6, roughness: 0.6, metalness: 0.3 });
    const AWN = ['#c9473f', '#2f7f8f', '#e8a23a', '#3e6db5', '#4c9a5e', '#d1d1cb'];
    const addCollider = (box, low) => C.colliders.push({ box, low: !!low, h: box.max.y - box.min.y });
    for (const [bx, bz] of blockC) {
      // 2x2 lots per block, some merged into one big building, with a courtyard gap now and then
      const lots = rnd() < 0.3 ? [[0, 0, BLOCK - 2, BLOCK - 2]] : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([u, v]) => [u * BLOCK / 4, v * BLOCK / 4, BLOCK / 2 - 2.5, BLOCK / 2 - 2.5]);
      for (const [ox, oz, w, d] of lots) {
        if (rnd() < 0.12) continue; // an empty lot (a little plaza)
        const floors = 2 + Math.floor(rnd() * (rnd() < 0.25 ? 9 : 4)), fh = 3.3, hgt = floors * fh, base = pick(PALETTE), style = Math.floor(rnd() * 3);
        const tex = facadeTex(base, floors, 4, style); tex.repeat.set(Math.max(1, Math.round(w / 8)), 1); tex.wrapS = THREE.RepeatWrapping;
        const texD = tex.clone(); texD.needsUpdate = true; texD.repeat.set(Math.max(1, Math.round(d / 8)), 1);
        const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), side2 = new THREE.MeshStandardMaterial({ map: texD, roughness: 0.85 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), [side2, side2, roofMat, roofMat, side, side]);
        m.position.set(bx + ox, hgt / 2, bz + oz); m.castShadow = m.receiveShadow = true; root.add(m);
        addCollider(new THREE.Box3(new V3(bx + ox - w / 2, 0, bz + oz - d / 2), new V3(bx + ox + w / 2, hgt, bz + oz + d / 2)));
        // parapet and roof units
        const par = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.6, d + 0.3), new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.92), roughness: 0.85 })); par.position.set(bx + ox, hgt + 0.3, bz + oz); par.castShadow = true; root.add(par);
        for (let k = 0; k < 2; k++) { const u = new THREE.Mesh(new THREE.BoxGeometry(1.6 + rnd(), 1.2, 1.2 + rnd()), unitMat); u.position.set(bx + ox + (rnd() - 0.5) * (w - 3), hgt + 0.6, bz + oz + (rnd() - 0.5) * (d - 3)); u.castShadow = true; root.add(u); }
        // awnings over the shopfronts on the street sides
        if (rnd() < 0.7) { const awn = new THREE.MeshStandardMaterial({ map: canvasTex(64, 16, (x, w2, h2) => { const c1 = pick(AWN); for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#f4f1ea' : c1; x.fillRect(k * w2 / 8, 0, w2 / 8, h2); } }), roughness: 0.8, side: THREE.DoubleSide });
          for (const sgn of [-1, 1]) { const a = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 1.4), awn); a.position.set(bx + ox, 3.0, bz + oz + sgn * (d / 2 + 0.6)); a.rotation.x = sgn * -Math.PI / 2 + sgn * 0.5; a.rotation.y = sgn < 0 ? Math.PI : 0; a.castShadow = true; root.add(a); } }
      }
    }
    // ---- palms: a gently curved, ringed trunk and a crown of drooping fronds
    const trunkMat = new THREE.MeshStandardMaterial({ map: canvasTex(32, 128, (x, w, h) => { x.fillStyle = '#7b6650'; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 6) { x.fillStyle = 'rgba(40,30,20,0.5)'; x.fillRect(0, y, w, 2); } noise(x, w, h, 300, 0.2, true); }, true), roughness: 0.95 });
    const frondTex = canvasTex(64, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#5d6b2e'; x.lineWidth = 3; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke(); for (let y = 6; y < h; y += 5) { const L = (w / 2 - 2) * Math.sin(Math.PI * (y / h)) * 0.95; x.strokeStyle = 'rgba(' + (60 + rnd() * 40) + ',' + (110 + rnd() * 40) + ',40,1)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(w / 2, y); x.lineTo(w / 2 - L, y + 10); x.moveTo(w / 2, y); x.lineTo(w / 2 + L, y + 10); x.stroke(); } });
    const frondMat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
    const frondGeo = (() => { const g = new THREE.PlaneGeometry(0.9, 3.4, 1, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.7, u = y / 3.4; p.setY(i, y * 0.95); p.setZ(i, -1.6 * u * u); } g.computeVertexNormals(); return g; })();
    const palm = (x, z, h) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); const lean = (rnd() - 0.5) * 0.25, dir = rnd() * Math.PI * 2;
      const path = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(Math.cos(dir) * lean * h * 0.3, h * 0.5, Math.sin(dir) * lean * h * 0.3), new V3(Math.cos(dir) * lean * h, h, Math.sin(dir) * lean * h)]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(path, 12, 0.17, 8), trunkMat); trunk.castShadow = true; g.add(trunk);
      const top = path.getPoint(1); for (let k = 0; k < 11; k++) { const f = new THREE.Mesh(frondGeo, frondMat); f.position.copy(top); f.rotation.set(0, (k / 11) * Math.PI * 2 + rnd() * 0.3, 0); f.rotateX(-0.5 - rnd() * 0.35); f.castShadow = true; g.add(f); }
      root.add(g); addCollider(new THREE.Box3(new V3(x - 0.2, 0, z - 0.2), new V3(x + 0.2, h, z + 0.2)), true);
    };
    // ---- street furniture
    const metalDark = new THREE.MeshStandardMaterial({ color: 0x2c3033, roughness: 0.5, metalness: 0.6 });
    const lamp = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.5, 8), metalDark); pole.position.y = 3.25; pole.castShadow = true; const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), metalDark); arm.position.set(0, 6.4, 0.75); const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.6), metalDark); head.position.set(0, 6.35, 1.45); g.add(pole, arm, head); root.add(g); addCollider(new THREE.Box3(new V3(x - 0.12, 0, z - 0.12), new V3(x + 0.12, 6.5, z + 0.12)), true); };
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.8 });
    const bench = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.45), benchMat); seat.position.y = 0.45; const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.05), benchMat); back.position.set(0, 0.72, -0.2); for (const sx of [-0.8, 0.8]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.45), metalDark); l.position.set(sx, 0.22, 0); g.add(l); } g.add(seat, back); g.traverse((o) => { o.castShadow = true; }); root.add(g); };
    const binMat = new THREE.MeshStandardMaterial({ color: 0x2e5e3e, roughness: 0.6 });
    const bin = (x, z) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.9, 12), binMat); b.position.set(x, 0.45, z); b.castShadow = true; root.add(b); addCollider(new THREE.Box3(new V3(x - 0.28, 0, z - 0.28), new V3(x + 0.28, 0.9, z + 0.28)), true); };
    // parked cars: a body, a glasshouse, wheels; boxy but proportioned like a mid-size sedan / hatch / pickup
    const CARC = [0xd8d8d4, 0x1d1f22, 0x9b1f24, 0x2a4f7e, 0x8a8f94, 0xe2c25a, 0x2f6b55, 0xf0f0ee];
    const glass = new THREE.MeshStandardMaterial({ color: 0x1b2730, roughness: 0.08, metalness: 0.6 }), tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: 0xb5b8bb, roughness: 0.3, metalness: 0.8 });
    const car = (x, z, ry) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const paint = new THREE.MeshStandardMaterial({ color: pick(CARC), roughness: 0.25, metalness: 0.55 }), type = rnd();
      const L = type < 0.6 ? 4.6 : type < 0.85 ? 4.0 : 5.3, W = 1.8;
      const bodyM = new THREE.Mesh(new THREE.BoxGeometry(W, 0.7, L), paint); bodyM.position.y = 0.65; g.add(bodyM);
      const cabL = type < 0.6 ? L * 0.48 : type < 0.85 ? L * 0.62 : L * 0.35, cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.55, cabL), glass); cab.position.set(0, 1.27, type < 0.85 ? -0.1 : -L * 0.15); g.add(cab);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.06, cabL * 0.82), paint); roof.position.set(0, 1.56, cab.position.z); g.add(roof);
      for (const [wx, wz] of [[W / 2, L * 0.33], [-W / 2, L * 0.33], [W / 2, -L * 0.33], [-W / 2, -L * 0.33]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), tyre); t.rotation.z = Math.PI / 2; t.position.set(wx * 0.95, 0.34, wz); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12), rim); r.rotation.z = Math.PI / 2; r.position.copy(t.position); g.add(t, r); }
      const lightM = new THREE.MeshStandardMaterial({ color: 0xfff6dd, emissive: 0x333022, roughness: 0.2 }), tailM = new THREE.MeshStandardMaterial({ color: 0x8a1010, emissive: 0x220000, roughness: 0.3 });
      for (const sx of [-0.6, 0.6]) { const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.04), lightM); h1.position.set(sx, 0.75, L / 2 + 0.01); const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.04), tailM); t1.position.set(sx, 0.8, -L / 2 - 0.01); g.add(h1, t1); }
      g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); root.add(g);
      const hw = Math.abs(Math.cos(ry)) * W / 2 + Math.abs(Math.sin(ry)) * L / 2, hd = Math.abs(Math.sin(ry)) * W / 2 + Math.abs(Math.cos(ry)) * L / 2;
      addCollider(new THREE.Box3(new V3(x - hw, 0, z - hd), new V3(x + hw, 1.5, z + hd)), true);
    };
    for (const [bx, bz] of blockC) {
      const e = BLOCK / 2 + SIDE - 0.6; // tree / lamp line near the kerb
      for (let t = -BLOCK / 2 + 4; t <= BLOCK / 2 - 4; t += 9) {
        palm(bx + t, bz - e, 7 + rnd() * 4); palm(bx + t, bz + e, 7 + rnd() * 4); palm(bx - e, bz + t, 7 + rnd() * 4); palm(bx + e, bz + t, 7 + rnd() * 4);
      }
      lamp(bx - e, bz - e, Math.PI * 1.25); lamp(bx + e, bz + e, Math.PI * 0.25); bench(bx + 4.5, bz - e + 1.0, 0); bench(bx - 4.5, bz + e - 1.0, Math.PI); bin(bx + e - 0.9, bz - 2); bin(bx - e + 0.9, bz + 3);
      // cars parked along the kerbs, nose to tail with gaps
      for (const [ax, az, ry] of [[0, -1, Math.PI / 2], [0, 1, -Math.PI / 2], [-1, 0, 0], [1, 0, Math.PI]]) for (let t = -BLOCK / 2 + 3; t < BLOCK / 2 - 3; t += 6.5) {
        if (rnd() < 0.45) continue; const off = BLOCK / 2 + SIDE + 1.3;
        const x = ax ? bx + ax * off : bx + t, z = az ? bz + az * off : bz + t; if (Math.abs(x) > HALF || Math.abs(z) > HALF) continue; car(x, z, ry + (rnd() < 0.5 ? Math.PI : 0));
      }
      C.spawns.push(new V3(bx - BLOCK / 2 - SIDE + 1.6, 0, bz + 3), new V3(bx + 3, 0, bz + BLOCK / 2 + SIDE - 1.6));
    }
    // ---- the beach and the sea to the east
    const sand = flat(36, HALF * 2 + 12, new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#e3d1a8'; x.fillRect(0, 0, w, h); noise(x, w, h, 6000, 0.12, true); noise(x, w, h, 3000, 0.2); }, true), roughness: 0.95 }), HALF + 20, 0, 0.001);
    sand.material.map.repeat.set(12, 30);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 600, 1, 1), new THREE.MeshStandardMaterial({ color: 0x2f7f93, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.94 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(HALF + 38 + 200, -0.05, 0); root.add(sea);
    const foam = flat(2.5, HALF * 2 + 12, new THREE.MeshBasicMaterial({ color: 0xf3f1ea, transparent: true, opacity: 0.6 }), HALF + 37.5, 0, 0.002);
    C.sea = sea; C.foam = foam;
    // ---- sky, sun and haze: a gradient dome, a warm late-afternoon sun from the south-west
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { sun: { value: new V3(-0.55, 0.42, -0.72).normalize() } },
      vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: 'uniform vec3 sun; varying vec3 vd; void main(){ float h = clamp(vd.y, -0.2, 1.0); vec3 top = vec3(0.16,0.42,0.78), hor = vec3(0.86,0.83,0.78), low = vec3(0.72,0.66,0.6); vec3 c = mix(hor, top, pow(max(h,0.0), 0.55)); if (h < 0.0) c = mix(hor, low, -h*5.0); float s = max(dot(vd, sun), 0.0); c += vec3(1.0,0.82,0.55) * (pow(s, 600.0) * 6.0 + pow(s, 12.0) * 0.35); gl_FragColor = vec4(c, 1.0); }' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); sky.frustumCulled = false; root.add(sky);
    const sunDir = new V3(-0.55, 0.62, -0.56).normalize();
    const sun = new THREE.DirectionalLight(0xffe2b8, 1.55); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 160 }); root.add(sun, sun.target);
    const hemi = new THREE.HemisphereLight(0xa9c8ec, 0x8c7c66, 0.6); root.add(hemi);
    C.sun = sun; C.sunDir = sunDir; C.hemi = hemi;
    // an environment map from the sky, for reflections on cars, glass, wet blood
    const envScene = new THREE.Scene(), eg = new THREE.SphereGeometry(50, 32, 16), ep = eg.attributes.position, ec = [], top = new THREE.Color(0x2a6ac4), hor = new THREE.Color(0xdcd4c6), low = new THREE.Color(0x8a7f70), cc = new THREE.Color();
    for (let i = 0; i < ep.count; i++) { const h = ep.getY(i) / 50; cc.copy(h > 0 ? hor.clone().lerp(top, Math.pow(h, 0.55)) : hor.clone().lerp(low, Math.min(1, -h * 5))); ec.push(cc.r, cc.g, cc.b); } // a plain gradient (the sky shader's sharp sun term does not survive the prefilter)
    eg.setAttribute('color', new THREE.Float32BufferAttribute(ec, 3)); envScene.add(new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.9, 0.7).multiplyScalar(8) })); sunDisc.position.set(-0.55 * 45, 0.62 * 45, -0.56 * 45); envScene.add(sunDisc);
    const pm = new THREE.PMREMGenerator(renderer); C.env = pm.fromScene(envScene, 0.04).texture; pm.dispose();
    C.fog = new THREE.Fog(0xc9d2d6, 60, 260);
    // keep the shadow box centred on the action
    C.follow = (p) => { sun.position.set(p.x + sunDir.x * 70, sunDir.y * 70, p.z + sunDir.z * 70); sun.target.position.set(p.x, 0, p.z); sun.target.updateMatrixWorld(); };
    C.t = 0; C.update = (dt) => { C.t += dt; foam.material.opacity = 0.45 + 0.2 * Math.sin(C.t * 0.8); foam.position.x = HALF + 37.5 + Math.sin(C.t * 0.5) * 0.6; };
    // a clear spot to stand: the point itself, or the nearest free one round it (never inside a box, a bin, a car)
    C.free = (p, r = 0.6) => { const ok = (q) => !C.colliders.some((c) => q.x > c.box.min.x - r && q.x < c.box.max.x + r && q.z > c.box.min.z - r && q.z < c.box.max.z + r); if (ok(p)) return p.clone(); for (let d = 0.5; d < 8; d += 0.5) for (let a = 0; a < 6.28; a += 0.5) { const q = new V3(p.x + Math.cos(a) * d, 0, p.z + Math.sin(a) * d); if (ok(q)) return q; } return p.clone(); };
    // bullets and sight lines against the city: the ground and every box
    C.ray = (o0, dir0, maxT) => {
      const o = new V3(o0.x, o0.y, o0.z), dir = new V3(dir0.x, dir0.y, dir0.z); // callers pass plain {x, y, z} too
      let best = maxT == null ? Infinity : maxT, n = null; const r = new THREE.Ray(o, dir), pt = new V3();
      if (dir.y < -1e-4) { const t = -o.y / dir.y; if (t > 1e-4 && t < best) { best = t; n = new V3(0, 1, 0); } }
      for (const c of C.colliders) if (r.intersectBox(c.box, pt)) { const t = pt.distanceTo(o); if (t > 1e-4 && t < best) { best = t; const b = c.box, e = 0.01; n = new V3(Math.abs(pt.x - b.min.x) < e ? -1 : Math.abs(pt.x - b.max.x) < e ? 1 : 0, Math.abs(pt.y - b.max.y) < e ? 1 : 0, Math.abs(pt.z - b.min.z) < e ? -1 : Math.abs(pt.z - b.max.z) < e ? 1 : 0); if (!n.lengthSq()) n.set(0, 1, 0); } }
      return n ? { t: best, p: o.clone().addScaledVector(dir, best), n } : null;
    };
    // ---- getting round the blocks: waypoints at every sidewalk corner and mid-side, and on the road at every junction
    // and mid-street, linked wherever a walker can go straight from one to the other (buildings in the way block a
    // link; cars, palms and bins are only stepped round). Routes are found with A* and followed waypoint by waypoint.
    const solid = C.colliders.filter((c) => !c.low), segClear = (a, b) => { const d = new V3(b.x - a.x, 0, b.z - a.z), L = d.length(); if (L < 1e-3) return true; d.divideScalar(L); const r = new THREE.Ray(new V3(a.x, 1, a.z), d), pt = new V3(); for (const c of solid) if (r.intersectBox(c.box, pt) && pt.distanceTo(r.origin) < L) return false; return true; };
    const nodes = [];
    for (const [bx, bz] of blockC) { const r = BLOCK / 2 + SIDE - 1.4; for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0]]) nodes.push(new V3(bx + u * r, 0, bz + v * r)); }
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { const x = -HALF + i * PITCH - (i ? 0 : 0), z = -HALF + j * PITCH; } // (outer edges are not roads)
    for (const cx of centres) for (const cz of centres) nodes.push(new V3(cx, 0, cz));
    for (const c of centres) for (const t of [-PITCH, 0, PITCH]) nodes.push(new V3(c, 0, t), new V3(t, 0, c));
    const adj = nodes.map(() => []); for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const d = nodes[i].distanceTo(nodes[j]); if (d < PITCH * 1.05 && segClear(nodes[i], nodes[j])) { adj[i].push([j, d]); adj[j].push([i, d]); } }
    C.nodes = nodes; C.segClear = segClear;
    C.route = (from, to) => {
      if (segClear(from, to)) return [to.clone()];
      const vis = (p) => nodes.map((n, i) => [i, n.distanceTo(p)]).filter(([i, d]) => d < PITCH * 1.2 && segClear(p, nodes[i]));
      const S0 = vis(from), T0 = new Map(vis(to)); if (!S0.length || !T0.size) return [to.clone()];
      const g = new Float64Array(nodes.length).fill(Infinity), prev = new Int32Array(nodes.length).fill(-1), open = new Set();
      for (const [i, d] of S0) { g[i] = d; open.add(i); }
      let best = -1, bestF = Infinity;
      while (open.size) { let u = -1, uf = Infinity; for (const i of open) { const f = g[i] + nodes[i].distanceTo(to); if (f < uf) { uf = f; u = i; } } open.delete(u);
        if (T0.has(u) && g[u] + T0.get(u) < bestF) { bestF = g[u] + T0.get(u); best = u; } if (uf >= bestF) break;
        for (const [v, d] of adj[u]) if (g[u] + d < g[v]) { g[v] = g[u] + d; prev[v] = u; open.add(v); } }
      if (best < 0) return [to.clone()];
      const path = [to.clone()]; for (let i = best; i >= 0; i = prev[i]) path.unshift(nodes[i].clone()); return path;
    };
    return C;
  };
})();
