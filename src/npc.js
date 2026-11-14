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
    // getting up: knees folded under, trunk forward over the feet, hands toward the floor
    rise: { abdomen: [0.45, 0, 0], thorax: [0.35, 0, 0], head: [0.1, 0, 0], uarmL: [-0.8, 0, 0.25], uarmR: [-0.8, 0, -0.25], farmL: [-0.3, 0, 0], farmR: [-0.3, 0, 0], thighL: [-1.45, 0, 0.1], thighR: [-1.45, 0, -0.1], shinL: [2.05, 0, 0], shinR: [2.05, 0, 0], footL: [-0.6, 0, 0], footR: [-0.6, 0, 0] },
    jerk: { abdomen: [0.25, 0, 0], thorax: [0.2, 0, 0], uarmL: [-0.8, 0, 0.1], uarmR: [-0.8, 0, -0.1], farmL: [-1.2, 0, 0], farmR: [-1.2, 0, 0], thighL: [-0.5, 0, 0], thighR: [-0.5, 0, 0], shinL: [0.7, 0, 0], shinR: [0.7, 0, 0] },
  };
  const PRIO = { neck: 5, thorax: 4, abdomen: 4, head: 3, pelvis: 3, thighL: 2, thighR: 2 };
  const eul = new THREE.Euler(), upv = new CANNON.Vec3(), UP = new CANNON.Vec3(0, 1, 0);
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  G.NPC = function (body, phys, rag, hooks) {
    const names = body.list.map((s) => s.name).filter((n) => n !== 'pelvis');
    const cur = {};
    for (const k of names) cur[k] = (POSES.stand[k] || [0, 0, 0]).slice();
    const N = { lookT: 0, lookAt: null, armSw: { L: 0, R: 0 }, fleeT: 0, flees: false, retreatT: 0, riseT: 0, riseTries: 0, chose: false, flinchT: 0, dip: 0, posture: 'stand', pose: 'stand', pos: new THREE.Vector3(), decideT: -1, wantDown: false, clock: 0, breath: 0, ragT: 0, stillT: 0, stagger: 0, stagDir: [0, 0], crawling: false, downT: 0,
      lowering: 0, giveT: 0, clutchT: 0, clutching: { L: null, R: null }, gasp: 0, cough: 0, coughAt: 4 + Math.random() * 6, groanAt: 3 + Math.random() * 5, lastBreath: 0, motor: 'normal' };
    const ctl = rag.ctl, ev = (t, d) => hooks.event && hooks.event(t, d);
    rag.start(); ctl.s = 1; ctl.bal = 1; ctl.y0 = ctl.yRest; ctl.canStep = true; ctl.trunk = 0; ctl.draw = 0; ctl.lead = null; ctl.face = null; rag.lost = null; rag.stepWin = 0;
    const collapse = (rigid, tripped) => {
      if (N.posture !== 'stand') return;
      rag.lost = null;
      N.posture = 'falling'; N.ragT = 0; ctl.s = 0; ctl.lead = null; ctl.face = null; ctl.push.set(0, 0, 0); N.giveT = tripped ? 0 : 1.4; N.lowering = 0; N.tripped = !!tripped;
      if (tripped) return; // already moving: momentum decides the fall, the legs stay under tone
      const a = Math.random() * 6.283, v = 0.25 + Math.random() * 0.3;
      rag.push('thorax', Math.cos(a) * v, 0, Math.sin(a) * v);
      // limp legs fold at the knee; a rigid (posturing) body goes over like a felled tree
      if (!rigid) {
        rag.push('pelvis', 0, -0.4, -0.2);
        // the knees rarely fold perfectly straight: one leg goes a little to the side
        const sx = (Math.random() - 0.5) * 0.9; rag.push('thighL', sx, 0, 0.6); rag.push('thighR', sx + (Math.random() - 0.5) * 0.4, 0, 0.6);
      }
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
      N.clutchT = 0.15; // re-check wounds shortly; when each one is noticed is decided per wound
      if (N.decideT < 0 && N.posture === 'stand') {
        N.decideT = 0.6 + Math.random() * 2.2;
        // many gunshot victims go down even when physically able to stand
        N.wantDown = phys.pain > 0.5 || Math.random() < 0.3 + phys.pain * 0.5;
        // those who stay on their feet usually back away from where the shot came from
        if (!N.wantDown && Math.random() < 0.75) { N.retreatT = 2.5 + Math.random() * 3.5; N.flees = Math.random() < 0.65; N.fleeT = 0; }
      }
    };
    // When does a person become aware of a wound? Adrenaline masks a lot: torso, neck and head wounds are usually
    // felt within a second; a limb hit often goes unnoticed for several seconds and a minor one may never be held.
    // A broken bone or a wound pouring blood is noticed at once.
    const TRUNKSEG = /^(neck|thorax|abdomen|pelvis|head)$/;
    function noticeDelay(w, P) {
      const n = w.seg.name, side = n.slice(-1);
      if (TRUNKSEG.test(n)) return 0.3 + Math.random() * 0.7;
      const broken = (/^(thigh|shin)/.test(n) && P.legBroken[side]) || (/^(uarm|farm)/.test(n) && P.armBroken[side]);
      if (broken) return 0.4 + Math.random() * 0.8;
      return Math.random() < 0.25 ? Infinity : 1.5 + Math.random() * 4.5;
    }
    const severity = (w) => (PRIO[w.seg.name] || 1) * 2 + Math.min(4, (w.rate || 0) / 120);
    // pick, for each usable arm, the most serious noticed wound that hand can physically reach
    function chooseClutch(P, can) {
      const now = N.clock;
      for (const w of body.wounds) {
        if (w.noticeAt == null) w.noticeAt = now + noticeDelay(w, P);
        if (w.noticeAt > now && (w.rate || 0) > 150) w.noticeAt = now + 0.4; // you notice a wound that is pouring blood
        if (!w.seen && w.noticeAt <= now) { w.seen = true; N.lookT = 1.4; N.lookAt = w; } // first realises: looks down at it
      }
      const pick = {};
      for (const sd of ['L', 'R']) {
        let best = null, bs = 0;
        if (can && !P.armsPara && !P.armBroken[sd]) {
          body.segs['uarm' + sd].g.getWorldPosition(v1);
          for (const w of body.wounds) {
            if (!(w.noticeAt <= now)) continue;
            const n = w.seg.name;
            if (n.endsWith(sd) && /^(uarm|farm|hand)/.test(n)) continue; // cannot hold its own arm
            body.woundWorld(w, v2);
            // a hanging hand already reaches the upper thigh; a hand already on a wound keeps it (hysteresis)
            const d = v2.distanceTo(v1); if (d > (N.clutching[sd] === w ? 1.0 : 0.8)) continue;
            const other = pick[sd === 'L' ? 'R' : 'L'], sev = severity(w);
            // both hands go to one wound when it is clearly the worst (a neck or chest wound pumping blood)
            const share = other === w ? (sev >= 8 ? -0.5 : -2.5) : 0;
            const sc = sev - d + share + (N.clutching[sd] === w ? 1 : 0);
            if (sc > bs) { bs = sc; best = w; }
          }
        }
        pick[sd] = best;
        if (best !== N.clutching[sd]) {
          N.clutching[sd] = best;
          if (best) { body.woundWorld(best, v2); body.woundNormal(best, v3); v2.addScaledVector(v3, 0.03); rag.setClutch(sd, best.seg, v2); const cl = rag.clutch[sd]; if (cl) { const ln = new CANNON.Vec3(v3.x, v3.y, v3.z); const qi = cl.b.quaternion.inverse(); cl.nl = qi.vmult(ln); } } else rag.setClutch(sd, null);
        }
      }
    }
    // pressure from the hands on each wound: about half the outflow for ordinary bleeding, much less for an artery;
    // two hands do better than one. Fades with grip strength as consciousness goes.
    function applyPressure(P, grip) {
      for (const w of P.wounds) {
        if (!w.surf) { w.press = 0; continue; }
        const hands = (N.clutching.L === w.surf ? 1 : 0) + (N.clutching.R === w.surf ? 1 : 0);
        const one = (!w.venous && w.rate >= 400 ? 0.25 : 0.5) * grip;
        w.press = hands ? 1 - Math.pow(1 - one, hands) : 0;
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
      // ---- getting back up after a fall that did not disable: a shove, or coming round from a knockout
      const fit = aware && !legsOut && !P.legsPara && P.brainE > 0.85 && P.map > 70 && P.pain < 0.55 && !N.chose;
      if (N.posture === 'down') { N.downT += dt; if (fit && N.riseTries < 3 && N.downT > 2.5 + N.riseTries * 2) { N.posture = 'rising'; N.riseT = 0; N.riseTries++; } }
      if (N.posture === 'rising') {
        N.riseT += dt; const t = N.riseT;
        if (!fit) { N.posture = 'down'; N.downT = 0; ctl.s = 0; ctl.trunk = 0; ctl.draw = 0; }
        else {
          const sm = (a, b) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
          // sit up and draw the feet in; push up only once the feet are under the hips; then stand
          if (N.riseT < dt * 1.5) { N.riseY = pel.position.y; N.pushT = null; }
          const fl = rag.parts.footL.b.position, fr = rag.parts.footR.b.position;
          const feetIn = Math.hypot((fl.x + fr.x) / 2 - pel.position.x, (fl.z + fr.z) / 2 - pel.position.z) < 0.5;
          if (N.pushT == null && t > 0.9 && (feetIn || t > 2)) N.pushT = t;
          const tp = N.pushT == null ? -1 : t - N.pushT;
          ctl.draw = tp < 0 ? sm(0.3, 0.9) : Math.max(0, 1 - tp / 1.2);
          ctl.trunk = sm(0, 0.8); ctl.s = tp < 0 ? 0 : Math.min(1, tp / 1.0); ctl.bal = 1; ctl.canStep = tp > 2.4; ctl.push.set(0, 0, 0);
          ctl.y0 = N.riseY + (ctl.yRest - N.riseY) * (tp < 0 ? 0 : (u => u * u * (3 - 2 * u))(Math.min(1, tp / 2.0)));
          target = tp < 1.6 ? POSES.rise : POSES.stand;
          tho.quaternion.vmult(UP, upv);
          if (tp > 2.0 && pel.position.y > ctl.yRest * 0.88 && upv.y > 0.8) { N.posture = 'stand'; N.pose = 'stand'; rag.lost = null; rag.stepWin = 0; ctl.trunk = 0; ctl.draw = 0; ctl.canStep = true; N.downT = 0; }
          else if (t > 7 || tp > 3.6) { N.posture = 'falling'; N.ragT = 0; ctl.s = 0; ctl.trunk = 0; ctl.draw = 0; ctl.canStep = true; } // could not make it: sinks back down
        }
      }
      if (N.posture === 'stand') {
        const dizzy = Math.max(0, 0.9 - P.brainE) + Math.max(0, (72 - P.map) / 50);
        tho.quaternion.vmult(UP, upv);
        if (rigid || clonic) collapse(rigid);
        else if (limp || legsOut || P.brainE < 0.55 || P.map < 48) collapse();
        else if ((pel.position.y < ctl.yRest * 0.74 && !N.lowering) || upv.y < 0.55) collapse(); // past the tipping point
        else if (rag.lost) collapse(false, true); // pushed or pulled further than a step can recover
        else {
          if (N.decideT >= 0) {
            N.decideT -= dt;
            if (N.decideT < 0) {
              N.decideT = -1;
              if (N.wantDown) { N.lowering = 0.001; N.chose = true; }
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
          // backing away: lean away from the shooter and let the balance steps carry the body (stops at the walls)
          N.retreatT = Math.max(0, N.retreatT - dt); N.retreating = false; ctl.lead = null; if (N.retreatT <= 0) { ctl.face = null; N.fleeT = 0; }
          const th = hooks.threat ? hooks.threat() : null;
          if (N.retreatT > 0 && th && N.stagger < 0.3) {
            let dx = pel.position.x - th.x, dz = pel.position.z - th.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
            const R = G.ROOM, nx = pel.position.x + dx * 0.7, nz = pel.position.z + dz * 0.7;
            if (nx > R.x0 && nx < R.x1 && nz > R.z0 && nz < R.z1 && d < 7) {
              N.retreating = true; const l = 0.11 * Math.min(1, P.brainE) * (P.map > 60 ? 1 : 0.6);
              // first a step or two backwards, then turn away and walk off (fleeing), faster while fit
              N.fleeT += dt;
              if (N.fleeT > 0.9 && N.flees) { ctl.face = Math.atan2(dx, dz); }
              const turned = ctl.face != null && Math.abs(rag.turnErr || 0) < 0.6;
              const ll = turned ? l * (P.pain < 0.5 ? 1.45 : 1.1) : l;
              ctl.lead = { x: dx * ll, z: dz * ll };
            }
          }
          N.flinchT = Math.max(0, N.flinchT - dt);
          target = N.lowering > 0 ? POSES.brace : N.flinchT > 0 ? POSES.guard : POSES[N.pose];
        }
      }
      if (N.posture !== 'stand' && N.posture !== 'rising') {
        N.ragT += dt;
        target = N.ragT < 0.9 ? POSES.brace : POSES.curl;
        if (N.posture === 'falling') { N.stillT = (rag.speed() < 0.6 && N.ragT > 0.6 && pel.position.y < 0.5) || N.ragT > 5 ? N.stillT + dt : 0; if (N.stillT > 0.4) { N.posture = 'down'; N.downT = 0; } }
      }
      P.upright = N.posture === 'stand';
      // ---- wounded and down but aware with working arms: drag away from the shooter
      N.crawling = false;
      // someone pressing on a serious wound (neck, chest, belly, or anything pouring blood) stays put and keeps pressing
      const holdingSerious = [N.clutching.L, N.clutching.R].some((w) => w && severity(w) >= 6);
      if (N.posture === 'down' && aware && !P.armsPara && P.brainE > 0.7 && !fit && !holdingSerious) {
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
      // ---- breaking the fall: a conscious person thrown off balance puts both hands out toward the floor
      N.protect = N.posture === 'falling' && aware && !P.armsPara && N.ragT < 1.2 && pel.position.y > 0.3;
      if (N.protect) {
        const v = tho.velocity, sp = Math.hypot(v.x, v.z) || 1, dx = v.x / sp, dz = v.z / sp;
        for (const sd of ['L', 'R']) {
          if (P.armBroken[sd]) { rag.reach[sd] = null; continue; }
          body.segs['uarm' + sd].g.getWorldPosition(v1);
          rag.reach[sd] = new THREE.Vector3(v1.x + dx * 0.45, Math.max(0.05, v1.y - 0.45), v1.z + dz * 0.45);
        }
        N.clutching.L = N.clutching.R = null; rag.setClutch('L', null); rag.setClutch('R', null);
      } else if (rag.reach.L || rag.reach.R) { rag.reach.L = rag.reach.R = null; }
      // ---- a hand goes to the wound: neck, chest, belly, thigh, whatever it can reach
      // grip strength follows the brain: hands weaken, then fall away, as consciousness fades
      const grip = Math.max(0, Math.min(1, (P.brainE - 0.45) / 0.4)) * (P.conscious ? 1 : 0);
      rag.grip = grip;
      if (grip < 0.15 && (N.clutching.L || N.clutching.R)) { N.clutching.L = N.clutching.R = null; rag.setClutch('L', null); rag.setClutch('R', null); }
      applyPressure(P, grip);
      N.lookT = Math.max(0, N.lookT - dt);
      if (N.clutchT > 0) N.clutchT -= dt;
      else { N.clutchT = 0.5; chooseClutch(P, aware && !N.crawling && !N.protect && body.wounds.length > 0 && grip > ((N.clutching.L || N.clutching.R) ? 0.15 : 0.35)); } // once the hands have dropped they need real strength to come back
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
        if (N.tripped && N.posture === 'falling' && isLeg) tone *= 0.5;
        if (isLeg) tone *= P.legsPara ? 0 : P.legBroken[side] ? 0.15 : P.pelvisBroken ? 0.4 : 1;
        if (isArm) tone *= P.armsPara ? 0 : P.armBroken[side] ? 0.2 : 1;
        const a = target[n] || [0, 0, 0], q = cur[n];
        for (let i = 0; i < 3; i++) q[i] += (a[i] - q[i]) * k;
        let x = q[0], y = q[1], z = q[2];
        if (writhe && tone > 0) { const ph = c * (1.1 + (n.length % 3) * 0.4) + n.charCodeAt(0); x += Math.sin(ph) * writhe; z += Math.sin(ph * 0.7) * writhe * 0.4; }
        if (N.crawling && n.startsWith('uarm')) x = -1.6 + Math.sin(c * 2.4 + (side === 'L' ? 0 : Math.PI)) * 0.9;
        if (isArm && N.protect) { tone *= 0.25; }
        // walking: each arm swings forward as the opposite leg steps
        if (n.startsWith('uarm')) {
          const st = rag.stepping, want = N.retreating && st && !N.clutching[side] ? (st.side === side ? 0.32 : -0.38) : 0;
          N.armSw[side] += (want - N.armSw[side]) * Math.min(1, dt * 7); x += N.armSw[side];
        }
        if (n.startsWith('farm') && N.retreating && !N.clutching[side]) x -= 0.35; // elbows a little bent while walking
        if (isArm && N.clutching[side]) { tone *= 0.12; if (n.startsWith('farm')) x = -1.3; } // let the reaching force place the hand
        if (n === 'thorax') {
          // breathing is involuntary: the chest keeps moving while the brainstem drives it
          if (alive && !rigid) { tone = Math.max(tone, 0.3); x += br * 5; }
          if (N.gasp > 0) { tone = Math.max(tone, 0.8); x -= 0.22 * N.gasp; }
          if (N.cough > 0) { tone = Math.max(tone, 0.9); x += 0.3 * N.cough; }
        }
        if ((n === 'neck' || n === 'head') && N.lookT > 0 && aware) { x += 0.32 * Math.min(1, N.lookT); tone = Math.max(tone, 0.6); } // looks down at the wound
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
