// Rigid-body physics (cannon.js): the subject is a 17-segment ragdoll with anatomical
// joint limits and segment masses. "Muscle tone" is a PD torque at each joint toward a
// target pose; the nervous system (consciousness, cord level, fractures) scales it.
// Bullets transfer their real momentum. Shell casings are rigid bodies too.
(function () {
  const G = (window.GSW = window.GSW || {});
  const V3 = THREE.Vector3, Q = THREE.Quaternion, C = CANNON;
  // segment masses, kg (Dempster-style fractions of 77 kg)
  const MASS = { head: 5.2, neck: 1.0, thorax: 16.5, abdomen: 10.7, pelvis: 11, uarm: 2.15, farm: 1.25, hand: 0.46, thigh: 7.7, shin: 3.6, foot: 1.1 };
  const n3 = (x, y, z) => { const l = Math.hypot(x, y, z); return new C.Vec3(x / l, y / l, z / l); };
  const DOWN = new C.Vec3(0, -1, 0), UP = new C.Vec3(0, 1, 0), XA = new C.Vec3(1, 0, 0);
  // joint: axisA = child's long axis at mid-range in the parent frame, cone = half range (rad)
  const JOINT = (name) => {
    const s = name.endsWith('L') ? 1 : -1, b = name.replace(/[LR]$/, '');
    switch (b) {
      case 'abdomen': return { aA: UP, aB: UP, cone: 0.4, twist: 0.3, gain: 3 };
      case 'thorax': return { aA: UP, aB: UP, cone: 0.35, twist: 0.35, gain: 3 };
      case 'neck': return { aA: UP, aB: UP, cone: 0.4, twist: 0.4, gain: 2 };
      case 'head': return { aA: UP, aB: UP, cone: 0.5, twist: 0.6, gain: 2 };
      case 'uarm': return { aA: n3(0.55 * s, -0.7, 0.4), aB: DOWN, cone: 1.35, twist: 0.9, gain: 2.5 };
      case 'farm': return { aA: n3(0, -0.3, 0.95), aB: DOWN, cone: 1.25, twist: 0.5, hinge: true, gain: 2 };
      case 'hand': return { aA: DOWN, aB: DOWN, cone: 0.6, twist: 0.3, gain: 1 };
      case 'thigh': return { aA: n3(0.12 * s, -0.64, 0.77), aB: DOWN, cone: 1.2, twist: 0.4, gain: 3 }; // hip: about 120 deg flexion, 20 deg extension
      case 'shin': return { aA: n3(0, -0.3, -0.95), aB: DOWN, cone: 1.25, twist: 0.2, hinge: true, gain: 2.5 };
      case 'foot': return { aA: DOWN, aB: DOWN, cone: 0.5, twist: 0.25, gain: 1 };
    }
  };

  // Collision shapes that behave like the body part: limbs are capsules (a cylinder with rounded ends) so
  // they roll and come to rest on their side; the head is a sphere; trunk segments stay boxes because the
  // back and chest really are flat-ish; hands and feet are boxes so a foot stands on its sole.
  const Z2Y = new C.Quaternion(); Z2Y.setFromAxisAngle(new C.Vec3(1, 0, 0), Math.PI / 2);
  function addShapes(b, name, he) {
    const base = name.replace(/[LR]$/, '');
    if (base === 'head') { b.addShape(new C.Sphere(Math.min(he.x, he.y, he.z) * 1.02)); return; }
    if (/^(uarm|farm|thigh|shin|neck)$/.test(base)) {
      const r = Math.max(0.012, Math.min(he.x, he.z) * 0.95), half = Math.max(0.005, he.y - r);
      b.addShape(new C.Cylinder(r, r, half * 2, 10), new C.Vec3(0, 0, 0), Z2Y);
      b.addShape(new C.Sphere(r), new C.Vec3(0, half, 0)); b.addShape(new C.Sphere(r), new C.Vec3(0, -half, 0));
      return;
    }
    b.addShape(new C.Box(he));
  }

  G.buildPhysics = function (scene, body, audio, hooks) {
    hooks = hooks || {};
    const world = new C.World();
    world.gravity.set(0, -9.81, 0); world.solver.iterations = 28; world.allowSleep = true;
    world.defaultContactMaterial.restitution = 0.08;
    const R = G.ROOM, GROUND = 1, BODY = 2, SMALL = 4, CHEST = 8, LEGL = 16, LEGR = 32, TRUNK = 64, ARML = 128, ARMR = 256;
    // self-collision between parts that do not overlap at rest: chest/head, pelvis/abdomen, each leg, each forearm+hand.
    // Adjacent segments (and the upper arms, which sit against the chest) are held apart by their joint limits instead.
    const filter = (n) => {
      if (n === 'thorax' || n === 'head') return [CHEST, GROUND | LEGL | LEGR | ARML | ARMR];
      if (n === 'pelvis' || n === 'abdomen') return [TRUNK, GROUND | ARML | ARMR];
      if (/^(thigh|shin|foot)L/.test(n)) return [LEGL, GROUND | CHEST | LEGR | ARML | ARMR];
      if (/^(thigh|shin|foot)R/.test(n)) return [LEGR, GROUND | CHEST | LEGL | ARML | ARMR];
      if (/^(farm|hand)L/.test(n)) return [ARML, GROUND | CHEST | TRUNK | LEGL | LEGR | ARMR];
      if (/^(farm|hand)R/.test(n)) return [ARMR, GROUND | CHEST | TRUNK | LEGL | LEGR | ARML];
      return [BODY, GROUND];
    };
    // Friction is calibrated empirically: sliding the whole body across the floor and measuring its
    // deceleration shows this solver grips ~200x harder than the nominal coefficient, so 0.003 here
    // behaves like a real coefficient of ~0.6 (about 6 m/s^2). Feet get their own, grippier contact while standing.
    world.defaultContactMaterial.friction = 0.003;
    const groundMat = new C.Material('ground'), footMat = new C.Material('foot');
    const footCM = new C.ContactMaterial(groundMat, footMat, { friction: 0.02, restitution: 0.05 });
    world.addContactMaterial(footCM);
    const plane = (pos, axis, ang) => { const b = new C.Body({ mass: 0, shape: new C.Plane(), material: groundMat }); b.position.set(...pos); if (axis) b.quaternion.setFromAxisAngle(axis, ang); b.collisionFilterGroup = GROUND; b.collisionFilterMask = -1; world.addBody(b); };
    plane([0, 0, 0], XA, -Math.PI / 2);
    plane([0, 0, R.z0], null); plane([0, 0, R.z1], UP, Math.PI);
    plane([R.x0, 0, 0], UP, Math.PI / 2); plane([R.x1, 0, 0], UP, -Math.PI / 2);

    const P = { stepping: null, stepCool: 0, steps: 0, world, active: false, parts: {}, joints: [], locks: [], rigid: false, lastThud: 0, t: 0, grabbed: null };
    // standing controller: s = leg support 0..1, bal = balance quality 0..1, y0 = pelvis height to hold, push = extra force (N)
    P.ctl = { s: 0, bal: 1, y0: 0.94, yRest: 0.94, push: new V3() };
    const MTOT = 77, GRAV = 9.81;
    // ---- ragdoll bodies
    for (const s of body.list) {
      const size = s.bbox.getSize(new V3()), c = s.bbox.getCenter(new V3());
      const he = new C.Vec3(Math.max(0.014, size.x * 0.46), Math.max(0.014, size.y * 0.47), Math.max(0.014, size.z * 0.46));
      const b = new C.Body({ mass: MASS[s.name.replace(/[LR]$/, '')], linearDamping: 0.04, angularDamping: 0.3 });
      addShapes(b, s.name, he);
      const halfLen = he.y;
      if (s.name.startsWith('foot')) b.material = footMat;
      [b.collisionFilterGroup, b.collisionFilterMask] = filter(s.name); b.sleepSpeedLimit = 0.12; b.sleepTimeLimit = 1.2;
      const part = { seg: s, b, off: s.origin.clone().sub(c), center: c, tone: 0, target: new Q(), I: 0, slack: 0, half: halfLen, leg: /^(thigh|shin|foot)/.test(s.name) ? s.name.slice(-1) : null };
      b.updateMassProperties(); part.I = Math.min(b.inertia.x, b.inertia.y, b.inertia.z);
      b.addEventListener('collide', (e) => {
        const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
        if (v > 1.1 && b.mass > 3 && P.t - P.lastThud > 0.25) { P.lastThud = P.t; audio.thud(Math.min(1, v / 4)); }
        // the head striking the floor: blunt injury scaled by impact speed
        if (s.name === 'head' && v > 2.2 && hooks.headImpact) hooks.headImpact(v);
      });
      P.parts[s.name] = part; s.part = part;
    }
    P.ctl.yRest = P.ctl.y0 = P.parts.pelvis.center.y;
    // at rest the trunk sits slightly behind the middle of the feet; balance holds that, not zero
    const offZ = (P.parts.pelvis.center.z + P.parts.thorax.center.z) / 2 - (P.parts.footL.center.z + P.parts.footR.center.z) / 2, fw = new C.Vec3(), FWD = new C.Vec3(0, 0, 1);
    for (const s of body.list) {
      if (!s.parent) continue;
      const a = P.parts[s.parent], b = P.parts[s.name], j = JOINT(s.name);
      const pA = new C.Vec3(s.origin.x - a.center.x, s.origin.y - a.center.y, s.origin.z - a.center.z);
      const pB = new C.Vec3(s.origin.x - b.center.x, s.origin.y - b.center.y, s.origin.z - b.center.z);
      const cons = [new C.ConeTwistConstraint(a.b, b.b, { pivotA: pA, pivotB: pB, axisA: j.aA, axisB: j.aB, angle: j.cone, twistAngle: j.twist })];
      if (j.hinge) cons.push(new C.HingeConstraint(a.b, b.b, { pivotA: pA, pivotB: pB, axisA: XA, axisB: XA }));
      for (const c of cons) c.collideConnected = false;
      // rigid posturing: an extra tight cone around the straight (rest) direction, switched on only while the brainstem holds the body in extension
      const lock = /^(hand|foot)/.test(s.name) ? null : new C.ConeTwistConstraint(a.b, b.b, { pivotA: pA, pivotB: pB, axisA: j.aB, axisB: j.aB, angle: /^uarm/.test(s.name) ? 0.3 : 0.12, twistAngle: 0.25 });
      if (lock) { lock.collideConnected = false; P.locks.push(lock); }
      // gains from the reduced inertia of the pair, so the explicit PD torque stays stable at 120 Hz
      const Ir = (a.I * b.I) / (a.I + b.I);
      P.joints.push({ a, b, cons, k: 290 * Ir * j.gain, d: 34 * Ir * j.gain, pd: 22 * Ir });
    }

    const q1 = new Q(), q2 = new Q(), q3 = new Q(), v1 = new V3(), v2 = new V3();
    // ---- hand the body over from animation to physics
    P.start = () => {
      if (P.active) return;
      P.active = true; body.updateMatrices();
      for (const k in P.parts) {
        const p = P.parts[k], s = p.seg;
        s.g.getWorldQuaternion(q1); s.g.getWorldPosition(v1); v2.copy(p.off).applyQuaternion(q1); v1.sub(v2);
        p.b.position.set(v1.x, v1.y, v1.z); p.b.quaternion.set(q1.x, q1.y, q1.z, q1.w);
        p.b.velocity.set(0, 0, 0); p.b.angularVelocity.set(0, 0, 0); p.b.force.set(0, 0, 0); p.b.torque.set(0, 0, 0);
        p.b.wakeUp(); world.addBody(p.b);
      }
      for (const j of P.joints) for (const c of j.cons) world.addConstraint(c);
    };
    P.setRigid = (on) => { if (on === P.rigid || !P.active) return; P.rigid = on; for (const c of P.locks) on ? world.addConstraint(c) : world.removeConstraint(c); for (const k in P.parts) P.parts[k].b.wakeUp(); };
    P.stop = () => {
      if (!P.active) return;
      P.setRigid(false);
      P.active = false; P.stepping = null; P.lost = null; P.stepWin = 0; P.grabbed = null; P.clutch.L = P.clutch.R = null; P.reach.L = P.reach.R = null; P.ctl.s = 0; P.ctl.push.set(0, 0, 0);
      for (const j of P.joints) for (const c of j.cons) world.removeConstraint(c);
      for (const k in P.parts) world.remove(P.parts[k].b);
      for (const s of body.list) { s.g.position.copy(s.rest); s.g.quaternion.set(0, 0, 0, 1); }
      body.root.position.set(0, 0, 0); body.root.rotation.set(0, 0, 0);
    };
    // impulse (kg·m/s) at a world point on a segment
    P.impulse = (seg, pt, imp) => {
      const b = seg.part.b; b.wakeUp();
      b.applyImpulse(new C.Vec3(imp.x, imp.y, imp.z), new C.Vec3(pt.x - b.position.x, pt.y - b.position.y, pt.z - b.position.z));
    };
    // reflex on being hit: the struck segment (and the one below it) goes slack for a moment and is
    // jerked away from the shot. Strength 0..1 from the energy deposited.
    const rv = new C.Vec3(), dv = new C.Vec3(), wv = new C.Vec3();
    P.hitReact = (seg, pt, dir, strength) => {
      const part = seg.part, b = part.b; b.wakeUp();
      part.slack = Math.max(part.slack, 0.12 + 0.3 * strength);
      for (const k in P.parts) if (P.parts[k].seg.parent === seg.name) P.parts[k].slack = Math.max(P.parts[k].slack, 0.1 + 0.2 * strength);
      rv.set(pt.x - b.position.x, pt.y - b.position.y, pt.z - b.position.z); dv.set(dir.x, dir.y, dir.z);
      rv.cross(dv, wv); const wm = wv.norm();
      if (wm > 1e-4) { const k = (2.5 + 7 * strength) / wm * (b.mass > 8 ? 0.8 : 1); b.angularVelocity.x += wv.x * k; b.angularVelocity.y += wv.y * k; b.angularVelocity.z += wv.z * k; }
    };
    P.push = (name, vx, vy, vz) => { const b = P.parts[name].b; b.velocity.x += vx; b.velocity.y += vy; b.velocity.z += vz; };
    const tw = new C.Vec3();
    function muscles() {
      for (const j of P.joints) {
        const A = j.a.b, B = j.b.b;
        let tone = j.b.tone;
        if (P.stepping && j.b.leg === P.stepping.side) tone *= 0.25; // the swinging leg is carried by the hip, not held stiff
        if (j.b.slack > 0) { tone *= 0.2; j.b.slack -= H; }
        let tx = 0, ty = 0, tz = 0;
        if (tone > 0.001) {
          A.wakeUp(); B.wakeUp();
          q1.set(A.quaternion.x, A.quaternion.y, A.quaternion.z, A.quaternion.w).multiply(j.b.target); // desired child orientation
          q2.set(B.quaternion.x, B.quaternion.y, B.quaternion.z, B.quaternion.w).invert();
          q3.multiplyQuaternions(q1, q2);
          if (q3.w < 0) { q3.x = -q3.x; q3.y = -q3.y; q3.z = -q3.z; q3.w = -q3.w; }
          const sn = Math.hypot(q3.x, q3.y, q3.z);
          if (sn > 1e-5) { const ang = Math.min(1.2, 2 * Math.atan2(sn, q3.w)), f = (j.k * tone * ang) / sn; tx = q3.x * f; ty = q3.y * f; tz = q3.z * f; }
        }
        const d = j.d * tone + j.pd;
        tx -= d * (B.angularVelocity.x - A.angularVelocity.x); ty -= d * (B.angularVelocity.y - A.angularVelocity.y); tz -= d * (B.angularVelocity.z - A.angularVelocity.z);
        B.torque.x += tx; B.torque.y += ty; B.torque.z += tz; A.torque.x -= tx; A.torque.y -= ty; A.torque.z -= tz;
      }
    }
    // Standing is a force balance, not an animation: the legs push the pelvis up and the feet
    // down by the same amount, and a limited corrective force keeps the trunk over the feet.
    // Push harder than the legs can correct and the subject goes over.
    const up = new C.Vec3(), ax = new C.Vec3();
    function balance() {
      const c = P.ctl; footCM.friction = c.s > 0.01 ? 0.1 : 0.003; // heels slide while the feet are drawn in; they grip once pushing up
      if (c.draw > 0.01) {
        // drawing the feet in under the hips (getting up): the hip and thigh muscles pull each foot toward a
        // point just in front of the pelvis. Internal force: equal and opposite on the pelvis.
        const pel = P.parts.pelvis.b; pel.quaternion.vmult(FWD, fw); pel.quaternion.vmult(LEFT, lv);
        const hx = fw.x, hz = fw.z, hm = Math.hypot(hx, hz) || 1, lx = lv.x, lz = lv.z, lm = Math.hypot(lx, lz) || 1;
        for (const [f, sg] of [[P.parts.footL.b, 1], [P.parts.footR.b, -1]]) {
          const tx = pel.position.x + (hx / hm) * 0.3 + (lx / lm) * 0.12 * sg, tz = pel.position.z + (hz / hm) * 0.3 + (lz / lm) * 0.12 * sg;
          sf.set(500 * (tx - f.position.x) - 40 * f.velocity.x, 0, 500 * (tz - f.position.z) - 40 * f.velocity.z);
          const m = sf.norm(), cap = 220 * c.draw; if (m > cap) sf.scale(cap / m, sf);
          f.wakeUp(); f.force.vadd(sf, f.force); pel.force.vsub(sf, pel.force);
        }
        // the hip flexors lift each knee (the lower end of the thigh) while the heel stays on the floor and is drawn
        // in, so the leg folds at the knee instead of lifting as a straight strut
        for (const sd of ['L', 'R']) {
          const part = P.parts['thigh' + sd], th = part.b, ft = P.parts['foot' + sd].b; th.wakeUp(); ft.wakeUp();
          th.quaternion.vmult(DOWN, kv); const half = part.half || 0.2; kp.set(th.position.x + kv.x * half, th.position.y + kv.y * half, th.position.z + kv.z * half);
          const lift = Math.min(160, Math.max(0, 0.45 - kp.y) * 700) * c.draw;
          kf.set(0, lift, 0); kr.set(kp.x - th.position.x, kp.y - th.position.y, kp.z - th.position.z); th.applyForce(kf, kr);
          pel.force.y -= lift * 0.6; ft.force.y -= lift * 0.4; // reaction through the pelvis and the heel
        }
      }
      if (c.s <= 0.01) {
        // sitting up from the floor uses the trunk muscles alone
        if (c.trunk > 0.01) for (const n in TRUNKK) {
          const b = P.parts[n].b, [K, D] = TRUNKK[n], g = c.trunk * 1.4;
          b.quaternion.vmult(UP, up); up.cross(UP, ax);
          b.torque.x += K * g * ax.x - D * c.trunk * b.angularVelocity.x; b.torque.z += K * g * ax.z - D * c.trunk * b.angularVelocity.z;
        }
        return;
      }
      const pel = P.parts.pelvis.b, tho = P.parts.thorax.b, fl = P.parts.footL.b, fr = P.parts.footR.b;
      let Fy = MTOT * GRAV * 0.8 + 7000 * (c.y0 - pel.position.y) - 1500 * pel.velocity.y;
      Fy = Math.max(0, Math.min(1.5 * MTOT * GRAV, Fy)) * Math.min(1, c.s);
      pel.quaternion.vmult(FWD, fw);
      const mx = (fl.position.x + fr.position.x) / 2 + fw.x * offZ, mz = (fl.position.z + fr.position.z) / 2 + fw.z * offZ;
      const cx = (pel.position.x + tho.position.x) / 2, cz = (pel.position.z + tho.position.z) / 2;
      // walking: the balance target sits a little ahead of the feet in the walking direction, so the body is held
      // leaning and the stepping keeps having to catch it
      const lx = c.lead ? c.lead.x : 0, lz = c.lead ? c.lead.z : 0;
      let Fx = 2600 * (mx + lx - cx) - 520 * (pel.velocity.x + tho.velocity.x) / 2, Fz = 2600 * (mz + lz - cz) - 520 * (pel.velocity.z + tho.velocity.z) / 2;
      const cap = 0.24 * MTOT * GRAV * c.s * c.bal, m = Math.hypot(Fx, Fz);
      if (m > cap) { Fx *= cap / m; Fz *= cap / m; }
      Fx += c.push.x; Fz += c.push.z;
      pel.force.y += Fy; pel.force.x += Fx / 2; pel.force.z += Fz / 2; tho.force.x += Fx / 2; tho.force.z += Fz / 2;
      // ---- stepping: if the capture point (centre of mass + velocity x sqrt(h/g)) leaves the feet, take a step
      const vx = (pel.velocity.x + tho.velocity.x) / 2, vz = (pel.velocity.z + tho.velocity.z) / 2;
      const capx = cx + vx * 0.31, capz = cz + vz * 0.31, ex = capx - mx, ez = capz - mz, em = Math.hypot(ex, ez);
      P.stepCool -= H;
      // past recovery: the capture point is further than a step can reach, or a run of steps has not caught it
      P.stepWin = Math.max(0, (P.stepWin || 0) - H);
      const lex = ex - (c.lead ? c.lead.x : 0), lez = ez - (c.lead ? c.lead.z : 0), lem = Math.hypot(lex, lez);
      if (c.s > 0.6 && c.canStep !== false && (lem > 0.5 || (P.stepWin > 2.4 && lem > 0.16))) { P.lost = { x: ex / (em || 1), z: ez / (em || 1), t: P.t }; }
      if (!P.stepping && c.s > 0.6 && c.canStep !== false && (em > 0.075 || Math.abs(P.turnErr || 0) > 0.35) && P.stepCool <= 0) {
        let side;
        pel.quaternion.vmult(LEFT, lv);
        if (em > 0.075) {
          const ux0 = ex / em, uz0 = ez / em;
          // the foot that is furthest behind the direction of fall makes the step
          const dl = (fl.position.x - mx) * ux0 + (fl.position.z - mz) * uz0, dr = (fr.position.x - mx) * ux0 + (fr.position.z - mz) * uz0;
          side = dl < dr ? 'L' : 'R';
        } else {
          // a turning step: move the foot that is furthest from where the new heading puts it
          const eL = Math.hypot(fl.position.x - (cx + lv.x * 0.1), fl.position.z - (cz + lv.z * 0.1)), eR = Math.hypot(fr.position.x - (cx - lv.x * 0.1), fr.position.z - (cz - lv.z * 0.1));
          side = eL > eR ? 'L' : 'R';
        }
        const ux = em > 1e-4 ? ex / em : 0, uz = em > 1e-4 ? ez / em : 0, foot = side === 'L' ? fl : fr, sg = side === 'L' ? 1 : -1;
        let tx = capx + ux * 0.04 * Math.min(1, em / 0.075) + lv.x * 0.095 * sg, tz = capz + uz * 0.04 * Math.min(1, em / 0.075) + lv.z * 0.095 * sg;
        const sx = tx - foot.position.x, sz = tz - foot.position.z, sl = Math.hypot(sx, sz), maxL = 0.5;
        if (sl > maxL) { tx = foot.position.x + sx / sl * maxL; tz = foot.position.z + sz / sl * maxL; }
        P.stepping = { side, foot, t: 0, dur: 0.24 + Math.min(0.12, sl * 0.25), fx: foot.position.x, fz: foot.position.z, fy: foot.position.y, tx, tz };
        P.steps++; if (em > 0.075 && !c.lead) P.stepWin += 0.8;
      }
      // once steady again, bring the feet back to a normal stance with a small step
      if (!P.stepping && c.s > 0.6 && c.canStep !== false && P.stepCool <= 0 && em < 0.04 && Math.hypot(vx, vz) < 0.12) {
        pel.quaternion.vmult(LEFT, lv); pel.quaternion.vmult(FWD, fw);
        const ddx = fl.position.x - fr.position.x, ddz = fl.position.z - fr.position.z;
        const fore = Math.abs(ddx * fw.x + ddz * fw.z), wide = ddx * lv.x + ddz * lv.z;
        P.tidyT = fore > 0.13 || wide < 0.12 || wide > 0.34 ? (P.tidyT || 0) + H : 0;
        if (P.tidyT > 0.5) {
          // move the foot that is further from under the body to sit beside the other one
          const dL = Math.hypot(fl.position.x - cx, fl.position.z - cz), dR = Math.hypot(fr.position.x - cx, fr.position.z - cz);
          const foot = dL > dR ? fl : fr, other = foot === fl ? fr : fl, sg = foot === fl ? 1 : -1;
          const tx = other.position.x + lv.x * 0.2 * sg, tz = other.position.z + lv.z * 0.2 * sg;
          P.stepping = { side: foot === fl ? 'L' : 'R', foot, t: 0, dur: 0.38, fx: foot.position.x, fz: foot.position.z, fy: foot.position.y, tx, tz }; P.tidyT = 0;
        }
      }
      const st = P.stepping;
      if (st) {
        st.t += H; const u = Math.min(1, st.t / st.dur), e = u * u * (3 - 2 * u);
        const dx = st.fx + (st.tx - st.fx) * e, dz = st.fz + (st.tz - st.fz) * e, dy = st.fy + (c.lead ? 0.11 : 0.075) * Math.sin(Math.PI * u); // walking steps clear the floor with a bent knee
        const f = st.foot;
        sf.set(1900 * (dx - f.position.x) - 70 * f.velocity.x, 1900 * (dy - f.position.y) - 70 * f.velocity.y + 120, 1900 * (dz - f.position.z) - 70 * f.velocity.z);
        const m2 = sf.norm(); if (m2 > 450) sf.scale(450 / m2, sf);
        f.force.vadd(sf, f.force); pel.force.vsub(sf, pel.force); // the hip muscles swing the leg: internal force
        // when turning, the swinging foot is rotated to the new heading before it is planted
        if (c.face != null) { f.quaternion.vmult(FWD, fw); let e = c.face - Math.atan2(fw.x, fw.z); e = Math.atan2(Math.sin(e), Math.cos(e)); f.torque.y += 6 * e - 0.4 * f.angularVelocity.y; }
        const stance = f === fl ? fr : fl;
        stance.force.y -= Fy; stance.force.x -= Fx; stance.force.z -= Fz;
        if (u >= 1) { P.stepping = null; P.stepCool = 0.1; }
      } else for (const f of [fl, fr]) { f.force.y -= Fy / 2; f.force.x -= Fx / 2; f.force.z -= Fz / 2; }
      // turning toward a heading: yaw torque on pelvis and trunk; the planted feet resist it until a step frees one
      if (c.face != null) {
        // commit to one turning direction (otherwise a half-turn dithers between left and right)
        const herr = (b) => { b.quaternion.vmult(FWD, fw); let e = c.face - Math.atan2(fw.x, fw.z); e = Math.atan2(Math.sin(e), Math.cos(e)); if (P.turnDir && Math.sign(e) !== P.turnDir && Math.abs(e) > 1.2) e += 2 * Math.PI * P.turnDir; return e; };
        if (P.lastFace == null || Math.abs(Math.atan2(Math.sin(c.face - P.lastFace), Math.cos(c.face - P.lastFace))) > 0.5) { P.lastFace = c.face; P.turnDir = 0; const e0 = herr(pel); P.turnDir = Math.abs(e0) > 2.9 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(e0) || 1; }
        for (const [b, k] of [[pel, 1], [tho, 0.7]]) {
          const e = herr(b);
          b.torque.y += (70 * k * Math.max(-0.6, Math.min(0.6, e)) - 10 * k * b.angularVelocity.y) * c.s;
        }
        // a large heading error forces small turning steps even when balanced
        P.turnErr = herr(pel);
      } else { P.turnErr = 0; P.lastFace = null; }
      // trunk muscles hold the spine upright (N·m per rad of lean, and damping), sized against the weight above each joint
      for (const n in TRUNKK) {
        const b = P.parts[n].b, [K, D] = TRUNKK[n], g = Math.max(c.s * c.bal, c.trunk || 0);
        b.quaternion.vmult(UP, up); up.cross(UP, ax);
        b.torque.x += K * g * ax.x - D * c.s * b.angularVelocity.x; b.torque.y -= D * 0.5 * c.s * b.angularVelocity.y; b.torque.z += K * g * ax.z - D * c.s * b.angularVelocity.z;
      }
    }
    const LEFT = new C.Vec3(1, 0, 0), lv = new C.Vec3(), sf = new C.Vec3(), kv = new C.Vec3(), kp = new C.Vec3(), kf = new C.Vec3(), kr = new C.Vec3();
    const TRUNKK = { pelvis: [260, 7], abdomen: [200, 5], thorax: [320, 14], head: [22, 0.7] };
    // wound clutching: the arm muscles pull a hand onto a wound. Modelled as an internal spring
    // (equal and opposite on the hand and on the wounded segment), so it adds no net force to the body.
    P.clutch = { L: null, R: null }; P.reach = { L: null, R: null };
    P.setClutch = (side, seg, wpt) => {
      if (!seg) { P.clutch[side] = null; return; }
      const b = seg.part.b, l = new C.Vec3(); b.pointToLocalFrame(new C.Vec3(wpt.x, wpt.y, wpt.z), l);
      P.clutch[side] = { b, l, seg };
    };
    const cp = new C.Vec3(), cr = new C.Vec3(), cv = new C.Vec3(), cf = new C.Vec3(), cn = new C.Vec3();
    function clutchForce() {
      const tho = P.parts.thorax.b;
      for (const sd of ['L', 'R']) {
        const rp = P.reach[sd];
        if (rp) {
          // reaching for a point in the world (arms thrown out to break a fall): internal force between hand and chest
          const h = P.parts['hand' + sd].b; h.wakeUp();
          cf.set(650 * (rp.x - h.position.x) - 30 * h.velocity.x, 650 * (rp.y - h.position.y) - 30 * h.velocity.y, 650 * (rp.z - h.position.z) - 30 * h.velocity.z);
          const m = cf.norm(); if (m > 130) cf.scale(130 / m, cf);
          h.force.vadd(cf, h.force); tho.force.vsub(cf, tho.force); continue;
        }
        const c = P.clutch[sd]; if (!c) continue;
        const h = P.parts['hand' + sd].b, b = c.b; h.wakeUp(); b.wakeUp();
        b.pointToWorldFrame(c.l, cp); cp.vsub(b.position, cr); b.angularVelocity.cross(cr, cv); cv.vadd(b.velocity, cv);
        cf.set(900 * (cp.x - h.position.x) - 40 * (h.velocity.x - cv.x), 900 * (cp.y - h.position.y) - 40 * (h.velocity.y - cv.y), 900 * (cp.z - h.position.z) - 40 * (h.velocity.z - cv.z));
        const m = cf.norm(); if (m > 170) cf.scale(170 / m, cf);
        h.force.vadd(cf, h.force); cf.negate(cn); b.applyForce(cn, cr);
      }
    }
    // grab tool: a damped spring between a point on a segment and the cursor
    const gp = new C.Vec3(), gr = new C.Vec3(), gv = new C.Vec3(), gf = new C.Vec3();
    P.grab = (seg, pt) => { const b = seg.part.b; const l = new C.Vec3(); b.pointToLocalFrame(new C.Vec3(pt.x, pt.y, pt.z), l); P.grabbed = { b, l, target: new V3(pt.x, pt.y, pt.z) }; };
    P.release = () => { P.grabbed = null; };
    function grabForce() {
      const g = P.grabbed; if (!g) return;
      const b = g.b; b.wakeUp();
      b.pointToWorldFrame(g.l, gp); gp.vsub(b.position, gr); b.angularVelocity.cross(gr, gv); gv.vadd(b.velocity, gv);
      gf.set(2200 * (g.target.x - gp.x) - 160 * gv.x, 2200 * (g.target.y - gp.y) - 160 * gv.y, 2200 * (g.target.z - gp.z) - 160 * gv.z);
      const m = gf.norm(); if (m > 1100) gf.scale(1100 / m, gf);
      b.applyForce(gf, gr);
    }
    let acc = 0;
    const H = 1 / 120;
    P.step = (dt) => {
      P.t += dt; acc = Math.min(acc + dt, 0.1);
      while (acc >= H) { if (P.active) { muscles(); balance(); clutchForce(); grabForce(); } world.step(H); acc -= H; }
      syncCasings();
    };
    // ---- write physics transforms back to the render / hit-test skeleton
    const wq = {}, wo = {};
    P.sync = () => {
      if (!P.active) return;
      body.root.position.set(0, 0, 0); body.root.rotation.set(0, 0, 0);
      for (const s of body.list) {
        const p = s.part, b = p.b;
        const qw = (wq[s.name] = wq[s.name] || new Q()).set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
        const ow = (wo[s.name] = wo[s.name] || new V3()).copy(p.off).applyQuaternion(qw); ow.x += b.position.x; ow.y += b.position.y; ow.z += b.position.z;
        if (!s.parent) { s.g.quaternion.copy(qw); s.g.position.copy(ow); continue; }
        q1.copy(wq[s.parent]).invert();
        s.g.quaternion.multiplyQuaternions(q1, qw);
        s.g.position.copy(ow).sub(wo[s.parent]).applyQuaternion(q1);
      }
      body.updateMatrices();
    };
    P.speed = () => { const v = P.parts.pelvis.b.velocity, w = P.parts.thorax.b.velocity; return Math.max(v.norm(), w.norm()); };

    // ---- shell casings
    const casings = [];
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a23f, metalness: 0.85, roughness: 0.3 }), hull = new THREE.MeshStandardMaterial({ color: 0xa3201c, roughness: 0.6 });
    P.casing = (pos, vel, cls) => {
      if (cls === 'revolver') return; // stays in the cylinder
      const r = cls === 'shotgun' ? 0.0102 : cls === 'rifle' ? 0.0048 : 0.005, len = cls === 'shotgun' ? 0.06 : cls === 'rifle' ? 0.045 : 0.019;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), cls === 'shotgun' ? hull : brass); m.castShadow = true; scene.add(m);
      const b = new C.Body({ mass: cls === 'shotgun' ? 0.012 : cls === 'rifle' ? 0.006 : 0.004, shape: new C.Box(new C.Vec3(r, len / 2, r)), linearDamping: 0.05, angularDamping: 0.35 });
      b.collisionFilterGroup = SMALL; b.collisionFilterMask = GROUND; b.sleepSpeedLimit = 0.2; b.sleepTimeLimit = 0.5;
      b.position.set(pos.x, pos.y, pos.z); b.velocity.set(vel.x, vel.y, vel.z);
      b.angularVelocity.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40);
      let tinks = 0;
      b.addEventListener('collide', (e) => { if (tinks < 3 && Math.abs(e.contact.getImpactVelocityAlongNormal()) > 0.5) { tinks++; audio.tink(cls === 'shotgun'); } });
      world.addBody(b); casings.push({ m, b });
      if (casings.length > 60) { const o = casings.shift(); scene.remove(o.m); world.remove(o.b); }
    };
    function syncCasings() { for (const c of casings) { c.m.position.set(c.b.position.x, c.b.position.y, c.b.position.z); c.m.quaternion.set(c.b.quaternion.x, c.b.quaternion.y, c.b.quaternion.z, c.b.quaternion.w); } }
    P.clear = () => { for (const c of casings) { scene.remove(c.m); world.remove(c.b); } casings.length = 0; };
    return P;
  };
})();
