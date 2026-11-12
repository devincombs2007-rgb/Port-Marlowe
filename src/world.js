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
    const W = { stains: [], pools: [], holes: [] };
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
    W.addHole = (p, n, r) => { const m = place(new THREE.Mesh(circ, holeMat), p, n, 0.003); m.scale.setScalar(r); W.holes.push(m); if (W.holes.length > 150) scene.remove(W.holes.shift()); };
    W.addStain = (p, n, r, stretch, ang) => {
      const m = place(new THREE.Mesh(circ, bloodMat), p, n, 0.0015 + Math.random() * 0.001);
      m.rotateZ(ang || 0); m.scale.set(r, r * (stretch || 1), 1); m.renderOrder = 2; W.stains.push(m);
      if (W.stains.length > 700) scene.remove(W.stains.shift());
    };
    // pools: radius follows volume. Blood on a smooth sealed floor spreads to ~2.5 mm deep.
    const poolGeo = (() => {
      const g = new THREE.CircleGeometry(1, 40), p = g.attributes.position;
      for (let i = 1; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)), k = 1 + 0.1 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 5 + 2) + 0.05 * Math.sin(a * 9); p.setXY(i, Math.cos(a) * k, Math.sin(a) * k); }
      return g;
    })();
    W.poolAt = (x, z) => {
      for (const p of W.pools) if ((p.x - x) ** 2 + (p.z - z) ** 2 < Math.max(0.3, p.r * 0.8) ** 2) return p;
      const m = new THREE.Mesh(poolGeo, bloodMat); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6.3;
      m.position.set(x, 0.0035 + W.pools.length * 0.0002, z); m.scale.setScalar(0.001); m.renderOrder = 3; scene.add(m);
      const p = { m, x, z, ml: 0, r: 0 }; W.pools.push(p); return p;
    };
    W.addToPool = (p, ml) => { p.ml += ml; p.r = Math.sqrt((p.ml * 1e-6) / 0.0025 / Math.PI); p.m.scale.set(p.r, p.r, 1); };

    // ---- droplets
    const NP = 900, pos = new Float32Array(NP * 3).fill(-50), parts = [];
    for (let i = 0; i < NP; i++) parts.push({ on: false, v: new V3(), p: new V3(), stain: 0 });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x8c0c0e, size: 0.014, sizeAttenuation: true })); points.frustumCulled = false; scene.add(points);
    let pi = 0;
    W.drop = (p, v, stain) => { const d = parts[pi]; pi = (pi + 1) % NP; d.on = true; d.p.copy(p); d.v.copy(v); d.stain = stain || 0; };
    W.burst = (p, dir, n, speed, cone, stain) => {
      const v = new V3();
      for (let i = 0; i < n; i++) {
        v.set(dir.x + (Math.random() - 0.5) * cone, dir.y + (Math.random() - 0.5) * cone, dir.z + (Math.random() - 0.5) * cone).normalize().multiplyScalar(speed * (0.25 + Math.random() * 0.9));
        W.drop(p, v, stain * (0.4 + Math.random()));
      }
    };
    const up = new V3(0, 1, 0), nn = new V3();
    W.update = (dt) => {
      for (let i = 0; i < NP; i++) {
        const d = parts[i];
        if (!d.on) continue;
        d.v.y -= 9.81 * dt; d.v.multiplyScalar(1 - 0.6 * dt); d.p.addScaledVector(d.v, dt);
        let hit = null;
        if (d.p.y <= 0) { d.p.y = 0; hit = up; }
        else if (d.p.z <= ROOM.z0) { d.p.z = ROOM.z0; hit = nn.set(0, 0, 1); }
        else if (d.p.x <= ROOM.x0) { d.p.x = ROOM.x0; hit = nn.set(1, 0, 0); }
        else if (d.p.x >= ROOM.x1) { d.p.x = ROOM.x1; hit = nn.set(-1, 0, 0); }
        else if (d.p.z >= ROOM.z1) { d.p.z = ROOM.z1; hit = nn.set(0, 0, -1); }
        if (hit) {
          d.on = false;
          if (d.stain > 0) {
            // oblique impacts leave elongated stains
            const sp = d.v.length(), vn = Math.abs(d.v.dot(hit)) / (sp || 1), st = Math.min(4, 1 / Math.max(0.25, vn));
            const ang = hit === up ? Math.atan2(-d.v.z, d.v.x) + Math.PI / 2 : Math.atan2(d.v.y, hit.z ? d.v.x * hit.z : -d.v.z * hit.x) + Math.PI / 2;
            W.addStain(d.p, hit, d.stain, st, ang);
          }
          pos[i * 3 + 1] = -50;
        } else { pos[i * 3] = d.p.x; pos[i * 3 + 1] = d.p.y; pos[i * 3 + 2] = d.p.z; }
      }
      pg.attributes.position.needsUpdate = true;
    };
    W.clear = () => {
      for (const a of [W.stains, W.holes]) { for (const m of a) scene.remove(m); a.length = 0; }
      for (const p of W.pools) scene.remove(p.m); W.pools.length = 0;
      for (let i = 0; i < NP; i++) { parts[i].on = false; pos[i * 3 + 1] = -50; }
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

  // ---- audio (synthesized; starts on first user gesture)
  G.Audio = function () {
    let ctx = null, noise = null;
    const A = { muted: false };
    A.init = () => {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        noise = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
        const ch = noise.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; }
    };
    const burst = (dur, f0, f1, gain, type, q) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
      s.buffer = noise; f.type = type || 'lowpass'; f.Q.value = q || 0.7; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02);
    };
    const tone = (dur, f0, f1, gain) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    };
    A.shot = (w) => {
      if (!ctx || A.muted) return;
      const L = w.loud, big = w.cls === 'rifle' || w.cls === 'shotgun';
      burst(0.09, 9000, 1200, 0.9 * L, 'lowpass'); burst(big ? 0.55 : 0.32, big ? 2600 : 3400, 180, 0.55 * L, 'lowpass');
      tone(big ? 0.22 : 0.14, w.cls === 'shotgun' ? 110 : big ? 150 : 190, 38, 0.8 * L);
      burst(1.1, 900, 120, 0.12 * L, 'lowpass'); // room tail
    };
    A.impact = () => { if (ctx && !A.muted) { burst(0.07, 700, 160, 0.35, 'lowpass'); } };
    A.wall = () => { if (ctx && !A.muted) burst(0.05, 5200, 1800, 0.12, 'bandpass', 2); };
    A.thud = () => { if (ctx && !A.muted) { tone(0.22, 85, 34, 0.9); burst(0.16, 420, 90, 0.4, 'lowpass'); } };
    return A;
  };
})();
