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

  const preChamber = new Set(scene.children);
  const vent = G.buildChamber(scene, renderer);
  const chamberObjs = scene.children.filter((o) => !preChamber.has(o)); // hidden outdoors
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
    if (VOICE_JAW[type] && current) { const J = current.jaw || (current.jaw = { a: 0, voice: 0, vt: 0 }); J.voice = VOICE_JAW[type][0] * (0.8 + 0.3 * (v || 0.5)); J.vt = VOICE_JAW[type][1]; }
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
  // small loose pieces (knocked-out teeth): thrown, they fall, bounce once or twice and lie on the floor
  const debris = [];
  function dropPiece(m, v, r) { scene.add(m); debris.push({ m, r, v: v.clone(), w: new V3(Math.random() * 30 - 15, Math.random() * 30 - 15, Math.random() * 30 - 15), rest: false }); }
  function stepDebris(dt) {
    for (const d of debris) {
      if (d.rest) continue; d.v.y -= 9.81 * dt; d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt;
      const r = d.r != null ? d.r : Math.max(d.m.scale.x, d.m.scale.y, d.m.scale.z) * 0.5;
      if (d.m.position.y < r) { d.m.position.y = r; if (Math.abs(d.v.y) < 0.5) { d.rest = true; } else { d.v.y *= -0.3; d.v.x *= 0.5; d.v.z *= 0.5; d.w.multiplyScalar(0.4); } }
    }
  }
  function clearDebris() { for (const d of debris) scene.remove(d.m); debris.length = 0; }
  // the voice opens the mouth: a scream wide, a cry or a cough part way, a moan a little
  const VOICE_JAW = { scream: [0.34, 1.3], yelp: [0.24, 0.45], cry: [0.2, 1.5], moan: [0.1, 1.1], groan: [0.1, 1.1], grunt: [0.06, 0.3], cough: [0.24, 0.35], gasp: [0.3, 0.6] };
  const pending = []; let simClock = 0; let duel = null, recon = null;
  const projectiles = G.Projectiles(scene);
  for (const S of subjects) S.viscera = G.Viscera(scene, S.body, S.rag);
  viscera = primary.viscera; current = primary;
  const newSubject = () => { const S = makeSubject(); S.viscera = G.Viscera(scene, S.body, S.rag); return S; };
  function cycleTime() { state.ti = (state.ti + 1) % TIMES.length; ui.setTime(TIMES[state.ti]); }
  // clothes: a T-shirt and trousers in everyday colours
  const SHIRTS = [0x2b2b2b, 0x5a6a48, 0x7a7a78, 0x2c3a55, 0xd8d4c8, 0x8a7a5a, 0x6a2a2a, 0x3d5a6a], TROUSERS = [0x3a4a6a, 0x2a3348, 0x4a5a7a, 0x6a6048, 0x2a2a2a, 0x4a5038];
  const SHOES = [[0x1c1c1c, 0x1c1c1c], [0xe8e8e4, 0xf2f2ee], [0x3a2a1e, 0x2a1e16], [0x2a2e38, 0xe6e6e0], [0x6a6a66, 0xdedad0]];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const outfit = (o) => ({ top: o.top ? pick(SHIRTS) : null, sleeves: Math.random() < 0.35 ? 'long' : 'short', pants: o.pants ? pick(TROUSERS) : null, shoes: o.shoes ? pick(SHOES) : null });
  function reset() {
    if (current !== primary) use(primary);
    body.clearWounds(); world.clear(); rag.stop(); rag.clear(); projectiles.clear(); viscera.clear(); headFx.rk = headFx.rkMax = 0; headFx.mouth = false; headFx.jawBroken = false; headFx.mouthK = 0; clearDebris(); handBlood.L = handBlood.R = 0;
    // each new subject is a different person (the first one is always the same, for a consistent start)
    if (body.setLook) { const first = reset.n == null; reset.n = (reset.n || 0) + 1;
      const tints = [0xffffff, 0x8a6a50, 0x5a4030, 0xd0b090, 0x404040];
      body.setLook(first ? 0 : Math.floor(Math.random() * body.looks), first ? 0 : Math.floor(Math.random() * 3), first ? 0xffffff : tints[Math.floor(Math.random() * tints.length)]);
      if (body.dress) { const r = Math.random(); body.dress(first || r < 0.3 ? {} : outfit(r < 0.5 ? { top: 1 } : r < 0.62 ? { pants: 1, shoes: 1 } : { top: 1, pants: 1, shoes: 1 })); } }
    phys = G.Physiology(G.ANATOMY.bloodVolume);
    npc = G.NPC(body, phys, rag, { threat: () => state.threat || state.pos, event: npcEvent }); pending.length = 0; primary.phys = phys; primary.npc = npc;
    npc.update(0.001); ui.report(null); G.state = { phys, npc, body, world, state };
  }
  reset(); setWeapon(1); ui.setTime(1);
  duel = Duel();
  recon = Recon();
  document.getElementById('bRecon').addEventListener('click', () => { document.getElementById('intro').hidden = true; state.started = true; audio.init(); recon.start(); });
  document.getElementById('bCity').addEventListener('click', () => { document.getElementById('intro').hidden = true; state.started = true; audio.init(); duel.city.start(); });
  document.getElementById('bDuel').addEventListener('click', () => { document.getElementById('intro').hidden = true; state.started = true; audio.init(); duel.start(); });


  // =============================== DALLAS, 22 NOVEMBER 1963: forensic reconstruction ===============================
  // A replay (not a game): the motorcade through Dealey Plaza and the three shots as found by the Warren Commission
  // (1964) and the House Select Committee on Assassinations (1979), run through the same tissue, wound, physiology
  // and ragdoll simulation as everything else. Timing in Zapruder-film frames (18.3 per second).
  function Recon() {
    const R = { on: false, D: null, subs: [], roles: {}, t: 0, rate: 1, cam: 1, fired: [false, false, false], cap: [], hud: null, hats: [] };
    // Western Cartridge Co. 6.5 x 52 mm Mannlicher-Carcano: 160-grain (10.4 g) round-nose full metal jacket, about 2,165 ft/s
    // at the muzzle (about 625 m/s at the car); long and stable, it can pass through flesh intact (CE399) and break up
    // on bone at speed
    const CARCANO = { name: '6.5×52 mm Mannlicher-Carcano', cls: 'rifle', model: 'bolt', load: '160 gr FMJ round nose (Western Cartridge Co.)', loud: 1, recoil: 0.7, spread: 0.0008,
      bullet: { m: 0.01037, d: 0.00668, v: 625, len: 0.0302, cd: 0.3, cdYaw: 0.62, boneDeform: 1.05, yawOn: 0.16, yawLen: 0.09, yawRest: 0.55, vFrag: 520, retain: 0.4, fragR: 0.025, fragSkull: true } }; /* (retain: the two largest head-shot fragments found in the car weighed about 41% of the bullet) */
    const FPS = 18.3, Z0 = -150, SHOTS = [160, 222, 313];
    const zNow = () => Z0 + R.t * FPS;
    // the limousine's place on the route (s, metres) for a Zapruder frame: 3.6 m/s through the turn, 4.9 m/s (11 mph) down
    // Elm through the shots, then Greer accelerates away toward Parkland Hospital
    function sOf(z) {
      const D = R.D, s313 = D.sAt.z313;
      if (z < 133) return s313 + 4.9 * (133 - 313) / FPS - 3.6 * (133 - z) / FPS;
      if (z < 320) return s313 + 4.9 * (z - 313) / FPS;
      const t = (z - 320) / FPS, v0 = 4.9, a = 3.2, tm = (13 - v0) / a; return s313 + 4.9 * 7 / FPS + (t < tm ? v0 * t + 0.5 * a * t * t : v0 * tm + 0.5 * a * tm * tm + 13 * (t - tm));
    }
    const segPt = (S, seg, rest) => { const sg = S.body.segs[seg]; S.body.updateMatrices(); return new V3(...rest).sub(sg.origin).applyMatrix4(sg.g.matrixWorld); };
    const SEATED = (S) => { const b = S.body.segs; for (const sd of ['L', 'R']) { const k = sd === 'L' ? 1 : -1; b['thigh' + sd].g.rotation.set(-1.45, 0, 0.08 * k); b['shin' + sd].g.rotation.set(1.4, 0, 0); b['foot' + sd].g.rotation.set(0.15, 0, 0); b['uarm' + sd].g.rotation.set(-0.3, 0, 0.08 * k); b['farm' + sd].g.rotation.set(-1.05, 0, 0); } };
    const LOOK = {
      jfk: { top: 0x1e2536, sleeves: 'long', pants: 0x1e2536, shoes: [0x111111, 0x111111], hair: 0x6a4630 },
      jackie: { top: 0xd99ab4, sleeves: 'long', pants: 0xd99ab4, shoes: [0x2a2a2a, 0x2a2a2a], hair: 0x2a1e18, hat: 0xd99ab4 },
      connally: { top: 0xb3a586, sleeves: 'long', pants: 0xb3a586, shoes: [0x3a2a1e, 0x2a1e16], hair: 0x8f8a84 },
      nellie: { top: 0xd6c07a, sleeves: 'long', pants: 0xd6c07a, shoes: [0x2a2a2a, 0x2a2a2a], hair: 0x5a3a26 },
      greer: { top: 0x2a2e36, sleeves: 'long', pants: 0x2a2e36, shoes: [0x111111, 0x111111], hair: 0x9a9a98 },
      kellerman: { top: 0x2a2e36, sleeves: 'long', pants: 0x2a2e36, shoes: [0x111111, 0x111111], hair: 0x3a2a20 },
    };
    // the inside of the car, in its own frame: seat cushions and backs, floor, doors, and the other people as blocks
    function carBoxes(role) {
      const S = R.D.limoSeats, B = (cx, cy, cz, sx, sy, sz) => new THREE.Box3(new V3(cx - sx / 2, cy - sy / 2, cz - sz / 2), new V3(cx + sx / 2, cy + sy / 2, cz + sz / 2)), out = [];
      out.push(B(0, S[role].y - 0.46 - 0.1, 0, 2.0, 0.2, 6.2)); /* the floor, where this person's feet rest */ out.push(B(1.03, 0.75, -0.7, 0.1, 0.8, 4.2), B(-1.03, 0.75, -0.7, 0.1, 0.8, 4.2));
      for (const k in S) { const q = S[k], wide = k === 'jfk' || k === 'jackie' || k === 'greer' || k === 'kellerman'; out.push(B(q.x, q.y - 0.07, q.z, wide ? 0.85 : 0.5, 0.14, 0.5), B(q.x, q.y + (k === 'connally' || k === 'nellie' ? 0.16 : 0.28), q.z - 0.31, wide ? 0.85 : 0.5, k === 'connally' || k === 'nellie' ? 0.32 : 0.55, 0.12));
        if (k !== role) out.push(B(q.x, q.y + 0.36, q.z - 0.08, 0.4, 0.62, 0.26)); }
      return out;
    }
    // which way each sat turned at about Z220 (radians, + to the car's left): the President a little toward the crowd on
    // the right, Mrs Kennedy toward the left, the Governor turning back from his right (his testimony)
    const SEATYAW = { jfk: -0.12, jackie: 0.3, connally: -0.12, nellie: 0.1 };
    // after the head shot the film shows the President thrown back and to the left, then slumping over to his left into
    // Mrs Kennedy's lap as she holds him. The limp body's own fall (and Greer's acceleration) is simulated; her arm
    // pulling him over is approximated as a turning push on his trunk (N·m: -z leans him to the car's left, -x back)
    function jfkLean(S) {
      if (!S.phys.brainDestroyed) return null; const z = zNow();
      if (z < 313 || z > 420) return null;
      const k = z < 330 ? 1 : 0.8; return { thorax: [z < 330 ? -22 * k : 6, 0, -26 * k], pelvis: [0, 0, -8 * k] };
    }
    function seat(S, role) {
      use(S); S.role = role; const q = R.D.limoSeats[role], L = LOOK[role];
      S.body.clearWounds(); S.rag.stop(); S.rag.clear(); S.viscera.clear(); S.headFx.rk = S.headFx.rkMax = 0; S.headFx.mouth = false; S.headFx.jawBroken = false; S.headFx.mouthK = 0; S.handBlood.L = S.handBlood.R = 0;
      if (S.gunModel) { scene.remove(S.gunModel); S.gunModel = null; } S.ai = null;
      if (S.body.setLook) S.body.setLook(role === 'greer' || role === 'kellerman' ? 1 : 0, role === 'jackie' || role === 'nellie' ? 1 : 0, L.hair);
      if (S.body.dress) S.body.dress(L);
      S.body.root.visible = true; S.body.root.position.set(q.x, q.y + 0.1 - 0.95, q.z - 0.06); S.body.root.rotation.set(0, 0, 0); SEATED(S);
      if (L.hat) { const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.088, 0.075, 20), new THREE.MeshStandardMaterial({ color: L.hat, roughness: 0.8 })); hat.position.set(0, 0.185, -0.02); hat.rotation.x = -0.25; S.body.segs.head.g.add(hat); R.hats.push(hat); } // the pillbox hat
      S.phys = G.Physiology(G.ANATOMY.bloodVolume); S.rag.setWalls(false); S.rag.setStatics(carBoxes(role));
      S.rag.frame = { pos: new V3(), quat: new THREE.Quaternion() }; S.rag.frameAcc = new V3();
      S.npc = G.NPC(S.body, S.phys, S.rag, { threat: () => null, event: npcEvent, seated: true, brace: role === 'jfk', seatYaw: SEATYAW[role] || 0, seatArms: role === 'connally' ? { uarmR: [-0.45, 0, -0.12], farmR: [-1.7, 0, 0] } : null, seatHold: role === 'connally' ? { R: [-0.04, -0.1, 0.19] } : null, lean: role === 'jfk' ? () => jfkLean(S) : null }); /* the Governor held his Stetson in his right hand, in front of his chest */
      R.roles[role] = S;
    }
    function scenery(on) {
      for (const o of chamberObjs) o.visible = !on; if (intro && intro.bulb) intro.bulb.parent.visible = !on;
      R.D.root.visible = on; scene.background = on ? null : new THREE.Color(0x0b0f11); scene.fog = on ? R.D.fog : null;
      if (on) { R.envSave = scene.environment; scene.environment = R.D.env; } else if (R.envSave) scene.environment = R.envSave;
      camera.far = on ? 900 : 40; camera.updateProjectionMatrix(); world.open = on; world.rayHook = on ? R.D.ray : null; G.BOUNDS = on ? { x0: -200, x1: 120, z0: -100, z1: 220 } : null;
      renderer.toneMappingExposure = on ? 0.86 : 1; gun.raise = on ? 0 : 1; document.body.classList.toggle('recon', on); if (R.hud) R.hud.hidden = !on;
      applyQuality();
    }
    // the car and everything with it at the current time
    let lastP = null, lastV = null;
    function place(dt) {
      const D = R.D, z = zNow(), s = sOf(z), at = D.path(s), q = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), at.ry);
      D.limo.position.copy(at.p); D.limo.rotation.set(0, at.ry, 0);
      // the frame the passengers' physics runs in, and its acceleration (felt by them as inertia: the turn, Greer's acceleration)
      const v = lastP && dt > 0 ? at.p.clone().sub(lastP).divideScalar(dt) : new V3(), acc = lastV && dt > 0 ? v.clone().sub(lastV).divideScalar(dt) : new V3(); lastP = at.p.clone(); lastV = v;
      if (acc.length() > 8) acc.setLength(8); const accL = acc.clone().applyQuaternion(q.clone().invert());
      for (const S of R.subs) { S.rag.frame.pos.copy(at.p); S.rag.frame.quat.copy(q); S.rag.frameAcc.copy(accL); }
      const put = (g, ds, lat, ry0) => { const a = D.path(Math.max(0, s + ds)); g.position.copy(a.p).add(new V3(Math.cos(a.ry) * lat, 0, -Math.sin(a.ry) * lat)); g.rotation.set(0, a.ry + (ry0 || 0), 0); return a; };
      put(D.leadCar, 32, 0); const fa = put(D.followCar, -10, 0); put(D.vpCar, -32, 0);
      for (const ag of D.agents) { const a = D.path(Math.max(0, s - 10 + ag.z)); ag.g.position.copy(a.p).add(new V3(Math.cos(a.ry) * ag.x, 0.35, -Math.sin(a.ry) * ag.x)); ag.g.rotation.set(0, a.ry, 0); }
      for (const m of D.motor) put(m.g, m.z, m.x);
      D.follow(at.p); return at;
    }
    // ---- a shot from the window
    function fire(i) {
      const D = R.D, JFK = R.roles.jfk, CON = R.roles.connally, W = D.muzzle(); let target;
      if (i === 0) target = D.limo.position.clone().addScaledVector(D.dir, 9).add(new V3(0.8, 0, 0)); // missed: down onto Elm ahead of the car
      else if (i === 1) target = segPt(JFK, 'neck', [-0.036, 1.492, -0.068]); // the base of the neck at the back, right of the spine (Warren: 14 cm below the right mastoid)
      else target = segPt(JFK, 'head', [-0.025, 1.72, -0.082]); // the back of the head, right of the midline: the HSCA panel's entry, about 10 cm above the autopsy's (higher in the cowlick area)
      const dir = target.clone().sub(W).normalize();
      D.rifle.lookAt(D.rifle.position.clone().sub(dir)); R.kick = 1;
      audio.dist = camera.position.distanceTo(W) / 6; audio.shot(CARCANO); state.shake = R.cam === 2 ? 0.6 : 0.15;
      const B = CARCANO.bullet, pts = [W.clone()], v = [B.v], hide = [false], results = [];
      const simAt = (T, o, d2, b) => { T.body.updateMatrices(); const c = new V3().setFromMatrixPosition(T.body.segs.thorax.g.matrixWorld), along = c.clone().sub(o).dot(d2), t0 = Math.max(0, along - 2.2); const o2 = o.clone().addScaledVector(d2, t0); return G.simulate(b, o2, d2, { sample: T.body.sample, cavity: T.body.cavity, maxDist: 4.5 }); };
      let res = i === 0 ? null : simAt(JFK, W, dir, B), res2 = null, res3 = null;
      if (res && res.hitBody) { results.push([JFK, res, W]); for (const mk of res.marks) if (mk.type === 'entry' || mk.type === 'exit') { pts.push(new V3(mk.p.x, mk.p.y, mk.p.z)); v.push(mk.v || B.v); hide.push(mk.type === 'exit'); }
        // the second shot goes on, slowed and already tumbling, into Governor Connally
        const ex = res.marks.filter((m) => m.type === 'exit').pop();
        if (i === 1 && ex && res.vExit > 60) { const d2 = new V3(ex.dir.x, ex.dir.y, ex.dir.z).normalize(), b2 = Object.assign({}, B, { v: res.vExit, yawOn: 0, vFrag: 0 }); /* CE399 came out nearly whole */ res2 = simAt(CON, new V3(ex.p.x, ex.p.y, ex.p.z), d2, b2);
          if (res2.hitBody) { results.push([CON, res2, new V3(ex.p.x, ex.p.y, ex.p.z)]); for (const mk of res2.marks) if (mk.type === 'entry' || mk.type === 'exit') { pts.push(new V3(mk.p.x, mk.p.y, mk.p.z)); v.push(mk.v || res.vExit); hide.push(mk.type === 'exit'); }
            // and on out of his chest, slower and yawing, into whatever is in front of it: his right wrist, his left thigh
            const ex2 = res2.marks.filter((m) => m.type === 'exit').pop();
            if (ex2 && res2.vExit > 60) { const d3 = new V3(ex2.dir.x, ex2.dir.y, ex2.dir.z).normalize(), o3 = new V3(ex2.p.x, ex2.p.y, ex2.p.z).addScaledVector(d3, 0.012); CON.body.updateMatrices();
              const r3 = G.simulate(Object.assign({}, B, { v: res2.vExit, yawOn: 0, vFrag: 0 }), o3, d3, { sample: CON.body.sample, cavity: CON.body.cavity, maxDist: 1.4 });
              if (r3.hitBody) { res3 = r3; results.push([CON, r3, o3]); for (const mk of r3.marks) if (mk.type === 'entry' || mk.type === 'exit') { pts.push(new V3(mk.p.x, mk.p.y, mk.p.z)); v.push(mk.v || res2.vExit); hide.push(mk.type === 'exit'); } } } } } }
      const last = res3 || (res2 && res2.hitBody ? res2 : res && res.hitBody ? res : null), endO = last ? last.marks.filter((m) => m.type === 'exit').pop() : null;
      const fromP = endO ? new V3(endO.p.x, endO.p.y, endO.p.z) : W, fromD = endO ? new V3(endO.dir.x, endO.dir.y, endO.dir.z) : dir;
      if (!last || endO) { const h = D.ray(fromP, fromD); if (h) { pts.push(h.p.clone()); v.push(400); hide.push(false); R.ground = h; } }
      projectiles.spawn(pts, v, hide, B.d, false, simClock);
      const tHit = (pts[1] ? W.distanceTo(pts[1]) : 80) / B.v;
      pending.push({ t: simClock + tHit, run: () => {
        const back = current;
        const before = new Map(); for (const [T] of results) if (!before.has(T)) before.set(T, T.phys.injuries.length);
        for (const [T, r, o] of results) { use(T); world.centerOn && world.centerOn(D.limo.position.x, D.limo.position.z); processShot(r, CARCANO, r.d0 || dir, o); headTrauma([r]); }
        if (R.ground && (!last || endO)) { strike(R.ground, fromD, last ? 0.5 * B.m * (last.vExit || 200) ** 2 : 0.5 * B.m * B.v * B.v, CARCANO, 0); R.ground = null; }
        if (results.length) audio.impact(results.some(([, r]) => r.order.some((p) => p.kind === 'bone')), 2000);
        use(back);
        R.shotNotes[i] = [...new Set(results.map((x) => x[0]))].map((T) => (T.role === 'jfk' ? 'President' : 'Governor') + ': ' + T.phys.injuries.slice(before.get(T)).filter((x) => !/^GSW/.test(x.text)).map((x) => x.text).slice(0, 4).join('; ')).join(' · ');
      } });
    }
    const EVENTS = [
      [-150, 'The motorcade turns from Main Street up Houston Street. Agent Greer drives SS-100-X at about 11 mph.'],
      [-40, 'The 120° left turn onto Elm Street, slowing to about 8 mph in front of the Texas School Book Depository.'],
      [133, 'Zapruder starts filming again from his pedestal on the knoll. From the sixth-floor window the oak tree hides the car until about Z210.'],
      [160, 'First shot (about Z160, Warren Commission): it missed. A fragment struck the curb near the triple underpass; spray from it grazed spectator James Tague.'],
      [222, 'Second shot (Z210–225): a 6.5 mm round enters the President\'s upper back and leaves through his throat, then strikes Governor Connally — back, chest, right wrist, left thigh (CE399; the single-bullet conclusion).'],
      [240, 'The President\'s arms come up toward his throat; his back brace holds him upright. The Governor turns and slumps.'],
      [313, 'Third shot (Z313): it strikes the back of the President\'s head and blows out a large wound on the right side.'],
      [340, 'Greer accelerates; Agent Clint Hill reaches the car from the follow-up car. Parkland Memorial Hospital: the President is pronounced dead at 1:00 pm. Governor Connally survives.'],
      [470, 'Reconstruction from the Warren Commission (1964) and HSCA (1979) findings. The HSCA also concluded, on acoustic evidence later disputed, that a fourth shot was probably fired from the grassy knoll and missed. Several points remain contested.'],
    ];
    R.update = (dt) => {
      const zb = zNow(); R.t += dt * R.rate; const z = zNow(); place(dt * R.rate);
      for (let i = 0; i < 3; i++) if (!R.fired[i] && z >= SHOTS[i]) { R.fired[i] = true; fire(i); }
      if (R.kick > 0) { R.kick = Math.max(0, R.kick - dt * 4); R.D.rifle.translateZ(R.kick * 0.004); }
      if (Math.floor(R.t * 6) !== R.hudT && R.hud) { R.hudT = Math.floor(R.t * 6);
        const ev = EVENTS.filter((e) => e[0] <= z).pop(), zi = Math.round(z), note = [1, 2].map((k) => R.shotNotes[k] && z > SHOTS[k] + 8 ? '<div class="sim">Simulation, shot ' + (k + 1) + ' — ' + R.shotNotes[k] + '</div>' : '').join('');
        R.hud.innerHTML = '<div class="title">Dealey Plaza, Dallas · Friday 22 November 1963 · 12:30 pm CST</div><div class="z">' + (zi >= 0 ? 'Zapruder frame ' + zi : (zi / FPS).toFixed(1) + ' s before frame 0') + ' · limousine ' + (R.speed * 2.237).toFixed(0) + ' mph' + (R.rate === 0 ? ' · paused' : R.rate < 1 ? ' · slow motion' : '') + '</div><div class="ev">' + (ev ? ev[1] : '') + '</div>' + note + '<div class="keys">1 Zapruder · 2 sixth-floor window · 3 plaza · 4 beside the car · 5 above · Space pause · F slow motion · R replay · O leave</div>'; }
      const p0 = R.D.path(sOf(zb)).p, p1 = R.D.path(sOf(z)).p; if (dt * R.rate > 0) R.speed = p0.distanceTo(p1) / (dt * R.rate);
    };
    R.camera = (dt) => {
      const D = R.D, c = D.limo.position, aim = c.clone().add(new V3(0, 1.1, 0)).addScaledVector(D.dir, 0), fwd = new V3(Math.sin(D.limo.rotation.y), 0, Math.cos(D.limo.rotation.y)), left = new V3(fwd.z, 0, -fwd.x);
      let pos, fov;
      D.zapFig.visible = R.cam !== 1; // (the camera is his eye)
      if (R.cam === 1) { pos = D.zapruder; fov = 12; } // Zapruder's Bell & Howell 414 at full zoom (27 mm on double-8 film: about 10° across), panning from his pedestal
      else if (R.cam === 2) { pos = D.window.clone().add(new V3(0.15, 0.05, -1.1)); fov = 13; } // through the 4x scope, roughly
      else if (R.cam === 3) { pos = new V3(-10, 30, 112); fov = 44; }
      else if (R.cam === 4) { pos = c.clone().addScaledVector(fwd, -2).addScaledVector(left, -4.2).add(new V3(0, 1.8, 0)); fov = 48; }
      else { pos = c.clone().add(new V3(0.1, 34, 0)); fov = 50; }
      camera.position.copy(pos); camera.lookAt(aim); camera.fov = fov; camera.updateProjectionMatrix();
      state.shake = Math.max(0, (state.shake || 0) - dt * 4); if (state.shake > 0) { const k = state.shake * state.shake * 0.01; camera.rotation.x += (Math.random() - 0.5) * k; camera.rotation.y += (Math.random() - 0.5) * k; }
      camera.updateMatrixWorld(); state.pos.copy(camera.position);
    };
    R.start = () => {
      if (duel.on) duel.stop(); if (duel.city && duel.city.on) duel.city.stop();
      if (!R.D) R.D = G.buildDealey(scene, renderer);
      if (!R.hud) { R.hud = document.createElement('div'); R.hud.id = 'reconHud'; document.getElementById('app').appendChild(R.hud); }
      while (subjects.length < 6) newSubject();
      for (const S of subjects) if (S !== primary) { use(S); S.rag.stop(); S.body.root.visible = false; }
      for (const h of R.hats) h.parent && h.parent.remove(h); R.hats = [];
      R.subs = [primary, ...subjects.slice(1, 6)]; const roles = ['jfk', 'jackie', 'connally', 'nellie', 'greer', 'kellerman'];
      R.on = true; scenery(true); world.clear(); projectiles.clear(); pending.length = 0; state.threat = null; ui.report(null);
      // Governor Connally's jump seat: placed so the second shot's line, through the President's neck, reaches the right side
      // of his back as the HSCA trajectory reconstruction found (he sat lower and a little inboard)
      { const D = R.D, at = D.path(sOf(SHOTS[1])), q = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), at.ry), inv = q.clone().invert(), W = D.window.clone().sub(at.p).applyQuaternion(inv), J = new V3(D.limoSeats.jfk.x - 0.036, D.limoSeats.jfk.y - 0.85 + 1.492, D.limoSeats.jfk.z - 0.06 - 0.068), dl = J.clone().sub(W).normalize(), t = (D.limoSeats.connally.z - 0.06 - 0.13 - J.z) / dl.z, hit = J.clone().addScaledVector(dl, t);
        D.limoSeats.connally.x = Math.max(-0.5, Math.min(-0.15, hit.x + 0.19)); const js = D.limo.userData.seats[1]; js.cush.position.x = js.back.position.x = js.base.position.x = D.limoSeats.connally.x; }
      roles.forEach((r, k) => seat(R.subs[k], r));
      R.t = 0; R.rate = 1; R.fired = [false, false, false]; R.shotNotes = []; R.cam = 1; lastP = lastV = null; place(0); state.slow = false;
    };
    R.stop = () => {
      R.on = false; for (const h of R.hats) h.parent && h.parent.remove(h); R.hats = [];
      for (const S of R.subs) { S.rag.frame = null; S.rag.frameAcc = null; S.rag.setStatics([]); S.rag.setWalls(true); if (S !== primary) { use(S); S.rag.stop(); S.body.clearWounds(); S.body.root.visible = false; } }
      scenery(false); camera.fov = 62; camera.updateProjectionMatrix(); state.pos.set(0, 1.62, 3); state.yaw = 0; state.pitch = -0.06;
      primary.body.root.position.set(0, 0, 0); primary.body.root.rotation.set(0, 0, 0); use(primary); reset();
    };
    R.key = (k) => { if (k >= '1' && k <= '5') R.cam = +k; else if (k === ' ') R.rate = R.rate === 0 ? 1 : 0; else if (k === 'f') R.rate = R.rate === 1 ? 0.2 : 1; else if (k === 'r') R.start(); else if (k === 'o') R.stop(); };
    return R;
  }

  // ---------- settings: HUD, crosshair, FPS counter and graphics quality, kept in this browser
  // quality: pr = share of the screen's pixel ratio rendered; key = the main light's shadow; bulb = the hanging bulb's
  // shadow (a point-light shadow draws the whole scene six more times); map = shadow-map size
  const QUAL = { high: { pr: 1, key: true, bulb: true, map: 1024 }, medium: { pr: 0.8, key: true, bulb: false, map: 1024 }, low: { pr: 0.6, key: false, bulb: false, map: 512 } };
  const cfg = { hud: false, cross: true, fps: false, q: 'auto', map: true };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem('gsw.settings') || '{}')); } catch (e) { /* storage unavailable: defaults */ }
  let autoQ = 'high';
  const saveCfg = () => { try { localStorage.setItem('gsw.settings', JSON.stringify(cfg)); } catch (e) { /* not persisted */ } };
  function applyQuality() {
    const Q = QUAL[cfg.q === 'auto' ? autoQ : cfg.q] || QUAL.high;
    scene.traverse((o) => { if (!o.isLight || !(o.castShadow || o.userData.shadowable)) return; o.userData.shadowable = true; const want = o.isPointLight ? Q.bulb : Q.key; if (o.castShadow !== want) { o.castShadow = want; } if (o.isDirectionalLight && o.shadow.mapSize.x !== Q.map) { o.shadow.mapSize.set(Q.map, Q.map); if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } } });
    renderer.shadowMap.enabled = Q.key || Q.bulb; resize();
    const note = document.getElementById('qNote'); if (note) note.textContent = cfg.q === 'auto' ? 'Auto: now ' + autoQ + ' (lowers itself if frames run slow)' : '';
  }
  const applySettingsQuality = () => applyQuality();
  function applySettings() {
    document.body.classList.toggle('nohud', !cfg.hud); document.body.classList.toggle('nocross', !cfg.cross);
    document.getElementById('fps').hidden = !cfg.fps;
    for (const [id, k] of [['optHud', 'hud'], ['optCross', 'cross'], ['optFps', 'fps'], ['optMap', 'map']]) document.getElementById(id).checked = cfg[k];
    for (const b of document.querySelectorAll('#optQ button')) b.setAttribute('aria-checked', String(b.dataset.q === cfg.q));
    applyQuality(); saveCfg();
  }
  const setPanel = document.getElementById('settings'), openSettings = (on) => { setPanel.hidden = on == null ? !setPanel.hidden : !on; };
  for (const [id, k] of [['optHud', 'hud'], ['optCross', 'cross'], ['optFps', 'fps'], ['optMap', 'map']]) document.getElementById(id).addEventListener('change', (e) => { cfg[k] = e.target.checked; applySettings(); });
  for (const b of document.querySelectorAll('#optQ button')) b.addEventListener('click', () => { cfg.q = b.dataset.q; if (cfg.q === 'auto') autoQ = 'high'; applySettings(); });
  document.getElementById('setClose').addEventListener('click', () => openSettings(false));
  document.getElementById('bSettings').addEventListener('click', () => openSettings(true));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') openSettings(); });
  // auto quality: watch real frame times; step down after a few slow seconds, back up after a long run of fast ones
  const perf = { ema: 16, slowT: 0, fastT: 0, fpsT: 0, n: 0 };
  function watchFrames(ms, dt) {
    perf.ema += (ms - perf.ema) * 0.05; perf.n++; perf.fpsT += dt;
    if (perf.fpsT > 0.5) { if (cfg.fps) document.getElementById('fps').textContent = Math.round(perf.n / perf.fpsT) + ' fps · ' + perf.ema.toFixed(1) + ' ms'; perf.fpsT = 0; perf.n = 0; }
    if (cfg.q !== 'auto' || document.hidden) return;
    perf.slowT = perf.ema > 24 ? perf.slowT + dt : 0; perf.fastT = perf.ema < 11 ? perf.fastT + dt : 0;
    const order = ['low', 'medium', 'high'], i = order.indexOf(autoQ);
    if (perf.slowT > 3 && i > 0) { autoQ = order[i - 1]; perf.slowT = 0; applyQuality(); }
    else if (perf.fastT > 12 && i < 2) { autoQ = order[i + 1]; perf.fastT = 0; applyQuality(); }
  }

  // ---------- input
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * (QUAL[cfg.q === 'auto' ? autoQ : cfg.q] || QUAL.high).pr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 78 : 62; camera.updateProjectionMatrix(); state.narrow = w < h;
    if (!state.moved) { state.ax = w / 2; state.ay = h * 0.42; }
  }
  window.addEventListener('resize', resize); resize();
  const touch = { id: null, x: 0, y: 0, t: 0, drag: false };
  let look = false;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  const CT = () => duel && duel.city && duel.city.on ? duel.city : null;
  canvas.addEventListener('pointerdown', (e) => {
    const C = CT(); if (C && e.pointerType === 'mouse') { if (!document.pointerLockElement && canvas.requestPointerLock) canvas.requestPointerLock(); if (e.button === 0) { C.fireHeld = true; C.fireReq = true; if (!C.aimHeld && C.player && C.player.ai) C.player.ai.hipT = Math.max(C.player.ai.hipT, 0.9); } else if (e.button === 2) C.aimHeld = true; return; }
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
    const C = CT(); if (C && e.pointerType === 'mouse') { if (document.pointerLockElement === canvas) { state.yaw -= e.movementX * 0.0024; state.pitch -= e.movementY * 0.0024; if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) C.lookT = 1.5; } else if (look || e.buttons & 2) { state.yaw -= e.movementX * 0.004; state.pitch -= e.movementY * 0.004; } return; }
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
    const C = CT(); if (C && e.pointerType === 'mouse') { if (e.button === 0) C.fireHeld = false; else if (e.button === 2) C.aimHeld = false; return; }
    if (e.pointerType === 'mouse') { if (e.button !== 0) look = false; else rag.release(); return; }
    if (e.pointerId !== touch.id) return;
    rag.release();
    if (!state.grab && !touch.drag && performance.now() - touch.t < 400 && e.type === 'pointerup') { state.ax = touch.x; state.ay = touch.y; state.moved = true; fire(); }
    touch.id = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  const toggleHud = () => { if (cfg.hud) document.body.classList.toggle('min'); }; // Tab: the panels and tools (with the HUD on)
  document.getElementById('bMenu').addEventListener('click', () => openSettings());
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); toggleHud(); } });
  window.addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (k === 'o' && state.started) { if (recon && recon.on) return; if (CT()) duel.city.stop(); else duel.on ? duel.stop() : duel.start(); } else if (k === 'c' && duel && duel.on) duel.cycleCam(); });
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey) return;
    const k = e.key.toLowerCase(); state.keys[k] = true;
    const wi = G.WEAPONS.findIndex((w) => w.key === k);
    if (recon && recon.on) { recon.key(k); if (k === ' ') e.preventDefault(); return; }
    const C = CT(); if (C) { if (k === 'f') { C.useKey(); return; } if (k === 't') { C.C.setTime(C.C.hour + 1); return; } if (C.veh && C.veh.driving) { if (k === ' ' || k.startsWith('arrow')) e.preventDefault(); return; } if (wi >= 0) { state.wi = wi; C.setWeapon(wi); } else if (k === 'r') C.reloadReq = true; else if (k === 'c') C.crouch = !C.crouch; if (k === ' ' || k.startsWith('arrow')) e.preventDefault(); return; } // in the city the keys drive the character
    if (wi >= 0) setWeapon(wi);
    else if (k === 'i') gun.inspect();
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
    if (gun.busy && gun.busy()) return; // changing weapons
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
    if (npc.startle && !results.some((r) => r.hitBody)) npc.startle(1); // a miss: he flinches at the shot
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
  // a shot at range: the tissue march starts 2 m short of the person (the round loses nothing worth modelling in the air
  // before that), so a target 80 m away is reached; the marks keep their true positions along the line
  function simNear(b, origin, d, T, opts) {
    const c = T.rag.parts.thorax.b.position, along = (c.x - origin.x) * d.x + (c.y - origin.y) * d.y + (c.z - origin.z) * d.z, t0 = Math.max(0, along - 2.2);
    const o2 = { x: origin.x + d.x * t0, y: origin.y + d.y * t0, z: origin.z + d.z * t0 };
    return G.simulate(b, o2, d, { sample: T.body.sample, cavity: T.body.cavity, maxDist: 4.5 });
  }
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
    // through the mouth: teeth along the track are smashed out (and fly on with the bullet); a broken jaw hangs open
    if (body.teeth) {
      body.updateMatrices(); const tp = new V3();
      for (const r of viaHead) {
        const jaw = r.order.some((o) => o.bone === 'jaw'), t = r.track, dir = t.length > 1 ? new V3(t[t.length - 1].x - t[0].x, t[t.length - 1].y - t[0].y, t[t.length - 1].z - t[0].z).normalize() : new V3(0, 0, 1);
        if (jaw) { headFx.jawBroken = true; phys.addInjury('mandible', 'Mandible fractured: the jaw hangs open', 1); }
        let lo = 9; for (const tt of body.teeth) { if (!tt.m.visible) continue; tt.m.getWorldPosition(tp); for (let i = 0; i < t.length - 1; i++) lo = Math.min(lo, segD(tp, t[i], t[i + 1])); }
        if (lo > 0.03) continue;
        for (const tt of body.teeth) {
          if (!tt.m.visible) continue; tt.m.getWorldPosition(tp); let dmin = 9; for (let i = 0; i < t.length - 1; i++) dmin = Math.min(dmin, segD(tp, t[i], t[i + 1]));
          if (dmin > (jaw ? 0.0075 : 0.0055) * (0.7 + Math.random() * 0.6)) continue; // the bullet and the bone and tooth fragments it drives ahead
          tt.m.visible = false; const m = new THREE.Mesh(tt.m.geometry, tt.m.material.clone()); m.material.color.lerp(new THREE.Color(0x7a1416), 0.5); tt.m.getWorldQuaternion(m.quaternion); m.scale.copy(tt.m.scale); m.position.copy(tp); m.castShadow = true;
          dropPiece(m, dir.clone().multiplyScalar(1.5 + Math.random() * 3).add(new V3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5)));
        }
        headFx.mouth = headFx.mouth || lo < 0.02;
      }
    }
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
      body.burst(sw, R, 4 + Math.round(s * 3)); body.scalpFlaps(sw, R, 1 + (Math.random() < 0.3 + 0.5 * s ? 1 : 0)); // torn scalp hangs off in flaps
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
    let entries = res.marks.filter((m) => m.type === 'entry'), exits = res.marks.filter((m) => m.type === 'exit');
    // a graze: in and out of the same part within a few centimetres, never more than a few millimetres under the
    // skin. The skin between is torn open: one furrow along the track, not two holes.
    if (entries.length === 1 && exits.length === 1 && res.depth < 0.06 && entries[0].seg && exits[0].seg && (entries[0].seg === exits[0].seg || res.depth < 0.035)) {
      const a = entries[0].p, b = exits[0].p, len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (len < 0.09) {
        const fm = { type: 'furrow', seg: entries[0].seg, p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }, r: entries[0].r, dir: entries[0].dir, len };
        res.marks = res.marks.map((m) => (m === entries[0] ? fm : m)).filter((m) => m !== exits[0]); res.graze = true;
        entries = [fm]; exits = []; res.exitMark = b;
      }
    }
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
    if (phys.laxNew && phys.laxNew.length) { for (const j of phys.laxNew) rag.lax(j); phys.laxNew.length = 0; } // torn ligaments loosen the joint
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
      // under clothes the cloth soaks it up; once saturated it runs down inside and drips from the hem or cuff below
      if (s.garment && !jet) { if (s.ext < (s.garment.kind === 'pants' ? 28 : 16)) continue; }
      if (!s.garment && !jet && body.holdDrops && body.holdDrops(s)) continue;
      const drip = !jet && (s.garment ? body.hemPoint(s, dp) : body.dripPoint && body.dripPoint(s, dp));
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
    const pace = Math.min(1, traveled / (walkSpeed * dt)); state.pace = pace;
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
    const ms = now - last, dt = Math.min(0.05, ms / 1000); last = now; watchFrames(ms, dt);
    if (!G.debug.manual) step(dt);
  }
  // ======================= AI 1v1 =======================
  // Two armed people in the room, random cover each round, first to three. Each fighter is a full subject (same
  // wounds, bleeding, physiology and ragdoll as the test subject) driven by a small mind: see the enemy or not, how hurt
  // each side is, cover nearby. It aims with the arm, fires with real ballistics into the other body, keeps fighting
  // while it physically can (from the floor too, holding a wound with the free hand), goes to cover when hurt,
  // pushes when winning and finishes a downed enemy.
  function Duel() {
    const D = { on: false, fighters: [], score: [0, 0], round: 0, phase: 'idle', t: 0, props: [], cam: 1, clock: 0, drops: [] };
    const NAMES = ['RED', 'BLUE'], SHORTS = [0x7a2020, 0x203c7a];
    const spawn = [new V3(0, 0, -1.6), new V3(0, 0, 6.1)];
    const mats = { crate: new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 0.85 }), concrete: new THREE.MeshStandardMaterial({ color: 0x8b8a84, roughness: 0.95 }), metal: new THREE.MeshStandardMaterial({ color: 0x4b545a, roughness: 0.5, metalness: 0.6 }) };
    const TYPES = [{ k: 'crate', s: [0.9, 0.9, 0.9], m: 'crate', low: true }, { k: 'barrier', s: [1.7, 0.85, 0.4], m: 'concrete', low: true }, { k: 'pillar', s: [0.55, 2.6, 0.55], m: 'concrete', low: false }, { k: 'locker', s: [0.9, 1.9, 0.5], m: 'metal', low: false }, { k: 'stack', s: [1.0, 1.4, 1.0], m: 'crate', low: false }];
    function clearProps() { for (const p of D.props) { scene.remove(p.mesh); p.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isLineSegments) o.material.dispose(); }); for (const S of D.fighters) S.rag.world.remove(p.bodies[S.idx]); } D.props.length = 0; }
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
      S.gunModel = m; S.ai.wi = wi; if (!S.flashLight) { S.flashLight = new THREE.PointLight(0xffc878, 0, 7, 2); scene.add(S.flashLight); } S.ai.flash = S.flashLight; S.flashLight.intensity = 0; // one muzzle-flash light per fighter, reused (a new light every round made every surface dearer to shade and recompiled the shaders)
      // the magazine (a separate part on magazine-fed guns) and the pump's forend, for reloads and racking
      let mag = null, fore = null; m.children.forEach((c) => { if (c.material && c.material.color && c.material.color.getHex() === 0x33373b && !mag) mag = c; });
      if (w.model === 'pump') fore = m.children[3];
      S.gs = { pos: null, q: new THREE.Quaternion(), mode: 'ready', kick: 0, back: 0, cyc: 0, mag, fore, fore0: fore ? fore.position.z : 0, dropped: false, modeT: 0 };
    }
    // ---- handling the gun the way a trained person does. Each gun's geometry (model space: forward -Z, up +Y,
    // the shooter's right +X): butt = stock length behind the origin, buttY its height; sight = height of the sight
    // line; grip = where the firing hand's palm sits; sup = where the support hand sits; load = magazine well / port;
    // rack = what the support hand pulls to charge it.
    const HOLD = {
      glock: { grip: [0, -0.06, 0.025], sup: [-0.03, -0.068, 0.012], sight: 0.043, load: [0, -0.12, 0.025], rack: [0, 0.028, 0.03] },
      m1911: { grip: [0, -0.06, 0.03], sup: [-0.03, -0.068, 0.016], sight: 0.043, load: [0, -0.12, 0.03], rack: [0, 0.028, 0.035] },
      target22: { grip: [0, -0.055, 0.035], sup: [-0.03, -0.065, 0.02], sight: 0.046, load: [0, -0.115, 0.04], rack: [0, 0.03, 0.04] },
      revolver: { grip: [0, -0.05, 0.03], sup: [-0.03, -0.06, 0.015], sight: 0.049, load: [-0.01, 0.026, -0.03], rack: [-0.01, 0.026, -0.03], tube: true },
      ar15: { long: true, butt: 0.31, buttY: 0.0, sight: 0.082, grip: [0, -0.055, 0.045], sup: [0, 0.008, -0.17], load: [0, -0.07, -0.08], rack: [0, 0.075, 0.2] },
      ak: { long: true, butt: 0.36, buttY: -0.01, sight: 0.062, grip: [0, -0.05, 0.043], sup: [0, 0.012, -0.17], load: [0, -0.04, -0.08], rack: [0.035, 0.04, -0.07] },
      bolt: { long: true, butt: 0.37, buttY: -0.015, sight: 0.098, grip: [0, -0.045, 0.06], sup: [0, -0.012, -0.16], load: [0.01, 0.05, 0.0], rack: [0.035, 0.036, 0.03], tube: true },
      pump: { long: true, butt: 0.39, buttY: -0.016, sight: 0.058, grip: [0, -0.022, 0.13], sup: [0, -0.012, -0.28], load: [0, -0.012, -0.03], rack: [0, -0.012, -0.2], tube: true },
    };
    const _m4 = new THREE.Matrix4(), WUP = new V3(0, 1, 0);
    const gunQ = (d, roll) => { // a gun frame looking along d, kept upright, canted by `roll` about the bore
      const z = d.clone().negate(), up0 = Math.abs(d.y) > 0.97 ? new V3(0, 0, 1) : WUP, x = new V3().crossVectors(up0, z).normalize(), y = new V3().crossVectors(z, x);
      const q = new THREE.Quaternion().setFromRotationMatrix(_m4.makeBasis(x, y, z)); if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(new V3(0, 0, 1), roll)); return q;
    };
    const mp = (O, q, p) => new V3(p[0], p[1], p[2]).applyQuaternion(q).add(O); // model point -> world
    const lerp3 = (a, b, u) => a.clone().lerp(b, Math.max(0, Math.min(1, u)));
    function holdGun(S, N, intent, dt, ep, vis) {
      const ai = S.ai, gs = S.gs, P = S.phys; if (!gs || !S.gunModel || ai.gunDown) return;
      const w = G.WEAPONS[ai.wi], H = HOLD[w.model] || HOLD.glock, gh = intent.gunHand || 'R', side = gh === 'L' ? -1 : 1;
      const standing = N.posture === 'stand' && P.conscious && ai.canFight;
      if (vis) ai.lastKnown = ep.clone();
      // the stance decides the carry: sprinting (no shooting), searching (low/compressed ready), on target, reloading
      let mode = !standing ? 'ground' : ai.reloadT > 0 ? 'reload' : intent.run && intent.move ? 'carry' : intent.aim ? 'aim' : 'ready';
      if (mode === 'carry') intent.aim = null;
      if (mode !== gs.mode) { gs.mode = mode; gs.modeT = 0; } gs.modeT += dt;
      gs.kick *= Math.exp(-dt / 0.075); gs.back *= Math.exp(-dt / 0.09); gs.cyc = Math.max(0, gs.cyc - dt);
      if (mode === 'ground') { intent.hold = null; intent.support = null; gs.pos = null; return; }
      // body frame
      const tb = S.rag.parts.thorax.b, tq = new THREE.Quaternion(tb.quaternion.x, tb.quaternion.y, tb.quaternion.z, tb.quaternion.w), T = partPos(S, 'thorax');
      const fw = new V3(0, 0, 1).applyQuaternion(tq); fw.y = 0; fw.normalize(); const rv = new V3(-fw.z, 0, fw.x).multiplyScalar(-side); // toward the gun side
      const hb = S.rag.parts.head.b, hq = new THREE.Quaternion(hb.quaternion.x, hb.quaternion.y, hb.quaternion.z, hb.quaternion.w), hf = new V3(0, 0, 1).applyQuaternion(hq);
      const sh = new V3(); S.body.segs['uarm' + gh].g.getWorldPosition(sh);
      if (new V3().subVectors(sh, T).dot(rv) < 0) rv.negate(); // make sure "gun side" really is the side of the gun shoulder
      const eye = partPos(S, 'head').addScaledVector(hf, 0.085).addScaledVector(WUP, 0.03).addScaledVector(rv, 0.03);
      // the shoulder pocket: the hollow on the front of the shoulder inside the joint, at collarbone height, on the chest's
      // surface (thorax frame: +x left, +y up, +z forward; the chest is 0.15 m deep from its centre)
      const lx = sh.clone().sub(T).applyQuaternion(tq.clone().invert()).x > 0 ? 1 : -1, pocket = new V3(lx * 0.13, 0.15, 0.15).applyQuaternion(tq).add(T);
      const lk = ai.lastKnown || ep, dh = lk.clone().sub(T); dh.y = 0; if (dh.lengthSq() < 1e-4) dh.copy(fw); dh.normalize();
      const sd = gh === 'R' ? 'L' : 'R', two = !(N.clutching && N.clutching[sd]) && !P.armBroken[sd] && !S.rag.parts['hand' + sd].severed;
      let O, q, sup = null, grip = H.grip;
      const fromButt = (B, d, roll) => { const qq = gunQ(d, roll), u = new V3(0, 1, 0).applyQuaternion(qq); return { O: B.clone().addScaledVector(u, -H.buttY).addScaledVector(d, H.butt - 0.03), q: qq }; }; // the recoil pad sinks into the pocket
      if (H.long) {
        if (mode === 'aim') {
          // stock in the shoulder pocket, head down on the stock (the neck flexes: cheek weld), sights on the target
          const B = pocket.clone().addScaledVector(WUP, 0.02), d = ai.target.clone().sub(B.clone().addScaledVector(WUP, H.sight - H.buttY)).normalize();
          ({ O, q } = fromButt(B, d, 0));
        } else if (mode === 'ready') {
          // low ready: stock still in the shoulder, muzzle down about 35 degrees toward where the threat is
          const d = dh.clone().multiplyScalar(Math.cos(0.6)).addScaledVector(WUP, -Math.sin(0.6)).normalize();
          ({ O, q } = fromButt(pocket.clone().addScaledVector(WUP, -0.03), d, 0));
        } else if (mode === 'carry') {
          // moving fast: across the chest, muzzle down toward the off side
          const d = fw.clone().multiplyScalar(0.72).addScaledVector(WUP, -0.48).addScaledVector(rv, -0.5).normalize();
          ({ O, q } = fromButt(pocket.clone().addScaledVector(WUP, -0.12).addScaledVector(rv, 0.03), d, -0.45 * side));
        } else { // reload: off the shoulder, in close, canted so the magazine well faces the support hand, muzzle up a little
          const d = dh.clone().multiplyScalar(0.92).addScaledVector(WUP, 0.3).addScaledVector(rv, -0.12).normalize();
          q = gunQ(d, 0.5 * side); O = T.clone().addScaledVector(fw, 0.3).addScaledVector(WUP, 0.04).addScaledVector(rv, 0.03);
        }
      } else {
        if (mode === 'aim') {
          // pistol: arms pushed out, sights brought up to the eye (two hands), or one arm out to the side when the other is busy
          const d = ai.target.clone().sub(eye).normalize(); q = gunQ(d, two ? 0 : 0.12 * side);
          const u = new V3(0, 1, 0).applyQuaternion(q); O = eye.clone().addScaledVector(d, two ? 0.5 : 0.6).addScaledVector(u, -H.sight).addScaledVector(rv, two ? 0 : 0.05);
        } else if (mode === 'ready') {
          // compressed ready: gun close in at the chest, both hands on it, muzzle toward the threat and a little down
          const d = dh.clone().addScaledVector(WUP, -0.32).normalize(); q = gunQ(d, 0); O = T.clone().addScaledVector(WUP, 0.14).addScaledVector(fw, 0.24).addScaledVector(rv, 0.02);
        } else if (mode === 'carry') {
          // running: muzzle straight down in front of the stomach, support hand flat on the chest
          const d = dh.clone().multiplyScalar(0.3).addScaledVector(WUP, -0.95).normalize(); q = gunQ(d, 0); O = T.clone().addScaledVector(fw, 0.2).addScaledVector(WUP, -0.02).addScaledVector(rv, 0.03);
          sup = T.clone().addScaledVector(fw, 0.17).addScaledVector(WUP, 0.08).addScaledVector(rv, -0.03);
        } else { // reload: in the workspace in front of the chest, canted, muzzle a little up
          const d = dh.clone().addScaledVector(WUP, 0.3).normalize(); q = gunQ(d, 0.45 * side); O = T.clone().addScaledVector(fw, 0.3).addScaledVector(WUP, 0.12).addScaledVector(rv, 0.02);
        }
      }
      // smooth: bringing a gun up or down takes a quarter of a second, not a frame
      const a = 1 - Math.exp(-dt * (mode === 'aim' ? 14 : 9));
      if (!gs.pos) { gs.pos = O.clone(); gs.q.copy(q); } else { gs.pos.lerp(O, a); gs.q.slerp(q, a); }
      // recoil: muzzle flip about the grip (pistol) or the butt (long gun), and the gun driven back into the hands/shoulder
      const piv = H.long ? [0, H.buttY, H.butt] : grip, pv = new V3(...piv), Pw = pv.clone().applyQuaternion(gs.q).add(gs.pos);
      const qk = gs.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), gs.kick));
      const Ok = Pw.clone().sub(pv.clone().applyQuaternion(qk)).addScaledVector(new V3(0, 0, 1).applyQuaternion(qk), gs.back);
      gs.rq = qk; gs.ro = Ok;
      // the hands: firing hand on the grip; support hand on the forend / round the firing hand, or busy reloading
      let gp = grip;
      if (w.model === 'bolt' && gs.cyc > 0) { const u = 1 - gs.cyc / 0.7; gp = u < 0.25 ? lerpA(grip, H.rack, u / 0.25) : u < 0.75 ? H.rack.map((v, i) => v + (i === 2 ? 0.07 * Math.sin((u - 0.25) / 0.5 * Math.PI) : 0)) : lerpA(H.rack, grip, (u - 0.75) / 0.25); } // work the bolt
      intent.hold = mp(Ok, qk, gp);
      let sp = H.sup, foreOff = 0;
      if (w.model === 'pump' && gs.cyc > 0) { const u = 1 - gs.cyc / 0.45; foreOff = 0.085 * Math.sin(Math.min(1, u) * Math.PI); sp = [H.sup[0], H.sup[1], H.sup[2] + foreOff]; } // rack the pump
      if (gs.fore) gs.fore.position.z = gs.fore0 + foreOff;
      if (mode === 'reload') {
        const tot = ai.reloadTot || 2, u = 1 - ai.reloadT / tot, belt = partPos(S, 'pelvis').addScaledVector(fw, 0.12).addScaledVector(rv, -0.13).addScaledVector(WUP, 0.06);
        const load = mp(Ok, qk, H.load), rack = mp(Ok, qk, H.rack), home = mp(Ok, qk, H.sup);
        if (H.tube) { const n = Math.max(1, Math.round(tot / 0.6)), k = (u * n) % 1; sup = k < 0.5 ? lerp3(load, belt, k / 0.25) : lerp3(belt, load, (k - 0.5) / 0.3); } // a round at a time: pouch, port
        else {
          if (u > 0.06 && !gs.dropped && gs.mag) dropMag(S);
          if (gs.mag) gs.mag.visible = u > 0.55;
          sup = u < 0.1 ? load : u < 0.45 ? lerp3(load, belt, (u - 0.1) / 0.18) : u < 0.72 ? lerp3(belt, load, (u - 0.45) / 0.2) : u < 0.9 ? lerp3(load, rack, (u - 0.72) / 0.08) : lerp3(rack, home, (u - 0.9) / 0.08);
        }
      } else if (gs.mag) { gs.mag.visible = true; gs.dropped = false; }
      if (!sup && two) sup = mp(Ok, qk, sp);
      intent.support = two ? sup : null; intent.cheek = H.long && mode === 'aim';
      // a hand far from its place on the gun comes round the front, not straight through its own belly; and no target
      // is ever put beyond the reach of its arm (an arm pulled straight at a point it cannot reach twists the whole chest)
      for (const [k, hs] of [['hold', gh], ['support', sd]]) {
        let t = intent[k]; if (!t) continue; const hp = partPos(S, 'hand' + hs), dd = hp.distanceTo(t);
        if (dd > 0.12) { const out = Math.min(0.2, (dd - 0.12) * 0.9); t = t.clone().addScaledVector(fw, out).addScaledVector(WUP, -out * 0.2); }
        const shp = new V3(); S.body.segs['uarm' + hs].g.getWorldPosition(shp); const v = t.clone().sub(shp), L = v.length(); if (L > 0.58) t = shp.addScaledVector(v, 0.58 / L);
        intent[k] = t;
      }
      // long guns are fired from a bladed stance: turned a little toward the gun side, which brings the support shoulder
      // forward under the forend
      if (H.long && (mode === 'aim' || mode === 'ready') && intent.face != null) intent.face += 0.35 * Math.sign(rv.x * fw.z - rv.z * fw.x || 1); // +angle turns the heading toward (fw.z, -fw.x)
      // how far the gun's line is off the target (for the decision to fire)
      const mz = mp(Ok, qk, [0, S.gunModel.userData.fy || 0.03, S.gunModel.userData.muzzle || -0.2]), gd = new V3(0, 0, -1).applyQuaternion(qk);
      gs.err = mode === 'aim' && ai.target ? gd.angleTo(ai.target.clone().sub(mz)) : 9;
    }
    const lerpA = (a, b, u) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, u)));
    // the empty magazine falls out of the gun and lies on the floor
    function dropMag(S) {
      const gs = S.gs; gs.dropped = true; const m = gs.mag.clone(); S.gunModel.updateMatrixWorld();
      m.applyMatrix4(S.gunModel.matrixWorld); scene.add(m); m.castShadow = true;
      D.drops.push({ m, v: new V3((Math.random() - 0.5) * 0.4, -0.5, (Math.random() - 0.5) * 0.4), w: new V3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3), rest: false });
    }
    function stepDrops(dt) {
      for (const d of D.drops) {
        if (d.rest) continue; d.v.y -= 9.81 * dt; d.m.position.addScaledVector(d.v, dt);
        d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt;
        if (d.m.position.y < 0.012) { d.m.position.y = 0.012; if (Math.abs(d.v.y) < 0.6) { d.rest = true; d.m.rotation.x = Math.round(d.m.rotation.x / (Math.PI / 2)) * (Math.PI / 2); d.m.rotation.z = Math.round(d.m.rotation.z / (Math.PI / 2)) * (Math.PI / 2); } else { d.v.y *= -0.25; d.v.x *= 0.5; d.v.z *= 0.5; d.w.multiplyScalar(0.4); } }
      }
    }
    const clearDrops = () => { for (const d of D.drops) scene.remove(d.m); D.drops.length = 0; };
    function setupFighter(S, i, wi) {
      use(S); S.idx = i;
      S.body.clearWounds(); S.rag.stop(); S.rag.clear(); S.viscera.clear(); S.headFx.rk = S.headFx.rkMax = 0; S.headFx.mouth = false; S.headFx.jawBroken = false; S.headFx.mouthK = 0; S.handBlood.L = S.handBlood.R = 0;
      if (S.body.setLook) S.body.setLook(Math.floor(Math.random() * S.body.looks), Math.floor(Math.random() * 3), [0xffffff, 0x8a6a50, 0x5a4030, 0x404040][Math.floor(Math.random() * 4)]);
      if (S.body.setShorts) S.body.setShorts(SHORTS[i]);
      if (S.body.dress) S.body.dress(outfit({ top: 1, pants: 1, shoes: 1 })); // dressed like anyone off the street
      S.body.root.visible = true; S.body.root.position.copy(spawn[i]); S.body.root.rotation.set(0, i ? Math.PI : 0, 0);
      S.phys = G.Physiology(G.ANATOMY.bloodVolume);
      if (S.ai && S.ai.knifeMesh) scene.remove(S.ai.knifeMesh);
      S.ai = { knife: Math.random() < 0.55, state: 'engage', t: 0, aimT: 0, fireT: 0.8 + Math.random() * 0.6, strafeT: 2 + Math.random() * 3, strafe: null, downT: 0, canFight: true, lastSeen: 0, goal: null, peekT: 0, crouch: 0, lean: 0, clock: 0, seenT: 0, react: 0.5, burst: 0, reloadT: 0, ammo: WMAG[wi] };
      S.npc = G.NPC(S.body, S.phys, S.rag, { threat: () => partPos(D.fighters[1 - i], 'thorax'), event: npcEvent, fighter: true, ai: (N) => brain(S, N) });
      giveGun(S, wi);
    }
    // ---- the mind
    function brain(S, N) {
      if (!S.ai) return null;
      const ai = S.ai, E = ai.enemy || D.fighters[1 - S.idx], P = S.phys, dt = Math.max(0, N.clock - (ai.clock || N.clock)); ai.clock = N.clock;
      const me = partPos(S, 'thorax'), ep = partPos(E, 'thorax'), toE = ep.clone().sub(me); toE.y = 0; const dist = toE.length(); toE.normalize();
      const face = Math.atan2(toE.x, toE.z);
      if (D.phase !== 'fight' && !CITY.on) { const it = { face, gunHand: 'R' }; holdGun(S, N, it, dt, ep, false); ai.intent = it; return it; } // waiting: gun at the ready
      const eye = partPos(S, 'head'), seeTarget = partPos(E, E.npc.posture === 'stand' ? 'thorax' : 'abdomen');
      const vis = los(eye, seeTarget) || los(eye, partPos(E, 'head'));
      if (vis) ai.lastSeen = 0; else ai.lastSeen += dt;
      const myHurt = hurtOf(S), enHurt = hurtOf(E) + (out(E) ? 2 : 0), winning = enHurt - myHurt > 0.5, losing = myHurt - enHurt > 0.6;
      ai.downT = N.posture === 'stand' ? 0 : ai.downT + dt;
      // which hand holds the gun: the right, unless it is broken or gone
      const usable = (sd) => !P.armBroken[sd] && !S.rag.parts['hand' + sd].severed && !(P.gripLost && P.gripLost[sd]) && !(P.armExtLost && P.armExtLost[sd]);
      const gh = usable('R') ? 'R' : usable('L') ? 'L' : null; // a hand that cannot grip (cut tendons) or an arm that cannot extend drops the gun: the other one takes it
      // no hand can hold the gun: it falls. Standing, with an arm still working, he fights on with a knife or his fists.
      if (!gh && !ai.gunDown && S.gunModel && P.conscious) dropGun(S);
      const punchArm = (sd) => !P.armBroken[sd] && !S.rag.parts['hand' + sd].severed && !(P.armExtLost && P.armExtLost[sd]);
      const melee = ai.gunDown && N.posture === 'stand' && (punchArm('R') || punchArm('L'));
      ai.canFight = (!!gh && !ai.gunDown || melee) && P.conscious && !P.armsPara && !ai.beg;
      const sh = new V3(); S.body.segs['uarm' + (gh || 'R')].g.getWorldPosition(sh);
      // where to aim: centre of mass; the head of an enemy who is down and close
      ai.target = E.npc.posture !== 'stand' && dist < 2.2 ? partPos(E, 'head') : partPos(E, E.npc.posture === 'stand' ? 'thorax' : 'abdomen');
      const aimDir = ai.target.clone().sub(sh).normalize(), aim = gh && vis ? sh.clone().addScaledVector(aimDir, 0.6) : null;
      const intent = { face, aim: ai.gunDown ? null : aim, gunHand: gh || 'R', crouch: 0, lean: 0, move: null, run: false };
      ai.t += dt;
      // beaten: down, conscious, and unable (or no longer willing) to fight - he begs with a hand raised, or curls up
      if (N.posture !== 'stand' && P.conscious && (ai.downT > 2 && (!gh || ai.gunDown || myHurt > 1.7))) {
        if (!ai.beg) { ai.beg = true; ai.style = ai.style || (Math.random() < 0.55 ? 'beg' : 'curl'); ai.begVoice = 0.5; }
        intent.aim = null; intent.beg = ai.style === 'beg' ? ep.clone().add(new V3(0, 0.4, 0)) : null;
        ai.begVoice -= dt; if (ai.begVoice < 0) { ai.begVoice = 2.2 + Math.random() * 2.5; npcEvent(Math.random() < 0.6 ? 'cry' : 'moan', 0.8); }
      } else if (N.posture === 'stand') ai.beg = false;
      if (N.posture === 'stand') {
        // decide what to do
        if ((out(E) || (E.ai && E.ai.beg)) && !E.phys.dead && !E.phys.brainDestroyed && !ai.gunDown && gh) ai.state = 'finish';
        else if (melee) ai.state = 'melee';
        else if (winning && enHurt > 1) ai.state = 'push';
        else if ((myHurt > 0.45 || losing) && D.props.length && ai.state !== 'cover' && ai.t > 1.5) { ai.state = 'cover'; ai.goal = coverSpot(S, ep); ai.t = 0; }
        else if (ai.lastSeen > 1.8 && ai.state !== 'flank' && ai.state !== 'cover') { ai.state = 'flank'; ai.goal = CITY.on ? (ai.lastKnown || ep).clone() : flankSpot(S, E); ai.t = 0; } // in the city: go to where he was last seen
        else if (vis && ai.state === 'flank') ai.state = 'engage';
        const goTo = (g0, run) => { if (!g0) return false; const g = CITY.on ? cityWay(S, me, g0) : g0; const d = g.clone().sub(me); if (g !== g0 && d.length() < 0.35) return false; d.y = 0; if (d.length() < 0.35) return true; d.normalize(); const st = steer(S, me, d, E); intent.move = { x: st.x, z: st.z }; intent.run = run && !st.tight; if (!vis || run) intent.face = Math.atan2(st.x, st.z); return false; };
        if (ai.state === 'engage') {
          ai.strafeT -= dt;
          if (ai.strafeT < 0) { ai.strafe = ai.strafe ? null : (Math.random() < 0.5 ? 1 : -1); ai.strafeT = ai.strafe ? 0.8 + Math.random() * 1.2 : 2 + Math.random() * 3; }
          // can see him but the muzzle line is blocked (low cover, a pillar edge): step out to get a shot, not stand there
          if ((ai.blockT || 0) > 0.6) { if (!ai.strafe || ai.blockT > 1.8) { ai.strafe = ai.blockT > 1.8 ? -(ai.strafe || 1) : (Math.random() < 0.5 ? 1 : -1); ai.blockT = 0.61; } ai.strafeT = Math.max(ai.strafeT, 0.6); }
          if (ai.strafe) { const st = steer(S, me, new V3(-toE.z * ai.strafe, 0, toE.x * ai.strafe), E); intent.move = { x: st.x, z: st.z }; }
          if (CITY.on && dist > 16) goTo(ep, false); // too far for a sure shot: close in, gun up
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
        } else if (ai.state === 'flank') { if (CITY.on && ai.lastSeen > 1.8) { ai.goal = ai.lastKnown ? ai.lastKnown.clone() : ep.clone(); } if (goTo(ai.goal, CITY.on && dist > 14) || ai.t > (CITY.on ? 30 : 6)) { ai.state = 'engage'; ai.t = 0; } }
        else if (ai.state === 'push') { if (dist > 2.2) goTo(ep, !vis); } // rush in, but walk with the gun up once he can be seen
        else if (ai.state === 'finish') {
          // finishing him: walk up to his head, crouch over him, put the gun to his head, a moment, one shot
          const hd = partPos(E, 'head'), hdist = Math.hypot(hd.x - me.x, hd.z - me.z); ai.target = hd;
          if (ai.over && hdist > 0.95) ai.over = false; else if (!ai.over && hdist < 0.62) ai.over = true; // over him (a little hysteresis: he squirms)
          if (!ai.over) { goTo(hd, hdist > 2.2); intent.face = face; ai.finishT = 0; } // hurries over, then walks the last steps gun up
          else { intent.crouch = 1; intent.face = Math.atan2(hd.x - me.x, hd.z - me.z); ai.finishT = (ai.finishT || 0) + dt; }
          intent.aim = gh && vis ? sh.clone().addScaledVector(hd.clone().sub(sh).normalize(), 0.6) : null; intent.finish = !!ai.over;
        } else if (ai.state === 'melee') meleeAct(S, N, E, intent, dt, me, dist, toE, goTo, punchArm);
      }
      // shooting the way people do: notice the enemy (reaction time), bring the gun on, fire a pair or a short burst
      // with the gun steady and the muzzle clear, pause to see what happened, reload when the magazine runs dry
      ai.fireT -= dt;
      if (vis) { if (ai.seenT === 0) ai.react = 0.3 + Math.random() * 0.35 + 0.35 * P.pain + (S.npc.posture !== 'stand' ? 0.3 : 0); ai.seenT += dt; ai.lostT = 0; }
      else { ai.lostT = (ai.lostT || 0) + dt; if (ai.lostT > 0.4) ai.seenT = 0; }
      if (ai.reloadT > 0) { ai.reloadT -= dt; intent.aim = null; if (ai.reloadT <= 0) ai.ammo = WMAG[ai.wi]; }
      else if (ai.ammo <= 0) { const w = G.WEAPONS[ai.wi]; ai.reloadT = w.cls === 'shotgun' ? 0.5 * WMAG[ai.wi] * 0.6 : w.model === 'bolt' ? 2.4 : w.model === 'revolver' ? 3.2 : 2.2; ai.reloadTot = ai.reloadT; ai.burst = 0; intent.aim = null; if (vis && D.props.length && ai.state === 'engage') { ai.state = 'cover'; ai.goal = coverSpot(S, ep); ai.t = 0; } }
      if (intent.aim && N.aiming) ai.aimT += dt; else ai.aimT = 0;
      holdGun(S, N, intent, dt, ep, vis);
      // steady: the gun is up on the target, the hand is on the grip and not swinging (relative to the body)
      const hb = S.rag.parts['hand' + (gh || 'R')].b, pv = S.rag.parts.pelvis.b.velocity, hp0 = intent.hold || intent.aim, handErr = hp0 ? hb.position.distanceTo(new CANNON.Vec3(hp0.x, hp0.y, hp0.z)) : 1, onGun = S.gs && S.gs.mode === 'aim' ? S.gs.err < 0.06 && S.gs.modeT > 0.2 : true, steady = intent.aim && onGun && (handErr < 0.1 || (ai.aimT > 1 && handErr < 0.22)) && Math.hypot(hb.velocity.x - pv.x, hb.velocity.y - pv.y, hb.velocity.z - pv.z) < 0.9; // steady relative to the body: he can fire on the move
      let clear = false;
      if (S.gunModel && intent.aim) {
        S.gunModel.updateMatrixWorld(); const mz = new V3(0, S.gunModel.userData.fy || 0.03, S.gunModel.userData.muzzle || -0.2).applyMatrix4(S.gunModel.matrixWorld); clear = los(mz, ai.target);
        // the body is behind cover but the head shows: take the head
        if (!clear) { const hd = partPos(E, 'head'); if (los(mz, hd)) { ai.target = hd; clear = true; } }
      }
      if (vis && intent.aim && !clear && ai.reloadT <= 0) ai.blockT = (ai.blockT || 0) + dt; else ai.blockT = 0;
      const spray = winning && dist < 4.5 && ai.state === 'push';
      const ready = !!intent.aim && ai.canFight && ai.seenT > ai.react && ai.aimT > 0.25 && (steady || (spray && handErr < 0.2)) && clear && ai.fireT <= 0 && ai.ammo > 0 && !(out(E) && E.phys.dead) && (!intent.finish || ai.finishT > 1.3) && !(ai.state === 'finish' && !intent.finish);
      ai.handErr = handErr;
      if (ready && ai.burst <= 0) { const w = G.WEAPONS[ai.wi]; ai.burst = intent.finish ? 1 : spray && !(w.cls === 'shotgun' || w.model === 'bolt') ? (w.cls === 'pistol' ? 3 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 5)) : w.cls === 'shotgun' || w.model === 'bolt' ? 1 : w.cls === 'pistol' ? (Math.random() < 0.65 ? 2 : Math.random() < 0.5 ? 1 : 3) : 2 + Math.floor(Math.random() * 3); }
      ai.wantFire = ready && ai.burst > 0;
      intent.scan = !vis && ai.lastSeen > 0.8 && !ai.gunDown; intent.lookDown = ai.reloadT > 0 && ai.reloadT < (ai.reloadTot || 2) * 0.85; // searching sweeps the head; a reload is watched
      ai.intent = intent;
      return intent;
    }
    // ---- disarmed: the gun falls; then knife or fists
    const KNIFE = { name: 'Knife', cls: 'knife', bullet: { m: 3, d: 0.004, v: 6.5, len: 0.12, cd: 0.3, boneDeform: 1 } };
    function dropGun(S) {
      const ai = S.ai; ai.gunDown = true; ai.burst = 0; ai.wantFire = false;
      const hb = S.rag.parts['hand' + (S.npc.gunHand || 'R')].b; dropPiece(S.gunModel, new V3(hb.velocity.x * 0.5 + (Math.random() - 0.5) * 0.6, 0.4, hb.velocity.z * 0.5 + (Math.random() - 0.5) * 0.6), 0.02);
      if (ai.knife && !ai.knifeMesh) { // a fixed-blade knife drawn from the belt
        const g = new THREE.Group(), blade = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.024, 0.14), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.9, roughness: 0.25 })), grip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.026, 0.11), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 }));
        blade.position.z = -0.075; grip.position.z = 0.055; g.add(blade, grip); g.traverse((o) => { o.castShadow = true; }); scene.add(g); ai.knifeMesh = g;
      }
    }
    // a strike: the fist or blade goes to a point on him and back. Guard up between strikes (hands by the chin, or the
    // knife held low and forward). Punches shove and hurt (and can stagger him); a stab is run through the same
    // tissue simulation as a bullet, as a slow, heavy, sharp blade limited to its length.
    function meleeAct(S, N, E, intent, dt, me, dist, toE, goTo, punchArm) {
      const ai = S.ai, P = S.phys, strong = punchArm(ai.knifeHand || 'R') ? (ai.knifeHand || 'R') : punchArm('L') ? 'L' : 'R', weak = strong === 'R' ? 'L' : 'R';
      ai.knifeHand = strong; intent.aim = null; intent.face = Math.atan2(toE.x, toE.z); intent.melee = true; intent.reachCap = 300;
      // a knife needs a hand that can still grip it; otherwise it is fists (or the heel of the hand)
      if (ai.knife && P.gripLost && P.gripLost[strong]) { ai.knife = false; if (ai.knifeMesh) { scene.remove(ai.knifeMesh); ai.knifeMesh = null; } }
      if (dist > 0.72) goTo(partPos(E, 'thorax'), dist > 2);
      const sh = new V3(); S.body.segs['uarm' + strong].g.getWorldPosition(sh);
      const tq = S.rag.parts.thorax.b.quaternion, fw = new V3(0, 0, 1).applyQuaternion(new THREE.Quaternion(tq.x, tq.y, tq.z, tq.w)); fw.y = 0; fw.normalize();
      const chin = partPos(S, 'head').addScaledVector(fw, 0.2).add(new V3(0, -0.12, 0)), side = new V3(-fw.z, 0, fw.x);
      const guardS = ai.knife ? partPos(S, 'abdomen').addScaledVector(fw, 0.32).add(new V3(0, 0.08, 0)) : chin.clone().addScaledVector(side, strong === 'L' ? 0.06 : -0.06), guardW = chin.clone().addScaledVector(side, strong === 'L' ? -0.07 : 0.07);
      intent.gunHand = strong; intent.hold = guardS; intent.support = punchArm(weak) ? guardW : null;
      ai.strikeT = (ai.strikeT == null ? 0.6 : ai.strikeT) - dt;
      if (!ai.strike && ai.strikeT <= 0 && dist < 0.95 && E.npc) {
        const parts = ai.knife ? (E.npc.posture === 'stand' ? ['abdomen', 'thorax', 'abdomen', 'neck'] : ['thorax', 'neck', 'abdomen']) : ['head', 'head', 'thorax', 'abdomen'];
        ai.strike = { t: 0, part: parts[Math.floor(Math.random() * parts.length)], hand: !ai.knife && punchArm(weak) && Math.random() < 0.45 ? weak : strong, done: false };
      }
      const st = ai.strike;
      if (st) {
        st.t += dt; const tgt = partPos(E, st.part), hn = 'hand' + st.hand, hp = partPos(S, hn);
        const out = st.t < 0.22; // out and back
        const pt = out ? tgt.clone().addScaledVector(tgt.clone().sub(sh).normalize(), 0.06) : (st.hand === strong ? guardS : guardW);
        if (st.hand === strong) intent.hold = pt; else { intent.support = pt; }
        if (out) intent.reachCap = 650; // the punch is thrown hard
        if (!st.done && st.t > 0.08 && hp.distanceTo(tgt) < (st.part === 'head' ? 0.13 : 0.16)) { st.done = true; landStrike(S, E, st, hp, tgt); }
        if (st.t > 0.45) { ai.strike = null; ai.strikeT = 0.55 + Math.random() * 0.7 + (P.pain > 0.5 ? 0.4 : 0); }
      }
    }
    function landStrike(S, E, st, hp, tgt) {
      const ai = S.ai, d = tgt.clone().sub(hp); d.y *= 0.5; d.normalize(); const seg = E.body.segs[st.part];
      if (!ai.knife) {
        // a punch: 10-15 N s to the head snaps it round; to the body it shoves and winds him
        const J = st.part === 'head' ? 11 : 15; E.npc.impulse(seg, tgt, { x: d.x * J, y: d.y * J, z: d.z * J });
        E.phys.pain = Math.min(1, E.phys.pain + (st.part === 'head' ? 0.06 : 0.04)); E.npc.stagger = Math.max(E.npc.stagger || 0, 0.5);
        audio.thud(st.part === 'head' ? 0.35 : 0.25);
        if (st.part === 'head' && Math.random() < 0.07) { E.phys.conscious = false; E.phys.koForced = true; E.phys.addInjury('ko', 'Knocked out by a punch', 1); }
        return;
      }
      // a stab
      const origin = hp.clone().addScaledVector(d, -0.04), back = current; use(E); E.body.updateMatrices();
      const res = G.simulate(KNIFE.bullet, origin, d, { sample: E.body.sample, cavity: E.body.cavity, maxDist: 0.04 + KNIFE.bullet.len });
      res.d0 = d; res.stab = true; for (const m of res.marks) m.stab = true;
      { const ib = res.order.findIndex((o) => o.kind === 'bone'); if (ib >= 0) res.order = res.order.slice(0, ib); } // the blade stops on bone (it glances off a rib or the spine; it does not break it)
      if (res.hitBody) { processShot(res, KNIFE, d, origin); audio.thud(0.2); }
      use(back);
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
      if (E && E !== S) { const ep = partPos(E, 'pelvis'); avoid(ep.x, ep.z, Math.hypot(me.x - ep.x, me.z - ep.z) - 0.2, 0.7); }
      // and the walls
      const A = area(); if (me.x < A.x0 + 0.6) out.x += 1.2; if (me.x > A.x1 - 0.6) out.x -= 1.2; if (me.z < A.z0 + 0.6) out.z += 1.2; if (me.z > A.z1 - 0.6) out.z -= 1.2;
      out.y = 0; const l = Math.hypot(out.x, out.z) || 1; out.x /= l; out.z /= l; out.tight = tight; return out;
    }
    function coverSpot(S, ep) {
      let best = null, bd = 1e9; const me = partPos(S, 'thorax');
      for (const p of D.props) {
        const c = p.mesh.position, away = new V3(c.x - ep.x, 0, c.z - ep.z).normalize(), r = Math.max(p.box.max.x - p.box.min.x, p.box.max.z - p.box.min.z) / 2 + 0.55;
        const spot = new V3(c.x + away.x * r, 0, c.z + away.z * r), d = spot.distanceTo(new V3(me.x, 0, me.z));
        const A = area(); if (d < bd && d < 30 && spot.x > A.x0 + 0.5 && spot.x < A.x1 - 0.5 && spot.z > A.z0 + 0.5 && spot.z < A.z1 - 0.5) { bd = d; best = spot; best.low = p.low; best.side = Math.random() < 0.5 ? -1 : 1; }
      }
      return best;
    }
    function flankSpot(S, E) {
      const ep = partPos(E, 'head'), me = partPos(S, 'thorax'); let best = null, bd = 1e9;
      for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283, r = 2.5 + Math.random() * 2.5, c = new V3(ep.x + Math.cos(a) * r, 1.5, ep.z + Math.sin(a) * r);
        const A = area(); if (c.x < A.x0 + 0.6 || c.x > A.x1 - 0.6 || c.z < A.z0 + 0.6 || c.z > A.z1 - 0.6 || !los(c, ep)) continue;
        const d = c.distanceTo(me); if (d < bd) { bd = d; best = c; } }
      return best;
    }
    // ---- firing: the round leaves the fighter's muzzle and is traced through the other body
    const mzl = new V3(), dd = new V3();
    function aiFire(S) {
      const ai = S.ai, E = ai.enemy || D.fighters[1 - S.idx], w = G.WEAPONS[ai.wi], P = S.phys, m = S.gunModel;
      const cands = CITY.on ? CITY.subs.filter((T) => T !== S && T.body.root.visible) : [E];
      if (CITY.on) CITY.shot(S); // everyone near hears it
      ai.ammo--; ai.burst--; ai.shots = (ai.shots || 0) + 1;
      if (S.gs) { const long = w.cls === 'rifle' || w.cls === 'shotgun'; S.gs.kick += (long ? 0.06 : 0.2) * w.recoil * (0.8 + Math.random() * 0.4) * (S.npc.supHand ? 1 : 1.5); S.gs.back += 0.018 * w.recoil; if (w.model === 'pump') S.gs.cyc = 0.45; else if (w.model === 'bolt') S.gs.cyc = 0.7; } // muzzle flip, worse one-handed; rack the pump / work the bolt
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
        // the round meets whoever is first along its line
        let res = null;
        for (const T of cands) { const tp = partPos(T, 'thorax'), v = tp.clone().sub(origin), along = v.dot(d); if (cands.length > 1 && (along < 0 || v.clone().addScaledVector(d, -along).length() > 1.3)) continue;
          T.body.updateMatrices(); const r2 = simNear(w.bullet, origin, d, T); r2.S = T; const e2 = r2.hitBody && r2.marks.find((mk) => mk.type === 'entry');
          const t2 = e2 ? origin.distanceTo(new V3(e2.p.x, e2.p.y, e2.p.z)) : Infinity; if (!res || (t2 < (res.tEnt || Infinity))) { res = r2; res.tEnt = t2; } }
        if (!res) { res = { hitBody: false, marks: [], E0: 0.5 * w.bullet.m * w.bullet.v * w.bullet.v, S: E }; } res.d0 = d;
        const entry = res.marks.find((mk) => mk.type === 'entry'), tBody = res.hitBody && entry ? origin.distanceTo(tmp2.set(entry.p.x, entry.p.y, entry.p.z)) : Infinity;
        const pr = rayProps(origin, d, tBody); if (pr) { res.blocked = pr; res.hitBody = false; }
        results.push(res); if (G.debug) G.debug.shotLog = (G.debug.shotLog || []).concat([(res.blocked ? 'blocked@' + res.blocked.t.toFixed(1) : res.hitBody ? 'HIT' : 'miss') + (res.S && res.S.ai && res.S.ai.ped ? ':ped' : '')]).slice(-30);
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
        const back = current;
        for (const r of results) { use(r.S || E);
          if (r.blocked) { const b = r.blocked; const nrm = new V3(); const c = b.p.mesh.position, hb = b.p.box, eps = 0.01; nrm.set(Math.abs(b.at.x - hb.min.x) < eps ? -1 : Math.abs(b.at.x - hb.max.x) < eps ? 1 : 0, Math.abs(b.at.y - hb.max.y) < eps ? 1 : 0, Math.abs(b.at.z - hb.min.z) < eps ? -1 : Math.abs(b.at.z - hb.max.z) < eps ? 1 : 0); if (nrm.lengthSq() === 0) nrm.set(0, 1, 0); void c;
            world.addHole(b.at, nrm, Math.max(0.006, w.bullet.d * 0.9), 300); world.chunks(b.at, nrm, 6, 1.6, 1.2, b.p.T && b.p.T.m === 'crate' ? 'chip' : 'dust'); audio.wall(300); continue; }
          if (r.hitBody) { if (CITY.on) { world.centerOn && world.centerOn(r.marks[0].p.x, r.marks[0].p.z); CITY.hit(S, r.S); } processShot(r, w, r.d0, origin); } else { const h = world.rayRoom(origin, r.d0); if (h) strike(h, r.d0, r.E0 || 400, w, 0); }
        }
        const hits = results.filter((r) => r.hitBody);
        if (!hits.length && E && E.npc && E.npc.startle) E.npc.startle(0.6); // the round cracked past him
        for (const T of new Set(hits.map((r) => r.S || E))) { use(T); const hT = hits.filter((r) => (r.S || E) === T); dismember(hT, w, origin); headTrauma(hT); audio.impact(hT.some((r) => r.order.some((p) => p.kind === 'bone')), hT.reduce((a, r) => a + r.Edep, 0)); }
        use(back);
      } });
    }
    // ---- rounds
    function startRound() {
      D.round++; D.phase = 'ready'; D.t = 0; D.finishBy = null; world.clear(); projectiles.clear(); pending.length = 0; clearDrops(); clearDebris();
      const wi = DUEL_W[Math.floor(Math.random() * DUEL_W.length)];
      for (let i = 0; i < 2; i++) setupFighter(D.fighters[i], i, wi);
      layout(); D.weaponName = G.WEAPONS[wi].name; use(D.fighters[0]);
    }
    const DUEL_W = [1, 2, 3, 4, 5, 6, 8];
    D.disarm = (i) => dropGun(D.fighters[i]); // tests
    D.arm = (wi) => { for (const S of D.fighters) { giveGun(S, wi); S.ai.ammo = WMAG[wi]; } D.weaponName = G.WEAPONS[wi].name; }; // tests / a fixed weapon
    // magazine capacity by weapon index (Glock 17, 1911 7+1, .357 revolver 6, AR/AK 30, bolt 5, pump 7)
    const WMAG = { 0: 10, 1: 17, 2: 17, 3: 8, 4: 6, 5: 30, 6: 30, 7: 5, 8: 7, 9: 7 };
    D.start = () => {
      if (D.fighters.length < 2) { D.fighters = [primary, subjects[1] || newSubject()]; }
      D.on = true; D.score = [0, 0]; D.round = 0; D.cam = 1; state.threat = null; gun.raise = 0; ui.report(null);
      document.body.classList.add('duel'); startRound(); hudEl.hidden = false;
    };
    D.stop = () => {
      D.on = false; clearProps(); clearDrops(); for (const S of D.fighters) if (S.body.setGrip) { S.body.setGrip('L', 0); S.body.setGrip('R', 0); } for (const S of D.fighters) { if (S.gunModel) { scene.remove(S.gunModel); S.gunModel = null; } if (S.ai && S.ai.flash) S.ai.flash.intensity = 0; S.ai = null; if (S !== primary) { use(S); S.rag.stop(); S.body.clearWounds(); S.body.root.visible = false; } }
      primary.body.root.position.set(0, 0, 0); primary.body.root.rotation.set(0, 0, 0); gun.raise = 1; document.body.classList.remove('duel'); hudEl.hidden = true; use(primary); reset();
    };

    // =============================== THE CITY: open-world mode ===============================
    // A third-person player on the streets of Port Marlowe, pedestrians going about their day, and armed
    // responders who come when the shooting starts ("heat"). Every person is a full subject: the same body,
    // physics, physiology and wound simulation as in the lab.
    const CITY = { on: false, C: null, subs: [], player: null, peds: [], cops: [], heat: 0, quietT: 0, aimHeld: false, fireHeld: false, aimPt: new V3(), msg: '', msgT: 0, downT: 0, camD: 3.2 };
    D.city = CITY;
    function area() { return CITY.on ? CITY.C.bounds : ROOM; }
    // the next point to head for on the way to g: straight there if nothing big is in the way, else along the street route
    function cityWay(S, me, g) {
      const R = S.route; if (!R || R.goal.distanceTo(g) > 3 || (R.t = (R.t || 0) + 1) > 40) S.route = { goal: g.clone(), path: CITY.C.route(me, g), t: 0 };
      const path = S.route.path; while (path.length > 1 && (Math.hypot(path[0].x - me.x, path[0].z - me.z) < 1.5 || CITY.C.segClear(me, path[1]))) path.shift();
      return path[0] || g;
    }
    const NPED = 6, NCOP = 3;
    let cityHud = null;
    function cityScenery(on) {
      for (const o of chamberObjs) o.visible = !on; if (intro && intro.bulb) intro.bulb.parent.visible = !on;
      CITY.C.root.visible = on; scene.background = on ? null : new THREE.Color(0x0b0f11); scene.fog = on ? CITY.C.fog : null;
      if (on) { CITY.envSave = scene.environment; scene.environment = CITY.C.env; } else if (CITY.envSave) scene.environment = CITY.envSave;
      camera.far = on ? 600 : 40; camera.updateProjectionMatrix(); world.open = on; world.rayHook = on ? CITY.C.ray : null; G.BOUNDS = on ? CITY.C.bounds : null;
      renderer.toneMappingExposure = on ? 0.82 : 1;
      CITY.C.sun.userData.shadowable = true; applySettingsQuality && applySettingsQuality();
    }
    // the colliders near a person go into his physics world (a full set in every world would be slow)
    function nearStatics(S) { const p = partPos(S, 'pelvis'), near = CITY.C.colliders.filter((c) => { if (c.car) return false; const b = c.box; return p.x > b.min.x - 6 && p.x < b.max.x + 6 && p.z > b.min.z - 6 && p.z < b.max.z + 6; }).slice(0, 14); S.rag.setStatics(near.map((c) => c.box)); S.staticAt = p.clone(); }
    function cityPerson(S, pos, ry, look) {
      use(S); S.idx = -1;
      S.body.clearWounds(); S.rag.stop(); S.rag.clear(); S.viscera.clear(); S.headFx.rk = S.headFx.rkMax = 0; S.headFx.mouth = false; S.headFx.jawBroken = false; S.headFx.mouthK = 0; S.handBlood.L = S.handBlood.R = 0;
      if (S.gunModel) { scene.remove(S.gunModel); S.gunModel = null; } if (S.ai && S.ai.knifeMesh) scene.remove(S.ai.knifeMesh);
      if (S.body.setLook) S.body.setLook(Math.floor(Math.random() * S.body.looks), Math.floor(Math.random() * 3), [0xffffff, 0x8a6a50, 0x5a4030, 0x404040, 0xd0b090][Math.floor(Math.random() * 5)]);
      if (S.body.dress) S.body.dress(look || outfit({ top: 1, pants: Math.random() < 0.85 ? 1 : 0, shoes: 1 }));
      S.body.root.visible = true; S.body.root.position.copy(CITY.C.free(pos)); S.body.root.rotation.set(0, ry, 0);
      S.phys = G.Physiology(G.ANATOMY.bloodVolume); S.rag.setWalls(false); S.staticAt = null;
    }
    const fighterAI = (wi, extra) => Object.assign({ knife: false, state: 'engage', t: 0, aimT: 0, fireT: 0.8, strafeT: 3, strafe: null, downT: 0, canFight: true, lastSeen: 0, goal: null, peekT: 0, crouch: 0, lean: 0, clock: 0, seenT: 0, react: 0.5, burst: 0, reloadT: 0, ammo: WMAG[wi] }, extra);
    function spawnPlayer() {
      const S = CITY.player; cityPerson(S, CITY.C.spawns[8], Math.PI / 2, { top: 0x2b2b2b, sleeves: 'short', pants: 0x3a4a6a, shoes: [0xe8e8e4, 0xf2f2ee] });
      S.ai = fighterAI(state.wi, { player: true, hipT: 0 });
      S.npc = G.NPC(S.body, S.phys, S.rag, { threat: () => CITY.aimPt, event: npcEvent, fighter: true, ai: (N) => playerIntent(S, N) });
      giveGun(S, cityWeapon(state.wi)); nearStatics(S); CITY.downT = 0;
    }
    const cityWeapon = (i) => (G.WEAPONS[i] ? i : 1);
    function spawnPed(S, at) {
      // on the sidewalk of the player's block or one next to it, somewhere he is not looking straight at
      const pp = partPos(CITY.player, 'pelvis'), near = CITY.C.walk.slice().sort((A, B) => Math.hypot(A[0][0] + A[2][0] - 2 * pp.x, A[0][1] + A[2][1] - 2 * pp.z) - Math.hypot(B[0][0] + B[2][0] - 2 * pp.x, B[0][1] + B[2][1] - 2 * pp.z)).slice(0, 3);
      let loop, k, pos; for (let tries = 0; tries < 12; tries++) { loop = near[Math.floor(Math.random() * near.length)]; k = Math.floor(Math.random() * 4); const a = loop[k], b = loop[(k + 1) % 4], u = Math.random(); pos = new V3(a[0] + (b[0] - a[0]) * u, 0, a[1] + (b[1] - a[1]) * u); const d = pos.distanceTo(pp); if (d > 7 && d < 45 && (tries > 8 || !CITY.subs.some((T) => T !== S && T.body.root.visible && partPos(T, 'pelvis').distanceTo(pos) < 3))) break; }
      if (at) pos = at.clone(); cityPerson(S, pos, Math.random() * 6.28);
      S.ai = { ped: true, loop, wp: (k + 1) % 4, dir: Math.random() < 0.5 ? 1 : -1, alarm: null, alarmT: 0, idleT: 0, cower: false, clock: 0 };
      S.npc = G.NPC(S.body, S.phys, S.rag, { threat: () => (S.ai.alarm ? S.ai.alarm.from : null), event: npcEvent, ai: (N) => pedIntent(S, N) });
      nearStatics(S);
    }
    function spawnCop(S) {
      // they come in from a street corner out of the player's sight
      const pp = partPos(CITY.player, 'pelvis'); let best = null, bd = -1;
      const H = CITY.C.pitch * 1.5 - 4, Q = CITY.C.pitch / 2; for (const c of [-H, -Q, Q, H]) for (const z of [-H, H]) for (const swap of [0, 1]) { const q = swap ? new V3(z, 0, c) : new V3(c, 0, z), d = q.distanceTo(pp); if (d > 30 && d < 70 && !los(q.clone().setY(1.6), pp.clone().setY(1.5)) && d > bd) { bd = d; best = q; } }
      if (!best) best = new V3(pp.x + 40, 0, pp.z);
      const wi = Math.random() < 0.5 ? 5 : 1; cityPerson(S, best, Math.atan2(pp.x - best.x, pp.z - best.z), { top: 0x1f2a44, sleeves: 'short', pants: 0x1c2233, shoes: [0x111111, 0x111111] });
      S.ai = fighterAI(wi, { enemy: CITY.player, cop: true, state: 'flank', goal: pp.clone() }); S.route = null;
      S.npc = G.NPC(S.body, S.phys, S.rag, { threat: () => partPos(CITY.player, 'thorax'), event: npcEvent, fighter: true, ai: (N) => brain(S, N) });
      giveGun(S, wi); nearStatics(S);
    }
    function despawn(S) { use(S); if (S.gunModel) { scene.remove(S.gunModel); S.gunModel = null; } if (S.ai && S.ai.flash) S.ai.flash.intensity = 0; S.ai = null; S.rag.stop(); S.body.clearWounds(); S.body.root.visible = false; }

    // ---------------- vehicles ----------------
    // Arcade car physics on the flat streets (a kinematic bicycle model with grip, drag, braking, reversing and a
    // handbrake), collisions with buildings, street furniture and other cars, and real impacts with people: the
    // bumper takes the legs (breaking them above walking pace), the body goes onto the bonnet and is thrown, the head
    // strikes the windscreen at speed. Ambient traffic drives the streets on the right, turns at junctions and stops
    // for whatever is in front of it.
    const VEH = { traffic: [], driving: null, sinceHit: new Map() };
    CITY.veh = VEH;
    const carFwd = (c) => new V3(Math.sin(c.ry), 0, Math.cos(c.ry));
    function carCollide(c, dt) {
      const f = carFwd(c), r = c.W / 2 + 0.05; let hit = 0;
      for (const k of [-0.36, 0, 0.36]) {
        const px = c.x + f.x * c.L * k, pz = c.z + f.z * c.L * k;
        for (const col of CITY.C.colliders) { if (col === c.col) continue; const b = col.box; const qx = Math.max(b.min.x, Math.min(px, b.max.x)), qz = Math.max(b.min.z, Math.min(pz, b.max.z)), dx = px - qx, dz = pz - qz, d = Math.hypot(dx, dz);
          if (d < r) { const nx = d > 1e-4 ? dx / d : (px - (b.min.x + b.max.x) / 2 > 0 ? 1 : -1), nz = d > 1e-4 ? dz / d : 0, pen = r - d; c.x += nx * pen; c.z += nz * pen; const vn = Math.abs(c.v) * Math.abs(f.x * nx + f.z * nz); if (vn > hit) hit = vn; } }
      }
      if (hit > 1.5) { c.v *= -0.25; c.spin += (Math.random() - 0.5) * hit * 0.08; if (c === VEH.driving) { state.shake = Math.min(1, (state.shake || 0) + hit * 0.06); } audio.dist = Math.hypot(state.pos.x - c.x, state.pos.z - c.z); audio.thud(Math.min(1, hit / 10)); }
    }
    // a person in the way of a moving car
    function carHits(c) {
      const f = carFwd(c), rgt = new V3(f.z, 0, -f.x), sp = Math.abs(c.v); if (sp < 1.2) return;
      for (const T of CITY.subs) {
        if (!T.body.root.visible || T.inCar) continue; const p = partPos(T, 'pelvis'), dx = p.x - c.x, dz = p.z - c.z, lz = dx * f.x + dz * f.z, lx = dx * rgt.x + dz * rgt.z;
        if (Math.abs(lx) > c.W / 2 + 0.3 || Math.abs(lz) > c.L / 2 + 0.35 || (Math.sign(lz) !== Math.sign(c.v) && Math.abs(lz) < c.L / 2 - 0.4)) continue;
        const last = VEH.sinceHit.get(T) || -9; if (CITY.C.t - last < 1.2) continue; VEH.sinceHit.set(T, CITY.C.t);
        use(T); const dir = f.clone().multiplyScalar(Math.sign(c.v)), kmh = Math.round(sp * 3.6), side = lx > 0 ? 'R' : 'L';
        // the bumper sweeps the legs, then the trunk folds onto the bonnet and the whole body is thrown ahead and up
        const J = 70 * sp;
        npc.impulse(body.segs['shin' + side], partPos(T, 'shin' + side), { x: dir.x * J * 0.12, y: 0, z: dir.z * J * 0.12 });
        npc.impulse(body.segs['shin' + (side === 'L' ? 'R' : 'L')], partPos(T, 'shin' + (side === 'L' ? 'R' : 'L')), { x: dir.x * J * 0.08, y: 0, z: dir.z * J * 0.08 });
        npc.impulse(body.segs.pelvis, partPos(T, 'pelvis'), { x: dir.x * J * 0.2, y: J * (sp > 6 ? 0.08 : 0.02), z: dir.z * J * 0.2 });
        npc.impulse(body.segs.thorax, partPos(T, 'thorax'), { x: dir.x * J * 0.16, y: J * (sp > 6 ? 0.07 : 0.0), z: dir.z * J * 0.16 });
        phys.pain = Math.min(1, phys.pain + 0.25 + sp * 0.03); npc.stagger = 1;
        if (sp > 6.5) { phys.legBroken[side] = true; rag.fracture('shinX' + side); phys.addInjury('carLeg' + side, (side === 'L' ? 'Left' : 'Right') + ' tibia and fibula broken by the bumper', 1); }
        if (sp > 10) { phys.headImpact(sp * 0.55); phys.addInjury('carHead', 'Head struck the windscreen', 1); }
        if (sp > 14) { phys.pelvisBroken = true; phys.addInjury('carPelvis', 'Pelvis fractured', 2); phys.addBleed('Pelvic fracture', 60 + sp * 4, null); }
        phys.addInjury('carHit', 'Struck by a car at ' + kmh + ' km/h', sp > 10 ? 2 : 1); phys.addBleed('Road abrasions', 6 + sp * 1.5, null);
        c.v *= 0.82; audio.thud(Math.min(1, sp / 12));
        if (c === VEH.driving) CITY.heat = Math.min(5, CITY.heat + 1);
      }
    }
    function carVisual(c, dt) {
      c.g.position.set(c.x, 0, c.z); c.g.rotation.set(c.pitch, c.ry, c.roll, 'YXZ');
      c.rot = (c.rot || 0) + c.v * dt / 0.34; for (const w of c.wheels) { w.t.rotation.set(c.rot, w.front ? c.steer : 0, Math.PI / 2, 'YXZ'); }
      c.syncBox();
    }
    // the player's car: W/S throttle and brake (reverse once stopped), A/D steer, Space handbrake
    function drivePlayer(dt) {
      const c = VEH.driving, k = state.keys, f = carFwd(c);
      const thr = k.w ? 1 : 0, brk = k.s ? 1 : 0, hb = k[' '] ? 1 : 0, st = (k.a ? 1 : 0) - (k.d ? 1 : 0);
      const maxSt = 0.62 / (1 + Math.abs(c.v) / 11); c.steer += (st * maxSt - c.steer) * Math.min(1, dt * 6);
      if (thr) c.v += (c.v < 0 ? 12 : 7.5 * (1 - Math.max(0, c.v) / 34)) * dt;
      if (brk) c.v -= (c.v > 0.3 ? 13 : 4.5) * dt; if (c.v < -8) c.v = -8;
      if (!thr && !brk) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), (0.7 + Math.abs(c.v) * 0.05) * dt);
      if (hb) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 6 * dt);
      const wb = c.L * 0.62, yaw = (c.v * Math.tan(c.steer) / wb) * (hb ? 1.7 : 1) + c.spin; c.spin *= Math.exp(-dt * 3);
      c.ry += yaw * dt; c.x += Math.sin(c.ry) * c.v * dt; c.z += Math.cos(c.ry) * c.v * dt;
      c.roll += (-yaw * Math.abs(c.v) * 0.004 - c.roll) * Math.min(1, dt * 5); c.pitch += (-(thr - brk) * 0.012 * Math.min(1, Math.abs(c.v) / 3) - c.pitch) * Math.min(1, dt * 4);
      carCollide(c, dt); carHits(c); carVisual(c, dt);
    }
    // ambient traffic on the four through-streets: right-hand lanes 3 m off the centre line; at junctions some turn
    const L0 = () => CITY.C.layout;
    function laneXZ(tr) { const o = 2.6 * tr.dir; return tr.axis === 'z' ? [tr.c - o, tr.t] : [tr.t, tr.c + o]; }
    function laneRY(tr) { return tr.axis === 'z' ? (tr.dir > 0 ? 0 : Math.PI) : (tr.dir > 0 ? Math.PI / 2 : -Math.PI / 2); }
    function spawnTraffic(n) {
      const lay = L0();
      for (let i = 0; i < n; i++) { const cr = CITY.C.makeCar(0, 0, 0, true); const tr = { car: cr, axis: Math.random() < 0.5 ? 'z' : 'x', c: lay.centres[Math.floor(Math.random() * 2)], dir: Math.random() < 0.5 ? 1 : -1, t: (Math.random() - 0.5) * lay.HALF * 1.6, v: 9, junc: null };
        const [x, z] = laneXZ(tr); cr.x = x; cr.z = z; cr.ry = laneRY(tr); cr.lit = true; carVisual(cr, 0); VEH.traffic.push(tr); }
      CITY.C.setTime(CITY.C.hour);
    }
    function trafficStep(dt) {
      const lay = L0();
      for (const tr of VEH.traffic) {
        const c = tr.car; if (c.driven) continue;
        // anything in the lane ahead (a person, a car, the player's car): slow and stop short of it
        const f = carFwd(c); let gap = 99;
        const look = (px, pz, wdt) => { const dx = px - c.x, dz = pz - c.z, a = dx * f.x + dz * f.z, lat = Math.abs(dx * f.z - dz * f.x); if (a > 0 && a < 22 && lat < wdt) gap = Math.min(gap, a); };
        for (const T of CITY.subs) if (T.body.root.visible && !T.inCar) { const p = partPos(T, 'pelvis'); look(p.x, p.z, 1.7); }
        for (const o of CITY.C.cars) if (o !== c && (o.traffic || o.driven || Math.abs(o.v) > 0.1 || true)) look(o.x, o.z, 1.5);
        const want = gap < 6.5 ? 0 : gap < 16 ? 9 * (gap - 6.5) / 9.5 : 10.5;
        tr.v += Math.max(-9 * dt, Math.min(3 * dt, want - tr.v)); tr.t += tr.v * tr.dir * dt;
        // junctions: straight on mostly, sometimes a turn onto the cross street
        for (const j of lay.centres) { const before = tr.t - tr.v * tr.dir * dt; if ((before - j) * (tr.t - j) <= 0 && tr.junc !== j) { tr.junc = j; if (Math.random() < 0.35) { const ndir = Math.random() < 0.5 ? 1 : -1, here = laneXZ(tr); tr.axis = tr.axis === 'z' ? 'x' : 'z'; const oldc = tr.c; tr.c = j; tr.dir = ndir; tr.t = tr.axis === 'z' ? here[1] : here[0]; } } }
        if (Math.abs(tr.t) > lay.HALF - 4) { tr.dir = -Math.sign(tr.t); tr.t = Math.sign(tr.t) * (lay.HALF - 4.5); tr.junc = null; } // the end of the street: turn round
        const [x, z] = laneXZ(tr), ry = laneRY(tr); let dr = ry - c.ry; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        c.x += (x - c.x) * Math.min(1, dt * 2.5); c.z += (z - c.z) * Math.min(1, dt * 2.5); c.ry += dr * Math.min(1, dt * 3); c.steer = Math.max(-0.5, Math.min(0.5, dr)); c.v = tr.v; c.pitch = 0; c.roll = -dr * 0.03;
        carHits(c); carVisual(c, dt);
      }
    }
    // getting in and out (F): into the nearest car within reach; out on the driver's side
    function enterCar() {
      const S = CITY.player; if (!S.phys.conscious || S.npc.posture !== 'stand') return;
      const p = partPos(S, 'pelvis'); let best = null, bd = 3.4; for (const c of CITY.C.cars) { const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = c; } }
      if (!best) { CITY.msg = 'No car close enough'; CITY.msgT = 1.5; return; }
      const tr = VEH.traffic.find((t) => t.car === best); if (tr) { best.v = tr.v; VEH.traffic.splice(VEH.traffic.indexOf(tr), 1); best.traffic = false; } // pulled from the traffic
      VEH.driving = best; best.driven = true; S.inCar = best; if (S.gunModel) S.gunModel.visible = false;
      S.body.root.visible = false; S.rag.stop(); CITY.camYaw = null; CITY.C.setTime(CITY.C.hour);
    }
    function exitCar() {
      const S = CITY.player, c = VEH.driving; if (Math.abs(c.v) > 4) { CITY.msg = 'Slow down to get out'; CITY.msgT = 1.2; return; }
      const f = carFwd(c), door = CITY.C.free(new V3(c.x + f.z * (c.W / 2 + 0.7), 0, c.z - f.x * (c.W / 2 + 0.7)));
      c.driven = false; c.v = 0; VEH.driving = null; S.inCar = null; use(S);
      S.body.root.position.copy(door); S.body.root.rotation.set(0, c.ry, 0); S.body.root.visible = true; S.staticAt = null;
      S.npc = G.NPC(S.body, S.phys, S.rag, { threat: () => CITY.aimPt, event: npcEvent, fighter: true, ai: (N) => playerIntent(S, N) });
      if (S.gunModel) S.gunModel.visible = true; nearStatics(S); state.yaw = c.ry + Math.PI; CITY.C.setTime(CITY.C.hour);
    }
    CITY.debugPed = (T, at) => spawnPed(T, at); // tests
    CITY.useKey = () => { if (VEH.driving) exitCar(); else enterCar(); };
    // chase camera behind the car, swinging back behind it as it drives; the mouse looks round
    function carCamera(dt) {
      const c = VEH.driving, behind = c.ry + Math.PI * (c.v < -1 ? 0 : 1);
      if (CITY.lookT > 0) CITY.lookT -= dt; else { let d = behind - state.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); state.yaw += d * Math.min(1, dt * 2.2); state.pitch += (-0.18 - state.pitch) * Math.min(1, dt * 2); }
      state.pitch = Math.max(-0.8, Math.min(0.4, state.pitch));
      const fwd = new V3(-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch));
      const piv = new V3(c.x, 1.5, c.z), dist = 6 + Math.min(3, Math.abs(c.v) * 0.08), want = piv.clone().addScaledVector(fwd, -dist).add(new V3(0, 0.6, 0));
      const dir = want.clone().sub(piv), L = dir.length(); dir.normalize(); const hit = CITY.C.ray(piv, dir, L + 0.3);
      camera.position.copy(hit && !hit.n.y ? piv.clone().addScaledVector(dir, Math.max(1.5, hit.t - 0.4)) : want);
      state.shake = Math.max(0, (state.shake || 0) - dt * 4); const sk = state.shake * state.shake * 0.01;
      camera.rotation.set(state.pitch + (Math.random() - 0.5) * sk, state.yaw + (Math.random() - 0.5) * sk, 0); camera.updateMatrixWorld();
      camera.fov += ((62 + Math.min(14, Math.abs(c.v) * 0.45)) - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); // the view widens with speed
      state.pos.copy(camera.position); CITY.aimPt.set(c.x, 1.2, c.z); CITY.C.follow(piv);
      // keep the (stopped) body with the car, so the responders hunt the car
      const S = CITY.player; for (const k in S.rag.parts) { const b = S.rag.parts[k].b; b.position.set(c.x + (b.position.x - (S.carPel ? S.carPel.x : b.position.x)), b.position.y, c.z + (b.position.z - (S.carPel ? S.carPel.z : b.position.z))); }
      S.carPel = new V3(c.x, 0, c.z);
    }
    // ---------------- the minimap ----------------
    let mapCv = null, mapBase = null;
    function drawMap() {
      if (!mapCv) { mapCv = document.createElement('canvas'); mapCv.id = 'minimap'; mapCv.width = mapCv.height = 180; document.getElementById('app').appendChild(mapCv); }
      mapCv.hidden = !CITY.on || cfg.map === false; if (mapCv.hidden) return;
      const lay = L0(), x = mapCv.getContext('2d'), R = 90, sc = 1.5, S = CITY.player, me = VEH.driving ? new V3(VEH.driving.x, 0, VEH.driving.z) : partPos(S, 'pelvis');
      x.save(); x.clearRect(0, 0, 180, 180); x.beginPath(); x.arc(R, R, R - 2, 0, 6.283); x.clip();
      x.fillStyle = 'rgba(28,34,38,0.86)'; x.fillRect(0, 0, 180, 180);
      x.translate(R, R); x.rotate(state.yaw); x.scale(sc, sc); x.translate(-me.x, -me.z);
      x.fillStyle = '#3a8fa4'; x.fillRect(lay.HALF + 38, -400, 600, 800); x.fillStyle = '#b8a77e'; x.fillRect(lay.HALF + 2, -400, 36, 800);
      x.fillStyle = '#5b6266'; x.fillRect(-lay.HALF - 6, -lay.HALF - 6, lay.HALF * 2 + 8, lay.HALF * 2 + 12);
      for (const [bx, bz] of lay.blockC) { const s2 = lay.BLOCK + lay.SIDE * 2; x.fillStyle = '#9aa0a0'; x.fillRect(bx - s2 / 2, bz - s2 / 2, s2, s2); x.fillStyle = '#c9c5bb'; x.fillRect(bx - lay.BLOCK / 2, bz - lay.BLOCK / 2, lay.BLOCK, lay.BLOCK); }
      for (const c of CITY.C.cars) if (c.traffic || c.driven) { x.fillStyle = c.driven ? '#ffffff' : '#e8d070'; x.fillRect(c.x - 1.2, c.z - 1.2, 2.4, 2.4); }
      for (const T of CITY.subs) { if (!T.body.root.visible || T === S) continue; const p = partPos(T, 'pelvis'); x.fillStyle = T.ai && T.ai.cop ? '#ff4b3e' : T.phys.dead ? '#6a1a1a' : '#f2f2f2'; x.beginPath(); x.arc(p.x, p.z, T.ai && T.ai.cop ? 2.2 : 1.4, 0, 6.283); x.fill(); }
      x.restore();
      // the player: an arrow in the centre pointing the way the camera looks; north marker on the rim
      x.save(); x.translate(R, R); x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(0, -8); x.lineTo(6, 6); x.lineTo(0, 2); x.lineTo(-6, 6); x.closePath(); x.fill(); x.restore();
      const na = state.yaw + Math.PI; x.fillStyle = '#f0d27a'; x.font = '600 12px IBM Plex Mono, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('N', R + Math.sin(-na + Math.PI) * 0 + Math.cos(na - Math.PI / 2) * 0, 12);
      x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 2; x.beginPath(); x.arc(R, R, R - 2, 0, 6.283); x.stroke();
    }
    // ---- the player's own body, driven by the controls
    function playerIntent(S, N) {
      const ai = S.ai, P = S.phys, dt = Math.max(0, N.clock - (ai.clock || N.clock)); ai.clock = N.clock;
      const k = state.keys, fwd = new V3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw)), right = new V3(-fwd.z, 0, fwd.x);
      const mv = fwd.clone().multiplyScalar((k.w ? 1 : 0) - (k.s ? 1 : 0)).addScaledVector(right, (k.d ? 1 : 0) - (k.a ? 1 : 0));
      const usable = (sd) => !P.armBroken[sd] && !S.rag.parts['hand' + sd].severed && !(P.gripLost && P.gripLost[sd]) && !(P.armExtLost && P.armExtLost[sd]);
      const gh = usable('R') ? 'R' : usable('L') ? 'L' : null;
      ai.hipT = Math.max(0, ai.hipT - dt); const aiming = !!gh && (CITY.aimHeld || ai.hipT > 0) && ai.reloadT <= 0;
      ai.target = CITY.aimPt.clone();
      let face = ai.faceKeep != null ? ai.faceKeep : Math.atan2(fwd.x, fwd.z);
      if (aiming) face = Math.atan2(fwd.x, fwd.z); else if (mv.lengthSq() > 0.01) face = Math.atan2(mv.x, mv.z);
      ai.faceKeep = face;
      const intent = { face, move: mv.lengthSq() > 0.01 ? { x: mv.normalize().x, z: mv.z } : null, run: !!k.shift && !aiming, aim: null, gunHand: gh || 'R', crouch: CITY.crouch ? 1 : 0 };
      if (aiming) { const sh = new V3(); S.body.segs['uarm' + gh].g.getWorldPosition(sh); intent.aim = sh.addScaledVector(ai.target.clone().sub(sh).normalize(), 0.6); }
      if (ai.reloadT > 0) { ai.reloadT -= dt; if (ai.reloadT <= 0) ai.ammo = WMAG[ai.wi]; }
      else if (CITY.reloadReq || ai.ammo <= 0) { const w = G.WEAPONS[ai.wi]; ai.reloadT = w.cls === 'shotgun' ? 0.5 * WMAG[ai.wi] * 0.6 : w.model === 'bolt' ? 2.4 : w.model === 'revolver' ? 3.2 : 2.2; ai.reloadTot = ai.reloadT; ai.burst = 0; }
      CITY.reloadReq = false; ai.fireT -= dt;
      holdGun(S, N, intent, dt, ai.target, true);
      const w = G.WEAPONS[ai.wi], auto = w.cls === 'rifle' && w.model !== 'bolt', ready = aiming && S.gs && S.gs.mode === 'aim' && S.gs.modeT > 0.12 && ai.fireT <= 0 && ai.ammo > 0 && ai.reloadT <= 0 && P.conscious && !ai.gunDown;
      ai.wantFire = ready && (CITY.fireReq || (auto && CITY.fireHeld)); if (ai.wantFire) { CITY.fireReq = false; ai.burst = 99; }
      ai.handErr = 0.03; ai.intent = intent; return intent;
    }
    // ---- pedestrians: walk the sidewalk loops, stop now and then; panic and run (or cower) when shooting starts
    function pedIntent(S, N) {
      const ai = S.ai, dt = Math.max(0, N.clock - (ai.clock || N.clock)); ai.clock = N.clock; const me = partPos(S, 'pelvis');
      if (ai.alarm) {
        ai.alarmT -= dt; if (ai.alarmT <= 0) ai.alarm = null;
        if (ai.cower) return { face: Math.atan2(ai.alarm ? ai.alarm.from.x - me.x : 0, ai.alarm ? ai.alarm.from.z - me.z : 1), crouch: 1, move: null };
        const away = me.clone().sub(ai.alarm ? ai.alarm.from : me); away.y = 0; if (away.lengthSq() < 0.01) away.set(1, 0, 0); away.normalize();
        if (!ai.fleeTo || ai.fleeTo.distanceTo(me) < 2) ai.fleeTo = CITY.C.free(me.clone().addScaledVector(away, 22)); const w = cityWay(S, me, ai.fleeTo), dd = w.clone().sub(me); dd.y = 0; dd.normalize();
        const st = steer(S, me, dd.lengthSq() ? dd : away, null); return { face: Math.atan2(st.x, st.z), move: { x: st.x, z: st.z }, run: true };
      }
      if (ai.idleT > 0) { ai.idleT -= dt; return { face: null, move: null }; }
      const t = ai.loop[ai.wp], d = new V3(t[0] - me.x, 0, t[1] - me.z);
      if (d.length() < 1.2) { ai.wp = (ai.wp + ai.dir + 4) % 4; if (Math.random() < 0.35) ai.idleT = 2 + Math.random() * 5; }
      d.normalize(); const st = steer(S, me, d, null);
      return { face: Math.atan2(st.x, st.z), move: { x: st.x, z: st.z }, run: false };
    }
    // a gunshot: everyone within earshot reacts; shooting near people raises the heat
    CITY.shot = (S) => {
      const from = partPos(S, 'thorax');
      for (const T of CITY.peds) { if (!T.ai || !T.body.root.visible || !T.phys.conscious) continue; const d = partPos(T, 'pelvis').distanceTo(from); if (d < 45) { if (!T.ai.alarm) T.ai.cower = Math.random() < 0.3; T.ai.alarm = { from: from.clone() }; T.ai.alarmT = 10 + Math.random() * 8; if (d < 25 && T.npc.startle) T.npc.startle(1); } }
      if (S === CITY.player) { CITY.quietT = 0; const near = CITY.peds.some((T) => T.body.root.visible && partPos(T, 'pelvis').distanceTo(from) < 25); if (near && (CITY.lastShotHeat || 0) < performance.now() - 3000) { CITY.lastShotHeat = performance.now(); CITY.heat = Math.min(5, CITY.heat + 0.35); } }
    };
    CITY.hit = (S, T) => { if (S === CITY.player && T && T !== S) CITY.heat = Math.min(5, CITY.heat + (T.ai && T.ai.cop ? 1.2 : 1)); };
    // ---- camera: over the shoulder, closer and tighter while aiming, never through a wall
    function cityCamera(dt) {
      const S = CITY.player, P = partPos(S, 'thorax'), aiming = CITY.aimHeld || (S.ai && S.ai.hipT > 0), want = aiming ? 1.45 : 3.2;
      CITY.camD += (want - CITY.camD) * Math.min(1, dt * 8);
      state.pitch = Math.max(-1.1, Math.min(0.8, state.pitch));
      const fwd = new V3(-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch)), right = new V3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
      const pivot = (CITY.camPivot || (CITY.camPivot = P.clone())).lerp(new V3(P.x, P.y + 0.32, P.z), Math.min(1, dt * 12));
      const want3 = pivot.clone().addScaledVector(fwd, -CITY.camD).addScaledVector(right, aiming ? 0.5 : 0.42);
      const dir = want3.clone().sub(pivot), L = dir.length(); dir.normalize(); const hit = CITY.C.ray(pivot, dir, L + 0.3);
      camera.position.copy(hit ? pivot.clone().addScaledVector(dir, Math.max(0.3, hit.t - 0.3)) : want3); camera.position.y = Math.max(0.25, camera.position.y);
      state.shake = Math.max(0, (state.shake || 0) - dt * 6); const sk = state.shake * state.shake * 0.006;
      camera.rotation.set(state.pitch + (Math.random() - 0.5) * sk, state.yaw + (Math.random() - 0.5) * sk, 0); camera.updateMatrixWorld();
      camera.fov += ((aiming ? 50 : 62) - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix();
      state.pos.copy(camera.position); // (sound is heard from the camera)
      // what the crosshair is on: the city, or the nearest person along the line
      const o = camera.position.clone(), cd = new V3(0, 0, -1).applyQuaternion(camera.quaternion); let t = 120; const h = CITY.C.ray(o, cd, 120); if (h) t = h.t;
      for (const T of CITY.subs) { if (T === S || !T.body.root.visible) continue; for (const n of ['head', 'thorax', 'abdomen', 'pelvis']) { const c = partPos(T, n), v = c.clone().sub(o), a = v.dot(cd); if (a > 0 && a < t && v.addScaledVector(cd, -a).length() < (n === 'head' ? 0.11 : 0.17)) t = a; } }
      CITY.aimPt.copy(o).addScaledVector(cd, Math.max(2.5, t));
      CITY.C.follow(P);
    }
    CITY.update = (dt) => {
      const S = CITY.player; stepDrops(dt); CITY.C.update(dt); if (scene.environment !== CITY.C.env) scene.environment = CITY.C.env; renderer.toneMappingExposure = CITY.C.exposure;
      if (VEH.driving) drivePlayer(dt); trafficStep(dt); drawMap();
      for (const c of CITY.C.cars) if (!c.traffic && !c.driven && Math.abs(c.v) > 0.05) { c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 5 * dt); c.x += Math.sin(c.ry) * c.v * dt; c.z += Math.cos(c.ry) * c.v * dt; carCollide(c, dt); carHits(c); carVisual(c, dt); } // a car left rolling
      for (const T of CITY.subs) { if (!T.body.root.visible) continue; if (T.ai && T.gunModel) gunTick(T); const p = partPos(T, 'pelvis'); if (!T.staticAt || T.staticAt.distanceTo(p) > 2.5) nearStatics(T); }
      // the heat: responders matching it come in; it cools off once they have lost him and he has stopped shooting
      CITY.quietT += dt; const seen = CITY.cops.some((T) => T.ai && T.body.root.visible && T.ai.lastSeen < 6);
      if (CITY.quietT > 15 && !seen) CITY.heat = Math.max(0, CITY.heat - dt * 0.08);
      const want = Math.min(NCOP, Math.ceil(CITY.heat - 0.05)), live = CITY.cops.filter((T) => T.body.root.visible && T.ai);
      if (live.length < want && S.phys.conscious) { const T = CITY.cops.find((c) => !c.body.root.visible); if (T && (CITY.copT = (CITY.copT || 0) - dt) <= 0) { spawnCop(T); CITY.copT = 4; } }
      if (CITY.heat < 0.1) for (const T of live) if (T.ai.lastSeen > 8 && !T.phys.dead) despawn(T);
      // the player down: a few seconds, then back on his feet at the start, the heat gone
      if (!S.inCar && (!S.phys.conscious || S.phys.dead || (S.npc.posture !== 'stand' && S.ai.downT > 20))) { CITY.downT += dt; if (CITY.downT > 7) { for (const T of CITY.cops) if (T.body.root.visible) despawn(T); CITY.heat = 0; spawnPlayer(); } } else CITY.downT = 0;
      for (const T of CITY.subs) if (T.ai && T.ai.player) T.ai.downT = T.npc.posture === 'stand' ? 0 : (T.ai.downT || 0) + dt;
      // a quiet street refills: someone who has been lying dead a while out of sight is replaced by a new passer-by
      for (const T of CITY.peds) { if (!T.body.root.visible) continue; if (T.phys.dead) T.deadT = (T.deadT || 0) + dt; else T.deadT = 0; const far = partPos(T, 'pelvis').distanceTo(partPos(S, 'pelvis')); if ((T.deadT > 90 && far > 35) || (far > 70 && !T.ai.alarm && T.phys.conscious)) spawnPed(T); } // the street round him stays alive
      // HUD: the heat, and a message line
      CITY.msgT -= dt;
      if (cityHud && Math.floor(CITY.C.t * 4) !== CITY.hudT) { CITY.hudT = Math.floor(CITY.C.t * 4);
        const pips = Math.ceil(CITY.heat - 0.05); let h = '<div class="heat">' + (pips > 0 ? 'HEAT ' + '<b>' + '●'.repeat(pips) + '</b>' + '○'.repeat(5 - pips) : '') + '</div>';
        const ai = S.ai, w = ai && G.WEAPONS[ai.wi], hh = Math.floor(CITY.C.hour), mm = Math.floor((CITY.C.hour - hh) * 60);
        h += '<div class="clock">' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + '</div>';
        if (VEH.driving) h += '<div class="ammo">' + Math.round(Math.abs(VEH.driving.v) * 3.6) + ' km/h</div>'; else if (w) h += '<div class="ammo">' + w.name + ' · ' + (ai.reloadT > 0 ? 'reloading' : ai.ammo + ' / ' + WMAG[ai.wi]) + '</div>';
        const m = CITY.downT > 0 ? 'Down. Back on your feet in ' + Math.max(1, Math.ceil(7 - CITY.downT)) : CITY.msgT > 0 ? CITY.msg : '';
        h += '<div class="msg">' + m + '</div>'; cityHud.innerHTML = h; }
    };
    CITY.camera = (dt) => (VEH.driving ? carCamera(dt) : cityCamera(dt));
    CITY.start = () => {
      if (D.on) D.stop();
      if (!CITY.C) { CITY.C = G.buildCity(scene, renderer); CITY.props = CITY.C.colliders.map((c) => ({ box: c.box, low: c.low, h: c.h, T: { m: 'concrete' }, mesh: { position: c.box.getCenter(new V3()) }, bodies: [] })); }
      if (!cityHud) { cityHud = document.createElement('div'); cityHud.id = 'cityHud'; document.getElementById('app').appendChild(cityHud); }
      while (subjects.length < 1 + NPED + NCOP) newSubject();
      CITY.player = primary; CITY.peds = subjects.slice(1, 1 + NPED); CITY.cops = subjects.slice(1 + NPED, 1 + NPED + NCOP); CITY.subs = [CITY.player, ...CITY.peds, ...CITY.cops];
      CITY.on = true; D.props = CITY.props; cityScenery(true); document.body.classList.add('city'); cityHud.hidden = false; gun.raise = 0; state.threat = null; ui.report(null);
      state.yaw = Math.PI; state.pitch = -0.12; // looking along the sidewalk CITY.heat = 0; CITY.camPivot = null; world.clear(); projectiles.clear(); pending.length = 0;
      spawnPlayer(); for (const T of CITY.peds) spawnPed(T); for (const T of CITY.cops) despawn(T);
      if (!VEH.traffic.length) { spawnTraffic(7); CITY.props = CITY.C.colliders.map((c) => ({ box: c.box, low: c.low, h: c.h, T: { m: 'concrete' }, mesh: { position: c.box.getCenter(new V3()) }, bodies: [] })); D.props = CITY.props; } CITY.C.setTime(17.5);
      CITY.msg = 'WASD move · Shift run · right mouse aim · left mouse fire · F car in/out · R reload · C crouch · T +1 hour · O leave'; CITY.msgT = 10;
    };
    CITY.stop = () => {
      if (VEH.driving) { VEH.driving.driven = false; VEH.driving.v = 0; VEH.driving = null; CITY.player.inCar = null; } if (mapCv) mapCv.hidden = true;
      CITY.on = false; for (const T of CITY.subs) { if (T !== primary) despawn(T); else { if (T.gunModel) { scene.remove(T.gunModel); T.gunModel = null; } T.ai = null; } T.rag.setWalls(true); T.rag.setStatics([]); }
      D.props = []; cityScenery(false); document.body.classList.remove('city'); if (cityHud) cityHud.hidden = true; if (document.pointerLockElement) document.exitPointerLock();
      primary.body.root.position.set(0, 0, 0); primary.body.root.rotation.set(0, 0, 0); camera.fov = 62; camera.updateProjectionMatrix(); gun.raise = 1; state.pos.set(0, 1.62, 3); state.yaw = 0; state.pitch = -0.06; use(primary); reset();
    };
    CITY.setWeapon = (i) => { const S = CITY.player; if (!S || !S.ai || !G.WEAPONS[i]) return; giveGun(S, i); S.ai.ammo = WMAG[i]; S.ai.reloadT = 0; S.ai.gunDown = false; };
    // security cameras in the top corners (and the free view)
    const CAMS = [null, new V3(-3.7, 2.9, -2.2), new V3(3.7, 2.9, -2.2), new V3(3.7, 2.9, 6.8), new V3(-3.7, 2.9, 6.8)];
    const camBody = new THREE.Group(); for (const c of CAMS) if (c) { const g = new THREE.Group(); const hous = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.22), new THREE.MeshStandardMaterial({ color: 0xd9d9d4, roughness: 0.5 })); const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 14), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.12; const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); led.position.set(0.04, 0.03, 0.11); hous.add(lens, led); g.add(hous); g.position.copy(c); g.lookAt(0, 1, 2.2); camBody.add(g); } scene.add(camBody);
    D.cycleCam = () => { D.cam = (D.cam + 1) % CAMS.length; };
    const hudEl = document.createElement('div'); hudEl.id = 'duelHud'; hudEl.hidden = true; document.getElementById('app').appendChild(hudEl);
    // guns in hand: aimed along the arm toward the target, or carried in the hand; dropped when the hand lets go
    function gunTick(S) {
        if (S.ai && S.ai.knifeMesh) { const kh = S.rag.parts['hand' + (S.ai.knifeHand || 'R')].b, kq = new THREE.Quaternion(kh.quaternion.x, kh.quaternion.y, kh.quaternion.z, kh.quaternion.w), dn = new V3(0, -1, 0).applyQuaternion(kq), fw2 = new V3(0, 0, 1).applyQuaternion(kq);
          S.ai.knifeMesh.position.set(kh.position.x, kh.position.y, kh.position.z).addScaledVector(dn, 0.03); S.ai.knifeMesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new V3(), fw2.multiplyScalar(-1), dn)); } // blade out past the thumb
        if (!S.ai || !S.gunModel || S.ai.gunDown) return;
        if (S.ai.flashN > 0) S.ai.flashN--; else S.ai.flash.intensity = 0;
        const gh = S.npc.gunHand || 'R', hb = S.rag.parts['hand' + gh].b, hp = new V3(hb.position.x, hb.position.y, hb.position.z);
        if (S.gs && S.gs.ro && S.gs.mode !== 'ground') {
          // held: the gun sits where the body puts it; if the hand has not got there (shoved, staggering) the gun goes with the hand
          const gp = S.ai.intent && S.ai.intent.hold; S.gunModel.quaternion.copy(S.gs.rq); S.gunModel.position.copy(S.gs.ro);
          if (gp) { const err = hp.distanceTo(gp), k = Math.max(0, Math.min(1, (err - 0.05) / 0.12)); if (k > 0) S.gunModel.position.addScaledVector(hp.clone().sub(gp), k); }
        } else if (S.npc.aiming && S.ai.target) { const m4 = new THREE.Matrix4().lookAt(hp, S.ai.target, new V3(0, 1, 0)); S.gunModel.quaternion.setFromRotationMatrix(m4); S.gunModel.position.copy(hp).add(new V3(0, 0.035, 0).applyQuaternion(S.gunModel.quaternion)); }
        else if (S.npc.posture === 'stand' && S.phys.conscious) {
          // low ready: muzzle forward and down, carried in the hand
          const tq = S.rag.parts.thorax.b.quaternion, fw = new V3(0, 0, 1).applyQuaternion(new THREE.Quaternion(tq.x, tq.y, tq.z, tq.w)); fw.y = 0; fw.normalize();
          const m4 = new THREE.Matrix4().lookAt(hp, hp.clone().addScaledVector(fw, 1).add(new V3(0, -0.8, 0)), new V3(0, 1, 0)); S.gunModel.quaternion.setFromRotationMatrix(m4); S.gunModel.position.copy(hp);
        } else { const q = new THREE.Quaternion(hb.quaternion.x, hb.quaternion.y, hb.quaternion.z, hb.quaternion.w); S.gunModel.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))); S.gunModel.position.copy(hp); }
        // fingers: closed round the grip / forend, half closed pressing on a wound, otherwise relaxed
        if (S.body.setGrip) for (const sd of ['L', 'R']) {
          const N = S.npc, it = S.ai.intent || {}, tgt = sd === N.gunHand && N.aiming ? it.hold : sd === N.supHand ? it.support : null, hpos = partPos(S, 'hand' + sd);
          const k = S.phys.gripLost && S.phys.gripLost[sd] ? 0.05 : tgt && hpos.distanceTo(tgt) < 0.1 ? (sd === N.gunHand ? 1 : 0.8) : N.clutching && N.clutching[sd] ? 0.4 : S.phys.conscious ? 0.22 : 0.3;
          S.body.setGrip(sd, k);
        }
        if ((D.phase === 'fight' || CITY.on) && S.ai.wantFire) aiFire(S);
    }
    D.update = (dt, rdt) => {
      D.t += rdt; D.clock += dt; stepDrops(dt);
      const [A, B] = D.fighters;
      for (const S of D.fighters) gunTick(S);
      if (D.phase === 'ready' && D.t > 2.5) { D.phase = 'fight'; D.t = 0; }
      if (D.phase === 'fight') {
        const oa = out(A), ob = out(B);
        // one man is out: the other gets a few seconds to walk up and finish him before the round is called
        const loser = oa && !ob ? A : ob && !oa ? B : null, winnerS = loser ? D.fighters[1 - loser.idx] : null;
        if (loser && !loser.phys.dead && !loser.phys.brainDestroyed && winnerS && winnerS.npc.posture === 'stand' && winnerS.ai && winnerS.ai.canFight && !winnerS.ai.gunDown) { D.finishBy = D.finishBy || D.t + 14; } // time to walk up and finish him
        if ((oa || ob) && D.finishBy && D.t < D.finishBy && !(loser && (loser.phys.dead || loser.phys.brainDestroyed))) { /* still finishing */ }
        else if (oa || ob || D.t > 120) { D.finishBy = null; D.phase = 'over'; D.t = 0; D.winner = oa && ob ? -1 : oa ? 1 : ob ? 0 : Math.abs(hurtOf(A) - hurtOf(B)) > 0.3 ? (hurtOf(A) < hurtOf(B) ? 0 : 1) : -1; /* time: the less hurt takes it */ if (D.winner >= 0) D.score[D.winner]++; }
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
    viscera.update(dt * slow); smearBody(); if (body.clothTick) body.clothTick(dt * slow); if (body.flapTick) body.flapTick(dt * slow);
    // hands get bloody: pressing a bleeding wound coats the palm and fingers within seconds; touching a pool on the
    // floor (crawling, pushing up) smears them too. It stays on (it dries, it does not go away).
    for (const sd of ['L', 'R']) {
      const cw = npc.clutching && npc.clutching[sd], h = rag.parts['hand' + sd] && rag.parts['hand' + sd].b;
      let add = 0; if (cw && (cw.rate || 0) > 0) add += dt * slow * Math.min(0.5, 0.04 + cw.rate / 600);
      if (h && h.position.y < 0.06 && world.depthAt(h.position.x, h.position.z) > 0.03) add += dt * slow * 0.4;
      if (add > 0) handBlood[sd] = Math.min(1, handBlood[sd] + add);
    }
    // the jaw: shut while calm; breathing through the mouth when working hard or hurt; slack when unconscious; dropped
    // open in death; gaping with each agonal gasp; wide with a scream; hanging when broken
    if (body.setJaw) {
      const J = S.jaw || (S.jaw = { a: 0, voice: 0, vt: 0 }), br = Math.max(0, Math.sin(npc.breath || 0));
      let tgt = phys.dead ? 0.22 : !phys.conscious ? (phys.agonal ? 0.12 + 0.18 * br : 0.1 + 0.025 * br) : (phys.rr > 24 || phys.frac() > 0.2 || phys.pain > 0.6 ? 0.03 + 0.07 * br : 0);
      if (J.vt > 0 && !phys.dead) { J.vt -= dt * slow; tgt = Math.max(tgt, J.voice); }
      if (headFx.jawBroken) tgt = Math.max(tgt, 0.3 + 0.05 * br);
      J.a += (tgt - J.a) * Math.min(1, dt * slow * (tgt > J.a ? 14 : 5)); body.setJaw(J.a);
      if (headFx.mouth) { headFx.mouthK = Math.min(0.85, (headFx.mouthK || 0) + dt * slow * 0.25); body.mouthBlood(headFx.mouthK); }
    }
    if (body.setLids) { if (!body.lidToned) body.lidToned = body.lidTone(); body.setLids(npc.lids || 0, npc.lids || 0); body.lookEyes(npc.eyePt, npc.eyeWander); }
    // the hands of a subject who is not holding anything: relaxed, half shut on a wound, clenched in pain, slack when out
    if (body.setGrip && !(S.ai && S.gunModel)) { const k0 = phys.dead ? 0.35 : !phys.conscious ? 0.3 : phys.pain > 0.55 && npc.posture !== 'down' ? 0.6 : 0.18; for (const sd of ['L', 'R']) body.setGrip(sd, npc.clutching && npc.clutching[sd] ? 0.4 : phys.gripLost && phys.gripLost[sd] ? 0.05 : k0); }
    handBlood.at += dt; if (handBlood.at > 0.3) { handBlood.at = 0; if (handBlood.L > 0) body.bloodyHand('L', handBlood.L); if (handBlood.R > 0) body.bloodyHand('R', handBlood.R); }
    // raccoon eyes come up over ~7 minutes while blood still circulates
    if (headFx.rkMax > headFx.rk && phys.hr > 20) { headFx.rk = Math.min(headFx.rkMax, headFx.rk + dt * slow * scale * headFx.rkMax / 420); headFx.at += dt; if (headFx.at > 0.25) { headFx.at = 0; body.periorbital(headFx.rk); } } body.bloodTick && body.bloodTick(dt * slow, phys.hr > 20);
  }
  // one full simulation + render step (also driven directly by the test harness for frame-exact capture)
  function step(dt, noRender) {
    const city = duel && duel.city && duel.city.on, rc = recon && recon.on;
    if (!city && !rc) movePlayer(dt);
    state.kick = Math.max(0, state.kick - dt * 0.12 * (1 + state.kick * 40));
    camera.position.copy(state.pos);
    camera.position.y += eyeOffset;
    // the blast jolts the head a little: a quick, decaying shake on top of the muzzle rise
    state.shake = Math.max(0, (state.shake || 0) - dt * 6); const sk = state.shake * state.shake * 0.006;
    camera.rotation.set(state.pitch + state.kick + (Math.random() - 0.5) * sk, state.yaw + (Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk * 0.6); camera.updateMatrixWorld();
    // simulation time
    // slow motion drops to bullet speed while a round is in the air, so it can be watched in flight
    const scale = TIMES[state.ti], slow = recon && recon.on ? recon.rate : state.slow ? (projectiles.active(simClock) ? 0.004 : 0.2) : 1;
    moveGrab();
    if (state.started) { simClock += dt * slow; while (pending.length && pending[0].t <= simClock) pending.shift().run(); }
    projectiles.update(simClock, dt * slow);
    const C0 = duel && duel.city && duel.city.on ? duel.city : null, R0 = recon && recon.on ? recon : null;
    const active = R0 ? R0.subs : C0 ? C0.subs.filter((T) => T.body.root.visible) : duel && duel.on ? duel.fighters : [primary];
    for (const S of active) simSubject(S, dt, scale, slow);
    world.update(dt * slow); stepDebris(dt * slow);
    if (R0) { R0.update(dt); use(R0.roles.jfk); } else if (C0) { C0.update(dt * slow); use(C0.player); } else if (duel && duel.on) duel.update(dt * slow, dt); else use(primary);
    if (state.started && !C0 && !R0) {
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
    { const yv = (state.yaw - (state.lastYaw ?? state.yaw)) / Math.max(1e-3, dt), pv = (state.pitch - (state.lastPitch ?? state.pitch)) / Math.max(1e-3, dt); state.lastYaw = state.yaw; state.lastPitch = state.pitch;
      gun.update(dt, camDir, state.narrow, { yawV: yv, pitchV: pv, stride, pace: state.pace || 0 }); }
    ui.cross(state.ax, state.ay); ui.ecg(phys, dt * Math.min(scale, 2) * slow);
    uiT += dt; if (uiT > 0.15) { uiT = 0;
      { const st = phys.status(), lost = Math.round(phys.total - phys.bv), mini = document.getElementById('mini');
        if (mini && document.body.classList.contains('min')) mini.innerHTML = '<b>' + st[0] + '</b> · HR ' + Math.round(phys.hr) + ' · ' + (lost > 0 ? '−' + lost + ' mL' : 'no blood loss') + ' · ' + G.WEAPONS[state.wi].name; }
      for (const S of (C0 ? active : duel && duel.on ? duel.fighters : [primary])) { use(S);
      // skin and pupils follow the physiology
      body.setPerfusion(phys.frac(), phys.spo2, phys.dead || phys.stemDestroyed, phys.deadT || 0);
      const brainGone = phys.dead || phys.stemDestroyed || phys.anoxic > 120;
      body.setPupil(brainGone ? 0.62 : 0.32 + 0.12 * Math.min(1, phys.frac() / 0.3) + (phys.tFirst != null && phys.conscious ? 0.06 : 0));
      }
      use(R0 ? R0.roles.jfk : C0 ? C0.player : duel && duel.on ? duel.fighters[0] : primary);
      ui.update(phys, npc); ui.setRange(Math.hypot(state.pos.x - npc.pos.x, state.pos.z - npc.pos.z)); }
    if (rc) { recon.camera(dt); gun.raise = 0; }
    if (city) { duel.city.camera(dt); gun.raise = 0; const r = canvas.getBoundingClientRect(); state.ax = r.width / 2; state.ay = r.height / 2; }
    if (G.debug && G.debug.camHook) G.debug.camHook(camera); // tests: a close look
    if (!noRender) renderer.render(scene, camera);
  }
  applySettings();
  requestAnimationFrame(frame);
  G.debug = { renderer, get recon() { return recon; }, get duel() { return duel; }, subjects, use, viscera, projectiles, gun, scene, tick: step, manual: false, audio, rag, toggleGrab, toggleSlow, fire, state, setWeapon, toggleXray, camera, get phys() { return phys; }, get npc() { return npc; }, body, world };
})();
