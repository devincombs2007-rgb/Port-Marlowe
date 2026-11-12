// NPC behaviour: posture is driven by physiology (consciousness, paralysis, fractures,
// pain). Bullets do not throw the body — collapse comes from the nervous system,
// the skeleton failing, or blood pressure.
(function () {
  const G = (window.GSW = window.GSW || {});
  const H = Math.PI / 2;
  const POSES = {
    stand: { root: [0, 0, 0], uarmL: [0, 0, 0.1], uarmR: [0, 0, -0.1], farmL: [-0.15, 0, 0], farmR: [-0.15, 0, 0] },
    guard: { root: [0, 0, 0], abdomen: [0.22, 0, 0], thorax: [0.25, 0, 0], head: [0.2, 0, 0], uarmL: [-0.35, 0, -0.12], uarmR: [-0.35, 0, 0.12], farmL: [-1.75, 0, -0.5], farmR: [-1.75, 0, 0.5], thighL: [-0.2, 0, 0], thighR: [-0.2, 0, 0], shinL: [0.35, 0, 0], shinR: [0.35, 0, 0], footL: [-0.15, 0, 0], footR: [-0.15, 0, 0] },
    kneel: { root: [0.12, 0, 0], abdomen: [0.3, 0, 0], thorax: [0.3, 0, 0], head: [0.3, 0, 0], uarmL: [-0.4, 0, -0.1], uarmR: [-0.4, 0, 0.1], farmL: [-1.7, 0, -0.5], farmR: [-1.7, 0, 0.5], thighL: [-0.25, 0, 0.06], thighR: [-0.25, 0, -0.06], shinL: [1.95, 0, 0], shinR: [1.95, 0, 0], footL: [0.9, 0, 0], footR: [0.9, 0, 0] },
    crumple: { root: [0.25, 0, 0], abdomen: [0.5, 0, 0], thorax: [0.45, 0, 0], neck: [0.3, 0, 0], head: [0.45, 0, 0], uarmL: [-0.2, 0, 0.15], uarmR: [-0.2, 0, -0.15], farmL: [-0.4, 0, 0], farmR: [-0.4, 0, 0], thighL: [-1.25, 0, 0.12], thighR: [-1.1, 0, -0.12], shinL: [2.2, 0, 0], shinR: [2.1, 0, 0], footL: [0.5, 0, 0], footR: [0.5, 0, 0] },
    back: { root: [-H, 0, 0], head: [-0.1, 0.5, 0], uarmL: [0, 0, 0.55], uarmR: [0, 0, -0.35], farmL: [-0.3, 0, 0], farmR: [-0.9, 0, 0.3], thighL: [-0.08, 0, 0.16], thighR: [-0.3, 0, -0.1], shinL: [0.15, 0, 0], shinR: [0.55, 0, 0], footL: [0.5, 0.3, 0], footR: [0.5, -0.3, 0] },
    front: { root: [H, 0, 0], neck: [-0.15, 0.5, 0], head: [-0.1, 0.6, 0], uarmL: [0.15, 0, 0.5], uarmR: [-0.6, 0, -0.9], farmL: [-0.2, 0, 0], farmR: [-1.2, 0, 0], thighL: [0, 0, 0.12], thighR: [-0.25, 0, -0.25], shinL: [0.1, 0, 0], shinR: [0.6, 0, 0], footL: [0.9, 0, 0], footR: [0.9, 0, 0] },
    sideR: { root: [0, 0, H], abdomen: [0.35, 0, 0], thorax: [0.3, 0, 0], head: [0.25, 0, -0.2], uarmL: [-0.7, 0, -0.2], uarmR: [-0.9, 0, 0.1], farmL: [-1.5, 0, -0.3], farmR: [-1.3, 0, 0.2], thighL: [-1.1, 0, 0], thighR: [-0.75, 0, 0], shinL: [1.4, 0, 0], shinR: [1.2, 0, 0], footL: [0.4, 0, 0], footR: [0.4, 0, 0] },
    sideL: { root: [0, 0, -H], abdomen: [0.35, 0, 0], thorax: [0.3, 0, 0], head: [0.25, 0, 0.2], uarmR: [-0.7, 0, 0.2], uarmL: [-0.9, 0, -0.1], farmR: [-1.5, 0, 0.3], farmL: [-1.3, 0, -0.2], thighR: [-1.1, 0, 0], thighL: [-0.75, 0, 0], shinR: [1.4, 0, 0], shinL: [1.2, 0, 0], footL: [0.4, 0, 0], footR: [0.4, 0, 0] },
  };
  const LIMP = { sideR: { abdomen: [0.15, 0, 0], thorax: [0.12, 0, 0], uarmL: [-0.5, 0, 0.1], farmL: [-0.5, 0, 0], uarmR: [-0.6, 0, 0], farmR: [-0.4, 0, 0], thighL: [-0.6, 0, 0], shinL: [0.8, 0, 0], thighR: [-0.3, 0, 0], shinR: [0.5, 0, 0] } };
  LIMP.sideL = { abdomen: [0.15, 0, 0], thorax: [0.12, 0, 0], uarmR: [-0.5, 0, -0.1], farmR: [-0.5, 0, 0], uarmL: [-0.6, 0, 0], farmL: [-0.4, 0, 0], thighR: [-0.6, 0, 0], shinR: [0.8, 0, 0], thighL: [-0.3, 0, 0], shinL: [0.5, 0, 0] };

  G.NPC = function (body, phys, hooks) {
    const names = body.list.map((s) => s.name).filter((n) => n !== 'pelvis');
    const keys = ['root', ...names];
    const cur = {}, from = {}, to = {};
    for (const k of keys) { cur[k] = [0, 0, 0]; from[k] = [0, 0, 0]; to[k] = (POSES.stand[k] || [0, 0, 0]).slice(); }
    const N = {
      posture: 'stand', pose: 'stand', t: 1, dur: 1, ease: (x) => x, queue: [], yaw: 0, pos: new THREE.Vector3(), posFrom: new THREE.Vector3(), posTo: new THREE.Vector3(),
      flinch: [0, 0, 0], flinchT: 0, decideT: -1, wantDown: false, downSide: 'sideR', clock: 0, breath: 0, onGround: false, limpSet: false, thudded: true,
    };
    body.root.rotation.order = 'YXZ';
    const go = (pose, dur, ease, shift, limp) => {
      for (const k of keys) { from[k][0] = cur[k][0]; from[k][1] = cur[k][1]; from[k][2] = cur[k][2]; const p = ((limp && LIMP[pose]) || {})[k] || POSES[pose][k] || [0, 0, 0]; to[k] = p.slice(); }
      if (limp && !LIMP[pose]) for (const k of ['uarmL', 'uarmR', 'farmL', 'farmR']) to[k] = to[k].map((v) => v * 0.6);
      N.pose = pose; N.t = 0; N.dur = dur; N.ease = ease || ((x) => x * x * (3 - 2 * x));
      N.posFrom.copy(N.pos); N.posTo.copy(N.pos);
      if (shift) N.posTo.add(new THREE.Vector3(shift[0], 0, shift[1]).applyAxisAngle(new THREE.Vector3(0, 1, 0), N.yaw));
    };
    const accel = (x) => x * x;
    const fallTo = (limp) => {
      // direction of the final lie: limp bodies crumple straight down then tip
      const r = Math.random();
      const final = limp ? (r < 0.4 ? 'back' : r < 0.7 ? 'front' : r < 0.85 ? 'sideR' : 'sideL') : N.downSide;
      const shift = final === 'back' ? [0, -0.35] : final === 'front' ? [0, 0.4] : final === 'sideR' ? [-0.3, 0] : [0.3, 0];
      N.queue = [[final, limp ? 0.55 : 1.1, accel, shift, limp]];
      go(limp ? 'crumple' : 'kneel', limp ? 0.38 : 0.85, limp ? accel : null, null, limp);
      N.posture = 'falling'; N.thudded = false; N.limpSet = limp;
    };
    N.onHit = (res, mark) => {
      if (!phys.alive() || !phys.conscious) return;
      // flinch away from the wound (a reflex, not momentum)
      const s = mark && mark.p.x > N.pos.x ? 1 : -1;
      N.flinch = [0.1 + Math.random() * 0.1, -s * 0.22, s * 0.06]; N.flinchT = 1;
      if (N.decideT < 0 && N.posture === 'stand') {
        N.decideT = 0.6 + Math.random() * 2.2;
        // many gunshot victims go down voluntarily even when physically able to stand
        N.wantDown = phys.pain > 0.5 || Math.random() < 0.3 + phys.pain * 0.5;
        N.downSide = Math.random() < 0.5 ? 'sideR' : 'sideL';
      }
    };
    N.reset = () => {
      N.posture = 'stand'; N.queue = []; N.pos.set(0, 0, 0); N.yaw = 0; N.decideT = -1; N.wantDown = false; N.onGround = false; N.flinchT = 0; N.thudded = true;
      for (const k of keys) cur[k] = [0, 0, 0];
      go('stand', 0.01);
    };
    N.update = (dt) => {
      N.clock += dt;
      const P = phys, limp = !P.conscious || P.brainDestroyed || P.dead;
      const legsOut = P.legsPara || P.legBroken.L || P.legBroken.R || P.pelvisBroken;
      // ---- posture decisions
      if (N.posture === 'stand') {
        if (limp || P.legsPara) fallTo(true);
        else if (legsOut) { N.downSide = P.legBroken.L ? 'sideL' : 'sideR'; fallTo(false); }
        else if (P.brainE < 0.55 || P.map < 48) fallTo(P.brainE < 0.4);
        else if (N.decideT >= 0) {
          N.decideT -= dt;
          if (N.decideT < 0) { if (N.wantDown) fallTo(false); else if (N.pose !== 'guard' && P.pain > 0.15) go('guard', 0.7); N.decideT = -1; if (!N.wantDown && P.pain > 0.6) N.decideT = 2 + Math.random() * 4, (N.wantDown = true); }
        } else if (P.pain > 0.15 && N.pose === 'stand') go('guard', 0.8);
      } else if (N.posture === 'falling') {
        if (limp && !N.limpSet) { N.limpSet = true; if (N.queue.length) N.queue[0][4] = true, (N.queue[0][1] = 0.5); }
      } else if (N.posture === 'down') {
        if (limp && !N.limpSet) { N.limpSet = true; go(N.pose, 1.6, null, null, true); }
      }
      // ---- pose transition
      if (N.t < 1) {
        N.t = Math.min(1, N.t + dt / N.dur);
        const e = N.ease(N.t);
        for (const k of keys) for (let i = 0; i < 3; i++) cur[k][i] = from[k][i] + (to[k][i] - from[k][i]) * e;
        N.pos.lerpVectors(N.posFrom, N.posTo, e);
        if (N.t >= 1 && N.queue.length) go(...N.queue.shift());
        else if (N.t >= 1 && N.posture === 'falling') { N.posture = 'down'; N.onGround = true; if (!N.thudded) { N.thudded = true; hooks.thud && hooks.thud(); } }
      }
      // ---- additive layers
      const alive = !P.dead && P.rr > 0.5;
      N.breath += dt * (P.rr / 60) * Math.PI * 2;
      const br = alive ? Math.sin(N.breath) * (0.012 + 0.012 * Math.min(1, P.rr / 30)) * (P.arrest ? 2 : 1) : 0;
      const aw = P.conscious && !limp ? 1 : 0;
      const dizzy = aw * Math.max(0, 0.9 - P.brainE) + aw * Math.max(0, (70 - P.map) / 60);
      const sway = N.posture === 'stand' ? 0.012 + dizzy * 0.16 : 0;
      const writhe = N.posture === 'down' && aw ? 0.05 + 0.12 * P.pain : 0;
      N.flinchT = Math.max(0, N.flinchT - dt * 2.6);
      const f = N.flinchT * N.flinchT, c = N.clock;
      const set = (k, x, y, z) => { const g = body.segs[k].g.rotation, a = cur[k]; g.set(a[0] + x, a[1] + y, a[2] + z); };
      for (const k of names) set(k, 0, 0, 0);
      set('thorax', br * -1 + N.flinch[0] * f + Math.sin(c * 2.3) * writhe * 0.5, N.flinch[1] * f, N.flinch[2] * f + Math.sin(c * 0.9) * sway);
      set('abdomen', Math.sin(c * 1.1 + 1) * sway * 0.6 + Math.sin(c * 1.7) * writhe * 0.4, 0, Math.sin(c * 0.7) * sway * 0.5);
      set('head', N.flinch[0] * f * 0.8 + Math.sin(c * 1.3) * (sway + writhe) * 0.6, Math.sin(c * 0.5) * 0.06 * aw + Math.sin(c * 1.9) * writhe, 0);
      set('uarmL', br * 0.4, 0, br * 0.5); set('uarmR', br * 0.4, 0, -br * 0.5);
      set('thighL', Math.sin(c * 1.5 + 2) * writhe, 0, 0); set('shinR', Math.abs(Math.sin(c * 1.2)) * writhe, 0, 0);
      if (P.armsPara || limp) for (const s of ['L', 'R']) if (N.posture === 'stand') body.segs['farm' + s].g.rotation.set(0, 0, 0);
      const rr = cur.root;
      body.root.rotation.set(rr[0] + Math.sin(c * 0.8) * sway * 0.5, N.yaw + rr[1], rr[2] + Math.sin(c * 0.6 + 1) * sway * 0.6);
      body.root.position.set(N.pos.x, 0, N.pos.z);
      body.root.updateMatrixWorld(true);
      body.root.position.y = -body.lowest() + 0.002;
      body.updateMatrices();
    };
    N.reset();
    return N;
  };
})();
