// Test chamber, blood (drips, spatter, pools sized from real volume), impact marks,
// first-person weapon model and synthesized audio.
(function () {
  const G = (window.GSW = window.GSW || {});
  const V3 = THREE.Vector3;
  const ROOM = { x0: -4, x1: 4, y0: 0, y1: 3.2, z0: -2.4, z1: 7 };
  G.ROOM = ROOM;

  G.buildWorld = function (scene) {
    const W = { stains: [], holes: [] };
    const w = ROOM.x1 - ROOM.x0, d = ROOM.z1 - ROOM.z0, cz = (ROOM.z0 + ROOM.z1) / 2;

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
    // the liquid's surface: a normal map from the depth field (so a pool's rim and every ripple catch the light) and a
    // roughness map (fresh blood is glossy; a drying film goes dull). The coverage in the alpha channel is filtered
    // between cells and then sharpened, so edges are crisp curves instead of 2.5 cm blocks.
    const npx = new Uint8Array(GX * GZ * 4), rpx = new Uint8Array(GX * GZ * 4).fill(255);
    for (let k = 0; k < GX * GZ; k++) { npx[k * 4] = 128; npx[k * 4 + 1] = 128; npx[k * 4 + 2] = 255; npx[k * 4 + 3] = 255; }
    const ntex = new THREE.DataTexture(npx, GX, GZ, THREE.RGBAFormat), rtex = new THREE.DataTexture(rpx, GX, GZ, THREE.RGBAFormat);
    for (const t of [ntex, rtex]) { t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
    const bmat = new THREE.MeshStandardMaterial({ map: btex, normalMap: ntex, normalScale: new THREE.Vector2(1.6, 1.6), roughnessMap: rtex, roughness: 1, metalness: 0.02, envMapIntensity: 0.55, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    bmat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.a = smoothstep(0.1, 0.32, diffuseColor.a) * 0.97;'); };
    const bmesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), bmat);
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
        px[o] = 128 - 72 * t - 50 * dry; px[o + 1] = 8 - 4 * t + 7 * dry; px[o + 2] = 10 - 5 * t + 2 * dry; px[o + 3] = Math.min(255, 255 * Math.min(1, h / 0.5));
        rpx[o + 1] = 255 * Math.min(1, 0.05 + 0.75 * dry);
      }
      // surface normals from the depth of the liquid (exaggerated a little: the rim of a 2 mm pool is a steep meniscus)
      for (let j = Math.max(1, j0); j <= Math.min(GZ - 2, j1); j++) for (let i = Math.max(1, i0); i <= Math.min(GX - 2, i1); i++) {
        const c = j * GX + i, o = c * 4;
        const hx = (vol[c + 1] - vol[c - 1]) / MLMM, hz = (vol[c + GX] - vol[c - GX]) / MLMM;
        // thin films and single drops lie flat; only a real pool has a rim worth catching the light
        const k = 0.05 * Math.min(1, vol[c] / MLMM / 0.8); let nx = -hx * k, ny = -hz * k; const m = Math.hypot(nx, ny); if (m > 0.7) { nx *= 0.7 / m; ny *= 0.7 / m; }
        npx[o] = 128 + nx * 127; npx[o + 1] = 128 + ny * 127; npx[o + 2] = 128 + 127 * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      }
      btex.needsUpdate = ntex.needsUpdate = rtex.needsUpdate = true; texDirty = false;
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
    const KIND = { tissue: [0.52, 0.12, 0.12], bone: [0.9, 0.86, 0.75], brain: [0.8, 0.55, 0.55], dust: [0.72, 0.74, 0.74], chip: [0.82, 0.84, 0.84], smoke: [0.86, 0.86, 0.84], spark: [1.0, 0.82, 0.45] };
    const kmat = {}; for (const k in KIND) kmat[k] = new THREE.MeshStandardMaterial({ color: new THREE.Color(...KIND[k]), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 });
    let ci = 0;
    W.chunk = (p, v, kind) => { const k = ci; ci = (ci + 1) % NC; const ch = chunks[k]; ch.on = true; ch.p.copy(p); ch.v.copy(v); ch.kind = kind; ch.life = kind === 'smoke' ? 1.2 + Math.random() * 0.8 : kind === 'spark' ? 0.15 + Math.random() * 0.15 : kind === 'dust' ? 0.5 + Math.random() * 0.7 : 9; const col = KIND[kind]; ccol[k * 3] = col[0]; ccol[k * 3 + 1] = col[1]; ccol[k * 3 + 2] = col[2]; cg.attributes.color.needsUpdate = true; };
    W.chunks = (p, dir, n, speed, cone, kind) => { const v = new V3(); for (let i = 0; i < n; i++) { v.set(dir.x + (Math.random() - 0.5) * cone, dir.y + (Math.random() - 0.5) * cone, dir.z + (Math.random() - 0.5) * cone).normalize().multiplyScalar(speed * (0.2 + Math.random())); W.chunk(p, v, kind); } };
    W.debris = [];
    // powder smoke: soft sprites that expand, drift up and thin out over a second or two
    const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(165,165,160,0.8)'); g.addColorStop(0.5, 'rgba(160,160,155,0.38)'); g.addColorStop(1, 'rgba(155,155,150,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const puffs = [];
    W.smoke = (p, dir, n, k) => {
      for (let i = 0; i < n; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.5 * k }));
        sp.position.copy(p); scene.add(sp);
        puffs.push({ sp, v: new V3(dir.x * (0.3 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.25, dir.y * 0.5 + 0.05 + Math.random() * 0.1, dir.z * (0.3 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.25), t: 0, life: 1.2 + Math.random() * 1.2, s0: 0.03 + 0.03 * k, s1: 0.22 + 0.25 * k, o: 0.7 * k });
        if (puffs.length > 40) { const o = puffs.shift(); scene.remove(o.sp); }
      }
    };
    // blood that hits a wall with enough volume runs down it
    W.drips = [];
    const up = new V3(0, 1, 0), nn = new V3();
    const wallHit = (pt) => (pt.y <= 0 ? up : pt.z <= ROOM.z0 ? nn.set(0, 0, 1) : pt.x <= ROOM.x0 ? nn.set(1, 0, 0) : pt.x >= ROOM.x1 ? nn.set(-1, 0, 0) : pt.z >= ROOM.z1 ? nn.set(0, 0, -1) : null);
    const clampIn = (pt) => { pt.y = Math.max(0, pt.y); pt.x = Math.max(ROOM.x0, Math.min(ROOM.x1, pt.x)); pt.z = Math.max(ROOM.z0, Math.min(ROOM.z1, pt.z)); };
    let flowAcc = 0, paintAcc = 0;
    W.landed = 0; // drops that reached the floor this frame (for drip sounds)
    W.update = (dt) => {
      for (let i = puffs.length - 1; i >= 0; i--) {
        const f = puffs[i]; f.t += dt; const u = f.t / f.life;
        if (u >= 1) { scene.remove(f.sp); puffs.splice(i, 1); continue; }
        f.v.multiplyScalar(1 - 2.2 * dt); f.v.y += 0.12 * dt; f.sp.position.addScaledVector(f.v, dt);
        const s = f.s0 + (f.s1 - f.s0) * Math.sqrt(u); f.sp.scale.set(s, s, 1); f.sp.material.opacity = f.o * (1 - u) * (1 - u);
      }
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
        const dust = ch.kind === 'dust' || ch.kind === 'smoke' || ch.kind === 'spark';
        ch.v.y -= (ch.kind === 'smoke' ? -0.25 : ch.kind === 'spark' ? 6 : dust ? 1.5 : 9.81) * dt; ch.v.multiplyScalar(1 - (ch.kind === 'smoke' ? 2.5 : ch.kind === 'spark' ? 1 : dust ? 4 : 0.8) * dt); ch.p.addScaledVector(ch.v, dt); ch.life -= dt;
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
      vol.fill(0); dv.fill(0); age.fill(0); px.fill(0); for (let k = 0; k < GX * GZ; k++) { npx[k * 4] = 128; npx[k * 4 + 1] = 128; npx[k * 4 + 2] = 255; } rpx.fill(255); btex.needsUpdate = ntex.needsUpdate = rtex.needsUpdate = true; bb.i0 = GX; bb.i1 = -1; bb.j0 = GZ; bb.j1 = -1; W.bloodOnFloor = 0;
      for (let i = 0; i < NP; i++) { parts[i].on = false; pos[i * 3 + 1] = -50; }
      for (let i = 0; i < NC; i++) { chunks[i].on = false; cpos[i * 3 + 1] = -50; }
    };
    return W;
  };

  // ---- first-person weapon model
  G.buildGun = function (camera) {
    const g = new THREE.Group(); camera.add(g);
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d2023, roughness: 0.45, metalness: 0.6 });
    const poly = new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.75, metalness: 0.1 }), wood = new THREE.MeshStandardMaterial({ color: 0x3d2110, roughness: 0.55 });
    const box = (m, w, h, d, x, y, z, rx) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; return b; };
    const models = {};
    const steel = new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.32, metalness: 0.8 }), black = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.6, metalness: 0.3 });
    const stainless = new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.3, metalness: 0.85 }), magm = new THREE.MeshStandardMaterial({ color: 0x33373b, roughness: 0.5, metalness: 0.6 });
    // Weapons are built from side-profile outlines ([forward, up] in metres) extruded to their real thickness,
    // plus turned parts (barrels, tubes, cylinders). Forward is -Z, the hand sits near the origin.
    const ext = (m, pts, th, hole) => {
      const sh = new THREE.Shape(pts.map((q) => new THREE.Vector2(q[0], q[1])));
      if (hole) sh.holes.push(new THREE.Path(hole.map((q) => new THREE.Vector2(q[0], q[1]))));
      const bv = Math.min(0.0025, th * 0.18), geo = new THREE.ExtrudeGeometry(sh, { depth: th - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: 4 });
      geo.translate(0, 0, -(th - 2 * bv) / 2);
      const me = new THREE.Mesh(geo, m); me.rotation.y = Math.PI / 2; return me;
    };
    const cyl = (m, r, len, f, y, r2, x) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, 16), m); c.rotation.x = Math.PI / 2; c.position.set(x || 0, y, -f); return c; };
    const bx = (m, w, h, len, f, y, x) => box(m, w, h, len, x || 0, y, -f);
    const guard = (m, f0, f1, y0, y1, th) => ext(m, [[f0, y0], [f1, y0], [f1 - 0.004, y1], [f0 - 0.002, y1 - 0.003]], th || 0.01, [[f0 + 0.006, y0 - 0.005], [f1 - 0.007, y0 - 0.005], [f1 - 0.01, y1 + 0.005], [f0 + 0.005, y1 + 0.003]]);
    const mk = (name, parts, muzzleZ, flashY) => { const m = new THREE.Group(); for (const q of parts) m.add(q); m.userData.muzzle = muzzleZ; m.userData.fy = flashY || 0.03; m.visible = false; g.add(m); models[name] = m; };
    // striker-fired polymer 9 mm
    mk('glock', [ext(steel, [[-0.036, 0.012], [0.152, 0.012], [0.156, 0.017], [0.156, 0.04], [-0.036, 0.04]], 0.026),
      ext(poly, [[-0.046, 0.012], [0.15, 0.012], [0.15, -0.001], [0.074, -0.004], [0.012, -0.004], [-0.046, -0.008]], 0.029),
      ext(poly, [[-0.047, -0.004], [0.013, -0.004], [0.002, -0.118], [-0.06, -0.108], [-0.052, -0.03]], 0.03), guard(poly, 0.008, 0.074, -0.004, -0.047, 0.013),
      bx(steel, 0.005, 0.02, 0.006, 0.04, -0.02), bx(black, 0.014, 0.005, 0.007, -0.026, 0.0425), bx(black, 0.004, 0.005, 0.005, 0.146, 0.0425),
      cyl(black, 0.0062, 0.004, 0.157, 0.031), bx(black, 0.002, 0.012, 0.032, 0.05, 0.031, 0.0125), bx(magm, 0.026, 0.006, 0.05, -0.03, -0.116)], -0.16, 0.031);
    // 1911: steel frame, exposed hammer, wood grip panels
    mk('m1911', [ext(steel, [[-0.042, 0.014], [0.168, 0.014], [0.172, 0.019], [0.172, 0.04], [-0.042, 0.04]], 0.024),
      ext(stainless, [[-0.05, 0.014], [0.125, 0.014], [0.125, 0.002], [0.07, -0.002], [0.012, -0.004], [-0.062, 0.004], [-0.066, 0.012]], 0.022),
      ext(stainless, [[-0.05, 0.0], [0.014, -0.004], [-0.012, -0.12], [-0.072, -0.108]], 0.024), ext(wood, [[-0.044, -0.008], [0.006, -0.01], [-0.016, -0.108], [-0.064, -0.098]], 0.032),
      guard(stainless, 0.008, 0.07, -0.003, -0.044, 0.011), bx(steel, 0.005, 0.018, 0.005, 0.036, -0.02), bx(steel, 0.008, 0.014, 0.012, -0.05, 0.044),
      bx(black, 0.012, 0.005, 0.007, -0.03, 0.0425), bx(black, 0.004, 0.005, 0.005, 0.162, 0.0425), cyl(black, 0.0075, 0.004, 0.173, 0.03), bx(black, 0.002, 0.011, 0.03, 0.055, 0.031, 0.0115)], -0.176, 0.03);
    // rimfire target pistol: tubular receiver, slim tapered barrel, raked grip
    mk('target22', [cyl(steel, 0.0125, 0.125, 0.0, 0.03), cyl(steel, 0.0095, 0.14, 0.13, 0.03, 0.0075), bx(steel, 0.02, 0.016, 0.1, 0.0, 0.014),
      ext(poly, [[-0.03, 0.01], [0.03, 0.01], [-0.004, -0.115], [-0.07, -0.105]], 0.028), guard(steel, 0.022, 0.078, 0.006, -0.036, 0.009), bx(steel, 0.004, 0.016, 0.005, 0.05, -0.012),
      bx(black, 0.012, 0.006, 0.008, -0.05, 0.046), bx(black, 0.003, 0.007, 0.006, 0.19, 0.041), cyl(black, 0.0032, 0.004, 0.201, 0.03)], -0.2, 0.03);
    // double-action revolver
    mk('revolver', [ext(stainless, [[-0.036, 0.0], [0.05, 0.0], [0.05, 0.012], [0.008, 0.012], [0.008, 0.04], [0.05, 0.04], [0.05, 0.05], [-0.022, 0.05], [-0.04, 0.03]], 0.02),
      cyl(stainless, 0.019, 0.04, 0.029, 0.026), cyl(stainless, 0.0085, 0.105, 0.102, 0.036), bx(stainless, 0.012, 0.014, 0.1, 0.1, 0.022), bx(black, 0.003, 0.008, 0.01, 0.146, 0.049),
      ext(wood, [[-0.036, 0.012], [0.006, 0.0], [-0.006, -0.1], [-0.064, -0.102], [-0.06, -0.03]], 0.03), guard(stainless, 0.004, 0.058, 0.0, -0.04, 0.01),
      bx(steel, 0.004, 0.016, 0.005, 0.03, -0.016), bx(steel, 0.007, 0.016, 0.01, -0.036, 0.052), cyl(black, 0.0048, 0.004, 0.156, 0.036)], -0.158, 0.036);
    // AR-15 pattern carbine
    mk('ar15', [ext(steel, [[-0.09, 0.02], [0.112, 0.02], [0.112, 0.062], [-0.09, 0.062]], 0.034), bx(black, 0.02, 0.007, 0.2, 0.01, 0.0655),
      ext(steel, [[-0.09, 0.022], [0.108, 0.022], [0.104, -0.012], [0.056, -0.014], [0.02, -0.012], [-0.03, -0.004], [-0.09, 0.002]], 0.03),
      ext(magm, [[0.058, -0.012], [0.102, -0.012], [0.122, -0.145], [0.076, -0.152]], 0.022), ext(poly, [[-0.046, -0.002], [-0.004, -0.006], [-0.03, -0.112], [-0.078, -0.1]], 0.028),
      guard(steel, -0.006, 0.058, -0.012, -0.046, 0.01), bx(steel, 0.004, 0.018, 0.005, 0.022, -0.026),
      cyl(poly, 0.0245, 0.25, 0.24, 0.04), cyl(steel, 0.0088, 0.17, 0.44, 0.04), cyl(black, 0.011, 0.045, 0.535, 0.04), bx(steel, 0.016, 0.03, 0.03, 0.372, 0.052), bx(steel, 0.008, 0.045, 0.01, 0.372, 0.085),
      bx(black, 0.022, 0.03, 0.02, -0.075, 0.08), cyl(steel, 0.0145, 0.2, -0.19, 0.04), ext(poly, [[-0.31, 0.066], [-0.13, 0.058], [-0.13, 0.018], [-0.22, 0.008], [-0.31, -0.06]], 0.034), bx(black, 0.03, 0.006, 0.02, -0.092, 0.064)], -0.56, 0.04);
    // AK pattern rifle
    mk('ak', [ext(steel, [[-0.1, 0.0], [0.122, 0.0], [0.122, 0.046], [0.1, 0.056], [-0.1, 0.056]], 0.034), ext(wood, [[0.122, 0.004], [0.285, 0.012], [0.285, 0.04], [0.122, 0.042]], 0.04),
      cyl(wood, 0.014, 0.15, 0.2, 0.06), cyl(steel, 0.0085, 0.3, 0.37, 0.034), cyl(steel, 0.007, 0.12, 0.31, 0.06), bx(steel, 0.016, 0.034, 0.024, 0.292, 0.046), bx(steel, 0.012, 0.05, 0.016, 0.47, 0.058), cyl(black, 0.0105, 0.03, 0.535, 0.034),
      ext(magm, [[0.052, 0.0], [0.102, 0.0], [0.15, -0.07], [0.196, -0.15], [0.146, -0.168], [0.1, -0.09]], 0.026), ext(wood, [[-0.05, 0.002], [-0.01, 0.0], [-0.036, -0.1], [-0.078, -0.094]], 0.028),
      guard(steel, -0.012, 0.05, 0.0, -0.036, 0.01), bx(steel, 0.004, 0.018, 0.005, 0.018, -0.016), ext(wood, [[-0.36, 0.044], [-0.1, 0.046], [-0.1, 0.006], [-0.2, -0.004], [-0.36, -0.062]], 0.036), bx(black, 0.012, 0.012, 0.02, -0.02, 0.062)], -0.55, 0.034);
    // scoped bolt-action hunting rifle
    mk('bolt', [ext(wood, [[-0.37, 0.042], [-0.13, 0.042], [-0.06, 0.03], [0.33, 0.03], [0.33, 0.006], [0.05, -0.004], [0.0, -0.01], [-0.03, -0.072], [-0.072, -0.078], [-0.094, -0.02], [-0.2, -0.02], [-0.37, -0.072]], 0.042),
      cyl(steel, 0.0165, 0.2, 0.04, 0.046), cyl(steel, 0.013, 0.44, 0.36, 0.046, 0.009), cyl(steel, 0.005, 0.045, -0.03, 0.04, null, 0.03), guard(steel, -0.01, 0.052, -0.006, -0.042, 0.01), bx(steel, 0.004, 0.016, 0.005, 0.018, -0.02),
      cyl(black, 0.0135, 0.25, 0.03, 0.098), cyl(black, 0.021, 0.07, 0.17, 0.098), cyl(black, 0.0185, 0.055, -0.11, 0.098), bx(black, 0.012, 0.03, 0.014, 0.1, 0.074), bx(black, 0.012, 0.03, 0.014, -0.03, 0.074), bx(black, 0.014, 0.014, 0.014, 0.03, 0.115)], -0.585, 0.046);
    models.bolt.children[5].rotation.set(0, 0, Math.PI / 2); models.bolt.children[5].position.set(0.03, 0.036, 0.03);
    // pump-action shotgun
    mk('pump', [ext(steel, [[-0.1, 0.0], [0.105, 0.0], [0.105, 0.056], [-0.08, 0.056], [-0.1, 0.04]], 0.04), cyl(steel, 0.0118, 0.52, 0.36, 0.043), cyl(steel, 0.011, 0.44, 0.32, 0.017), cyl(wood, 0.0225, 0.17, 0.28, 0.019),
      bx(steel, 0.014, 0.008, 0.012, 0.6, 0.03), cyl(stainless, 0.002, 0.004, 0.61, 0.058), ext(wood, [[-0.39, 0.046], [-0.1, 0.05], [-0.1, 0.0], [-0.14, -0.04], [-0.2, -0.02], [-0.39, -0.078]], 0.04),
      guard(steel, -0.02, 0.05, 0.0, -0.038, 0.011), bx(steel, 0.004, 0.016, 0.005, 0.014, -0.018), bx(black, 0.002, 0.016, 0.06, 0.04, 0.03, 0.0205)], -0.62, 0.043);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.9, depthWrite: false }));
    flash.visible = false; g.add(flash);
    const light = new THREE.PointLight(0xffc878, 0, 9, 2); g.add(light);
    const S = { g, models, cls: null, kick: 0, flashT: 0, aim: new THREE.Quaternion() };
    const fwd = new V3(0, 0, -1), d = new V3();
    S.set = (cls, model) => { S.model = models[model] ? model : 'glock'; for (const k in models) models[k].visible = k === S.model; S.cls = cls; };
    S.fire = (recoil) => { S.kick = Math.min(1.6, S.kick + 0.5 + recoil * 0.4); S.flashT = 0.05; const mz = models[S.model].userData.muzzle; flash.position.set(0, models[S.model].userData.fy, mz - 0.05); flash.scale.set(0.035 + recoil * 0.02, 0.035 + recoil * 0.02, 0.09 + recoil * 0.04); flash.rotation.z = Math.random() * 3; light.position.copy(flash.position); };
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
