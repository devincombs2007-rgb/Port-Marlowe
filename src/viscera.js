// Evisceration. When a round blows a crater through the abdominal wall and has torn the bowel behind it, loops of
// intestine push out through the hole: slowly at first, faster while the person is upright and straining, and they
// hang, swing and settle on the floor. Each loop is a rope of points (verlet integration with length constraints),
// both ends held at the wound as it moves with the body, drawn as a glistening tube.
(function () {
  const G = (window.GSW = window.GSW || {});
  G.Viscera = function (scene, body, rag) {
    const V3 = THREE.Vector3, loops = [];
    const tex = (() => {
      // serosa: pink-grey with darker folds across the tube and fine vessels along it
      const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d');
      x.fillStyle = '#a8645c'; x.fillRect(0, 0, 256, 32);
      for (let i = 0; i < 256; i += 7 + Math.random() * 9) { x.fillStyle = 'rgba(90,35,40,' + (0.08 + Math.random() * 0.12) + ')'; x.fillRect(i, 0, 1 + Math.random() * 2, 32); }
      for (let k = 0; k < 10; k++) { const g = x.createRadialGradient(0, 0, 1, 0, 0, 1); x.save(); x.translate(Math.random() * 256, Math.random() * 32); x.scale(6 + Math.random() * 14, 4 + Math.random() * 8); g.addColorStop(0, 'rgba(70,4,8,0.75)'); g.addColorStop(1, 'rgba(70,4,8,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); } // blood on it
      for (let k = 0; k < 14; k++) { x.strokeStyle = 'rgba(140,30,45,0.35)'; x.lineWidth = 0.8; x.beginPath(); let y = Math.random() * 32; x.moveTo(0, y); for (let i = 0; i < 256; i += 16) { y += (Math.random() - 0.5) * 4; x.lineTo(i, y); } x.stroke(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
    })();
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, color: 0xc49a94, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.15, metalness: 0, side: THREE.DoubleSide });
    const RS = 10, N = 30; // ring segments, points per loop
    const P = {};
    // w: the surface wound; size: crater radius (m) — sets how much can come out
    P.spawn = (w, size) => {
      if (loops.filter((l) => l.w === w).length >= 2) return;
      const k = loops.filter((l) => l.w === w).length;
      const len = Math.min(0.9, 0.25 + size * 9) * (k ? 0.6 : 1); // up to most of a metre of small bowel through a big hole
      const g = new THREE.BufferGeometry(), pos = new Float32Array(N * RS * 3), nrm = new Float32Array(N * RS * 3), uv = new Float32Array(N * RS * 2), idx = [];
      for (let i = 0; i < N - 1; i++) for (let j = 0; j < RS; j++) { const a = i * RS + j, b = i * RS + ((j + 1) % RS), c = a + RS, d = b + RS; idx.push(a, b, c, b, d, c); }
      for (let i = 0; i < N; i++) for (let j = 0; j < RS; j++) { uv[(i * RS + j) * 2] = (i / (N - 1)) * len * 9; uv[(i * RS + j) * 2 + 1] = j / RS; }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
      const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.castShadow = true; scene.add(mesh);
      const p = [], q = []; const c0 = new V3(); body.woundWorld(w, c0);
      for (let i = 0; i < N; i++) { p.push(c0.clone()); q.push(c0.clone()); }
      loops.push({ w, mesh, g, p, q, len, out: 0.02, rad: 0.012 + Math.random() * 0.003, twist: Math.random() * 6, side: k ? -1 : 1 });
    };
    const c = new V3(), n = new V3(), t = new V3(), tA = new V3(), tB = new V3(), d = new V3(), up = new V3(0, 1, 0), tmp = new V3();
    const torsoParts = ['abdomen', 'pelvis', 'thorax'];
    P.update = (dt) => {
      if (!loops.length || dt <= 0) return;
      const h = Math.min(dt, 1 / 30);
      for (const L of loops) {
        body.woundWorld(L.w, c); body.woundNormal(L.w, n);
        // how fast it comes out: gravity along the wound's outward direction and the body's own movement push it
        const push = 0.006 + 0.03 * Math.max(0, -n.y * 0.2 + 0.4) + (rag.speed ? Math.min(0.05, rag.speed() * 0.02) : 0);
        L.out = Math.min(L.len, L.out + push * h);
        const seg = L.out / (N - 1);
        tA.copy(up).cross(n); if (tA.lengthSq() < 1e-4) tA.set(1, 0, 0); tA.normalize();
        // both ends are held in the hole, a little apart
        const e0 = tmp.copy(c).addScaledVector(tA, L.side * 0.008).addScaledVector(n, -0.004);
        for (let i = 0; i < N; i++) {
          if (i === 0 || i === N - 1) continue;
          const pi = L.p[i], qi = L.q[i];
          d.subVectors(pi, qi).multiplyScalar(0.985); qi.copy(pi); pi.add(d); pi.y -= 9.81 * h * h;
        }
        L.p[0].copy(e0); L.p[N - 1].copy(c).addScaledVector(tA, -L.side * 0.008).addScaledVector(n, -0.004);
        for (let it = 0; it < 10; it++) {
          for (let i = 0; i < N - 1; i++) {
            const a = L.p[i], b = L.p[i + 1]; d.subVectors(b, a); const m = d.length() || 1e-6, diff = (m - seg) / m;
            const wa = i === 0 ? 0 : 0.5, wb = i + 1 === N - 1 ? 0 : 0.5;
            a.addScaledVector(d, diff * wa * (wa + wb > 0 ? 1 / (wa + wb) : 0)); b.addScaledVector(d, -diff * wb * (wa + wb > 0 ? 1 / (wa + wb) : 0));
          }
          for (let i = 1; i < N - 1; i++) {
            const pi = L.p[i];
            if (pi.y < L.rad) pi.y = L.rad; // the floor
            // it lies on the outside of the body, not inside it
            for (const nm of torsoParts) { const b = rag.parts[nm] && rag.parts[nm].b; if (!b) continue; const r = nm === 'thorax' ? 0.13 : 0.12; d.set(pi.x - b.position.x, pi.y - b.position.y, pi.z - b.position.z); const m = d.length(); if (m < r && m > 1e-5) pi.addScaledVector(d, (r - m) / m); }
            // and pushes out of the wound, not back in
            d.subVectors(pi, c); const along = d.dot(n); if (along < 0.004 * Math.min(i, N - 1 - i)) pi.addScaledVector(n, Math.min(0.01, 0.004 * Math.min(i, N - 1 - i) - along) * 0.5);
          }
        }
        // the tube: rings along the rope with parallel-transported frames
        const pos = L.g.attributes.position.array, nrm = L.g.attributes.normal.array;
        let ref = tB.copy(n);
        for (let i = 0; i < N; i++) {
          t.subVectors(L.p[Math.min(N - 1, i + 1)], L.p[Math.max(0, i - 1)]).normalize();
          ref.addScaledVector(t, -ref.dot(t)); if (ref.lengthSq() < 1e-6) ref.copy(tA); ref.normalize();
          const bi = d.crossVectors(t, ref).normalize(), r = L.rad * (i === 0 || i === N - 1 ? 0.6 : 1) * (1 + 0.12 * Math.sin(i * 1.7 + L.twist));
          for (let j = 0; j < RS; j++) {
            const a = (j / RS) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), o = (i * RS + j) * 3;
            const nx = ref.x * ca + bi.x * sa, ny = ref.y * ca + bi.y * sa, nz = ref.z * ca + bi.z * sa;
            pos[o] = L.p[i].x + nx * r; pos[o + 1] = L.p[i].y + ny * r; pos[o + 2] = L.p[i].z + nz * r; nrm[o] = nx; nrm[o + 1] = ny; nrm[o + 2] = nz;
          }
        }
        L.g.attributes.position.needsUpdate = L.g.attributes.normal.needsUpdate = true; L.g.computeBoundingSphere();
      }
    };
    P.count = () => loops.length;
    P.clear = () => { for (const L of loops) { scene.remove(L.mesh); L.g.dispose(); } loops.length = 0; };
    return P;
  };
})();
