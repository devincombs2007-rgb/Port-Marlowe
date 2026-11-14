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
    // brain: grey-pink, convoluted, streaked with blood; the optic nerve: pale, thin
    const brainTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#b8968e'; x.fillRect(0, 0, 128, 32);
      for (let k = 0; k < 40; k++) { x.strokeStyle = 'rgba(120,70,70,0.45)'; x.lineWidth = 1.2; x.beginPath(); let px = Math.random() * 128, py = Math.random() * 32; x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (Math.random() - 0.5) * 14; py += (Math.random() - 0.5) * 10; x.lineTo(px, py); } x.stroke(); }
      for (let k = 0; k < 8; k++) { x.fillStyle = 'rgba(80,6,8,0.6)'; x.beginPath(); x.ellipse(Math.random() * 128, Math.random() * 32, 4 + Math.random() * 10, 2 + Math.random() * 5, 0, 0, 7); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t; })();
    const MATS = {
      bowel: mat,
      brain: new THREE.MeshPhysicalMaterial({ map: brainTex, color: 0xb0948f, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.15, side: THREE.DoubleSide }),
      brainBloody: new THREE.MeshPhysicalMaterial({ map: brainTex, color: 0x7a2a28, roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.08, side: THREE.DoubleSide }),
      nerve: new THREE.MeshPhysicalMaterial({ color: 0xc8a8a0, roughness: 0.5, clearcoat: 0.4, side: THREE.DoubleSide }),
    };
    const RS = 10, N = 30; // ring segments, points per loop
    const P = {};
    // w: the surface wound; size: crater radius (m) — sets how much can come out
    // kind: 'bowel' (a loop, both ends in the wound), 'brain' (extruded tissue, a short lumpy loop), 'eye' (the optic
    // nerve as a strand with the eyeball on its end; opts.eye is the eye's mesh group to carry)
    // brain pushed out of a burst skull is not a rope: it is soft, torn lumps clinging to the edge of the defect and
    // the hair, some slumping out and down. Irregular blobs, carried by the head.
    const blobs = [], blobGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 2), a = g.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i), z = a.getZ(i), k = 1 + 0.22 * Math.sin(x * 5.1 + y * 3.3) * Math.sin(z * 4.7 - x * 2.1) + 0.1 * Math.sin(y * 11 + z * 9); a.setXYZ(i, x * k, y * k * 0.7, z * k); } g.computeVertexNormals(); return g; })();
    P.brain = (w, R) => {
      const n = 3 + Math.round(R * 55), g = w.g.parent, hc = new V3(0, 1.69, -0.005).sub(w.seg.origin); // lumps move with the head
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(blobGeo, MATS.brain), a = Math.random() * 6.283, rr = R * (0.05 + 0.6 * Math.pow(Math.random(), 1.5));
        const t1 = new V3(0, 1, 0).cross(w.n); if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0); t1.normalize(); const t2 = new V3().crossVectors(w.n, t1);
        m.position.copy(w.g.position).addScaledVector(t1, Math.cos(a) * rr).addScaledVector(t2, Math.sin(a) * rr);
        // keep each lump on the curve of the skull (or just inside the defect), not on a flat plane sticking out
        const out = m.position.clone().sub(hc), r0 = w.g.position.distanceTo(hc); out.setLength(r0 * (0.9 + Math.random() * 0.12)); m.position.copy(hc).add(out);
        if (Math.random() < 0.45) m.material = MATS.brainBloody;
        m.scale.setScalar(0.004 + Math.random() * 0.007 * (0.6 + R * 6)); m.scale.y *= 0.6 + Math.random() * 0.5; m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        m.castShadow = true; g.add(m); blobs.push(m);
      }
    };
    P.spawn = (w, size, kind = 'bowel', opts = {}) => {
      if (kind === 'brain') return P.brain(w, Math.max(0.012, size));
      if (loops.filter((l) => l.w === w && l.kind === kind).length >= (kind === 'brain' ? 3 : 2)) return;
      const k = loops.filter((l) => l.w === w).length;
      const len = kind === 'eye' ? 0.035 + Math.random() * 0.015 : kind === 'brain' ? Math.min(0.09, 0.025 + size * 0.7) * (0.6 + Math.random() * 0.6) : Math.min(0.9, 0.25 + size * 9) * (k ? 0.6 : 1); // up to most of a metre of small bowel through a big hole
      const g = new THREE.BufferGeometry(), pos = new Float32Array(N * RS * 3), nrm = new Float32Array(N * RS * 3), uv = new Float32Array(N * RS * 2), idx = [];
      for (let i = 0; i < N - 1; i++) for (let j = 0; j < RS; j++) { const a = i * RS + j, b = i * RS + ((j + 1) % RS), c = a + RS, d = b + RS; idx.push(a, b, c, b, d, c); }
      for (let i = 0; i < N; i++) for (let j = 0; j < RS; j++) { uv[(i * RS + j) * 2] = (i / (N - 1)) * len * 9; uv[(i * RS + j) * 2 + 1] = j / RS; }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
      const mesh = new THREE.Mesh(g, kind === 'eye' ? MATS.nerve : MATS[kind] || mat); mesh.frustumCulled = false; mesh.castShadow = true; scene.add(mesh);
      let ball = null; if (kind === 'eye' && opts.eye) { ball = opts.eye.clone(true); ball.visible = true; ball.position.set(0, 0, 0); scene.add(ball); }
      const p = [], q = []; const c0 = new V3(); body.woundWorld(w, c0);
      for (let i = 0; i < N; i++) { p.push(c0.clone()); q.push(c0.clone()); }
      loops.push({ w, kind, ball, mesh, g, p, q, len, out: kind === 'eye' ? len : kind === 'brain' ? len * 0.4 : 0.02, rad: kind === 'eye' ? 0.0022 : kind === 'brain' ? 0.011 + Math.random() * 0.008 : 0.012 + Math.random() * 0.003, lump: kind === 'brain' ? 0.6 : kind === 'eye' ? 0 : 0.12, twist: Math.random() * 6, side: k % 2 ? -1 : 1, strand: kind === 'eye' });
    };
    const c = new V3(), n = new V3(), t = new V3(), tA = new V3(), tB = new V3(), d = new V3(), up = new V3(0, 1, 0), tmp = new V3();
    const torsoParts = ['abdomen', 'pelvis', 'thorax', 'head'], Z = new V3(0, 0, 1); // the eye's front faces away from its nerve
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
          if (i === 0 || (i === N - 1 && !L.strand)) continue;
          const pi = L.p[i], qi = L.q[i];
          d.subVectors(pi, qi).multiplyScalar(0.985); qi.copy(pi); pi.add(d); pi.y -= 9.81 * h * h;
        }
        L.p[0].copy(e0); if (!L.strand) L.p[N - 1].copy(c).addScaledVector(tA, -L.side * 0.008).addScaledVector(n, -0.004);
        for (let it = 0; it < 10; it++) {
          for (let i = 0; i < N - 1; i++) {
            const a = L.p[i], b = L.p[i + 1]; d.subVectors(b, a); const m = d.length() || 1e-6, diff = (m - seg) / m;
            const wa = i === 0 ? 0 : 0.5, wb = i + 1 === N - 1 && !L.strand ? 0 : 0.5;
            a.addScaledVector(d, diff * wa * (wa + wb > 0 ? 1 / (wa + wb) : 0)); b.addScaledVector(d, -diff * wb * (wa + wb > 0 ? 1 / (wa + wb) : 0));
          }
          for (let i = 1; i < (L.strand ? N : N - 1); i++) {
            const pi = L.p[i];
            if (pi.y < L.rad) pi.y = L.rad; // the floor
            // it lies on the outside of the body, not inside it
            for (const nm of torsoParts) { const b = rag.parts[nm] && rag.parts[nm].b; if (!b) continue; const r = nm === 'thorax' ? 0.13 : nm === 'head' ? 0.085 : 0.12; d.set(pi.x - b.position.x, pi.y - b.position.y, pi.z - b.position.z); const m = d.length(); if (m < r && m > 1e-5) pi.addScaledVector(d, (r - m) / m); }
            // and pushes out of the wound, not back in
            const ends = L.strand ? i : Math.min(i, N - 1 - i);
            d.subVectors(pi, c); const along = d.dot(n); if (along < 0.004 * ends) pi.addScaledVector(n, Math.min(0.01, 0.004 * ends - along) * 0.5);
          }
        }
        // the tube: rings along the rope with parallel-transported frames
        const pos = L.g.attributes.position.array, nrm = L.g.attributes.normal.array;
        let ref = tB.copy(n);
        for (let i = 0; i < N; i++) {
          t.subVectors(L.p[Math.min(N - 1, i + 1)], L.p[Math.max(0, i - 1)]).normalize();
          ref.addScaledVector(t, -ref.dot(t)); if (ref.lengthSq() < 1e-6) ref.copy(tA); ref.normalize();
          const bi = d.crossVectors(t, ref).normalize(), r = L.rad * (i === 0 || (i === N - 1 && !L.strand) ? 0.6 : 1) * (1 + L.lump * Math.sin(i * 1.7 + L.twist) * Math.sin(i * 0.6 + L.twist * 2));
          for (let j = 0; j < RS; j++) {
            const a = (j / RS) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), o = (i * RS + j) * 3;
            const nx = ref.x * ca + bi.x * sa, ny = ref.y * ca + bi.y * sa, nz = ref.z * ca + bi.z * sa;
            pos[o] = L.p[i].x + nx * r; pos[o + 1] = L.p[i].y + ny * r; pos[o + 2] = L.p[i].z + nz * r; nrm[o] = nx; nrm[o + 1] = ny; nrm[o + 2] = nz;
          }
        }
        L.g.attributes.position.needsUpdate = L.g.attributes.normal.needsUpdate = true; L.g.computeBoundingSphere();
        if (L.ball) { L.ball.position.copy(L.p[N - 1]); t.subVectors(L.p[N - 1], L.p[N - 2]).normalize(); L.ball.quaternion.setFromUnitVectors(Z, t); }
      }
    };
    P.count = () => loops.length;
    P.clear = () => { for (const L of loops) { scene.remove(L.mesh); L.g.dispose(); if (L.ball) scene.remove(L.ball); } loops.length = 0; for (const m of blobs) m.parent && m.parent.remove(m); blobs.length = 0; };
    return P;
  };
})();
