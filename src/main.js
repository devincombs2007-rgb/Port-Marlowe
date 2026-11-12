// Game loop, input, firing, and turning shot results into wounds, blood and reports.
(function () {
  const G = window.GSW, V3 = THREE.Vector3, ROOM = G.ROOM;
  const canvas = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0f11);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 40);
  camera.rotation.order = 'YXZ'; scene.add(camera);

  const world = G.buildWorld(scene), body = G.buildBody(scene), gun = G.buildGun(camera), audio = G.Audio();
  const rag = G.buildPhysics(scene, body, audio);
  let phys, npc;
  const sampler = { sample: body.sample, cavity: body.cavity, maxDist: 20 };
  const TIMES = [1, 4, 15, 60];
  const state = { yaw: 0, pitch: -0.06, pos: new V3(0, 1.62, 3.0), ax: 0, ay: 0, wi: 1, lastShot: -9, ti: 0, started: false, keys: {}, stick: [0, 0], kick: 0, narrow: false, slow: false, grab: false, grabT: 0 };

  const ui = G.UI({
    weapon: (i) => setWeapon(i), xray: () => toggleXray(), time: () => cycleTime(), reset: () => reset(),
    grab: () => toggleGrab(), slow: () => toggleSlow(),
    sound: () => { audio.muted = !audio.muted; ui.setSound(!audio.muted); }, start: () => { state.started = true; audio.init(); },
  });
  function setWeapon(i) { state.wi = i; const w = G.WEAPONS[i]; gun.set(w.cls); ui.setWeapon(w, i); }
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
  function cycleTime() { state.ti = (state.ti + 1) % TIMES.length; ui.setTime(TIMES[state.ti]); }
  function reset() {
    body.clearWounds(); world.clear(); rag.stop(); rag.clear();
    phys = G.Physiology(G.ANATOMY.bloodVolume);
    npc = G.NPC(body, phys, rag, { threat: () => state.pos });
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
  window.addEventListener('blur', () => { state.keys = {}; });
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
  stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);

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
    // eject the spent case: up and to the right of the weapon
    gun.g.getWorldPosition(tmp); tmp2.set(1.6 + Math.random() * 0.8, 1.4 + Math.random() * 0.6, 0.3 * (Math.random() - 0.5)).applyQuaternion(camera.quaternion);
    rag.casing(tmp, tmp2, w.cls);
    const n = w.pellets || 1, results = [];
    for (let i = 0; i < n; i++) {
      const s = w.spread * (n > 1 ? 1 : 0.6);
      tmp.set(dir.x + gauss() * s, dir.y + gauss() * s, dir.z + gauss() * s).normalize();
      const res = G.simulate(w.bullet, camera.position, tmp, sampler);
      results.push(res); processShot(res, w, tmp);
    }
    if (results.some((r) => r.hitBody)) audio.impact();
    ui.report(buildReport(results, w));
  }
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.82;

  function processShot(res, w, d0) {
    const surfs = [];
    let first = null;
    for (const m of res.marks) {
      if (!m.seg) continue;
      const exit = m.type === 'exit', md = m.dir || d0;
      const sw = body.addWound(m, exit ? md : { x: -md.x, y: -md.y, z: -md.z });
      sw.rate = 0; sw.acc = 0; sw.pool = null; surfs.push(sw); if (!first) first = sw;
      tmp2.set(m.p.x, m.p.y, m.p.z);
      if (exit) {
        // forward spatter: fine, fast, proportional to what the bullet still carries
        const e = 0.5 * w.bullet.m * m.v * m.v;
        world.burst(tmp2, md, Math.round(Math.min(70, 8 + e / 25)), 2.5 + Math.min(7, m.v / 90), 0.55, 0.004 + Math.min(0.006, e / 2e5));
      } else if (m.type === 'entry') world.burst(tmp2, { x: -md.x, y: -md.y + 0.2, z: -md.z }, 3 + Math.round(Math.random() * 4), 1.6, 1.1, 0.003);
    }
    if (first) {
      const pts = [res.marks[0].p, ...res.track]; if (res.stopped) pts.push(res.endPoint);
      body.addTrack(first, pts);
    }
    res.notes = res.hitBody ? phys.applyShot(res, surfs) : [];
    res.where = res.marks[0] && res.marks[0].seg ? body.locate(res.marks[0].seg, res.marks[0].p) : null;
    if (res.hitBody) {
      npc.onHit(res, res.marks[0], d0);
      // momentum the projectile gave up inside the body: m * (v_in - v_out). Small next to a 77 kg body.
      const en = res.marks.find((m) => m.type === 'entry');
      if (en && en.seg) { const dp = w.bullet.m * (w.bullet.v - res.vExit); npc.impulse(en.seg, en.p, { x: d0.x * dp, y: d0.y * dp, z: d0.z * dp }); }
    }
    if (!res.stopped && !res.noPen) {
      const from = res.hitBody ? res.endPoint : camera.position, dd = res.hitBody ? res.endDir : d0;
      // start the wall ray from the exit point, not from where the march gave up
      const ex = res.marks.filter((m) => m.type === 'exit').pop();
      const hit = world.rayRoom(ex ? ex.p : from, ex ? ex.dir : dd);
      if (hit) { world.addHole(hit.p, hit.n, Math.max(0.006, w.bullet.d * 0.9)); audio.wall(); }
    }
  }

  function buildReport(results, w) {
    const hits = results.filter((r) => r.hitBody), lines = [];
    if (!hits.length) return { tag: 'miss', lines: [{ html: 'No contact with the subject.', cls: 'dim' }] };
    const r = hits[0], multi = results.length > 1;
    if (multi) lines.push({ html: hits.length + ' of ' + results.length + ' pellets struck the subject' });
    lines.push({ html: 'Entry: <b>' + r.where + '</b>', cls: 'path' });
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

  // ---------- blood leaving the body: stains, drips, pools sized from real volume
  const wp = new V3(), wn = new V3(), vel = new V3(), smear = new V3(), upY = new V3(0, 1, 0);
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
      const ml = (s.rate * dt) / 60; s.ext += ml; body.growStain(s, s.ext);
      body.woundWorld(s, wp);
      if (!s.pool || (s.pool.x - wp.x) ** 2 + (s.pool.z - wp.z) ** 2 > Math.max(0.3, s.pool.r) ** 2) s.pool = world.poolAt(wp.x, wp.z);
      // a bleeding wound dragged along the floor leaves a smear instead of a pool
      if (wp.y < 0.16 && s.ext > 3) {
        if (!s.sm) s.sm = wp.clone();
        const dx = wp.x - s.sm.x, dz = wp.z - s.sm.z, dd = Math.hypot(dx, dz);
        if (dd > 0.045) { smear.set(wp.x, 0, wp.z); world.addStain(smear, upY, 0.022 + Math.min(0.03, s.rate / 6000), 1.9, Math.atan2(-dz, dx) + Math.PI / 2); s.sm.copy(wp); }
      }
      world.addToPool(s.pool, ml);
      if (!visual) continue;
      s.acc += dt * Math.min(28, 0.4 + s.rate / 14);
      body.woundNormal(s, wn);
      while (s.acc > 1) {
        s.acc -= 1;
        const art = s.rate > 140 ? (0.5 + 1.9 * beat) * (phys.map / 93) : 0.12;
        vel.set(wn.x * art + (Math.random() - 0.5) * 0.25, wn.y * art + 0.1 * art, wn.z * art + (Math.random() - 0.5) * 0.25);
        world.drop(wp, vel, art > 0.8 && Math.random() < 0.25 ? 0.006 : 0);
      }
    }
  }

  // ---------- loop
  let last = performance.now(), uiT = 0;
  const camDir = new V3(), q = new THREE.Quaternion();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // movement
    const k = state.keys, sp = 2.2 * dt;
    let mx = (k.d ? 1 : 0) - (k.a ? 1 : 0) + state.stick[0], mz = (k.s ? 1 : 0) - (k.w ? 1 : 0) + state.stick[1];
    state.yaw += ((k.arrowleft ? 1 : 0) - (k.arrowright ? 1 : 0)) * dt * 1.6; state.pitch += ((k.arrowup ? 1 : 0) - (k.arrowdown ? 1 : 0)) * dt * 1.2;
    state.pitch = Math.max(-1.3, Math.min(1.3, state.pitch));
    if (state.started && (mx || mz)) {
      const c = Math.cos(state.yaw), s = Math.sin(state.yaw);
      state.pos.x += (mx * c + mz * s) * sp; state.pos.z += (-mx * s + mz * c) * sp;
      state.pos.x = Math.max(ROOM.x0 + 0.4, Math.min(ROOM.x1 - 0.4, state.pos.x)); state.pos.z = Math.max(ROOM.z0 + 0.4, Math.min(ROOM.z1 - 0.4, state.pos.z));
      const dx = state.pos.x - npc.pos.x, dz = state.pos.z - npc.pos.z, dd = Math.hypot(dx, dz);
      if (dd < 0.75) { state.pos.x = npc.pos.x + (dx / dd) * 0.75; state.pos.z = npc.pos.z + (dz / dd) * 0.75; }
    }
    state.kick = Math.max(0, state.kick - dt * 0.12 * (1 + state.kick * 40));
    camera.position.copy(state.pos); camera.rotation.set(state.pitch + state.kick, state.yaw, 0); camera.updateMatrixWorld();
    // simulation time
    const scale = TIMES[state.ti], slow = state.slow ? 0.2 : 1;
    moveGrab();
    if (state.started) {
      let simDt = dt * scale * slow; const sub = Math.ceil(simDt / 0.2);
      for (let i = 0; i < sub; i++) { phys.step(simDt / sub); bleed(simDt / sub, i === sub - 1); }
      npc.update(dt * Math.min(scale, 3) * slow);
    } else npc.update(dt);
    world.update(dt * slow);
    aimDir(camDir); q.copy(camera.quaternion).invert(); camDir.applyQuaternion(q);
    gun.update(dt, camDir, state.narrow);
    ui.cross(state.ax, state.ay); ui.ecg(phys, dt * Math.min(scale, 2) * slow);
    uiT += dt; if (uiT > 0.15) { uiT = 0; ui.update(phys, npc); ui.setRange(Math.hypot(state.pos.x - npc.pos.x, state.pos.z - npc.pos.z)); }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  G.debug = { rag, toggleGrab, toggleSlow, fire, state, setWeapon, toggleXray, camera, get phys() { return phys; }, get npc() { return npc; }, body, world };
})();
