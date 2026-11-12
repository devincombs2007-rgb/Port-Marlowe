// NPC behaviour. The body is always a physics ragdoll. This file is the "nervous system":
// it decides leg support, balance quality and per-joint muscle tone from the physiology
// (consciousness, cord level, fractures, blood pressure, pain) and physics does the rest.
// Standing, staggering, losing balance, falling and dragging along the floor all emerge.
(function () {
  const G = (window.GSW = window.GSW || {});
  const POSES = {
    stand: { uarmL: [0, 0, 0.1], uarmR: [0, 0, -0.1], farmL: [-0.15, 0, 0], farmR: [-0.15, 0, 0] },
    guard: { abdomen: [0.22, 0, 0], thorax: [0.25, 0, 0], head: [0.2, 0, 0], uarmL: [-0.35, 0, -0.12], uarmR: [-0.35, 0, 0.12], farmL: [-1.75, 0, -0.5], farmR: [-1.75, 0, 0.5], thighL: [-0.2, 0, 0], thighR: [-0.2, 0, 0], shinL: [0.35, 0, 0], shinR: [0.35, 0, 0], footL: [-0.15, 0, 0], footR: [-0.15, 0, 0] },
    brace: { abdomen: [0.3, 0, 0], thorax: [0.3, 0, 0], head: [0.2, 0, 0], uarmL: [-0.9, 0, 0.2], uarmR: [-0.9, 0, -0.2], farmL: [-0.7, 0, 0], farmR: [-0.7, 0, 0], thighL: [-0.9, 0, 0.06], thighR: [-0.9, 0, -0.06], shinL: [1.7, 0, 0], shinR: [1.7, 0, 0] },
    curl: { abdomen: [0.35, 0, 0], thorax: [0.3, 0, 0], head: [0.25, 0, 0], uarmL: [-0.7, 0, -0.15], uarmR: [-0.7, 0, 0.15], farmL: [-1.5, 0, -0.3], farmR: [-1.5, 0, 0.3], thighL: [-1.0, 0, 0], thighR: [-0.8, 0, 0], shinL: [1.3, 0, 0], shinR: [1.2, 0, 0] },
  };
  const eul = new THREE.Euler(), upv = new CANNON.Vec3(), UP = new CANNON.Vec3(0, 1, 0);
  G.NPC = function (body, phys, rag, hooks) {
    const names = body.list.map((s) => s.name).filter((n) => n !== 'pelvis');
    const cur = {};
    for (const k of names) cur[k] = (POSES.stand[k] || [0, 0, 0]).slice();
    const N = { posture: 'stand', pose: 'stand', pos: new THREE.Vector3(), decideT: -1, wantDown: false, clock: 0, breath: 0, ragT: 0, stillT: 0, stagger: 0, stagDir: [0, 0], crawling: false, downT: 0 };
    const ctl = rag.ctl;
    rag.start(); ctl.s = 1; ctl.bal = 1; ctl.y0 = ctl.yRest;
    const collapse = () => {
      if (N.posture !== 'stand') return;
      N.posture = 'falling'; N.ragT = 0; ctl.s = 0; ctl.push.set(0, 0, 0);
      // the legs stop pushing: knees unlock and whatever sway the trunk had decides the direction
      const a = Math.random() * 6.283, v = 0.25 + Math.random() * 0.3;
      rag.push('thorax', Math.cos(a) * v, 0, Math.sin(a) * v); rag.push('pelvis', 0, -0.4, -0.2);
      rag.push('thighL', 0, 0, 0.6); rag.push('thighR', 0, 0, 0.6);
    };
    // real momentum of the projectile (mass x velocity lost in the body)
    N.impulse = (seg, pt, imp) => rag.impulse(seg, pt, imp);
    N.onHit = (res, mark, dir) => {
      if (!phys.alive() || !phys.conscious) return;
      // startle / stagger: a reflex step driven by the legs, in roughly the direction of fire
      N.stagger = 1; const a = Math.atan2(dir.z, dir.x) + (Math.random() - 0.5) * 1.2; N.stagDir = [Math.cos(a), Math.sin(a)];
      if (N.decideT < 0 && N.posture === 'stand') {
        N.decideT = 0.6 + Math.random() * 2.2;
        // many gunshot victims go down even when physically able to stand
        N.wantDown = phys.pain > 0.5 || Math.random() < 0.3 + phys.pain * 0.5;
      }
    };
    N.update = (dt) => {
      N.clock += dt;
      const P = phys, limp = !P.conscious || P.brainDestroyed || P.dead, c = N.clock;
      const legsOut = P.legsPara || P.legBroken.L || P.legBroken.R || P.pelvisBroken;
      const alive = !P.dead && P.rr > 0.5;
      N.breath += dt * (P.rr / 60) * Math.PI * 2;
      const br = alive ? Math.sin(N.breath) * (0.012 + 0.012 * Math.min(1, P.rr / 30)) * (P.arrest ? 2 : 1) : 0;
      const pel = rag.parts.pelvis.b, tho = rag.parts.thorax.b;
      let target = POSES.curl;
      if (N.posture === 'stand') {
        const dizzy = Math.max(0, 0.9 - P.brainE) + Math.max(0, (72 - P.map) / 50);
        tho.quaternion.vmult(UP, upv);
        if (limp || legsOut || P.brainE < 0.55 || P.map < 48) collapse();
        else if (pel.position.y < ctl.yRest * 0.74 || upv.y < 0.55) collapse(); // lost balance: no recovery once past the tipping point
        else {
          if (N.decideT >= 0) {
            N.decideT -= dt;
            if (N.decideT < 0) {
              N.decideT = -1;
              if (N.wantDown) collapse();
              else { if (P.pain > 0.15) N.pose = 'guard'; if (P.pain > 0.6) { N.decideT = 2 + Math.random() * 4; N.wantDown = true; } }
            }
          } else if (P.pain > 0.15) N.pose = 'guard';
          // leg support and balance quality fall with blood pressure and brain perfusion
          ctl.s = 1; ctl.bal = Math.max(0.15, 1 - dizzy * 1.3);
          ctl.y0 = ctl.yRest * (N.pose === 'guard' ? 0.965 : 1) - dizzy * 0.05;
          N.stagger = Math.max(0, N.stagger - dt * 3.2);
          const sw = 6 + dizzy * 150, st = N.stagger * N.stagger * 230;
          ctl.push.set(Math.sin(c * 0.9) * sw + Math.sin(c * 2.3 + 1) * sw * 0.4 + N.stagDir[0] * st, 0, Math.sin(c * 0.7 + 2) * sw + N.stagDir[1] * st);
          target = POSES[N.pose];
        }
      }
      if (N.posture !== 'stand') {
        N.ragT += dt;
        target = N.ragT < 0.9 ? POSES.brace : POSES.curl;
        if (N.posture === 'falling') { N.stillT = rag.speed() < 0.35 && N.ragT > 0.6 && (pel.position.y < 0.5 || N.ragT > 6) ? N.stillT + dt : 0; if (N.stillT > 0.4) { N.posture = 'down'; N.downT = 0; } }
      }
      // ---- wounded and down but conscious with working arms: drag away from the shooter
      N.crawling = false;
      if (N.posture === 'down' && !limp && !P.armsPara && P.brainE > 0.7) {
        N.downT += dt;
        const th = hooks.threat ? hooks.threat() : null;
        if (th && N.downT > 3.5) {
          let dx = tho.position.x - th.x, dz = tho.position.z - th.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
          const R = G.ROOM, x = tho.position.x + dx * 0.9, z = tho.position.z + dz * 0.9;
          if (x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1 && d < 6) {
            N.crawling = true;
            const pulse = Math.max(0, Math.sin(c * 2.4)), f = 1500 * pulse * pulse * Math.min(1, P.brainE);
            if (Math.hypot(tho.velocity.x, tho.velocity.z) < 0.45) { tho.wakeUp(); pel.wakeUp(); tho.force.x += dx * f * 0.6; tho.force.z += dz * f * 0.6; pel.force.x += dx * f * 0.4; pel.force.z += dz * f * 0.4; }
          }
        }
      }
      // ---- muscle tone and joint targets
      const base = limp ? 0 : Math.max(0.25, Math.min(1, P.brainE)) * (1 - 0.3 * Math.min(1, Math.max(0, (60 - P.map) / 40)));
      const writhe = N.posture === 'down' && !limp ? 0.05 + 0.2 * P.pain : 0, k = Math.min(1, dt * 5);
      for (const n of names) {
        const part = rag.parts[n], side = n.slice(-1), isLeg = /^(thigh|shin|foot)/.test(n), isArm = /^(uarm|farm|hand)/.test(n);
        let tone = base;
        if (isLeg) tone *= P.legsPara ? 0 : P.legBroken[side] ? 0.15 : P.pelvisBroken ? 0.4 : 1;
        if (isArm) tone *= P.armsPara ? 0 : P.armBroken[side] ? 0.2 : 1;
        const a = target[n] || [0, 0, 0], q = cur[n];
        for (let i = 0; i < 3; i++) q[i] += (a[i] - q[i]) * k;
        let x = q[0], y = q[1], z = q[2];
        if (writhe && tone > 0) { const ph = c * (1.1 + (n.length % 3) * 0.4) + n.charCodeAt(0); x += Math.sin(ph) * writhe; z += Math.sin(ph * 0.7) * writhe * 0.4; }
        if (N.crawling && isArm && n.startsWith('uarm')) x = -1.6 + Math.sin(c * 2.4 + (side === 'L' ? 0 : Math.PI)) * 0.9;
        // breathing is involuntary: the chest keeps moving while the brainstem drives it
        if (n === 'thorax' && alive) { tone = Math.max(tone, 0.3); x += br * 5; }
        part.tone = tone; part.target.setFromEuler(eul.set(x, y, z));
      }
      rag.step(dt); rag.sync();
      N.pos.set(pel.position.x, 0, pel.position.z);
    };
    return N;
  };
})();
