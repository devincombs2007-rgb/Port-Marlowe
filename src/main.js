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
  const world = G.buildWorld(scene), body = G.buildBody(scene), gun = G.buildGun(camera), audio = G.Audio();
  const rag = G.buildPhysics(scene, body, audio, { headImpact: (v) => phys && npc && npc.posture === 'falling' && phys.headImpact(v), footstep: (k) => { audio.dist = Math.hypot(state.pos.x - npc.pos.x, state.pos.z - npc.pos.z); audio.step(k); } }); // only a real fall, not movement on the floor
  let phys, npc;
  const sampler = { sample: body.sample, cavity: body.cavity, maxDist: 20 };
  const TIMES = [1, 4, 15, 60];
  const state = { yaw: 0, pitch: -0.06, pos: new V3(0, 1.62, 3.0), ax: 0, ay: 0, wi: 1, lastShot: -9, ti: 0, started: false, keys: {}, stick: [0, 0], kick: 0, narrow: false, slow: false, grab: false, grabT: 0 };

  const ui = G.UI({
    weapon: (i) => setWeapon(i), xray: () => toggleXray(), time: () => cycleTime(), reset: () => reset(),
    grab: () => toggleGrab(), slow: () => toggleSlow(),
    sound: () => { audio.muted = !audio.muted; ui.setSound(!audio.muted); }, start: () => { state.started = true; audio.init(); },
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
  function moveGrab() { if (rag.grabbed) { aimDir(gdir); rag.grabbed.target.copy(camera.position).addScaledVector(gdir, state.grabT); } }
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
  const pending = []; let simClock = 0;
  const projectiles = G.Projectiles(scene);
  const viscera = G.Viscera(scene, body, rag);
  function cycleTime() { state.ti = (state.ti + 1) % TIMES.length; ui.setTime(TIMES[state.ti]); }
  function reset() {
    body.clearWounds(); world.clear(); rag.stop(); rag.clear(); projectiles.clear(); viscera.clear();
    // each new subject is a different person (the first one is always the same, for a consistent start)
    if (body.setLook) { const first = reset.n == null; reset.n = (reset.n || 0) + 1;
      const tints = [0xffffff, 0x8a6a50, 0x5a4030, 0xd0b090, 0x404040];
      body.setLook(first ? 0 : Math.floor(Math.random() * body.looks), first ? 0 : Math.floor(Math.random() * 3), first ? 0xffffff : tints[Math.floor(Math.random() * tints.length)]); }
    phys = G.Physiology(G.ANATOMY.bloodVolume);
    npc = G.NPC(body, phys, rag, { threat: () => state.threat || state.pos, event: npcEvent }); pending.length = 0;
    npc.update(0.001); ui.report(null); G.state = { phys, npc, body, world, state };
  }
  reset(); setWeapon(1); ui.setTime(1);

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
    if (!state.started || state.grab) return;
    const now = performance.now() / 1000, w = G.WEAPONS[state.wi];
    if (now - state.lastShot < 60 / w.rpm) return;
    state.lastShot = now;
    camera.updateMatrixWorld(); body.updateMatrices();
    aimDir(dir);
    gun.fire(w.recoil); audio.shot(w); state.kick += 0.012 + w.recoil * 0.012;
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
  // one full simulation + render step (also driven directly by the test harness for frame-exact capture)
  function step(dt, noRender) {
    movePlayer(dt);
    state.kick = Math.max(0, state.kick - dt * 0.12 * (1 + state.kick * 40));
    camera.position.copy(state.pos);
    camera.position.y += eyeOffset;
    camera.rotation.set(state.pitch + state.kick, state.yaw, 0); camera.updateMatrixWorld();
    // simulation time
    // slow motion drops to bullet speed while a round is in the air, so it can be watched in flight
    const scale = TIMES[state.ti], slow = state.slow ? (projectiles.active(simClock) ? 0.004 : 0.2) : 1;
    moveGrab();
    if (state.started) { simClock += dt * slow; while (pending.length && pending[0].t <= simClock) pending.shift().run(); }
    projectiles.update(simClock, dt * slow);
    if (state.started) {
      let simDt = dt * scale * slow; const sub = Math.ceil(simDt / 0.2);
      for (let i = 0; i < sub; i++) { phys.step(simDt / sub); bleed(simDt / sub, i === sub - 1); }
      npc.update(dt * Math.min(scale, 3) * slow);
    } else npc.update(dt);
    world.update(dt * slow); viscera.update(dt * slow); smearBody(); body.bloodTick && body.bloodTick(dt * slow, phys.hr > 20);
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
    gun.update(dt, camDir, state.narrow);
    ui.cross(state.ax, state.ay); ui.ecg(phys, dt * Math.min(scale, 2) * slow);
    uiT += dt; if (uiT > 0.15) { uiT = 0;
      // skin and pupils follow the physiology
      body.setPerfusion(phys.frac(), phys.spo2, phys.dead || phys.stemDestroyed, phys.deadT || 0);
      const brainGone = phys.dead || phys.stemDestroyed || phys.anoxic > 120;
      body.setPupil(brainGone ? 0.62 : 0.32 + 0.12 * Math.min(1, phys.frac() / 0.3) + (phys.tFirst != null && phys.conscious ? 0.06 : 0));
      ui.update(phys, npc); ui.setRange(Math.hypot(state.pos.x - npc.pos.x, state.pos.z - npc.pos.z)); }
    if (!noRender) renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  G.debug = { viscera, projectiles, gun, scene, tick: step, manual: false, audio, rag, toggleGrab, toggleSlow, fire, state, setWeapon, toggleXray, camera, get phys() { return phys; }, get npc() { return npc; }, body, world };
})();
