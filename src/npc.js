// NPC behaviour. The body is always a physics ragdoll. This file is the "nervous system":
// it decides leg support, balance quality and per-joint muscle tone from the physiology
// (consciousness, cord level, fractures, blood pressure, pain) and physics does the rest.
// Voluntary acts (guarding, clutching a wound, dragging away) need a conscious brain.
// Involuntary ones (posturing, convulsions, gasping) come from what is left of it.
(function () {
  const G = (window.GSW = window.GSW || {});
  const POSES = {
    stand: { uarmL: [0, 0, 0.1], uarmR: [0, 0, -0.1], farmL: [-0.15, 0, 0], farmR: [-0.15, 0, 0] },
    guard: { abdomen: [0.22, 0, 0], thorax: [0.25, 0, 0], head: [0.2, 0, 0], uarmL: [-0.35, 0, -0.12], uarmR: [-0.35, 0, 0.12], farmL: [-1.75, 0, -0.5], farmR: [-1.75, 0, 0.5], thighL: [-0.2, 0, 0], thighR: [-0.2, 0, 0], shinL: [0.35, 0, 0], shinR: [0.35, 0, 0], footL: [-0.15, 0, 0], footR: [-0.15, 0, 0] },
    brace: { abdomen: [0.3, 0, 0], thorax: [0.3, 0, 0], head: [0.2, 0, 0], uarmL: [-0.9, 0, 0.2], uarmR: [-0.9, 0, -0.2], farmL: [-0.7, 0, 0], farmR: [-0.7, 0, 0], thighL: [-0.9, 0, 0.06], thighR: [-0.9, 0, -0.06], shinL: [1.7, 0, 0], shinR: [1.7, 0, 0] },
    curl: { abdomen: [0.35, 0, 0], thorax: [0.3, 0, 0], head: [0.25, 0, 0], uarmL: [-0.7, 0, -0.15], uarmR: [-0.7, 0, 0.15], farmL: [-1.5, 0, -0.3], farmR: [-1.5, 0, 0.3], thighL: [-1.0, 0, 0], thighR: [-0.8, 0, 0], shinL: [1.3, 0, 0], shinR: [1.2, 0, 0] },
    // decerebrate: everything extends. Arms straight and turned in, legs rigid, feet pointed, head and back arched
    decerebrate: { abdomen: [-0.12, 0, 0], thorax: [-0.18, 0, 0], neck: [-0.3, 0, 0], head: [-0.3, 0, 0], uarmL: [0.25, 0.5, 0.1], uarmR: [0.25, -0.5, -0.1], farmL: [0, 0, 0], farmR: [0, 0, 0], handL: [0.7, 0, 0], handR: [0.7, 0, 0], thighL: [0.06, 0, -0.04], thighR: [0.06, 0, 0.04], footL: [0.65, 0, 0], footR: [0.65, 0, 0] },
    // tonic / decorticate: arms flex hard onto the chest, legs extend
    tonic: { thorax: [-0.1, 0, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], uarmL: [-0.45, 0, -0.2], uarmR: [-0.45, 0, 0.2], farmL: [-2.1, 0, -0.3], farmR: [-2.1, 0, 0.3], handL: [0.8, 0, 0], handR: [0.8, 0, 0], thighL: [0.04, 0, 0], thighR: [0.04, 0, 0], footL: [0.6, 0, 0], footR: [0.6, 0, 0] },
    jerk: { abdomen: [0.25, 0, 0], thorax: [0.2, 0, 0], uarmL: [-0.8, 0, 0.1], uarmR: [-0.8, 0, -0.1], farmL: [-1.2, 0, 0], farmR: [-1.2, 0, 0], thighL: [-0.5, 0, 0], thighR: [-0.5, 0, 0], shinL: [0.7, 0, 0], shinR: [0.7, 0, 0] },
  };
  const PRIO = { neck: 5, thorax: 4, abdomen: 4, head: 3, pelvis: 3, thighL: 2, thighR: 2 };
  const eul = new THREE.Euler(), upv = new CANNON.Vec3(), UP = new CANNON.Vec3(0, 1, 0);
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  G.NPC = function (body, phys, rag, hooks) {
    const names = body.list.map((s) => s.name).filter((n) => n !== 'pelvis');
    const cur = {};
    for (const k of names) cur[k] = (POSES.stand[k] || [0, 0, 0]).slice();
    const N = { flinchT: 0, dip: 0, posture: 'stand', pose: 'stand', pos: new THREE.Vector3(), decideT: -1, wantDown: false, clock: 0, breath: 0, ragT: 0, stillT: 0, stagger: 0, stagDir: [0, 0], crawling: false, downT: 0,
      lowering: 0, giveT: 0, clutchT: 0, clutching: { L: null, R: null }, gasp: 0, cough: 0, coughAt: 4 + Math.random() * 6, groanAt: 3 + Math.random() * 5, lastBreath: 0, motor: 'normal' };
    const ctl = rag.ctl, ev = (t, d) => hooks.event && hooks.event(t, d);
    rag.start(); ctl.s = 1; ctl.bal = 1; ctl.y0 = ctl.yRest;
    const collapse = (rigid) => {
      if (N.posture !== 'stand') return;
      N.posture = 'falling'; N.ragT = 0; ctl.s = 0; ctl.push.set(0, 0, 0); N.giveT = 1.4; N.lowering = 0;
      const a = Math.random() * 6.283, v = 0.25 + Math.random() * 0.3;
      rag.push('thorax', Math.cos(a) * v, 0, Math.sin(a) * v);
      // limp legs fold at the knee; a rigid (posturing) body goes over like a felled tree
      if (!rigid) { rag.push('pelvis', 0, -0.4, -0.2); rag.push('thighL', 0, 0, 0.6); rag.push('thighR', 0, 0, 0.6); }
    };
    N.impulse = (seg, pt, imp) => rag.impulse(seg, pt, imp);
    N.onHit = (res, mark, dir) => {
      // the reflex jolt of the struck part happens whether or not the person is conscious
      const en = res.marks.find((m) => m.type === 'entry');
      if (en && en.seg) {
        const str = Math.min(1, (res.Edep || 0) / 1500);
        rag.hitReact(en.seg, en.p, dir, str);
        // a hit to the leg buckles that knee for a moment: the body dips and has to catch itself
        if (/^(thigh|shin)/.test(en.seg.name)) { N.dip = Math.max(N.dip, 0.7 + str); rag.parts[en.seg.name].slack = Math.max(rag.parts[en.seg.name].slack, 0.45); }
        N.flinchT = 0.45; // hunch: shoulders up, trunk and head forward, arms in
      }
      if (!phys.alive() || !phys.conscious) return;
      ev('grunt', Math.min(1, 0.4 + phys.pain));
      // startle / stagger: a reflex step driven by the legs, in roughly the direction of fire
      N.stagger = 1; const a = Math.atan2(dir.z, dir.x) + (Math.random() - 0.5) * 1.2; N.stagDir = [Math.cos(a), Math.sin(a)];
      N.clutchT = 0.25 + Math.random() * 0.4; // reaction time before a hand goes to the wound
      if (N.decideT < 0 && N.posture === 'stand') {
        N.decideT = 0.6 + Math.random() * 2.2;
        // many gunshot victims go down even when physically able to stand
        N.wantDown = phys.pain > 0.5 || Math.random() < 0.3 + phys.pain * 0.5;
      }
    };
    // pick, for each usable arm, the most serious wound that hand can physically reach
    function chooseClutch(P, can) {
      for (const sd of ['L', 'R']) {
        let best = null, bs = 0;
        if (can && !P.armsPara && !P.armBroken[sd]) {
          body.segs['uarm' + sd].g.getWorldPosition(v1);
          for (const w of body.wounds) {
            const n = w.seg.name;
            if (n.endsWith(sd) && /^(uarm|farm|hand)/.test(n)) continue; // cannot hold its own arm
            body.woundWorld(w, v2);
            const d = v2.distanceTo(v1); if (d > 0.66) continue;
            const other = N.clutching[sd === 'L' ? 'R' : 'L'];
            const sc = (PRIO[n] || 1) * 2 - d + (w.rate > 30 ? 1.5 : 0) - (other === w ? 2.5 : 0);
            if (sc > bs) { bs = sc; best = w; }
          }
        }
        if (best !== N.clutching[sd]) {
          N.clutching[sd] = best;
          if (best) { body.woundWorld(best, v2); body.woundNormal(best, v3); v2.addScaledVector(v3, 0.03); rag.setClutch(sd, best.seg, v2); } else rag.setClutch(sd, null);
        }
      }
    }
    N.update = (dt) => {
      N.clock += dt;
      const P = phys, M = P.motor.mode, c = N.clock;
      const rigid = M === 'decerebrate' || M === 'tonic', clonic = M === 'clonic';
      const limp = (!P.conscious || P.brainDestroyed || P.dead) && !rigid && !clonic;
      const aware = P.conscious && !P.brainDestroyed && !P.dead && M === 'normal';
      const legsOut = P.legsPara || P.legBroken.L || P.legBroken.R || P.pelvisBroken;
      const alive = !P.dead && P.rr > 0.5;
      N.motor = M;
      // ---- breathing, gasping, coughing
      N.breath += dt * (P.rr / 60) * Math.PI * 2;
      const cyc = Math.floor(N.breath / (Math.PI * 2));
      if (cyc !== N.lastBreath) { N.lastBreath = cyc; if (P.agonal) { N.gasp = 1; ev('gasp'); } }
      N.gasp = Math.max(0, N.gasp - dt * 1.8); N.cough = Math.max(0, N.cough - dt * 3.5);
      const br = alive && !P.agonal ? Math.sin(N.breath) * (0.012 + 0.012 * Math.min(1, P.rr / 30)) : 0;
      if (aware && P.hemoptysis && alive) { N.coughAt -= dt; if (N.coughAt <= 0) { N.coughAt = 3 + Math.random() * 9; N.cough = 1; ev('cough'); } }
      if (aware && N.posture === 'down' && P.pain > 0.25) { N.groanAt -= dt; if (N.groanAt <= 0) { N.groanAt = 5 + Math.random() * 10; ev('groan', P.pain); } }
      const pel = rag.parts.pelvis.b, tho = rag.parts.thorax.b;
      let target = POSES.curl;
      if (N.posture === 'stand') {
        const dizzy = Math.max(0, 0.9 - P.brainE) + Math.max(0, (72 - P.map) / 50);
        tho.quaternion.vmult(UP, upv);
        if (rigid || clonic) collapse(rigid);
        else if (limp || legsOut || P.brainE < 0.55 || P.map < 48) collapse();
        else if ((pel.position.y < ctl.yRest * 0.74 && !N.lowering) || upv.y < 0.55) collapse(); // past the tipping point
        else {
          if (N.decideT >= 0) {
            N.decideT -= dt;
            if (N.decideT < 0) {
              N.decideT = -1;
              if (N.wantDown) N.lowering = 0.001;
              else { if (P.pain > 0.15) N.pose = 'guard'; if (P.pain > 0.6) { N.decideT = 2 + Math.random() * 4; N.wantDown = true; } }
            }
          } else if (P.pain > 0.15) N.pose = 'guard';
          ctl.s = 1; ctl.bal = Math.max(0.15, 1 - dizzy * 1.3);
          N.dip = Math.max(0, N.dip - dt * 1.6);
          ctl.y0 = ctl.yRest * (N.pose === 'guard' ? 0.965 : 1) - dizzy * 0.05 - 0.15 * Math.min(1, N.dip);
          // going down on purpose: the legs lower the body under control, then let go close to the floor
          if (N.lowering > 0) {
            N.lowering += dt / 1.5; const e = Math.min(1, N.lowering); ctl.y0 = ctl.yRest * (1 - 0.52 * e * e * (3 - 2 * e)); ctl.bal *= 1 - 0.5 * e;
            if (N.lowering >= 1 || pel.position.y < ctl.yRest * 0.56) collapse();
          }
          N.stagger = Math.max(0, N.stagger - dt * 3.2);
          const sw = 6 + dizzy * 150, st = N.stagger * N.stagger * 230;
          ctl.push.set(Math.sin(c * 0.9) * sw + Math.sin(c * 2.3 + 1) * sw * 0.4 + N.stagDir[0] * st, 0, Math.sin(c * 0.7 + 2) * sw + N.stagDir[1] * st);
          N.flinchT = Math.max(0, N.flinchT - dt);
          target = N.lowering > 0 ? POSES.brace : N.flinchT > 0 ? POSES.guard : POSES[N.pose];
        }
      }
      if (N.posture !== 'stand') {
        N.ragT += dt;
        target = N.ragT < 0.9 ? POSES.brace : POSES.curl;
        if (N.posture === 'falling') { N.stillT = (rag.speed() < 0.6 && N.ragT > 0.6 && pel.position.y < 0.5) || N.ragT > 5 ? N.stillT + dt : 0; if (N.stillT > 0.4) { N.posture = 'down'; N.downT = 0; } }
      }
      P.upright = N.posture === 'stand';
      // ---- wounded and down but aware with working arms: drag away from the shooter
      N.crawling = false;
      if (N.posture === 'down' && aware && !P.armsPara && P.brainE > 0.7) {
        N.downT += dt;
        const th = hooks.threat ? hooks.threat() : null;
        if (th && N.downT > 6) {
          let dx = tho.position.x - th.x, dz = tho.position.z - th.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
          const R = G.ROOM, x = tho.position.x + dx * 0.9, z = tho.position.z + dz * 0.9;
          if (x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1 && d < 6) {
            N.crawling = true;
            const pulse = Math.max(0, Math.sin(c * 2.4)), f = 1500 * pulse * pulse * Math.min(1, P.brainE);
            if (Math.hypot(tho.velocity.x, tho.velocity.z) < 0.45) { tho.wakeUp(); pel.wakeUp(); tho.force.x += dx * f * 0.6; tho.force.z += dz * f * 0.6; pel.force.x += dx * f * 0.4; pel.force.z += dz * f * 0.4; }
          }
        }
      }
      // ---- a hand goes to the wound: neck, chest, belly, thigh, whatever it can reach
      if (N.clutchT > 0) N.clutchT -= dt;
      else { N.clutchT = 0.5; chooseClutch(P, aware && !N.crawling && body.wounds.length > 0); }
      // ---- muscle tone and joint targets
      const base = limp ? 0 : Math.max(0.25, Math.min(1, P.brainE)) * (1 - 0.3 * Math.min(1, Math.max(0, (60 - P.map) / 40)));
      const writhe = N.posture === 'down' && aware ? 0.05 + 0.2 * P.pain : 0, k = Math.min(1, dt * (rigid || clonic || N.flinchT > 0.3 ? 14 : 5));
      if (rigid) target = POSES[M];
      // clonic phase: rhythmic whole-body jerks that slow and fade
      let jerk = 0;
      if (clonic) { const f = 3.2 + Math.min(2.5, P.motor.t * 0.25); jerk = Math.sin(c * f * 6.283) > 0 ? 1 : 0; target = jerk ? POSES.jerk : POSES.tonic; }
      N.giveT = Math.max(0, N.giveT - dt);
      const giving = N.posture === 'falling' && (N.giveT > 0 || pel.position.y > 0.5);
      for (const n of names) {
        const part = rag.parts[n], side = n.slice(-1), isLeg = /^(thigh|shin|foot)/.test(n), isArm = /^(uarm|farm|hand)/.test(n);
        let tone = rigid ? 1.5 : clonic ? 1.25 : base;
        if (giving && !rigid) tone *= isLeg ? 0.06 : isArm ? 1 : 0.35;
        if (isLeg) tone *= P.legsPara ? 0 : P.legBroken[side] ? 0.15 : P.pelvisBroken ? 0.4 : 1;
        if (isArm) tone *= P.armsPara ? 0 : P.armBroken[side] ? 0.2 : 1;
        const a = target[n] || [0, 0, 0], q = cur[n];
        for (let i = 0; i < 3; i++) q[i] += (a[i] - q[i]) * k;
        let x = q[0], y = q[1], z = q[2];
        if (writhe && tone > 0) { const ph = c * (1.1 + (n.length % 3) * 0.4) + n.charCodeAt(0); x += Math.sin(ph) * writhe; z += Math.sin(ph * 0.7) * writhe * 0.4; }
        if (N.crawling && n.startsWith('uarm')) x = -1.6 + Math.sin(c * 2.4 + (side === 'L' ? 0 : Math.PI)) * 0.9;
        if (isArm && N.clutching[side]) { tone *= 0.12; if (n.startsWith('farm')) x = -1.3; } // let the reaching force place the hand
        if (n === 'thorax') {
          // breathing is involuntary: the chest keeps moving while the brainstem drives it
          if (alive && !rigid) { tone = Math.max(tone, 0.3); x += br * 5; }
          if (N.gasp > 0) { tone = Math.max(tone, 0.8); x -= 0.22 * N.gasp; }
          if (N.cough > 0) { tone = Math.max(tone, 0.9); x += 0.3 * N.cough; }
        }
        if ((n === 'neck' || n === 'head') && N.gasp > 0) { tone = Math.max(tone, 0.7); x -= 0.3 * N.gasp; }
        part.tone = tone; part.target.setFromEuler(eul.set(x, y, z));
      }
      rag.setRigid(rigid);
      rag.step(dt); rag.sync();
      N.pos.set(pel.position.x, 0, pel.position.z);
    };
    return N;
  };
})();
