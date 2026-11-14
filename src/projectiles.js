// The bullet itself: a jacketed round (or a cloud of shot) that leaves the muzzle and flies the track the ballistics
// computed, at the real speed of each leg: muzzle to the skin, hidden inside the body, out of the exit at the exit
// speed, on to the wall, and off again if it ricochets. At normal speed it crosses the room inside one frame and shows
// only as a faint streak (what a camera shutter would catch); in slow motion time drops to bullet speed while a round
// is in the air, so it can be watched all the way in.
(function () {
  const G = (window.GSW = window.GSW || {});
  G.Projectiles = function (scene) {
    const list = [];
    const jacket = new THREE.MeshStandardMaterial({ color: 0xc27a45, metalness: 0.85, roughness: 0.28 });
    const lead = new THREE.MeshStandardMaterial({ color: 0x8a8d91, metalness: 0.7, roughness: 0.4 });
    // the wake: brightest at the round, fading out behind it
    const fade = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c); })();
    const streakMat = new THREE.MeshBasicMaterial({ color: 0xfff0d8, alphaMap: fade, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    // an ogive-nosed bullet, 1.6 calibres long, nose along +Y
    const roundGeo = new THREE.LatheGeometry([[0, 0], [0.5, 0], [0.5, 0.95], [0.46, 1.15], [0.36, 1.35], [0.2, 1.52], [0, 1.6]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
    const shotGeo = new THREE.SphereGeometry(0.5, 10, 8), streakGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1, true);
    streakGeo.translate(0, -0.5, 0); // the streak trails behind the round
    const Y = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
    const P = {};
    // pts: [p0, p1, ...] world points; v: speed (m/s) of each leg; hide: legs inside the body; cal: diameter (m)
    P.spawn = (pts, v, hide, cal, shot, t0) => {
      const legs = []; let T = t0;
      for (let i = 0; i < pts.length - 1; i++) { const len = pts[i].distanceTo(pts[i + 1]), dt = len / Math.max(1, v[i]); legs.push({ a: pts[i].clone(), b: pts[i + 1].clone(), t0: T, t1: T + dt, hide: hide[i] }); T += dt; }
      if (!legs.length) return;
      const m = new THREE.Mesh(shot ? shotGeo : roundGeo, shot ? lead : jacket), s = new THREE.Mesh(streakGeo, streakMat.clone());
      m.scale.setScalar(Math.max(0.004, cal)); m.visible = s.visible = false; scene.add(m, s);
      list.push({ legs, m, s, cal: Math.max(0.004, cal), end: T, last: null });
    };
    P.active = (t) => list.some((p) => t < p.end);
    const posAt = (p, t, out) => {
      for (const L of p.legs) if (t <= L.t1) { const u = Math.max(0, (t - L.t0) / (L.t1 - L.t0 || 1)); out.lerpVectors(L.a, L.b, u); return L; }
      const L = p.legs[p.legs.length - 1]; out.copy(L.b); return L;
    };
    P.update = (t, dtSim) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (t > p.end + 0.03) { scene.remove(p.m, p.s); p.s.material.dispose(); list.splice(i, 1); continue; }
        const L = posAt(p, t, a), L0 = posAt(p, Math.max(p.legs[0].t0, t - Math.max(dtSim, 1e-5)), b);
        d.subVectors(L.b, L.a).normalize();
        p.m.position.copy(a); p.m.quaternion.setFromUnitVectors(Y, d); p.m.visible = !L.hide && t < p.end;
        // the streak: where the round was a moment ago to where it is now, on the same visible leg
        // at full speed: where the round was a frame ago to where it is now (a shutter streak). In slow motion: a wake
        // of disturbed air a little under a metre long, so the eye can follow a round only a few pixels across
        const slowmo = dtSim < 0.002, run = a.distanceTo(L.a), len = slowmo ? Math.min(run, 0.8) : L0 === L ? a.distanceTo(b) : run;
        p.s.visible = !L.hide && len > p.cal * 2;
        if (p.s.visible) { p.s.position.copy(a); p.s.quaternion.copy(p.m.quaternion); const w = slowmo ? p.cal * 1.1 : p.cal * 0.6; p.s.scale.set(w, Math.min(len, 6), w); p.s.material.opacity = slowmo ? 0.32 : len > 0.5 ? 0.16 : 0.32; }
      }
    };
    P.clear = () => { for (const p of list) { scene.remove(p.m, p.s); p.s.material.dispose(); } list.length = 0; };
    return P;
  };
})();
