// Test chamber, blood (drips, spatter, pools sized from real volume), impact marks,
// first-person weapon model and synthesized audio.
(function () {
  const G = (window.GSW = window.GSW || {});
  const V3 = THREE.Vector3;
  const ROOM = { x0: -4, x1: 4, y0: 0, y1: 3.2, z0: -2.4, z1: 7 };
  G.ROOM = ROOM;

  function gridTex(base, line, cells, size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) { x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '0,0,0' : '255,255,255') + ',' + Math.random() * 0.035 + ')'; x.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 5, 2 + Math.random() * 5); }
    x.strokeStyle = line; x.lineWidth = 2;
    const s = size / cells;
    for (let i = 0; i <= cells; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, size); x.moveTo(0, i * s); x.lineTo(size, i * s); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.encoding = THREE.sRGBEncoding;
    return t;
  }

  G.buildWorld = function (scene) {
    const W = { stains: [], holes: [] };
    const w = ROOM.x1 - ROOM.x0, h = ROOM.y1, d = ROOM.z1 - ROOM.z0, cz = (ROOM.z0 + ROOM.z1) / 2;
    const floorT = gridTex('#9aa3a6', 'rgba(40,52,58,0.55)', 2, 512); floorT.repeat.set(w / 1, d / 1);
    const wallT = gridTex('#c9d0d1', 'rgba(60,76,84,0.5)', 2, 512);
    const plane = (pw, ph, tex, rep) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rep[0], rep[1]); return new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: t, roughness: 0.82 })); };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.55, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, cz); floor.receiveShadow = true; scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0xd8dcdc, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, h, cz); scene.add(ceil);
    const back = plane(w, h, wallT, [w / 1, h / 1]); back.position.set(0, h / 2, ROOM.z0); back.receiveShadow = true; scene.add(back);
    const front = plane(w, h, wallT, [w, h]); front.position.set(0, h / 2, ROOM.z1); front.rotation.y = Math.PI; scene.add(front);
    const left = plane(d, h, wallT, [d, h]); left.position.set(ROOM.x0, h / 2, cz); left.rotation.y = Math.PI / 2; left.receiveShadow = true; scene.add(left);
    const right = plane(d, h, wallT, [d, h]); right.position.set(ROOM.x1, h / 2, cz); right.rotation.y = -Math.PI / 2; right.receiveShadow = true; scene.add(right);
    // height scale on the back wall (cm) so wound heights can be read off
    const sc = document.createElement('canvas'); sc.width = 96; sc.height = 1024;
    const sx = sc.getContext('2d'); sx.fillStyle = '#f3f1e6'; sx.fillRect(0, 0, 96, 1024); sx.fillStyle = '#1b2327'; sx.font = 'bold 22px monospace';
    for (let cm = 0; cm <= 200; cm += 10) { const y = 1024 - (cm / 200) * 1024; sx.fillRect(0, y - 1, cm % 50 === 0 ? 50 : 26, 3); if (cm % 50 === 0 && cm) sx.fillText(cm, 40, y + 24); }
    const st = new THREE.CanvasTexture(sc); st.encoding = THREE.sRGBEncoding;
    const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 2), new THREE.MeshStandardMaterial({ map: st, roughness: 0.9 }));
    scale.position.set(-0.75, 1, ROOM.z0 + 0.004); scene.add(scale);
    // lights
    scene.add(new THREE.HemisphereLight(0xe9f1f4, 0x5a5f60, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(1.8, 3.1, 3.2); key.target.position.set(0, 0.9, 0);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 9 }); key.shadow.bias = -0.0015;
    scene.add(key, key.target);
    for (const z of [0.5, 4.2]) {
      const p = new THREE.PointLight(0xf4fbff, 0.35, 9, 2); p.position.set(0, 3.0, z); scene.add(p);
      const tube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff })); tube.position.set(0, h - 0.02, z); scene.add(tube);
    }

    // ---- ray vs room (from inside)
    W.rayRoom = (o, dir) => {
      let best = Infinity, n = null;
      const test = (t, nx, ny, nz) => { if (t > 1e-4 && t < best) { best = t; n = [nx, ny, nz]; } };
      if (dir.x) { test((ROOM.x0 - o.x) / dir.x, 1, 0, 0); test((ROOM.x1 - o.x) / dir.x, -1, 0, 0); }
      if (dir.y) { test((ROOM.y0 - o.y) / dir.y, 0, 1, 0); test((ROOM.y1 - o.y) / dir.y, 0, -1, 0); }
      if (dir.z) { test((ROOM.z0 - o.z) / dir.z, 0, 0, 1); test((ROOM.z1 - o.z) / dir.z, 0, 0, -1); }
      if (!n) return null;
      return { t: best, p: new V3(o.x + dir.x * best, o.y + dir.y * best, o.z + dir.z * best), n: new V3(...n) };
    };

    // ---- flat marks on room surfaces
    const circ = new THREE.CircleGeometry(1, 12), zAxis = new V3(0, 0, 1);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x15181a, polygonOffset: true, polygonOffsetFactor: -2 });
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0x7a0a0c, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false });
    const place = (m, p, n, lift) => { m.position.copy(p).addScaledVector(n, lift); m.quaternion.setFromUnitVectors(zAxis, n); scene.add(m); return m; };
    const spallGeo = (() => {
      const g = new THREE.CircleGeometry(1, 28), p = g.attributes.position;
      for (let i = 1; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)), k = 1 + 0.16 * Math.sin(a * 3 + 1) + 0.12 * Math.sin(a * 5 + 2) + 0.08 * Math.sin(a * 9); p.setXY(i, Math.cos(a) * k, Math.sin(a) * k); }
      return g;
    })();
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xe9ecec, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
    // a strike on tile: a pale spalled crater a few bullet diameters wide around a dark hole
    W.addHole = (p, n, r, energy) => {
      const sp = place(new THREE.Mesh(spallGeo, chipMat), p, n, 0.002); sp.rotateZ(Math.random() * 6); sp.scale.setScalar(r * (1.8 + Math.min(3.5, (energy || 100) / 500)));
      const m = place(new THREE.Mesh(circ, holeMat), p, n, 0.003); m.scale.setScalar(r);
      W.holes.push(sp, m); while (W.holes.length > 240) scene.remove(W.holes.shift());
    };
    W.addStain = (p, n, r, stretch, ang) => {
      const m = place(new THREE.Mesh(circ, bloodMat), p, n, 0.0015 + Math.random() * 0.001);
      m.rotateZ(ang || 0); m.scale.set(r, r * (stretch || 1), 1); m.renderOrder = 2; W.stains.push(m);
      if (W.stains.length > 700) scene.remove(W.stains.shift());
    };
    // ================= BLOOD AS A LIQUID =================
    // The floor carries a 2.5 cm grid of blood volume. A cell holds a film up to ~2.2 mm deep (what surface
    // tension supports on a sealed floor); anything above that flows to lower neighbours. The floor is not
    // perfectly flat: it has shallow undulations and recessed grout lines, so pools creep, finger and follow
    // the joints instead of growing as circles. Every drop that lands adds its own volume to the cell it hits.
    const GX = 320, GZ = 376, CW = w / GX, CD = d / GZ, MLMM = (CW * CD * 1e4) / 10; /* mL per mm depth in one cell */
    const vol = new Float32Array(GX * GZ), dv = new Float32Array(GX * GZ), flr = new Float32Array(GX * GZ), age = new Float32Array(GX * GZ);
    for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) {
      const x = ROOM.x0 + (i + 0.5) * CW, z = ROOM.z1 - (j + 0.5) * CD;
      let hgt = 0.28 * Math.sin(x * 2.1 + 1) * Math.cos(z * 1.7) + 0.18 * Math.sin(x * 5.3 + z * 4.1) + 0.1 * Math.sin(x * 13 - z * 11);
      const gx = Math.abs(((x % 0.5) + 0.5) % 0.5), gz = Math.abs(((z % 0.5) + 0.5) % 0.5);
      if (gx < CW * 0.6 || gz < CW * 0.6) hgt -= 0.7; // grout line
      flr[j * GX + i] = hgt;
    }
    const HC = 2.2, px = new Uint8Array(GX * GZ * 4);
    const btex = new THREE.DataTexture(px, GX, GZ, THREE.RGBAFormat); btex.magFilter = btex.minFilter = THREE.LinearFilter; btex.encoding = THREE.sRGBEncoding; btex.needsUpdate = true;
    const bmesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: btex, transparent: true, roughness: 0.1, metalness: 0.05, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    bmesh.rotation.x = -Math.PI / 2; bmesh.position.set(0, 0.0022, cz); bmesh.renderOrder = 2; scene.add(bmesh);
    const bb = { i0: GX, i1: -1, j0: GZ, j1: -1 };
    let texDirty = false; W.bloodOnFloor = 0;
    const cellOf = (x, z) => { const i = Math.floor((x - ROOM.x0) / CW), j = Math.floor((ROOM.z1 - z) / CD); return i < 2 || j < 2 || i >= GX - 2 || j >= GZ - 2 ? -1 : j * GX + i; };
    const grow = (i, j) => { if (i < bb.i0) bb.i0 = i; if (i > bb.i1) bb.i1 = i; if (j < bb.j0) bb.j0 = j; if (j > bb.j1) bb.j1 = j; };
    W.addBlood = (x, z, ml) => {
      const c = cellOf(x, z); if (c < 0 || !(ml > 0)) return;
      vol[c] += ml; W.bloodOnFloor += ml; const i = c % GX, j = (c / GX) | 0; grow(i - 1, j - 1); grow(i + 1, j + 1); texDirty = true;
    };
    W.depthAt = (x, z) => { const c = cellOf(x, z); return c < 0 ? 0 : vol[c] / MLMM; };
    // a body part dragged through blood pushes most of it along and leaves a thin film behind
    W.smear = (x, z, dx, dz, rad) => {
      const n = Math.ceil(rad / CW), m = Math.hypot(dx, dz) || 1, sx = Math.round((dx / m) * 1.6), sz = -Math.round((dz / m) * 1.6);
      const c0 = cellOf(x, z); if (c0 < 0) return;
      const i0 = c0 % GX, j0 = (c0 / GX) | 0;
      for (let j = j0 - n; j <= j0 + n; j++) for (let i = i0 - n; i <= i0 + n; i++) {
        if (i < 3 || j < 3 || i >= GX - 3 || j >= GZ - 3 || (i - i0) ** 2 + (j - j0) ** 2 > n * n) continue;
        const c = j * GX + i, v = vol[c]; if (v < 0.03) continue;
        const film = Math.min(v, 0.12 * MLMM), mv = (v - film) * 0.6 + film * 0.35;
        vol[c] -= mv; vol[(j + sz) * GX + i + sx] += mv; grow(i - 2, j - 2); grow(i + 2, j + 2); texDirty = true;
      }
    };
    const nb = [0, 0, 0, 0], df = [0, 0, 0, 0];
    function flow() {
      if (bb.i1 < 0) return;
      const i0 = Math.max(1, bb.i0), i1 = Math.min(GX - 2, bb.i1), j0 = Math.max(1, bb.j0), j1 = Math.min(GZ - 2, bb.j1);
      let moved = false;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const c = j * GX + i, v = vol[c]; if (v <= 0) continue;
        const h = v / MLMM, cap = HC - flr[c] * 0.6; if (h <= cap) continue;
        const L = flr[c] + h, ex = (h - cap) * MLMM;
        nb[0] = c - 1; nb[1] = c + 1; nb[2] = c - GX; nb[3] = c + GX; let sum = 0;
        for (let k = 0; k < 4; k++) { const q = nb[k], dl = L - (flr[q] + vol[q] / MLMM); df[k] = dl > 0 ? dl : 0; sum += df[k]; }
        if (sum <= 0) continue;
        const out = Math.min(ex, sum * MLMM * 0.22) * 0.5;
        for (let k = 0; k < 4; k++) if (df[k] > 0) dv[nb[k]] += (out * df[k]) / sum;
        dv[c] -= out; moved = true;
      }
      if (!moved) return;
      for (let j = j0 - 1; j <= j1 + 1; j++) for (let i = i0 - 1; i <= i1 + 1; i++) { const c = j * GX + i; if (dv[c] !== 0) { vol[c] += dv[c]; dv[c] = 0; if (vol[c] > 0.001) grow(i, j); } }
      texDirty = true;
    }
    function paint(dtAge) {
      const i0 = Math.max(0, bb.i0 - 1), i1 = Math.min(GX - 1, bb.i1 + 1), j0 = Math.max(0, bb.j0 - 1), j1 = Math.min(GZ - 1, bb.j1 + 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const c = j * GX + i, h = vol[c] / MLMM, o = c * 4;
        if (h <= 0.002) { px[o + 3] = 0; continue; }
        age[c] += dtAge;
        // fresh thin blood is bright; deep pools read dark; thin films dry toward brown within minutes
        const t = Math.min(1, h / 1.6), dry = Math.min(1, age[c] / (90 + h * 400)) * (1 - t * 0.7);
        px[o] = 150 - 70 * t - 55 * dry; px[o + 1] = 10 - 5 * t + 8 * dry; px[o + 2] = 12 - 6 * t + 2 * dry; px[o + 3] = Math.min(238, 255 * Math.min(1, h / 0.28) * 0.93);
      }
      btex.needsUpdate = true; texDirty = false;
    }

    // ================= PARTICLES =================
    // blood drops: each carries a volume (mL). Gravity + air drag; on landing the volume joins the floor liquid.
    const NP = 1600, pos = new Float32Array(NP * 3).fill(-50), parts = [];
    for (let i = 0; i < NP; i++) parts.push({ on: false, v: new V3(), p: new V3(), stain: 0, ml: 0 });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x8c0c0e, size: 0.013, sizeAttenuation: true })); points.frustumCulled = false; scene.add(points);
    let pi = 0;
    W.drop = (p, v, stain, ml) => { const dr = parts[pi]; pi = (pi + 1) % NP; if (dr.on && dr.ml) W.addBlood(dr.p.x, dr.p.z, dr.ml); dr.on = true; dr.p.copy(p); dr.v.copy(v); dr.stain = stain || 0; dr.ml = ml || 0; };
    W.burst = (p, dir, n, speed, cone, stain, ml) => {
      const v = new V3();
      for (let i = 0; i < n; i++) {
        v.set(dir.x + (Math.random() - 0.5) * cone, dir.y + (Math.random() - 0.5) * cone, dir.z + (Math.random() - 0.5) * cone).normalize().multiplyScalar(speed * (0.25 + Math.random() * 0.9));
        W.drop(p, v, stain * (0.4 + Math.random()), (ml || 0) / n);
      }
    };
    // tissue, bone and brain fragments thrown out by high-energy exits; dust and chips from wall strikes
    const NC = 260, cpos = new Float32Array(NC * 3).fill(-50), ccol = new Float32Array(NC * 3), chunks = [];
    for (let i = 0; i < NC; i++) chunks.push({ on: false, v: new V3(), p: new V3(), life: 0, kind: 0 });
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cpos, 3)); cg.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
    const cpts = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.022, sizeAttenuation: true, vertexColors: true })); cpts.frustumCulled = false; scene.add(cpts);
    const KIND = { tissue: [0.52, 0.12, 0.12], bone: [0.9, 0.86, 0.75], brain: [0.8, 0.55, 0.55], dust: [0.72, 0.74, 0.74], chip: [0.82, 0.84, 0.84] };
    const kmat = {}; for (const k in KIND) kmat[k] = new THREE.MeshStandardMaterial({ color: new THREE.Color(...KIND[k]), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 });
    let ci = 0;
    W.chunk = (p, v, kind) => { const k = ci; ci = (ci + 1) % NC; const ch = chunks[k]; ch.on = true; ch.p.copy(p); ch.v.copy(v); ch.kind = kind; ch.life = kind === 'dust' ? 0.5 + Math.random() * 0.7 : 9; const col = KIND[kind]; ccol[k * 3] = col[0]; ccol[k * 3 + 1] = col[1]; ccol[k * 3 + 2] = col[2]; cg.attributes.color.needsUpdate = true; };
    W.chunks = (p, dir, n, speed, cone, kind) => { const v = new V3(); for (let i = 0; i < n; i++) { v.set(dir.x + (Math.random() - 0.5) * cone, dir.y + (Math.random() - 0.5) * cone, dir.z + (Math.random() - 0.5) * cone).normalize().multiplyScalar(speed * (0.2 + Math.random())); W.chunk(p, v, kind); } };
    W.debris = [];
    // blood that hits a wall with enough volume runs down it
    W.drips = [];
    const up = new V3(0, 1, 0), nn = new V3();
    const wallHit = (pt) => (pt.y <= 0 ? up : pt.z <= ROOM.z0 ? nn.set(0, 0, 1) : pt.x <= ROOM.x0 ? nn.set(1, 0, 0) : pt.x >= ROOM.x1 ? nn.set(-1, 0, 0) : pt.z >= ROOM.z1 ? nn.set(0, 0, -1) : null);
    const clampIn = (pt) => { pt.y = Math.max(0, pt.y); pt.x = Math.max(ROOM.x0, Math.min(ROOM.x1, pt.x)); pt.z = Math.max(ROOM.z0, Math.min(ROOM.z1, pt.z)); };
    let flowAcc = 0, paintAcc = 0;
    W.landed = 0; // drops that reached the floor this frame (for drip sounds)
    W.update = (dt) => {
      W.landed = 0;
      for (let i = 0; i < NP; i++) {
        const dr = parts[i];
        if (!dr.on) continue;
        dr.v.y -= 9.81 * dt; dr.v.multiplyScalar(1 - 0.6 * dt); dr.p.addScaledVector(dr.v, dt);
        const hit = wallHit(dr.p);
        if (hit) {
          dr.on = false; clampIn(dr.p);
          const sp = dr.v.length(), vn = Math.abs(dr.v.dot(hit)) / (sp || 1);
          if (hit === up) {
            W.addBlood(dr.p.x, dr.p.z, dr.ml); W.landed++;
            // fast or oblique drops leave elongated spatter; slow drips just join the liquid
            if (dr.stain > 0 && (sp > 2.2 || vn < 0.8)) W.addStain(dr.p, hit, dr.stain, Math.min(4, 1 / Math.max(0.25, vn)), Math.atan2(-dr.v.z, dr.v.x) + Math.PI / 2);
          } else {
            const r = Math.max(dr.stain, Math.min(0.03, 0.004 + Math.sqrt(dr.ml) * 0.012));
            W.addStain(dr.p, hit, r, Math.min(4, 1 / Math.max(0.25, vn)), Math.atan2(dr.v.y, hit.z ? dr.v.x * hit.z : -dr.v.z * hit.x) + Math.PI / 2);
            if (dr.ml > 0.25 && W.drips.length < 60) {
              const m = new THREE.Mesh(circ, bloodMat); m.position.copy(dr.p).addScaledVector(hit, 0.002); m.quaternion.setFromUnitVectors(zAxis, hit); m.scale.set(0.004, 0.004, 1); m.renderOrder = 2; scene.add(m);
              W.drips.push({ m, top: dr.p.y, len: 0, max: Math.min(dr.p.y, 0.04 + dr.ml * 0.16), ml: dr.ml, w: 0.003 + Math.min(0.004, dr.ml * 0.002) });
            }
          }
          pos[i * 3 + 1] = -50;
        } else { pos[i * 3] = dr.p.x; pos[i * 3 + 1] = dr.p.y; pos[i * 3 + 2] = dr.p.z; }
      }
      pg.attributes.position.needsUpdate = true;
      for (const dp of W.drips) {
        if (dp.len >= dp.max) continue;
        dp.len = Math.min(dp.max, dp.len + dt * (0.03 + dp.ml * 0.05)); dp.m.scale.set(dp.w, dp.len / 2 + dp.w, 1); dp.m.position.y = dp.top - dp.len / 2;
        if (dp.len >= dp.max && dp.top - dp.len < 0.02) W.addBlood(dp.m.position.x, dp.m.position.z, dp.ml * 0.5);
      }
      for (let i = 0; i < NC; i++) {
        const ch = chunks[i];
        if (!ch.on) continue;
        const dust = ch.kind === 'dust';
        ch.v.y -= (dust ? 1.5 : 9.81) * dt; ch.v.multiplyScalar(1 - (dust ? 4 : 0.8) * dt); ch.p.addScaledVector(ch.v, dt); ch.life -= dt;
        const hit = wallHit(ch.p);
        if (hit || ch.life <= 0) {
          ch.on = false; cpos[i * 3 + 1] = -50;
          if (hit && !dust) {
            clampIn(ch.p);
            const m = new THREE.Mesh(circ, kmat[ch.kind]); m.position.copy(ch.p).addScaledVector(hit, 0.003); m.quaternion.setFromUnitVectors(zAxis, hit); m.rotateZ(Math.random() * 6); m.scale.set(0.004 + Math.random() * 0.007, 0.003 + Math.random() * 0.005, 1); scene.add(m);
            W.debris.push(m); if (W.debris.length > 220) scene.remove(W.debris.shift());
            if (ch.kind !== 'chip' && hit === up) W.addBlood(ch.p.x, ch.p.z, 0.25);
          }
        } else { cpos[i * 3] = ch.p.x; cpos[i * 3 + 1] = ch.p.y; cpos[i * 3 + 2] = ch.p.z; }
      }
      cg.attributes.position.needsUpdate = true;
      flowAcc += dt; let n = 0;
      while (flowAcc > 1 / 40 && n++ < 3) { flowAcc -= 1 / 40; flow(); }
      if (flowAcc > 0.2) flowAcc = 0;
      paintAcc += dt; if (paintAcc > 0.07 && (texDirty || bb.i1 >= 0)) { paint(paintAcc); paintAcc = 0; }
    };
    W.clear = () => {
      for (const a of [W.stains, W.holes, W.debris]) { for (const m of a) scene.remove(m); a.length = 0; }
      for (const dp of W.drips) scene.remove(dp.m); W.drips.length = 0;
      vol.fill(0); dv.fill(0); age.fill(0); px.fill(0); btex.needsUpdate = true; bb.i0 = GX; bb.i1 = -1; bb.j0 = GZ; bb.j1 = -1; W.bloodOnFloor = 0;
      for (let i = 0; i < NP; i++) { parts[i].on = false; pos[i * 3 + 1] = -50; }
      for (let i = 0; i < NC; i++) { chunks[i].on = false; cpos[i * 3 + 1] = -50; }
    };
    return W;
  };

  // ---- first-person weapon model
  G.buildGun = function (camera) {
    const g = new THREE.Group(); camera.add(g);
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d2023, roughness: 0.45, metalness: 0.6 });
    const poly = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.8 }), wood = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.7 });
    const box = (m, w, h, d, x, y, z, rx) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; return b; };
    const models = {};
    const mk = (name, parts, muzzleZ) => { const m = new THREE.Group(); for (const p of parts) m.add(p); m.userData.muzzle = muzzleZ; m.visible = false; g.add(m); models[name] = m; };
    mk('pistol', [box(dark, 0.028, 0.034, 0.19, 0, 0.012, -0.06), box(poly, 0.03, 0.11, 0.045, 0, -0.05, 0.015, 0.25), box(poly, 0.012, 0.04, 0.06, 0, -0.02, -0.035)], -0.16);
    mk('revolver', [box(dark, 0.02, 0.024, 0.16, 0, 0.018, -0.11), box(dark, 0.042, 0.042, 0.045, 0, 0.004, -0.01), box(wood, 0.03, 0.1, 0.04, 0, -0.055, 0.035, 0.35)], -0.2);
    mk('rifle', [box(dark, 0.04, 0.06, 0.34, 0, 0, -0.05), box(dark, 0.018, 0.018, 0.4, 0, 0.01, -0.4), box(poly, 0.035, 0.07, 0.3, 0, -0.012, 0.25), box(dark, 0.028, 0.15, 0.05, 0, -0.1, -0.04, 0.2), box(poly, 0.03, 0.09, 0.04, 0, -0.07, 0.08, 0.3), box(poly, 0.045, 0.045, 0.24, 0, 0.004, -0.3)], -0.6);
    mk('shotgun', [box(dark, 0.042, 0.055, 0.3, 0, 0, -0.03), box(dark, 0.026, 0.026, 0.52, 0, 0.012, -0.4), box(dark, 0.024, 0.024, 0.4, 0, -0.016, -0.33), box(wood, 0.046, 0.046, 0.18, 0, -0.018, -0.32), box(wood, 0.036, 0.075, 0.34, 0, -0.025, 0.27, -0.1)], -0.66);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.9, depthWrite: false }));
    flash.visible = false; g.add(flash);
    const light = new THREE.PointLight(0xffc878, 0, 9, 2); g.add(light);
    const S = { g, cls: null, kick: 0, flashT: 0, aim: new THREE.Quaternion() };
    const fwd = new V3(0, 0, -1), d = new V3();
    S.set = (cls) => { for (const k in models) models[k].visible = k === cls; S.cls = cls; };
    S.fire = (recoil) => { S.kick = Math.min(1.6, S.kick + 0.5 + recoil * 0.4); S.flashT = 0.05; const mz = models[S.cls].userData.muzzle; flash.position.set(0, 0.012, mz - 0.05); flash.scale.set(0.035 + recoil * 0.02, 0.035 + recoil * 0.02, 0.09 + recoil * 0.04); flash.rotation.z = Math.random() * 3; light.position.copy(flash.position); };
    // dirCam: aim direction in camera space
    S.update = (dt, dirCam, narrow) => {
      const long = S.cls === 'rifle' || S.cls === 'shotgun';
      g.position.set(narrow ? 0.12 : 0.2, long ? -0.17 : -0.2, long ? -0.42 : -0.5);
      d.copy(dirCam).multiplyScalar(12).sub(g.position).normalize();
      S.aim.setFromUnitVectors(fwd, d); g.quaternion.slerp(S.aim, Math.min(1, dt * 18));
      S.kick = Math.max(0, S.kick - dt * 7 * (0.4 + S.kick));
      g.position.z += S.kick * 0.05; g.rotateX(S.kick * 0.12);
      S.flashT -= dt; flash.visible = S.flashT > 0; light.intensity = S.flashT > 0 ? 2.2 : 0;
    };
    return S;
  };

})();
