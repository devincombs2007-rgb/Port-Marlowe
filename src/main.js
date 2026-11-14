// Game loop, input, firing, and turning shot results into wounds, blood and reports.
(function () {
  const G = window.GSW, V3 = THREE.Vector3, ROOM = G.ROOM;
  const canvas = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding;
  // filmic tone mapping: highlights roll off like a camera instead of clipping, which reads far more natural on skin
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0f11);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 40);
  camera.rotation.order = 'YXZ'; scene.add(camera);

  const vent = G.buildChamber(scene, renderer);
  const world = G.buildWorld(scene), gun = G.buildGun(camera), audio = G.Audio();
  let body = G.buildBody(scene);
  if (G.FPHands) gun.hands = G.FPHands(gun);
  const intro = G.Intro ? G.Intro({ scene, canvas, gun, room: G.ROOM }) : null;
  // ---- subjects. Every person in the room has their own body, physics, physiology and behaviour; the code below
  // works on "the current subject" (body, rag, phys, npc, ...), and use(S) switches which one that is.
  const subjects = [];
  function physicsFor(S) {
    return G.buildPhysics(scene, S.body, audio, { headImpact: (v) => S.phys && S.npc && S.npc.posture === 'falling' && S.phys.headImpact(v), footstep: (k) => { if (S.npc) { audio.dist = Math.hypot(state.pos.x - S.npc.pos.x, state.pos.z - S.npc.pos.z); audio.step(k); } } }); // only a real fall, not movement on the floor
  }
  let rag, phys, npc, viscera, headFx, handBlood, sampler, current = null;
  function use(S) { current = S; body = S.body; rag = S.rag; phys = S.phys; npc = S.npc; viscera = S.viscera; headFx = S.headFx; handBlood = S.handBlood; sampler = S.sampler; }
  function makeSubject(b) {
    const S = { body: b || G.buildBody(scene) }; S.rag = physicsFor(S);
    S.sampler = { sample: S.body.sample, cavity: S.body.cavity, maxDist: 20 };
    S.headFx = { rk: 0, rkMax: 0, at: 0 }; S.handBlood = { L: 0, R: 0, at: 0 };
    subjects.push(S); return S;
  }
  const primary = makeSubject(body);
  rag = primary.rag; sampler = primary.sampler; headFx = primary.headFx; handBlood = primary.handBlood;
  const TIMES = [1, 4, 15, 60];
  const state = { yaw: 0, pitch: -0.06, pos: new V3(0, 1.62, 3.0), ax: 0, ay: 0, wi: 1, lastShot: -9, ti: 0, started: false, keys: {}, stick: [0, 0], kick: 0, narrow: false, slow: false, grab: false, grabT: 0 };

  const ui = G.UI({
    weapon: (i) => setWeapon(i), xray: () => toggleXray(), time: () => cycleTime(), reset: () => reset(),
    grab: () => toggleGrab(), slow: () => toggleSlow(),
    sound: () => { audio.muted = !audio.muted; ui.setSound(!audio.muted); }, start: () => { state.started = true; audio.init(); if (intro && !window.GSW_NOINTRO) intro.start(); },
  });
  function setWeapon(i) { state.wi = i; const w = G.WEAPONS[i]; gun.set(w.cls, w.model); ui.setWeapon(w, i); }
  function toggleXray() { body.setXray(!body.xray); ui.setXray(body.xray); }
  function toggleGrab() { state.grab = !state.grab; rag.release(); ui.setGrab(state.grab); }
  function toggleSlow() { state.slow = !state.slow; ui.setSlow(state.slow); }
  // grab tool: find the first body point under the cursor and attach a spring to it
  const gs = { inBody: false, seg: null, prim: null, sdf: 0 }, gpt = new V3(), gdir = new V3();
  function tryGrab() {
    camera.updateMatrixWorld(); body.updateMatrices(); aimDir(gdir);
    for (let t = 0.3; t < 12; t += 0.012) {
      gpt.copy(camera.position).addScaledVector(gdir, t); body.sample(gpt, 0, gs);
      if (gs.inBody) { rag.grab(gs.seg, gpt); state.grabT = t; return true; }
    }
    return false;
  }
  function moveGrab() { if (rag.grabbed && state.grab) { aimDir(gdir); rag.grabbed.target.copy(camera.position).addScaledVector(gdir, state.grabT); } }
  // the subject's own sounds and what comes with them
  const mouth = new V3(), mdir = new V3();
  function npcEvent(type, v) {
    const weak = Math.min(1, Math.max(0, (phys.frac() - 0.15) / 0.25)); // shock: quieter, weaker voice
    if (type === 'grunt') audio.grunt(v); else if (type === 'groan' || type === 'moan') audio.moan(v, weak); else if (type === 'gasp') audio.gasp();
    else if (type === 'yelp') audio.yelp(v, weak); else if (type === 'scream') audio.scream(v, weak); else if (type === 'cry') audio.cry(v, weak);
    else if (type === 'cough') {
      audio.cough();
      // blood in the airway comes up with the cough
      const h = body.segs.head; mouth.set(0, 1.605 - h.origin.y, 0.095 - h.origin.z).applyMatrix4(h.g.matrixWorld); mdir.set(0, -0.15, 1).transformDirection(h.g.matrixWorld);
      const ml = 1 + Math.random() * 3; world.burst(mouth, mdir, 7, 1.8, 0.7, 0.003, ml); phys.bv -= ml; phys.lostExt += ml;
    }
  }
  const pending = []; let simClock = 0; let duel = null;
  const projectiles = G.Projectiles(scene);
  for (const S of subjects) S.viscera = G.Viscera(scene, S.body, S.rag);
  viscera = primary.viscera; current = primary;
  const newSubject = () => { const S = makeSubject(); S.viscera = G.Viscera(scene, S.body, S.rag); return S; };
  function cycleTime() { state.ti = (state.ti + 1) % TIMES.length; ui.setTime(TIMES[state.ti]); }
  function reset() {
    if (current !== primary) use(primary);
    body.clearWounds(); world.clear(); rag.stop(); rag.clear(); projectiles.clear(); viscera.clear(); headFx.rk = headFx.rkMax = 0; headFx.mouth = false; handBlood.L = handBlood.R = 0;
    // each new subject is a different person (the first one is always the same, for a consistent start)
    if (body.setLook) { const first = reset.n == null; reset.n = (reset.n || 0) + 1;
      const tints = [0xffffff, 0x8a6a50, 0x5a4030, 0xd0b090, 0x404040];
      body.setLook(first ? 0 : Math.floor(Math.random() * body.looks), first ? 0 : Math.floor(Math.random() * 3), first ? 0xffffff : tints[Math.floor(Math.random() * tints.length)]); }
    phys = G.Physiology(G.ANATOMY.bloodVolume);
    npc = G.NPC(body, phys, rag, { threat: () => state.threat || state.pos, event: npcEvent }); pending.length = 0; primary.phys = phys; primary.npc = npc;
    npc.update(0.001); ui.report(null); G.state = { phys, npc, body, world, state };
  }
  reset(); setWeapon(1); ui.setTime(1);
  duel = Duel();
  document.getElementById('bDuel').addEventListener('click', () => { document.getElementById('intro').hidden = true; state.started = true; audio.init(); duel.start(); });

  // ---------- input
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 78 : 62; camera.updateProjectionMatrix(); state.narrow = w < h;
    if (!state.moved) { state.ax = w / 2; state.ay = h * 0.42; }
  }
  window.addEventListener('resize', resize); resize();
  const touch = { id: null, x: 0, y: 0, t: 0, drag: false };
  let look = false;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    audio.init(); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (e.pointerType === 'mouse') {
      state.ax = x; state.ay = y; state.moved = true;
      if (e.button === 0) { if (state.grab) tryGrab(); else fire(); } else look = true;
    } else if (touch.id == null) {
      Object.assign(touch, { id: e.pointerId, x, y, sx: x, sy: y, t: performance.now(), drag: false, grab: false });
      if (state.grab) { state.ax = x; state.ay = y; state.moved = true; touch.grab = tryGrab(); }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (e.pointerType === 'mouse') {
      if (look) { state.yaw -= e.movementX * 0.0032; state.pitch -= e.movementY * 0.0032; }
      state.ax = x; state.ay = y; state.moved = true;
    } else if (e.pointerId === touch.id) {
      if (!touch.drag && Math.hypot(x - touch.sx, y - touch.sy) > 9) touch.drag = true;
      if (touch.grab) { state.ax = x; state.ay = y; }
      else if (touch.drag) { state.yaw += (x - touch.x) * 0.0042; state.pitch += (y - touch.y) * 0.0042; }
      touch.x = x; touch.y = y;
    }
  });
  const up = (e) => {
    if (e.pointerType === 'mouse') { if (e.button !== 0) look = false; else rag.release(); return; }
    if (e.pointerId !== touch.id) return;
    rag.release();
    if (!state.grab && !touch.drag && performance.now() - touch.t < 400 && e.type === 'pointerup') { state.ax = touch.x; state.ay = touch.y; state.moved = true; fire(); }
    touch.id = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  const toggleHud = () => document.body.classList.toggle('min');
  document.getElementById('bMenu').addEventListener('click', toggleHud);
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); toggleHud(); } });
  window.addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (k === 'o' && state.started) { duel.on ? duel.stop() : duel.start(); } else if (k === 'c' && duel && duel.on) duel.cycleCam(); });
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey) return;
    const k = e.key.toLowerCase(); state.keys[k] = true;
    const wi = G.WEAPONS.findIndex((w) => w.key === k);
    if (wi >= 0) setWeapon(wi);
    else if (k === 'x') toggleXray(); else if (k === 't') cycleTime(); else if (k === 'r') reset(); else if (k === 'g') toggleGrab(); else if (k === 'f') toggleSlow(); else if (k === ' ') { fire(); e.preventDefault(); }
    if (k.startsWith('arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { state.keys[e.key.toLowerCase()] = false; });
  // touch move stick
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  if (window.matchMedia('(pointer: coarse)').matches) stick.hidden = false;
  const stickMove = (e) => {
    const r = stick.getBoundingClientRect(); let x = (e.clientX - r.left) / r.width * 2 - 1, y = (e.clientY - r.top) / r.height * 2 - 1;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    state.stick = [x, y]; knob.style.transform = 'translate(' + x * 28 + 'px,' + y * 28 + 'px)';
  };
  stick.addEventListener('pointerdown', (e) => { stick.setPointerCapture(e.pointerId); stickMove(e); });
  stick.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType !== 'mouse') stickMove(e); });
  const stickEnd = () => { state.stick = [0, 0]; knob.style.transform = ''; };
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);
  stick.addEventListener('lostpointercapture', stickEnd);
  window.addEventListener('blur', () => {
    state.keys = {};
    look = false;
    velocity.set(0, 0);
    stickEnd();
  });

  // ---------- firing
  const ndc = new V3(), dir = new V3(), tmp = new V3(), tmp2 = new V3();
  function aimDir(out) {
    ndc.set((state.ax / canvas.clientWidth) * 2 - 1, -(state.ay / canvas.clientHeight) * 2 + 1, 0.5).unproject(camera);
    return out.copy(ndc).sub(camera.position).normalize();
  }
  function fire() {
    if (!state.started || state.grab || (intro && intro.active()) || (duel && duel.on)) return;
    const now = performance.now() / 1000, w = G.WEAPONS[state.wi];
    if (now - state.lastShot < 60 / w.rpm) return;
    state.lastShot = now;
    camera.updateMatrixWorld(); body.updateMatrices();
    aimDir(dir);
    gun.fire(w.recoil); audio.shot(w); state.kick += 0.012 + w.recoil * 0.012; state.shake = Math.min(1, (state.shake || 0) + 0.25 + w.recoil * 0.25);
    if (audio.deafen) audio.deafen(Math.min(1, (w.loud || 1) - 0.3));
    // a puff of powder smoke at the muzzle, drifting up; more from rifles and shotguns
    { const m = gun.models[gun.model]; if (m) { tmp.set(0, m.userData.fy || 0.03, (m.userData.muzzle || -0.2) - 0.02); m.localToWorld(tmp); world.smoke(tmp, dir, Math.round(2 + w.recoil * 2), Math.min(1.4, 0.5 + w.recoil * 0.5)); } }
    // eject the spent case: up and to the right of the weapon
    gun.g.getWorldPosition(tmp); tmp2.set(1.6 + Math.random() * 0.8, 1.4 + Math.random() * 0.6, 0.3 * (Math.random() - 0.5)).applyQuaternion(camera.quaternion);
    rag.casing(tmp, tmp2, w.cls);
    const n = w.pellets || 1, results = [], origin = camera.position.clone();
    for (let i = 0; i < n; i++) {
      const s = w.spread * (n > 1 ? 1 : 0.6);
      tmp.set(dir.x + gauss() * s, dir.y + gauss() * s, dir.z + gauss() * s).normalize();
      const res = G.simulate(w.bullet, origin, tmp, sampler);
      res.d0 = tmp.clone(); results.push(res);
    }
    G.debug.last = results;
    // the round itself, flying the computed track from the muzzle
    { const m = gun.models[gun.model]; tmp.set(0, m ? m.userData.fy || 0.03 : 0.03, m ? (m.userData.muzzle || -0.2) : -0.2); if (m) m.localToWorld(tmp); else tmp.copy(origin);
      for (const res of results) {
        const pts = [tmp.clone()], v = [], hide = []; let sp = w.bullet.v, inside = false;
        for (const mk of res.marks) {
          if (mk.type !== 'entry' && mk.type !== 'exit') continue;
          pts.push(new V3(mk.p.x, mk.p.y, mk.p.z)); v.push(sp); hide.push(inside);
          if (mk.type === 'entry') inside = true; else { inside = false; sp = mk.v || sp * 0.6; }
        }
        const tr = res.track, last = res.marks.filter((mk) => mk.type === 'exit').pop();
        if (inside && tr.length) { const e = tr[tr.length - 1]; pts.push(new V3(e.x, e.y, e.z)); v.push(sp * 0.5); hide.push(true); } // stopped inside
        else if (!res.stopped && !res.noPen) { const o = last ? new V3(last.p.x, last.p.y, last.p.z) : origin, dd = last ? new V3(last.dir.x, last.dir.y, last.dir.z) : res.d0, hit = world.rayRoom(o, dd); if (hit) { pts.push(hit.p.clone()); v.push(sp); hide.push(false); } }
        projectiles.spawn(pts, v, hide, w.pellets > 1 ? 0.0084 : w.bullet.d, w.pellets > 1, simClock);
      } }
    // the bullet takes time to arrive: muzzle-to-target distance over muzzle velocity (a few ms; visible in slow motion)
    const first = results.find((r) => r.hitBody), dist = first ? origin.distanceTo(first.marks[0].p) : 4;
    pending.push({ t: simClock + dist / w.bullet.v, run: () => {
      for (const res of results) processShot(res, w, res.d0, origin);
      const hits = results.filter((r) => r.hitBody);
      if (w.pellets > 1 && hits.length > w.pellets * 0.6) {
        // inside ~2 m the shot has barely spread: it strikes as one mass with the wad and blows a single ragged hole
        const en = hits[0].marks.find((mk) => mk.type === 'entry'), sw = en && body.wounds.find((bw) => bw.mark === en);
        const rg = en ? origin.distanceTo(tmp2.set(en.p.x, en.p.y, en.p.z)) : 9;
        if (sw && rg < 2) {
          const cr = 0.016 + 0.026 * Math.min(1, (2 - rg) / 1.6);
          body.crater(sw, cr, cr * 0.7); world.chunks(tmp2, { x: -res0dir(hits[0]).x, y: -res0dir(hits[0]).y, z: -res0dir(hits[0]).z }, Math.round(cr * 300), 2.2, 0.7, 'tissue');
          const gutHit = hits.find((r) => r.order.some((p) => GUT.test(p.kind))); if (gutHit) eviscerate(gutHit, sw, cr);
        }
      }
      if (hits.length) audio.impact(hits.some((r) => r.order.some((p) => p.kind === 'bone')), hits.reduce((a, r) => a + r.Edep, 0));
      // long-bone shafts that were hit break where the bullet crossed them (the limb then bends there)
      for (const r of results) for (const pr of r.order) {
        if (pr.kind !== 'bone' || /\(/.test(pr.name)) continue; // the shaft only (heads, condyles, plateaus are joints)
        const seg = pr.bone === 'femur' ? 'thighX' : pr.bone === 'tibia' ? 'shinX' : pr.bone === 'humerus' ? 'uarmX' : pr.bone === 'forearm' ? 'farmX' : null;
        if (!seg) continue;
        // one forearm bone alone splints on the other: the forearm only folds when both go (or the hit is violent)
        if (pr.bone === 'forearm' && !(r.order.filter((o) => o.bone === 'forearm' && o.side === pr.side).length > 1 || r.Edep > 900)) continue;
        rag.fracture(seg + pr.side);
      }
      dismember(results, w, origin);
      // blood from the mouth: a torn lung or airway brings it up; a broken jaw or face bleeds into the mouth
      { const ord = results.flatMap((r) => r.order), lung = ord.some((o) => o.kind === 'lung' || o.kind === 'airway'), face = ord.some((o) => o.bone === 'jaw' || o.bone === 'face');
        if ((lung || face) && !headFx.mouth) { headFx.mouth = true; const sd = Math.random() < 0.5 ? 1 : -1; oozeAt(new V3(0.02 * sd, 1.598, 0.088), new V3(0.3 * sd, -0.6, 0.75), face ? 14 : 5, 'Mouth'); if (face) oozeAt(new V3(-0.02 * sd, 1.598, 0.088), new V3(-0.3 * sd, -0.6, 0.75), 8, 'Mouth'); } }
      headTrauma(results);
      ui.report(buildReport(results, w));
    } });
  }
  const res0dir = (r) => r.d0;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.82;

  // a crater through the belly wall over a torn bowel: loops of intestine push out through it
  const GUT = /^(bowel|stomach|colon)/;
  function eviscerate(res, sw, cr) {
    if (cr < 0.02 || !/^(abdomen|pelvis)$/.test(sw.seg.name) || !res.order.some((p) => GUT.test(p.kind))) return;
    viscera.spawn(sw, cr); if (cr > 0.032) viscera.spawn(sw, cr);
    phys.addInjury('evisc', 'Evisceration: loops of bowel protruding through the wound', 2);
  }
  // ---- the head. What a bullet does to the skull, brain and eyes depends above all on how much energy it leaves
  // there. A handgun round (300-700 J) makes a modest exit, often with a little brain in it. A rifle round or a slug
  // (1000-3000 J) throws a temporary cavity of 6-9 cm through a brain shut inside a rigid skull: the skull bursts open.
  // The pressure fractures the thin roofs of the orbits, so bruising spreads round both eyes over the following
  // minutes ("raccoon eyes"), and a fractured skull base bleeds from the nose and ears. A track through the eye
  // ruptures it; one passing close behind it drives it forward, and a powerful one can push it out of the socket.
  let marks = null;
  function headMarks() {
    if (marks) return marks;
    const g = body.human.geometry, P = g.attributes.position; let nose = null, earL = null, earR = null;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (Math.abs(x) < 0.006 && y > 1.59 && y < 1.66 && (!nose || z > nose.z)) nose = new V3(x, y, z);
      if (y > 1.62 && y < 1.68 && z > -0.04 && z < 0.03) { if (!earL || x > earL.x) earL = new V3(x, y, z); if (!earR || x < earR.x) earR = new V3(x, y, z); }
    }
    return (marks = { nose, earL, earR });
  }
  const restToWorld = (v) => v.clone().sub(body.segs.head.origin).applyMatrix4(body.segs.head.g.matrixWorld);
  function oozeAt(rest, nrm, rate, label) {
    const hs = body.segs.head, p = restToWorld(rest), n = nrm.clone().transformDirection(hs.g.matrixWorld);
    const sw = body.addWound({ seg: hs, p, r: 0.002, type: 'ooze' }, n, null); sw.rate = 0; sw.acc = 0; sw.buf = 0;
    phys.addBleed(label, rate, sw);
  }
  const segD = (c, a, b) => { tmp.set(b.x - a.x, b.y - a.y, b.z - a.z); const L2 = tmp.lengthSq() || 1e-9; const t = Math.max(0, Math.min(1, ((c.x - a.x) * tmp.x + (c.y - a.y) * tmp.y + (c.z - a.z) * tmp.z) / L2)); return Math.hypot(a.x + tmp.x * t - c.x, a.y + tmp.y * t - c.y, a.z + tmp.z * t - c.z); };
  function headTrauma(results) {
    const viaHead = results.filter((r) => r.hitBody && r.marks.some((m) => m.seg && m.seg.name === 'head'));
    if (!viaHead.length || !body.eyes) return;
    const brain = viaHead.filter((r) => r.order.some((o) => /cereb|brain/.test(o.kind))), E = brain.reduce((a, r) => a + r.Edep, 0);
    body.updateMatrices();
    const ec = new V3();
    for (const e of body.eyes) {
      body.eyeWorld(e, ec); let dmin = 9;
      for (const r of viaHead) { const t = r.track; for (let i = 0; i < t.length - 1; i++) dmin = Math.min(dmin, segD(ec, t[i], t[i + 1])); for (const m of r.marks) if (m.seg && m.seg.name === 'head') dmin = Math.min(dmin, ec.distanceTo(tmp2.set(m.p.x, m.p.y, m.p.z))); }
      const side = e.side === 'L' ? 'Left' : 'Right';
      if (dmin < e.r + 0.004) {
        body.eyeRupture(e); phys.addInjury('globe' + e.side, side + ' eye: globe ruptured', 2);
        oozeAt(e.c.clone().add(new V3(0, -e.r * 0.4, e.r)), new V3(0, -0.3, 1), 25, side + ' orbit');
      } else if (dmin < 0.03) {
        if (E > 1100 && Math.random() < 0.65) {
          // pushed out of the socket: it hangs on the optic nerve
          body.eyeOut(e); phys.addInjury('enuc' + e.side, side + ' eye forced out of the orbit', 2);
          const hs = body.segs.head, sw = body.addWound({ seg: hs, p: restToWorld(e.c.clone().add(new V3(0, 0, e.r * 0.6))), r: 0.002, type: 'ooze' }, new V3(0, 0, 1).transformDirection(hs.g.matrixWorld), null);
          sw.rate = 0; sw.acc = 0; sw.buf = 0; phys.addBleed(side + ' orbit', 30, sw); viscera.spawn(sw, 0, 'eye', { eye: e.g });
        } else { body.eyeForward(e, 5 + Math.random() * 4); body.eyeBlood(e, 0.85); phys.addInjury('prop' + e.side, side + ' eye: orbit fractured, bleeding behind the eye pushes it forward', 1); }
      } else if (E > 1500) { body.eyeForward(e, 2 + Math.random() * 3); body.eyeBlood(e, 0.6); } // the pressure wave of a bursting skull
    }
    if (!brain.length) return;
    // fractured skull base: bruising round the eyes over minutes, blood from the nose and ears
    if (E > 250) { headFx.rkMax = Math.max(headFx.rkMax, Math.min(1, 0.35 + E / 1800)); phys.addInjury('basefx', 'Skull base fractured', 1); }
    const L = headMarks();
    if (L.nose && (E > 600 || Math.random() < 0.35)) { oozeAt(L.nose.clone().add(new V3(0.006, -0.015, -0.01)), new V3(0, -0.6, 0.8), 8 + Math.min(25, E / 80), 'Nose'); if (E > 1200) oozeAt(L.nose.clone().add(new V3(-0.006, -0.015, -0.01)), new V3(0, -0.6, 0.8), 6 + E / 150, 'Nose'); }
    if (E > 900 || Math.random() < 0.25) for (const [ear, nx] of [[L.earL, 1], [L.earR, -1]]) if (ear && (E > 1400 || Math.random() < 0.6)) oozeAt(ear, new V3(nx, 0, 0), 4 + E / 300, 'Ear');
    // the exit (or the entry, if the round stayed inside)
    const r0 = brain[0], ex = r0.marks.filter((m) => m.type === 'exit' && m.seg && m.seg.name === 'head').pop() || r0.marks.find((m) => m.type === 'entry' && m.seg && m.seg.name === 'head');
    const sw = ex && body.wounds.find((bw) => bw.mark === ex); if (!sw) return;
    if (E > 1000) {
      const s = Math.min(1, (E - 900) / 2200), R = 0.04 + 0.045 * s;
      body.burst(sw, R, 4 + Math.round(s * 3));
      for (let k = 0; k < 1 + Math.round(2 * s); k++) viscera.spawn(sw, R, 'brain');
      tmp2.set(ex.p.x, ex.p.y, ex.p.z); const dd = ex.dir || r0.d0;
      world.chunks(tmp2, dd, Math.round(14 + 24 * s), 3 + 4 * s, 0.7, 'brain'); world.chunks(tmp2, dd, Math.round(5 + 10 * s), 3 + 3 * s, 0.8, 'bone');
      phys.addInjury('burst', 'Skull burst open: massive destruction of the brain', 2);
    } else if (ex.type === 'exit' && E > 250) viscera.spawn(sw, 0.012, 'brain'); // a little brain in a handgun exit
  }
  // ---- dismemberment, only where it really happens. A shotgun charge at close range strikes as one mass and can take
  // off a hand or a foot, or leave a forearm or lower leg hanging by a strip of tissue; a slug does much the same to a
  // hand or wrist; a high-energy rifle round can mangle a hand. Nothing here cuts through a thigh or an upper arm
  // (except a contact shotgun blast, which can leave an arm hanging): handgun and rifle bullets do not amputate limbs.
  const AMP = { hand: { L: 'Left hand', at: 'at the wrist', rate: 260 }, farm: { L: 'Left forearm', at: 'through the forearm', rate: 320 }, foot: { L: 'Left foot', at: 'at the ankle', rate: 280 }, shin: { L: 'Left lower leg', at: 'through the lower leg', rate: 650 }, uarm: { L: 'Left arm', at: 'through the upper arm', rate: 900 } };
  function dismember(results, w, origin) {
    const groups = {};
    for (const r of results) {
      const en = r.marks.find((m) => m.type === 'entry'); if (!en || !en.seg) continue;
      const nm = en.seg.name, base = nm.replace(/X?[LR]$/, ''), side = nm.slice(-1);
      if (!AMP[base]) continue;
      const k = base + side, g = groups[k] || (groups[k] = { base, side, n: 0, E: 0, range: 9 });
      g.n++; g.E += r.Edep; g.range = Math.min(g.range, origin.distanceTo(tmp2.set(en.p.x, en.p.y, en.p.z)));
    }
    const shot = w.pellets > 1, slug = !shot && w.bullet.m > 0.02;
    for (const k in groups) {
      const g = groups[k], r = g.range; let cut = null;
      if (shot) {
        if (g.base === 'hand' && g.n >= 4 && r < 1.5) cut = r < 0.9 ? 'full' : 'partial';
        else if (g.base === 'foot' && g.n >= 5 && r < 1.2) cut = r < 0.6 ? 'full' : 'partial';
        else if (g.base === 'farm' && g.n >= 6 && r < 1.0) cut = r < 0.5 ? 'full' : 'partial';
        else if (g.base === 'shin' && g.n >= 7 && r < 0.6) cut = r < 0.3 ? 'full' : 'partial';
        else if (g.base === 'uarm' && g.n >= 8 && r < 0.3) cut = 'partial';
      } else if (slug) {
        if (g.base === 'hand' && r < 2) cut = r < 0.8 ? 'full' : 'partial';
        else if ((g.base === 'farm' && r < 0.8) || (g.base === 'foot' && r < 1)) cut = 'partial';
      } else if (g.base === 'hand' && g.E > 700) cut = 'partial'; // a rifle round through the hand
      if (!cut) continue;
      const seg = g.base === 'farm' ? 'farmX' + g.side : g.base === 'shin' ? 'shinX' + g.side : g.base === 'uarm' ? 'uarmX' + g.side : g.base + g.side;
      const partial = cut === 'partial', a = AMP[g.base], who = (g.side === 'L' ? 'Left' : 'Right') + a.L.slice(4);
      const info = body.amputate(seg, partial); if (!info) continue;
      rag.sever(seg, partial);
      // the stump bleeds from its arteries; the wound on it is where the body can press
      body.updateMatrices();
      const ps = info.parent, wp = info.at.clone().sub(ps.origin).applyMatrix4(ps.g.matrixWorld), wn = info.dir.clone().negate().transformDirection(ps.g.matrixWorld);
      const sw = body.addWound({ seg: ps, p: wp, r: 0.004, type: 'ooze' }, { x: -wn.x, y: -wn.y, z: -wn.z }, null); sw.rate = 0; sw.acc = 0; sw.buf = 0;
      phys.addBleed(who + ' stump', a.rate * (partial ? 0.7 : 1), sw, true);
      phys.addInjury('amp' + seg, who + (partial ? ' nearly severed ' + a.at + ', hanging by tissue' : ' traumatically amputated ' + a.at), 2);
      if (/^(hand|farm|uarm)/.test(g.base)) phys.armBroken[g.side] = true; else phys.legBroken[g.side] = true;
      phys.pain = Math.min(1, phys.pain + 0.5);
      world.chunks(wp, { x: wn.x, y: wn.y, z: wn.z }, 14, 2.5, 0.8, 'tissue'); world.chunks(wp, { x: wn.x, y: wn.y, z: wn.z }, 5, 2.5, 0.8, 'bone');
      world.burst(wp, { x: wn.x, y: wn.y, z: wn.z }, 30, 3, 0.55, 0.005, 12); phys.bv -= 12; phys.lostExt += 12;
    }
  }
  function processShot(res, w, d0, origin) {
    const surfs = [];
    let first = null;
    const head = res.order.some((p) => p.kind === 'cerebrum' || p.kind === 'cerebellum' || p.kind === 'brainstem'), bone = res.order.some((p) => p.kind === 'bone');
    const tr = res.track, t0 = tr[0], t1 = tr[tr.length - 1];
    const entries = res.marks.filter((m) => m.type === 'entry'), exits = res.marks.filter((m) => m.type === 'exit');
    for (const m of res.marks) {
      if (!m.seg) continue;
      const exit = m.type === 'exit', md = m.dir || d0;
      tmp2.set(m.p.x, m.p.y, m.p.z);
      const range = origin.distanceTo(tmp2);
      const sw = body.addWound(m, exit ? md : { x: -md.x, y: -md.y, z: -md.z }, exit ? null : range);
      sw.rate = 0; sw.acc = 0; sw.buf = 0; surfs.push(sw); if (!first) first = sw;
      if (exit) {
        const e = 0.5 * w.bullet.m * m.v * m.v, last = m === exits[exits.length - 1] && t1;
        // the exit: skin tears outward. Where the temporary cavity reaches the surface it blows a crater.
        let cr = last ? Math.min(0.075, t1.rpc * 1.5 + Math.max(0, t1.rtc - 0.02) * 0.6) : m.r * 1.3;
        if (head && last) cr = Math.min(0.085, cr * 1.5 + 0.006); // the skull contains the pressure until it bursts
        if (cr > 0.016) { body.crater(sw, cr, cr * 0.5); eviscerate(res, sw, cr); }
        // forward spatter: fine, fast, proportional to what the bullet still carries
        const ml = Math.min(45, 1.5 + e / 40 + (last ? t1.rtc * 250 : 0));
        world.burst(tmp2, md, Math.round(Math.min(90, 10 + e / 20)), 2.5 + Math.min(8, m.v / 80), 0.55, 0.004 + Math.min(0.006, e / 2e5), ml);
        phys.bv -= ml; phys.lostExt += ml;
        if (last) {
          const nT = Math.round(Math.min(26, Math.max(0, (cr * 100 - 1.6) * 5)));
          if (nT) world.chunks(tmp2, md, nT, 2 + m.v / 120, 0.7, head ? 'brain' : 'tissue');
          if (bone && nT) world.chunks(tmp2, md, Math.ceil(nT / 3), 2 + m.v / 150, 0.8, 'bone');
        }
      } else if (m.type === 'entry') {
        // back spatter is small; a high-energy impact at the surface also bursts the entry
        const first0 = m === entries[0] && t0;
        if (first0 && t0.rtc > 0.045) { const cr = Math.min(0.05, t0.rtc * 0.45); body.crater(sw, cr, t0.rtc * 0.2); eviscerate(res, sw, cr); }
        // back-spatter from an entry is a faint mist, visible mainly at close range or from high-energy rounds
        const bs = range < 1 || res.Edep > 1200 ? 2 + Math.round(Math.random() * 3) : Math.random() < 0.4 ? 1 : 0;
        if (bs) world.burst(tmp2, { x: -md.x, y: -md.y + 0.2, z: -md.z }, bs, 1.4, 1.1, 0.002, 0.1);
        if (range < 0.5) world.chunks(tmp2, { x: -md.x, y: -md.y, z: -md.z }, 5, 1.2, 1.4, 'dust'); // powder smoke
      }
    }
    if (first) {
      const pts = [res.marks[0].p, ...res.track]; if (res.stopped) pts.push(res.endPoint);
      body.addTrack(first, pts);
    }
    res.notes = res.hitBody ? phys.applyShot(res, surfs) : [];
    res.where = res.marks[0] && res.marks[0].seg ? body.locate(res.marks[0].seg, res.marks[0].p) : null;
    res.range = entries[0] ? origin.distanceTo(tmp2.set(entries[0].p.x, entries[0].p.y, entries[0].p.z)) : null;
    if (res.hitBody) {
      npc.onHit(res, res.marks[0], d0);
      // momentum the projectile gave up inside the body: m * (v_in - v_out). Small next to a 77 kg body.
      const en = entries[0];
      if (en && en.seg) { const dp = w.bullet.m * (w.bullet.v - res.vExit); npc.impulse(en.seg, en.p, { x: d0.x * dp, y: d0.y * dp, z: d0.z * dp }); }
    }
    if (!res.stopped && !res.noPen) {
      const ex = exits[exits.length - 1];
      const hit = world.rayRoom(ex ? ex.p : origin, ex ? ex.dir : d0), en = res.hitBody ? res.Eexit : res.E0;
      if (hit) strike(hit, ex ? ex.dir : d0, en, w, 0);
    }
  }

  // what is left of a bullet meets the tile. At a grazing angle (under ~15 degrees to the surface) a bullet
  // usually ricochets instead of digging in: it leaves flatter still, deformed, with a fraction of its energy.
  const rd = new V3();
  function strike(hit, dir, en, w, bounce) {
    const sinA = Math.abs(dir.x * hit.n.x + dir.y * hit.n.y + dir.z * hit.n.z), graze = Math.asin(Math.min(1, sinA));
    const pRic = graze < 0.26 ? 1 - graze / 0.26 : 0;
    if (bounce < 2 && en > 40 && Math.random() < pRic) {
      world.addHole(hit.p, hit.n, Math.max(0.004, w.bullet.d * 0.6), en * 0.3); // a shallow gouge, not a hole
      world.chunks(hit.p, hit.n, 8, 3.5, 1.4, 'spark'); world.chunks(hit.p, hit.n, 5, 1.2, 1.2, 'dust');
      rd.copy(dir).addScaledVector(hit.n, -2 * (dir.x * hit.n.x + dir.y * hit.n.y + dir.z * hit.n.z)); // mirror
      rd.addScaledVector(hit.n, -0.5 * rd.dot(hit.n)).normalize(); // leaves flatter than it arrived
      rd.x += (Math.random() - 0.5) * 0.15; rd.y += (Math.random() - 0.5) * 0.08; rd.z += (Math.random() - 0.5) * 0.15; rd.normalize();
      audio.wall(en * 0.4); audio.ricochet();
      const o = hit.p.clone().addScaledVector(hit.n, 0.01), next = world.rayRoom(o, rd);
      if (next) projectiles.spawn([o, next.p.clone()], [Math.sqrt(2 * en * 0.45 / w.bullet.m)], [false], w.bullet.d, false, simClock);
      if (next) strike(next, rd.clone(), en * (0.3 + Math.random() * 0.3), w, bounce + 1);
      return;
    }
    world.addHole(hit.p, hit.n, Math.max(0.006, w.bullet.d * 0.9), en); audio.wall(en);
    world.chunks(hit.p, hit.n, Math.round(Math.min(16, 4 + en / 150)), 1.6, 1.3, 'dust'); world.chunks(hit.p, hit.n, Math.round(Math.min(8, 1 + en / 400)), 2.4, 1.2, 'chip');
  }

  function buildReport(results, w) {
    const hits = results.filter((r) => r.hitBody), lines = [];
    if (!hits.length) return { tag: 'miss', lines: [{ html: 'No contact with the subject.', cls: 'dim' }] };
    const r = hits[0], multi = results.length > 1;
    if (multi) lines.push({ html: hits.length + ' of ' + results.length + ' pellets struck the subject' });
    const rg = r.range == null ? '' : r.range < 0.16 ? ' · near-contact (soot, powder burn)' : r.range < 0.75 ? ' · close range (powder stippling)' : '';
    lines.push({ html: 'Entry: <b>' + r.where + '</b>' + rg, cls: 'path' });
    const names = [];
    for (const h of hits) for (const n of h.notes) { const s = n.replace(/ \(posterior arch\)/, ''); if (!names.includes(s)) names.push(s); }
    lines.push({ html: names.length ? 'Track: ' + names.map((n) => '<b>' + n + '</b>').join(' → ') : 'Track: skin and muscle only', cls: 'path' });
    if (!multi) {
      const beh = [r.expanded && 'expanded', r.yawed && 'tumbled', r.fragmented && 'fragmented'].filter(Boolean).join(', ');
      lines.push({ html: 'Penetration ' + (r.depth * 100).toFixed(1) + ' cm' + (beh ? ' · bullet ' + beh : '') });
      lines.push({ html: r.noPen ? 'Failed to penetrate skin' : r.exited ? 'Exited at ' + Math.round(r.vExit) + ' m/s (' + Math.round(r.Eexit) + ' J left)' : r.underSkin ? 'Retained under the far-side skin' : 'Bullet retained in the body' });
      lines.push({ html: 'Energy deposited ' + Math.round(r.Edep) + ' of ' + Math.round(r.E0) + ' J', cls: 'dim' });
    } else {
      const dep = hits.reduce((a, h) => a + h.Edep, 0), ex = hits.filter((h) => h.exited).length;
      lines.push({ html: 'Energy deposited ' + Math.round(dep) + ' J · ' + ex + ' exited, ' + (hits.length - ex) + ' retained', cls: 'dim' });
    }
    return { tag: w.name, lines };
  }

  // ---------- blood leaving the body. It exits each wound as drops that carry real volume; where they land
  // the floor liquid takes over. A wound lying against the floor seeps straight into it.
  const wp = new V3(), wn = new V3(), vel = new V3(), dp = new V3();
  function bleed(dt, visual) {
    const ws = body.wounds; if (!ws.length) return;
    for (const s of ws) s.rate = 0;
    for (const w of phys.wounds) {
      const ext = (w.now || 0) * w.ext; if (ext <= 0) continue;
      if (w.surf) w.surf.rate += ext; else for (const s of ws) s.rate += ext / ws.length;
    }
    const beat = Math.sin(phys.t * (phys.hr / 60) * Math.PI * 2) > 0.5 ? 1 : 0.15;
    for (const s of ws) {
      if (s.rate <= 0) continue;
      const ml = (s.rate * dt) / 60; s.ext += ml; s.buf += ml; body.growStain(s, s.ext);
      body.woundWorld(s, wp);
      if (wp.y < 0.09 || !visual) { world.addBlood(wp.x, wp.z, s.buf); s.buf = 0; continue; }
      // slow bleeding runs down the skin first and only drips from where the trail leaves the body
      const jet = s.rate > 140;
      if (!jet && body.holdDrops && body.holdDrops(s)) continue;
      const drip = !jet && body.dripPoint && body.dripPoint(s, dp);
      if (drip && dp.y < 0.09) { world.addBlood(dp.x, dp.z, s.buf); s.buf = 0; continue; }
      // drip count follows flow, capped; each drop carries its share of the buffered volume
      s.acc += dt * Math.min(40, 0.5 + s.rate / 10);
      const n = Math.min(6, Math.floor(s.acc)); if (!n) continue;
      s.acc -= n; body.woundNormal(s, wn);
      const each = s.buf / n; s.buf = 0;
      for (let i = 0; i < n; i++) {
        // arterial wounds spurt with each heartbeat, scaled by blood pressure; venous and tissue bleeding just runs off
        const art = s.rate > 140 ? (0.5 + 1.9 * beat) * (phys.map / 93) : 0.12;
        if (drip) vel.set((Math.random() - 0.5) * 0.04, -0.05, (Math.random() - 0.5) * 0.04);
        else vel.set(wn.x * art + (Math.random() - 0.5) * 0.25, wn.y * art + 0.1 * art, wn.z * art + (Math.random() - 0.5) * 0.25);
        world.drop(drip ? dp : wp, vel, art > 0.8 && Math.random() < 0.3 ? 0.006 : 0, each);
      }
    }
  }
  // body parts sliding across the floor push the blood around
  function smearBody() {
    for (const k in rag.parts) {
      const b = rag.parts[k].b; if (b.position.y > 0.16) continue;
      const sp = Math.hypot(b.velocity.x, b.velocity.z); if (sp < 0.06) continue;
      if (world.depthAt(b.position.x, b.position.z) > 0.05) world.smear(b.position.x, b.position.z, b.velocity.x, b.velocity.z, k === 'thorax' || k === 'pelvis' || k === 'abdomen' ? 0.13 : 0.06);
    }
  }

  // ---------- player movement
  const walkSpeed = 2.2, stepLength = 0.91, subjectClearance = 0.75;
  const minX = ROOM.x0 + 0.4, maxX = ROOM.x1 - 0.4;
  const minZ = ROOM.z0 + 0.4, maxZ = ROOM.z1 - 0.4;
  const { clamp, lerp } = THREE.MathUtils;
  const velocity = new THREE.Vector2(), targetVelocity = new THREE.Vector2();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stride = 0.5, eyeOffset = 0;

  function movePlayer(dt) {
    const keys = state.keys;
    state.yaw += ((keys.arrowleft ? 1 : 0) - (keys.arrowright ? 1 : 0)) * dt * 1.6;
    state.pitch += ((keys.arrowup ? 1 : 0) - (keys.arrowdown ? 1 : 0)) * dt * 1.2;
    state.pitch = clamp(state.pitch, -1.3, 1.3);
    if (!state.started || dt <= 0) return;

    const mx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + state.stick[0];
    const mz = (keys.s ? 1 : 0) - (keys.w ? 1 : 0) + state.stick[1];
    const c = Math.cos(state.yaw), s = Math.sin(state.yaw);
    targetVelocity.set(mx * c + mz * s, -mx * s + mz * c).clampLength(0, 1).multiplyScalar(walkSpeed);
    velocity.lerp(targetVelocity, 1 - Math.exp(-dt * (mx || mz ? 13 : 23)));
    if (velocity.lengthSq() < 0.0001) velocity.set(0, 0);

    const previousX = state.pos.x, previousZ = state.pos.z;
    let x = clamp(previousX + velocity.x * dt, minX, maxX);
    let z = clamp(previousZ + velocity.y * dt, minZ, maxZ);
    if (x !== previousX || z !== previousZ) {
      const dx = x - npc.pos.x, dz = z - npc.pos.z, separation = Math.hypot(dx, dz);
      if (separation < subjectClearance) {
        if (separation > 0.0001) {
          x = clamp(npc.pos.x + dx / separation * subjectClearance, minX, maxX);
          z = clamp(npc.pos.z + dz / separation * subjectClearance, minZ, maxZ);
        } else {
          x = previousX;
          z = previousZ;
        }
      }
      state.pos.x = x;
      state.pos.z = z;
    }

    const traveled = Math.hypot(x - previousX, z - previousZ);
    const pace = Math.min(1, traveled / (walkSpeed * dt));
    stride += traveled / stepLength;
    if (stride >= 1) {
      stride %= 1;
      audio.playerStep(pace);
    }
    const targetEyeOffset = -Math.cos(stride * Math.PI * 2) * 0.014 * pace;
    eyeOffset = reducedMotion.matches ? 0 : lerp(eyeOffset, targetEyeOffset, 1 - Math.exp(-dt * 20));
  }

  // ---------- loop
  let last = performance.now(), uiT = 0;
  const camDir = new V3(), q = new THREE.Quaternion();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!G.debug.manual) step(dt);
  }
  // ======================= AI 1v1 =======================
  // Two armed people in the room, random cover each round, first to three. Each fighter is a full subject (same
  // wounds, bleeding, physiology and ragdoll as the test subject) driven by a small mind: see the enemy or not, how hurt
  // each side is, cover nearby. It aims with the arm, fires with real ballistics into the other body, keeps fighting
  // while it physically can (from the floor too, holding a wound with the free hand), goes to cover when hurt,
  // pushes when winning and finishes a downed enemy.
  function Duel() {
    const D = { on: false, fighters: [], score: [0, 0], round: 0, phase: 'idle', t: 0, props: [], cam: 1, clock: 0 };
    const NAMES = ['RED', 'BLUE'], SHORTS = [0x7a2020, 0x203c7a];
    const spawn = [new V3(0, 0, -1.6), new V3(0, 0, 6.1)];
    const mats = { crate: new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 0.85 }), concrete: new THREE.MeshStandardMaterial({ color: 0x8b8a84, roughness: 0.95 }), metal: new THREE.MeshStandardMaterial({ color: 0x4b545a, roughness: 0.5, metalness: 0.6 }) };
    const TYPES = [{ k: 'crate', s: [0.9, 0.9, 0.9], m: 'crate', low: true }, { k: 'barrier', s: [1.7, 0.85, 0.4], m: 'concrete', low: true }, { k: 'pillar', s: [0.55, 2.6, 0.55], m: 'concrete', low: false }, { k: 'locker', s: [0.9, 1.9, 0.5], m: 'metal', low: false }, { k: 'stack', s: [1.0, 1.4, 1.0], m: 'crate', low: false }];
    function clearProps() { for (const p of D.props) { scene.remove(p.mesh); for (const S of D.fighters) S.rag.world.remove(p.bodies[S.idx]); } D.props.length = 0; }
    function addProp(T, x, z, rot) {
      const sx = rot ? T.s[2] : T.s[0], sz = rot ? T.s[0] : T.s[2], sy = T.s[1];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mats[T.m]); mesh.position.set(x, sy / 2, z); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
      if (T.m === 'crate') { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x2c2014 })); mesh.add(e); }
      const box = new THREE.Box3(new V3(x - sx / 2, 0, z - sz / 2), new V3(x + sx / 2, sy, z + sz / 2));
      const p = { T, mesh, box, low: T.low, h: sy, bodies: [] };
      for (const S of D.fighters) { const b = new CANNON.Body({ mass: 0 }); b.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2))); b.position.set(x, sy / 2, z); S.rag.world.addBody(b); p.bodies[S.idx] = b; }
      D.props.push(p);
    }
    function layout() {
      clearProps(); const n = 4 + Math.floor(Math.random() * 3);
      for (let tries = 0; D.props.length < n && tries < 200; tries++) {
        const T = TYPES[Math.floor(Math.random() * TYPES.length)], x = -3 + Math.random() * 6, z = -0.4 + Math.random() * 5.3, rot = Math.random() < 0.5;
        const r = Math.max(T.s[0], T.s[2]) / 2 + 0.9;
        if (D.props.some((p) => Math.hypot(p.mesh.position.x - x, p.mesh.position.z - z) < r + 0.6)) continue;
        if (spawn.some((s) => Math.hypot(s.x - x, s.z - z) < r + 0.5)) continue;
        addProp(T, x, z, rot);
      }
    }
    // the nearest point along a ray where it enters a prop (Infinity if none)
    const rayProps = (o, d, maxT) => { let best = maxT == null ? Infinity : maxT, hit = null; const r = new THREE.Ray(o, d), pt = new V3(); for (const p of D.props) if (r.intersectBox(p.box, pt)) { const t = pt.distanceTo(o); if (t < best) { best = t; hit = { p, at: pt.clone() }; } } return hit ? { t: best, ...hit } : null; };
    const los = (a, b) => { const d = b.clone().sub(a), L = d.length(); d.divideScalar(L); return !rayProps(a, d, L - 0.05); };
    const partPos = (S, n) => { const b = S.rag.parts[n].b.position; return new V3(b.x, b.y, b.z); };
    // out of the fight: dead, unconscious, down and unable to use a gun, or down so long he is not getting up again
    const out = (S) => S.phys.dead || S.phys.brainDestroyed || !S.phys.conscious || (S.ai && S.npc.posture !== 'stand' && ((S.ai.downT > 2.5 && !S.ai.canFight) || S.ai.downT > 16));
    const hurtOf = (S) => S.phys.pain * 0.6 + S.phys.frac() * 2.5 + (S.npc.posture !== 'stand' ? 0.5 : 0) + (S.phys.armBroken.R && S.phys.armBroken.L ? 1 : 0);
    // a gun in each fighter's hand (a copy of the first-person models)
    function giveGun(S, wi) {
      if (S.gunModel) scene.remove(S.gunModel);
      const w = G.WEAPONS[wi], src = gun.models[w.model] || gun.models.glock, m = src.clone(true); m.visible = true; m.traverse((o) => { o.visible = true; o.castShadow = true; }); scene.add(m);
      S.gunModel = m; S.ai.wi = wi; S.ai.flash = new THREE.PointLight(0xffc878, 0, 7, 2); scene.add(S.ai.flash);
    }
    function setupFighter(S, i, wi) {
      use(S); S.idx = i;
      S.body.clearWounds(); S.rag.stop(); S.rag.clear(); S.viscera.clear(); S.headFx.rk = S.headFx.rkMax = 0; S.headFx.mouth = false; S.handBlood.L = S.handBlood.R = 0;
      if (S.body.setLook) S.body.setLook(Math.floor(Math.random() * S.body.looks), Math.floor(Math.random() * 3), [0xffffff, 0x8a6a50, 0x5a4030, 0x404040][Math.floor(Math.random() * 4)]);
      if (S.body.setShorts) S.body.setShorts(SHORTS[i]);
      S.body.root.visible = true; S.body.root.position.copy(spawn[i]); S.body.root.rotation.set(0, i ? Math.PI : 0, 0);
      S.phys = G.Physiology(G.ANATOMY.bloodVolume);
      S.ai = { state: 'engage', t: 0, aimT: 0, fireT: 0.8 + Math.random() * 0.6, strafeT: 2 + Math.random() * 3, strafe: null, downT: 0, canFight: true, lastSeen: 0, goal: null, peekT: 0, crouch: 0, lean: 0, clock: 0, seenT: 0, react: 0.5, burst: 0, reloadT: 0, ammo: WMAG[wi] };
      S.npc = G.NPC(S.body, S.phys, S.rag, { threat: () => partPos(D.fighters[1 - i], 'thorax'), event: npcEvent, fighter: true, ai: (N) => brain(S, N) });
      giveGun(S, wi);
    }
    // ---- the mind
    function brain(S, N) {
      if (!S.ai) return null;
      const E = D.fighters[1 - S.idx], ai = S.ai, P = S.phys, dt = Math.max(0, N.clock - (ai.clock || N.clock)); ai.clock = N.clock;
      const me = partPos(S, 'thorax'), ep = partPos(E, 'thorax'), toE = ep.clone().sub(me); toE.y = 0; const dist = toE.length(); toE.normalize();
      const face = Math.atan2(toE.x, toE.z);
      if (D.phase !== 'fight') return { face };
      const eye = partPos(S, 'head'), seeTarget = partPos(E, E.npc.posture === 'stand' ? 'thorax' : 'abdomen');
      const vis = los(eye, seeTarget) || los(eye, partPos(E, 'head'));
      if (vis) ai.lastSeen = 0; else ai.lastSeen += dt;
      const myHurt = hurtOf(S), enHurt = hurtOf(E) + (out(E) ? 2 : 0), winning = enHurt - myHurt > 0.5, losing = myHurt - enHurt > 0.6;
      ai.downT = N.posture === 'stand' ? 0 : ai.downT + dt;
      // which hand holds the gun: the right, unless it is broken or gone
      const gh = !P.armBroken.R && !S.rag.parts.handR.severed ? 'R' : !P.armBroken.L && !S.rag.parts.handL.severed ? 'L' : null;
      ai.canFight = !!gh && P.conscious && !P.armsPara;
      const sh = new V3(); S.body.segs['uarm' + (gh || 'R')].g.getWorldPosition(sh);
      // where to aim: centre of mass; the head of an enemy who is down and close
      ai.target = E.npc.posture !== 'stand' && dist < 2.2 ? partPos(E, 'head') : partPos(E, E.npc.posture === 'stand' ? 'thorax' : 'abdomen');
      const aimDir = ai.target.clone().sub(sh).normalize(), aim = gh && vis ? sh.clone().addScaledVector(aimDir, 0.6) : null;
      const intent = { face, aim, gunHand: gh || 'R', crouch: 0, lean: 0, move: null, run: false };
      ai.t += dt;
      if (N.posture === 'stand') {
        // decide what to do
        if (out(E) && !E.phys.dead && dist > 1.6) ai.state = 'finish';
        else if (winning && enHurt > 1) ai.state = 'push';
        else if ((myHurt > 0.45 || losing) && D.props.length && ai.state !== 'cover' && ai.t > 1.5) { ai.state = 'cover'; ai.goal = coverSpot(S, ep); ai.t = 0; }
        else if (ai.lastSeen > 1.8 && ai.state !== 'flank' && ai.state !== 'cover') { ai.state = 'flank'; ai.goal = flankSpot(S, E); ai.t = 0; }
        else if (vis && ai.state === 'flank') ai.state = 'engage';
        const goTo = (g, run) => { if (!g) return false; const d = g.clone().sub(me); d.y = 0; if (d.length() < 0.35) return true; d.normalize(); const st = steer(S, me, d, E); intent.move = { x: st.x, z: st.z }; intent.run = run && !st.tight; if (!vis || run) intent.face = Math.atan2(st.x, st.z); return false; };
        if (ai.state === 'engage') {
          ai.strafeT -= dt;
          if (ai.strafeT < 0) { ai.strafe = ai.strafe ? null : (Math.random() < 0.5 ? 1 : -1); ai.strafeT = ai.strafe ? 0.8 + Math.random() * 1.2 : 2 + Math.random() * 3; }
          // can see him but the muzzle line is blocked (low cover, a pillar edge): step out to get a shot, not stand there
          if ((ai.blockT || 0) > 0.6) { if (!ai.strafe || ai.blockT > 1.8) { ai.strafe = ai.blockT > 1.8 ? -(ai.strafe || 1) : (Math.random() < 0.5 ? 1 : -1); ai.blockT = 0.61; } ai.strafeT = Math.max(ai.strafeT, 0.6); }
          if (ai.strafe) { const st = steer(S, me, new V3(-toE.z * ai.strafe, 0, toE.x * ai.strafe), E); intent.move = { x: st.x, z: st.z }; }
        } else if (ai.state === 'cover') {
          const there = goTo(ai.goal, true);
          if (there) {
            // behind cover: crouch behind low cover, lean out from tall cover, and come up / out to shoot in bursts
            ai.peekT -= dt; if (ai.peekT < 0) ai.peekT = ai.peeking ? 1.2 + Math.random() * 1.5 : 1.5 + Math.random() * 2;
            if (ai.peekT < 0.05) ai.peeking = !ai.peeking;
            const low = ai.goal.low;
            if (!ai.peeking) { intent.crouch = low ? 1 : 0; intent.aim = null; } else { intent.crouch = low && (ai.blockT || 0) < 0.5 ? 0.2 : 0; intent.lean = low ? 0 : ai.goal.side; if (!low && (ai.blockT || 0) > 1.2) ai.goal.side = -ai.goal.side; } // still no line: rise fully / try the other edge
            if (myHurt < 0.3 && ai.t > 8) ai.state = 'engage';
          }
        } else if (ai.state === 'flank') { if (goTo(ai.goal, false) || ai.t > 6) { ai.state = 'engage'; ai.t = 0; } }
        else if (ai.state === 'push') { if (dist > 2.2) goTo(ep, !vis); } // rush in, but walk with the gun up once he can be seen
        else if (ai.state === 'finish') { if (dist > 1.4) goTo(ep, true); }
      }
      // shooting the way people do: notice the enemy (reaction time), bring the gun on, fire a pair or a short burst
      // with the gun steady and the muzzle clear, pause to see what happened, reload when the magazine runs dry
      ai.fireT -= dt;
      if (vis) { if (ai.seenT === 0) ai.react = 0.3 + Math.random() * 0.35 + 0.35 * P.pain + (S.npc.posture !== 'stand' ? 0.3 : 0); ai.seenT += dt; ai.lostT = 0; }
      else { ai.lostT = (ai.lostT || 0) + dt; if (ai.lostT > 0.4) ai.seenT = 0; }
      if (ai.reloadT > 0) { ai.reloadT -= dt; intent.aim = null; if (ai.reloadT <= 0) ai.ammo = WMAG[ai.wi]; }
      else if (ai.ammo <= 0) { const w = G.WEAPONS[ai.wi]; ai.reloadT = w.cls === 'shotgun' ? 0.5 * WMAG[ai.wi] * 0.6 : w.model === 'bolt' ? 2.4 : w.model === 'revolver' ? 3.2 : 2.2; ai.burst = 0; intent.aim = null; if (vis && D.props.length && ai.state === 'engage') { ai.state = 'cover'; ai.goal = coverSpot(S, ep); ai.t = 0; } }
      if (intent.aim && N.aiming) ai.aimT += dt; else ai.aimT = 0;
      // steady: the hand is where the aim wants it and not swinging; lined up: the muzzle points at the target
      const hb = S.rag.parts['hand' + (gh || 'R')].b, pv = S.rag.parts.pelvis.b.velocity, handErr = intent.aim ? hb.position.distanceTo(new CANNON.Vec3(intent.aim.x, intent.aim.y, intent.aim.z)) : 1, steady = intent.aim && (handErr < 0.09 || (ai.aimT > 1 && handErr < 0.22)) && Math.hypot(hb.velocity.x - pv.x, hb.velocity.y - pv.y, hb.velocity.z - pv.z) < 0.9; // steady relative to the body: he can fire on the move
      let clear = false;
      if (S.gunModel && intent.aim) {
        S.gunModel.updateMatrixWorld(); const mz = new V3(0, S.gunModel.userData.fy || 0.03, S.gunModel.userData.muzzle || -0.2).applyMatrix4(S.gunModel.matrixWorld); clear = los(mz, ai.target);
        // the body is behind cover but the head shows: take the head
        if (!clear) { const hd = partPos(E, 'head'); if (los(mz, hd)) { ai.target = hd; clear = true; } }
      }
      if (vis && intent.aim && !clear && ai.reloadT <= 0) ai.blockT = (ai.blockT || 0) + dt; else ai.blockT = 0;
      const ready = !!intent.aim && ai.canFight && ai.seenT > ai.react && ai.aimT > 0.25 && steady && clear && ai.fireT <= 0 && ai.ammo > 0 && !(out(E) && E.phys.dead);
      ai.handErr = handErr;
      if (ready && ai.burst <= 0) { const w = G.WEAPONS[ai.wi]; ai.burst = w.cls === 'shotgun' || w.model === 'bolt' ? 1 : w.cls === 'pistol' ? (Math.random() < 0.65 ? 2 : Math.random() < 0.5 ? 1 : 3) : 2 + Math.floor(Math.random() * 3); }
      ai.wantFire = ready && ai.burst > 0;
      ai.intent = intent;
      return intent;
    }
    // find a way round: props (and the other man) push the heading away when close, and turn it along their side
    // toward the goal, so a fighter runs round a crate instead of into it
    function steer(S, me, d, E) {
      const out = d.clone(); let tight = false;
      const avoid = (cx, cz, dist, keep) => {
        if (dist > keep) return; const ax = me.x - cx, az = me.z - cz, al = Math.hypot(ax, az) || 1, nx = ax / al, nz = az / al, w = (keep - dist) / keep;
        const into = -(d.x * nx + d.z * nz); if (into < -0.2 && dist > keep * 0.5) return; // already heading away
        const tx = -nz, tz = nx, sgn = tx * d.x + tz * d.z >= 0 ? 1 : -1; // slide along the side nearer the goal
        out.x += nx * w * 1.6 + tx * sgn * w * 1.4; out.z += nz * w * 1.6 + tz * sgn * w * 1.4; if (dist < keep * 0.6) tight = true;
      };
      for (const p of D.props) { const b = p.box, cx = Math.max(b.min.x, Math.min(me.x, b.max.x)), cz = Math.max(b.min.z, Math.min(me.z, b.max.z)); avoid(cx, cz, Math.hypot(me.x - cx, me.z - cz), 0.75); }
      const ep = partPos(E, 'pelvis'); avoid(ep.x, ep.z, Math.hypot(me.x - ep.x, me.z - ep.z) - 0.2, 0.7);
      // and the walls
      if (me.x < ROOM.x0 + 0.6) out.x += 1.2; if (me.x > ROOM.x1 - 0.6) out.x -= 1.2; if (me.z < ROOM.z0 + 0.6) out.z += 1.2; if (me.z > ROOM.z1 - 0.6) out.z -= 1.2;
      out.y = 0; const l = Math.hypot(out.x, out.z) || 1; out.x /= l; out.z /= l; out.tight = tight; return out;
    }
    function coverSpot(S, ep) {
      let best = null, bd = 1e9; const me = partPos(S, 'thorax');
      for (const p of D.props) {
        const c = p.mesh.position, away = new V3(c.x - ep.x, 0, c.z - ep.z).normalize(), r = Math.max(p.box.max.x - p.box.min.x, p.box.max.z - p.box.min.z) / 2 + 0.55;
        const spot = new V3(c.x + away.x * r, 0, c.z + away.z * r), d = spot.distanceTo(new V3(me.x, 0, me.z));
        if (d < bd && spot.x > ROOM.x0 + 0.5 && spot.x < ROOM.x1 - 0.5 && spot.z > ROOM.z0 + 0.5 && spot.z < ROOM.z1 - 0.5) { bd = d; best = spot; best.low = p.low; best.side = Math.random() < 0.5 ? -1 : 1; }
      }
      return best;
    }
    function flankSpot(S, E) {
      const ep = partPos(E, 'head'), me = partPos(S, 'thorax'); let best = null, bd = 1e9;
      for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283, r = 2.5 + Math.random() * 2.5, c = new V3(ep.x + Math.cos(a) * r, 1.5, ep.z + Math.sin(a) * r);
        if (c.x < ROOM.x0 + 0.6 || c.x > ROOM.x1 - 0.6 || c.z < ROOM.z0 + 0.6 || c.z > ROOM.z1 - 0.6 || !los(c, ep)) continue;
        const d = c.distanceTo(me); if (d < bd) { bd = d; best = c; } }
      return best;
    }
    // ---- firing: the round leaves the fighter's muzzle and is traced through the other body
    const mzl = new V3(), dd = new V3();
    function aiFire(S) {
      const E = D.fighters[1 - S.idx], ai = S.ai, w = G.WEAPONS[ai.wi], P = S.phys, m = S.gunModel;
      ai.ammo--; ai.burst--; ai.shots = (ai.shots || 0) + 1;
      const gap = Math.max(60 / w.rpm, w.cls === 'pistol' ? 0.24 : 0.14) * (1 + Math.random() * 0.4) + (P.pain > 0.5 ? 0.1 : 0);
      ai.fireT = ai.burst > 0 ? gap : gap + 0.55 + Math.random() * 0.9; // between bursts: a look at what happened
      m.updateMatrixWorld(); mzl.set(0, m.userData.fy || 0.03, m.userData.muzzle || -0.2).applyMatrix4(m.matrixWorld);
      // aim error: the weapon, the person (pain, blood loss, which hand, lying down, moving), and the range
      const sig = 0.008 + w.spread * 0.5 + 0.03 * P.pain + 0.05 * P.frac() + (S.npc.gunHand === 'L' ? 0.015 : 0) + (S.npc.posture !== 'stand' ? 0.025 : 0) + (ai.intent && ai.intent.move ? 0.02 : 0) + 0.25 * Math.max(0, (ai.handErr || 0) - 0.06); // the gun is not quite where he wants it
      audio.shot(w); world.smoke(mzl, dd.copy(ai.target).sub(mzl).normalize(), Math.round(2 + w.recoil * 2), 0.8);
      ai.flash.position.copy(mzl); ai.flash.intensity = 3 + w.recoil * 1.5; ai.flashN = 1;
      S.rag.impulse(S.body.segs['hand' + S.npc.gunHand], partPos(S, 'hand' + S.npc.gunHand), { x: -dd.x * w.recoil * 0.6, y: 0.4 * w.recoil, z: -dd.z * w.recoil * 0.6 }); // recoil kicks the hand
      const n = w.pellets || 1, results = [], origin = mzl.clone();
      for (let i = 0; i < n; i++) {
        const d = ai.target.clone().sub(origin).normalize(), s = sig + (n > 1 ? w.spread : 0);
        d.x += gauss() * s; d.y += gauss() * s; d.z += gauss() * s; d.normalize();
        E.body.updateMatrices(); const res = G.simulate(w.bullet, origin, d, E.sampler); res.d0 = d;
        const entry = res.marks.find((mk) => mk.type === 'entry'), tBody = res.hitBody && entry ? origin.distanceTo(tmp2.set(entry.p.x, entry.p.y, entry.p.z)) : Infinity;
        const pr = rayProps(origin, d, tBody); if (pr) { res.blocked = pr; res.hitBody = false; }
        results.push(res);
        // the visible round
        const pts = [origin.clone()], v = [], hide = []; let sp = w.bullet.v, inside = false;
        if (res.blocked) { pts.push(res.blocked.at.clone()); v.push(sp); hide.push(false); }
        else {
          for (const mk of res.marks) { if (mk.type !== 'entry' && mk.type !== 'exit') continue; pts.push(new V3(mk.p.x, mk.p.y, mk.p.z)); v.push(sp); hide.push(inside); if (mk.type === 'entry') inside = true; else { inside = false; sp = mk.v || sp * 0.6; } }
          if (!res.hitBody) { const h = world.rayRoom(origin, d); if (h) { pts.push(h.p.clone()); v.push(sp); hide.push(false); } }
        }
        projectiles.spawn(pts, v, hide, n > 1 ? 0.0084 : w.bullet.d, n > 1, simClock);
      }
      const first = results.find((r) => r.hitBody), firstBlock = results.find((r) => r.blocked), dist = first ? origin.distanceTo(tmp2.set(first.marks[0].p.x, first.marks[0].p.y, first.marks[0].p.z)) : firstBlock ? firstBlock.blocked.t : 5;
      pending.push({ t: simClock + dist / w.bullet.v, run: () => {
        const back = current; use(E);
        for (const r of results) {
          if (r.blocked) { const b = r.blocked; const nrm = new V3(); const c = b.p.mesh.position, hb = b.p.box, eps = 0.01; nrm.set(Math.abs(b.at.x - hb.min.x) < eps ? -1 : Math.abs(b.at.x - hb.max.x) < eps ? 1 : 0, Math.abs(b.at.y - hb.max.y) < eps ? 1 : 0, Math.abs(b.at.z - hb.min.z) < eps ? -1 : Math.abs(b.at.z - hb.max.z) < eps ? 1 : 0); if (nrm.lengthSq() === 0) nrm.set(0, 1, 0); void c;
            world.addHole(b.at, nrm, Math.max(0.006, w.bullet.d * 0.9), 300); world.chunks(b.at, nrm, 6, 1.6, 1.2, b.p.T.m === 'crate' ? 'chip' : 'dust'); audio.wall(300); continue; }
          if (r.hitBody) processShot(r, w, r.d0, origin); else { const h = world.rayRoom(origin, r.d0); if (h) strike(h, r.d0, r.E0 || 400, w, 0); }
        }
        const hits = results.filter((r) => r.hitBody);
        if (hits.length) { dismember(results.filter((r) => !r.blocked), w, origin); headTrauma(hits); audio.impact(hits.some((r) => r.order.some((p) => p.kind === 'bone')), hits.reduce((a, r) => a + r.Edep, 0)); }
        use(back);
      } });
    }
    // ---- rounds
    function startRound() {
      D.round++; D.phase = 'ready'; D.t = 0; world.clear(); projectiles.clear(); pending.length = 0;
      const wi = DUEL_W[Math.floor(Math.random() * DUEL_W.length)];
      for (let i = 0; i < 2; i++) setupFighter(D.fighters[i], i, wi);
      layout(); D.weaponName = G.WEAPONS[wi].name; use(D.fighters[0]);
    }
    const DUEL_W = [1, 2, 3, 4, 5, 6, 8];
    // magazine capacity by weapon index (Glock 17, 1911 7+1, .357 revolver 6, AR/AK 30, bolt 5, pump 7)
    const WMAG = { 0: 10, 1: 17, 2: 17, 3: 8, 4: 6, 5: 30, 6: 30, 7: 5, 8: 7, 9: 7 };
    D.start = () => {
      if (D.fighters.length < 2) { D.fighters = [primary, subjects[1] || newSubject()]; }
      D.on = true; D.score = [0, 0]; D.round = 0; D.cam = 1; state.threat = null; gun.raise = 0; ui.report(null);
      document.body.classList.add('duel'); startRound(); hudEl.hidden = false;
    };
    D.stop = () => {
      D.on = false; clearProps(); for (const S of D.fighters) { if (S.gunModel) { scene.remove(S.gunModel); S.gunModel = null; } if (S.ai && S.ai.flash) scene.remove(S.ai.flash); S.ai = null; if (S !== primary) { use(S); S.rag.stop(); S.body.clearWounds(); S.body.root.visible = false; } }
      primary.body.root.position.set(0, 0, 0); primary.body.root.rotation.set(0, 0, 0); gun.raise = 1; document.body.classList.remove('duel'); hudEl.hidden = true; use(primary); reset();
    };
    // security cameras in the top corners (and the free view)
    const CAMS = [null, new V3(-3.7, 2.9, -2.2), new V3(3.7, 2.9, -2.2), new V3(3.7, 2.9, 6.8), new V3(-3.7, 2.9, 6.8)];
    const camBody = new THREE.Group(); for (const c of CAMS) if (c) { const g = new THREE.Group(); const hous = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.22), new THREE.MeshStandardMaterial({ color: 0xd9d9d4, roughness: 0.5 })); const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 14), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.12; const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); led.position.set(0.04, 0.03, 0.11); hous.add(lens, led); g.add(hous); g.position.copy(c); g.lookAt(0, 1, 2.2); camBody.add(g); } scene.add(camBody);
    D.cycleCam = () => { D.cam = (D.cam + 1) % CAMS.length; };
    const hudEl = document.createElement('div'); hudEl.id = 'duelHud'; hudEl.hidden = true; document.getElementById('app').appendChild(hudEl);
    D.update = (dt, rdt) => {
      D.t += rdt; D.clock += dt;
      const [A, B] = D.fighters;
      // guns in hand: aimed along the arm toward the target, or carried in the hand; dropped when the hand lets go
      for (const S of D.fighters) {
        if (!S.ai || !S.gunModel) continue;
        if (S.ai.flashN > 0) S.ai.flashN--; else S.ai.flash.intensity = 0;
        const gh = S.npc.gunHand || 'R', hb = S.rag.parts['hand' + gh].b, hp = new V3(hb.position.x, hb.position.y, hb.position.z);
        if (S.npc.aiming && S.ai.target) { const m4 = new THREE.Matrix4().lookAt(hp, S.ai.target, new V3(0, 1, 0)); S.gunModel.quaternion.setFromRotationMatrix(m4); S.gunModel.position.copy(hp).add(new V3(0, 0.035, 0).applyQuaternion(S.gunModel.quaternion)); }
        else if (S.npc.posture === 'stand' && S.phys.conscious) {
          // low ready: muzzle forward and down, carried in the hand
          const tq = S.rag.parts.thorax.b.quaternion, fw = new V3(0, 0, 1).applyQuaternion(new THREE.Quaternion(tq.x, tq.y, tq.z, tq.w)); fw.y = 0; fw.normalize();
          const m4 = new THREE.Matrix4().lookAt(hp, hp.clone().addScaledVector(fw, 1).add(new V3(0, -0.8, 0)), new V3(0, 1, 0)); S.gunModel.quaternion.setFromRotationMatrix(m4); S.gunModel.position.copy(hp);
        } else { const q = new THREE.Quaternion(hb.quaternion.x, hb.quaternion.y, hb.quaternion.z, hb.quaternion.w); S.gunModel.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))); S.gunModel.position.copy(hp); }
        if (D.phase === 'fight' && S.ai.wantFire) aiFire(S);
      }
      if (D.phase === 'ready' && D.t > 2.5) { D.phase = 'fight'; D.t = 0; }
      if (D.phase === 'fight') {
        const oa = out(A), ob = out(B);
        if (oa || ob || D.t > 120) { D.phase = 'over'; D.t = 0; D.winner = oa && ob ? -1 : oa ? 1 : ob ? 0 : Math.abs(hurtOf(A) - hurtOf(B)) > 0.3 ? (hurtOf(A) < hurtOf(B) ? 0 : 1) : -1; /* time: the less hurt takes it */ if (D.winner >= 0) D.score[D.winner]++; }
      } else if (D.phase === 'over' && D.t > 5) {
        if (D.score[0] >= 3 || D.score[1] >= 3) { D.phase = 'match'; D.t = 0; } else startRound();
      } else if (D.phase === 'match' && D.t > 8) { D.score = [0, 0]; D.round = 0; startRound(); }
      // camera: a security camera tracking the fight, or the free view
      camBody.children.forEach((g, k) => { g.visible = k + 1 !== D.cam; }); // not the one we are looking through
      if (D.cam > 0) { const c = CAMS[D.cam], mid = partPos(A, 'thorax').add(partPos(B, 'thorax')).multiplyScalar(0.5); camera.position.copy(c); camera.lookAt(mid); camera.updateMatrixWorld(); }
      if (Math.floor(D.clock * 4) !== D.hudT) { D.hudT = Math.floor(D.clock * 4);
        const st = (S, i) => '<span class="f' + i + '">' + NAMES[i] + '</span> ' + (S.phys.dead ? 'DEAD' : !S.phys.conscious ? 'DOWN' : S.npc.posture !== 'stand' ? 'WOUNDED, DOWN' : S.phys.frac() > 0.15 || S.phys.pain > 0.4 ? 'WOUNDED' : 'OK') + (S.ai ? ' · ' + S.ai.state : '');
        const banner = D.phase === 'ready' ? 'ROUND ' + D.round + ' · ' + D.weaponName : D.phase === 'over' ? (D.winner >= 0 ? NAMES[D.winner] + ' WINS THE ROUND' : 'NO WINNER') : D.phase === 'match' ? NAMES[D.score[0] >= 3 ? 0 : 1] + ' WINS THE MATCH' : 'ROUND ' + D.round;
        hudEl.innerHTML = '<div class="banner">' + banner + '</div><div class="score"><span class="f0">' + NAMES[0] + ' ' + D.score[0] + '</span> — <span class="f1">' + D.score[1] + ' ' + NAMES[1] + '</span></div><div class="st">' + st(A, 0) + '<br>' + st(B, 1) + '</div><div class="cam">' + (D.cam ? 'CAM ' + D.cam : 'FREE VIEW') + ' · C camera · O exit</div>';
      }
      use(A);
    };
    return D;
  }
  // one subject's physiology, behaviour, bleeding and the marks it leaves
  function simSubject(S, dt, scale, slow) {
    use(S);
    if (state.started) {
      let simDt = dt * scale * slow; const sub = Math.ceil(simDt / 0.2);
      for (let i = 0; i < sub; i++) { phys.step(simDt / sub); bleed(simDt / sub, i === sub - 1); }
      npc.update(dt * Math.min(scale, 3) * slow);
    } else npc.update(dt);
    viscera.update(dt * slow); smearBody();
    // hands get bloody: pressing a bleeding wound coats the palm and fingers within seconds; touching a pool on the
    // floor (crawling, pushing up) smears them too. It stays on (it dries, it does not go away).
    for (const sd of ['L', 'R']) {
      const cw = npc.clutching && npc.clutching[sd], h = rag.parts['hand' + sd] && rag.parts['hand' + sd].b;
      let add = 0; if (cw && (cw.rate || 0) > 0) add += dt * slow * Math.min(0.5, 0.04 + cw.rate / 600);
      if (h && h.position.y < 0.06 && world.depthAt(h.position.x, h.position.z) > 0.03) add += dt * slow * 0.4;
      if (add > 0) handBlood[sd] = Math.min(1, handBlood[sd] + add);
    }
    handBlood.at += dt; if (handBlood.at > 0.3) { handBlood.at = 0; if (handBlood.L > 0) body.bloodyHand('L', handBlood.L); if (handBlood.R > 0) body.bloodyHand('R', handBlood.R); }
    // raccoon eyes come up over ~7 minutes while blood still circulates
    if (headFx.rkMax > headFx.rk && phys.hr > 20) { headFx.rk = Math.min(headFx.rkMax, headFx.rk + dt * slow * scale * headFx.rkMax / 420); headFx.at += dt; if (headFx.at > 0.25) { headFx.at = 0; body.periorbital(headFx.rk); } } body.bloodTick && body.bloodTick(dt * slow, phys.hr > 20);
  }
  // one full simulation + render step (also driven directly by the test harness for frame-exact capture)
  function step(dt, noRender) {
    movePlayer(dt);
    state.kick = Math.max(0, state.kick - dt * 0.12 * (1 + state.kick * 40));
    camera.position.copy(state.pos);
    camera.position.y += eyeOffset;
    // the blast jolts the head a little: a quick, decaying shake on top of the muzzle rise
    state.shake = Math.max(0, (state.shake || 0) - dt * 6); const sk = state.shake * state.shake * 0.006;
    camera.rotation.set(state.pitch + state.kick + (Math.random() - 0.5) * sk, state.yaw + (Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk * 0.6); camera.updateMatrixWorld();
    // simulation time
    // slow motion drops to bullet speed while a round is in the air, so it can be watched in flight
    const scale = TIMES[state.ti], slow = state.slow ? (projectiles.active(simClock) ? 0.004 : 0.2) : 1;
    moveGrab();
    if (state.started) { simClock += dt * slow; while (pending.length && pending[0].t <= simClock) pending.shift().run(); }
    projectiles.update(simClock, dt * slow);
    const active = duel && duel.on ? duel.fighters : [primary];
    for (const S of active) simSubject(S, dt, scale, slow);
    world.update(dt * slow);
    if (duel && duel.on) duel.update(dt * slow, dt); else use(primary);
    if (state.started) {
      const dx = vent.x - state.pos.x, dz = vent.y - state.pos.z;
      const distance = Math.hypot(dx, dz);
      audio.ventilation(distance, (dx * Math.cos(state.yaw) - dz * Math.sin(state.yaw)) / Math.max(1, distance));
    }
    audio.dist = Math.hypot(state.pos.x - npc.pos.x, state.pos.z - npc.pos.z);
    const effort = !phys.conscious ? (phys.rr > 1 ? 0.35 : 0) : Math.min(1.6, 0.15 + Math.max(0, phys.rr - 14) / 14 + phys.pain * 0.6);
    audio.breath(npc.breath, phys.rr, effort, phys.hemoptysis, phys.dead ? 'none' : phys.agonal ? 'agonal' : !phys.conscious ? 'snore' : 'awake');
    if (world.landed && Math.random() < 0.25) audio.drip();
    aimDir(camDir); q.copy(camera.quaternion).invert(); camDir.applyQuaternion(q);
    if (intro) intro.update(dt);
    gun.update(dt, camDir, state.narrow);
    ui.cross(state.ax, state.ay); ui.ecg(phys, dt * Math.min(scale, 2) * slow);
    uiT += dt; if (uiT > 0.15) { uiT = 0;
      { const st = phys.status(), lost = Math.round(phys.total - phys.bv), mini = document.getElementById('mini');
        if (mini && document.body.classList.contains('min')) mini.innerHTML = '<b>' + st[0] + '</b> · HR ' + Math.round(phys.hr) + ' · ' + (lost > 0 ? '−' + lost + ' mL' : 'no blood loss') + ' · ' + G.WEAPONS[state.wi].name; }
      for (const S of (duel && duel.on ? duel.fighters : [primary])) { use(S);
      // skin and pupils follow the physiology
      body.setPerfusion(phys.frac(), phys.spo2, phys.dead || phys.stemDestroyed, phys.deadT || 0);
      const brainGone = phys.dead || phys.stemDestroyed || phys.anoxic > 120;
      body.setPupil(brainGone ? 0.62 : 0.32 + 0.12 * Math.min(1, phys.frac() / 0.3) + (phys.tFirst != null && phys.conscious ? 0.06 : 0));
      }
      use(duel && duel.on ? duel.fighters[0] : primary);
      ui.update(phys, npc); ui.setRange(Math.hypot(state.pos.x - npc.pos.x, state.pos.z - npc.pos.z)); }
    if (!noRender) renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  G.debug = { get duel() { return duel; }, subjects, use, viscera, projectiles, gun, scene, tick: step, manual: false, audio, rag, toggleGrab, toggleSlow, fire, state, setWeapon, toggleXray, camera, get phys() { return phys; }, get npc() { return npc; }, body, world };
})();
