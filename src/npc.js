// NPC behaviour. While the subject can stand, posture is animated. The moment it can't
// (or chooses not to), the body is handed to the physics ragdoll: gravity, joint limits
// and ground contact decide how it falls. The nervous system only sets muscle tone:
// unconscious = limp, cord injury = no tone below the level, fracture = limb can't brace.
(function () {
  const G = (window.GSW = window.GSW || {});
  const POSES = {
    stand: { uarmL: [0, 0, 0.1], uarmR: [0, 0, -0.1], farmL: [-0.15, 0, 0], farmR: [-0.15, 0, 0] },
    guard: { abdomen: [0.22, 0, 0], thorax: [0.25, 0, 0], head: [0.2, 0, 0], uarmL: [-0.35, 0, -0.12], uarmR: [-0.35, 0, 0.12], farmL: [-1.75, 0, -0.5], farmR: [-1.75, 0, 0.5], thighL: [-0.2, 0, 0], thighR: [-0.2, 0, 0], shinL: [0.35, 0, 0], shinR: [0.35, 0, 0], footL: [-0.15, 0, 0], footR: [-0.15, 0, 0] },
    // joint targets the muscles pull toward once on the way down / on the ground
    brace: { abdomen: [0.3, 0, 0], thorax: [0.3, 0, 0], head: [0.2, 0, 0], uarmL: [-0.9, 0, 0.2], uarmR: [-0.9, 0, -0.2], farmL: [-0.7, 0, 0], farmR: [-0.7, 0, 0], thighL: [-0.9, 0, 0.06], thighR: [-0.9, 0, -0.06], shinL: [1.7, 0, 0], shinR: [1.7, 0, 0] },
    curl: { abdomen: [0.35, 0, 0], thorax: [0.3, 0, 0], head: [0.25, 0, 0], uarmL: [-0.7, 0, -0.15], uarmR: [-0.7, 0, 0.15], farmL: [-1.5, 0, -0.3], farmR: [-1.5, 0, 0.3], thighL: [-1.0, 0, 0], thighR: [-0.8, 0, 0], shinL: [1.3, 0, 0], shinR: [1.2, 0, 0] },
  };
  const eul = new THREE.Euler();
  G.NPC = function (body, phys, rag, hooks) {
    const names = body.list.map((s) => s.name).filter((n) => n !== 'pelvis');
    const cur = {}, from = {}, to = {};
    for (const k of names) { cur[k] = [0, 0, 0]; from[k] = [0, 0, 0]; to[k] = (POSES.stand[k] || [0, 0, 0]).slice(); }
    const N = { posture: 'stand', pose: 'stand', t: 1, dur: 1, pos: new THREE.Vector3(), flinch: [0, 0, 0], flinchT: 0, decideT: -1, wantDown: false, clock: 0, breath: 0, ragT: 0, stillT: 0, pending: [] };
    const go = (pose, dur) => {
      for (const k of names) { from[k] = cur[k].slice(); to[k] = (POSES[pose][k] || [0, 0, 0]).slice(); }
      N.pose = pose; N.t = 0; N.dur = dur;
    };
    const collapse = () => {
      rag.start(); N.posture = 'falling'; N.ragT = 0;
      // a standing body is never perfectly balanced: small sway velocity decides the direction
      const a = Math.random() * 6.283, v = 0.25 + Math.random() * 0.25;
      rag.push('thorax', Math.cos(a) * v, 0, Math.sin(a) * v); rag.push('pelvis', -Math.cos(a) * v * 0.4, 0, -Math.sin(a) * v * 0.4);
      for (const p of N.pending) if (N.clock - p.t < 0.5) rag.impulse(p.seg, p.pt, p.imp);
      N.pending.length = 0;
    };
    // real momentum of the projectile (mass x velocity lost in the body)
    N.impulse = (seg, pt, imp) => { if (rag.active) rag.impulse(seg, pt, imp); else N.pending.push({ seg, pt: { ...pt }, imp: { ...imp }, t: N.clock }); };
    N.onHit = (res, mark) => {
      if (!phys.alive() || !phys.conscious) return;
      const s = mark && mark.p.x > N.pos.x ? 1 : -1; // flinch is a reflex, not momentum
      N.flinch = [0.1 + Math.random() * 0.1, -s * 0.22, s * 0.06]; N.flinchT = 1;
      if (N.decideT < 0 && N.posture === 'stand') {
        N.decideT = 0.6 + Math.random() * 2.2;
        // many gunshot victims go down even when physically able to stand
        N.wantDown = phys.pain > 0.5 || Math.random() < 0.3 + phys.pain * 0.5;
      }
    };
    N.update = (dt) => {
      N.clock += dt;
      const P = phys, limp = !P.conscious || P.brainDestroyed || P.dead;
      const legsOut = P.legsPara || P.legBroken.L || P.legBroken.R || P.pelvisBroken;
      const alive = !P.dead && P.rr > 0.5;
      N.breath += dt * (P.rr / 60) * Math.PI * 2;
      const br = alive ? Math.sin(N.breath) * (0.012 + 0.012 * Math.min(1, P.rr / 30)) * (P.arrest ? 2 : 1) : 0;
      const aw = limp ? 0 : 1, c = N.clock;
      if (N.posture === 'stand') {
        if (limp || legsOut || P.brainE < 0.55 || P.map < 48) collapse();
        else if (N.decideT >= 0) {
          N.decideT -= dt;
          if (N.decideT < 0) {
            N.decideT = -1;
            if (N.wantDown) collapse();
            else { if (N.pose !== 'guard' && P.pain > 0.15) go('guard', 0.7); if (P.pain > 0.6) { N.decideT = 2 + Math.random() * 4; N.wantDown = true; } }
          }
        } else if (P.pain > 0.15 && N.pose === 'stand') go('guard', 0.8);
      }
      if (!rag.active) {
        // ---- animated standing
        if (N.t < 1) { N.t = Math.min(1, N.t + dt / N.dur); const e = N.t * N.t * (3 - 2 * N.t); for (const k of names) for (let i = 0; i < 3; i++) cur[k][i] = from[k][i] + (to[k][i] - from[k][i]) * e; }
        const dizzy = Math.max(0, 0.9 - P.brainE) + Math.max(0, (70 - P.map) / 60), sway = 0.012 + dizzy * 0.16;
        N.flinchT = Math.max(0, N.flinchT - dt * 2.6);
        const f = N.flinchT * N.flinchT;
        const set = (k, x, y, z) => { const a = cur[k]; body.segs[k].g.rotation.set(a[0] + x, a[1] + y, a[2] + z); };
        for (const k of names) set(k, 0, 0, 0);
        set('thorax', -br + N.flinch[0] * f, N.flinch[1] * f, N.flinch[2] * f + Math.sin(c * 0.9) * sway);
        set('abdomen', Math.sin(c * 1.1 + 1) * sway * 0.6, 0, Math.sin(c * 0.7) * sway * 0.5);
        set('head', N.flinch[0] * f * 0.8 + Math.sin(c * 1.3) * sway * 0.6, Math.sin(c * 0.5) * 0.06, 0);
        set('uarmL', br * 0.4, 0, br * 0.5); set('uarmR', br * 0.4, 0, -br * 0.5);
        body.root.rotation.set(Math.sin(c * 0.8) * sway * 0.5, 0, Math.sin(c * 0.6 + 1) * sway * 0.6);
        body.root.position.set(0, 0, 0); body.root.updateMatrixWorld(true);
        body.root.position.y = -body.lowest() + 0.002;
        body.updateMatrices();
        rag.step(dt);
        return;
      }
      // ---- ragdoll: set muscle tone and targets, then let physics run
      N.ragT += dt;
      const base = limp ? 0 : Math.max(0.25, Math.min(1, P.brainE)) * (1 - 0.3 * Math.min(1, Math.max(0, (60 - P.map) / 40)));
      const target = N.ragT < 0.9 ? POSES.brace : POSES.curl, writhe = aw * (0.05 + 0.2 * P.pain);
      for (const k of names) {
        const part = rag.parts[k], side = k.slice(-1), isLeg = /^(thigh|shin|foot)/.test(k), isArm = /^(uarm|farm|hand)/.test(k);
        let tone = base;
        if (isLeg) tone *= P.legsPara ? 0 : P.legBroken[side] ? 0.15 : P.pelvisBroken ? 0.4 : 1;
        if (isArm) tone *= P.armsPara ? 0 : P.armBroken[side] ? 0.2 : 1;
        const a = target[k] || [0, 0, 0];
        let x = a[0], y = a[1], z = a[2];
        if (tone > 0) { const ph = c * (1.1 + (k.length % 3) * 0.4) + k.charCodeAt(0); x += Math.sin(ph) * writhe; z += Math.sin(ph * 0.7) * writhe * 0.4; }
        // breathing is involuntary: the chest keeps moving while the brainstem drives it
        if (k === 'thorax' && alive) { tone = Math.max(tone, 0.3); x += br * 5; }
        part.tone = tone; part.target.setFromEuler(eul.set(x, y, z));
      }
      rag.step(dt); rag.sync();
      const pb = rag.parts.pelvis.b.position; N.pos.set(pb.x, 0, pb.z);
      if (N.posture === 'falling') { N.stillT = rag.speed() < 0.35 && N.ragT > 0.6 ? N.stillT + dt : 0; if (N.stillT > 0.4) N.posture = 'down'; }
    };
    return N;
  };
})();
