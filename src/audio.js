// Audio. Every sound is a recording (src/sounds.js; sources and licences in assets/sounds/README.md): gunshots and
// actions, bullet impacts, falls, footsteps, casings, dripping, the room's air handling, and the subject's own voice
// and breathing. Nothing is synthesized: if a clip is missing it is simply silent. The recordings are played into a
// tiled-room reverb (the gunshots were recorded outdoors).
(function () {
  const G = (window.GSW = window.GSW || {});
  // weapon -> [recording, gain, action recording, action gain, action delay s]
  const REC = {
    '.22 LR pistol': ['22', 0.5], '9×19 mm pistol': ['9mm', 0.85], '.45 ACP pistol': ['45', 0.95], '.357 Magnum revolver': ['rev', 1.0],
    '5.56×45 mm rifle': ['ar15', 1.0], '7.62×39 mm rifle': ['ak', 1.0], '.308 Win hunting rifle': ['bolt', 1.0, 'boltcycle', 0.5, 0.55], '12 ga shotgun': ['sg', 1.0, 'pump', 0.5, 0.4],
  };
  G.Audio = function () {
    const bufs = {};
    let ctx = null, master = null, wet = null, dry = null, ventGain = null, ventPan = null, ventSrc = null, muted = false, ear = null;
    const A = {
      dist: 3,
      get muted() { return muted; },
      set muted(value) { muted = value; if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.03); },
    };
    A.init = () => {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const sr = ctx.sampleRate;
        // reverb of a hard, tiled 8 x 9 x 3 m room: dense early reflections and a ~1.1 s decaying tail. This is the
        // room's acoustic response applied to the recordings, not a sound of its own.
        const ir = ctx.createBuffer(2, sr * 1.3, sr);
        for (let c = 0; c < 2; c++) {
          const dch = ir.getChannelData(c);
          for (let i = 0; i < dch.length; i++) { const t = i / sr; dch[i] = (Math.random() * 2 - 1) * Math.exp(-t * 5.2) * (t < 0.012 ? t / 0.012 : 1); }
          for (const [t, g] of [[0.011, 0.7], [0.019, 0.55], [0.027, 0.5], [0.041, 0.4], [0.058, 0.3]]) dch[Math.floor((t + c * 0.0013) * sr)] += g * (c ? 1 : -1);
        }
        const conv = ctx.createConvolver(); conv.buffer = ir;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.001; comp.release.value = 0.12;
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; dry = ctx.createGain(); wet = ctx.createGain(); wet.gain.value = 0.32;
        dry.connect(comp); dry.connect(conv); conv.connect(wet); wet.connect(comp);
        // hearing: a gunshot indoors briefly deafens; everything goes dull and comes back over a second or two
        ear = ctx.createBiquadFilter(); ear.type = 'lowpass'; ear.frequency.value = 20000; ear.Q.value = 0.5; comp.connect(ear); ear.connect(master); master.connect(ctx.destination);
        ventGain = ctx.createGain(); ventGain.gain.value = 0;
        ventPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        ventGain.connect(ventPan || comp); if (ventPan) ventPan.connect(comp);
        for (const k in G.SOUNDS || {}) {
          try {
            const bin = atob(G.SOUNDS[k].split(',')[1]), u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            const pr = ctx.decodeAudioData(u8.buffer, (b) => { bufs[k] = b; if (k === 'vent') startVent(); }, () => {});
            if (pr && pr.catch) pr.catch(() => {});
          } catch (e) { /* that clip stays silent */ }
        }
      } catch (e) { ctx = null; }
    };
    const ok = () => ctx && !A.muted;
    const play = (k, gain, at, rate, out) => {
      const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[k]; s.playbackRate.value = rate || 1; g.gain.value = gain;
      s.connect(g); g.connect(out || dry); s.start(ctx.currentTime + (at || 0)); return { s, g };
    };
    A.loaded = () => Object.keys(bufs);
    const takes = (group) => Object.keys(bufs).filter((k) => k.startsWith(group + '_'));
    // a random take from a recorded group (e.g. 'fall' -> fall_1..4), never the same take twice in a row
    const lastTake = {};
    const pick = (group) => { const ks = takes(group); if (!ks.length) return null; let k = ks[Math.floor(Math.random() * ks.length)]; if (ks.length > 1 && k === lastTake[group]) k = ks[(ks.indexOf(k) + 1) % ks.length]; lastTake[group] = k; return k; };
    const one = (group, gain, rate, at) => { const k = pick(group); if (!k) return null; return play(k, gain, at || 0, (rate || 1) * (0.95 + Math.random() * 0.1)); };
    const near = () => 1 / (1 + A.dist * 0.3);
    // k: 0 (a .22) to 1 (a rifle or shotgun in a tiled room)
    A.deafen = (k) => { if (!ctx || !ear) return; const t = ctx.currentTime, f = 600 + (1 - k) * 4000; ear.frequency.cancelScheduledValues(t); ear.frequency.setValueAtTime(Math.min(ear.frequency.value, f), t + 0.06); ear.frequency.exponentialRampToValueAtTime(20000, t + 0.6 + k * 2.2); };
    A.shot = (w) => {
      if (!ok()) return;
      const r = REC[w.name]; if (!r || !bufs[r[0]]) return;
      play(r[0], r[1] * 1.25, 0, 0.97 + Math.random() * 0.06); // tiny pitch variation so repeated shots are not identical
      if (r[2] && bufs[r[2]]) play(r[2], r[3], r[4], 1);
    };
    // bullet into the body: a wet slap; bone adds a sharp knock
    A.impact = (bone, energy) => {
      if (!ok()) return;
      const e = Math.min(1, 0.35 + (energy || 300) / 2500);
      one('flesh', 0.9 * e * near()); if (bone) one('thump', 0.7 * e * near(), 1.25, 0.005);
    };
    A.wall = (energy) => { if (ok()) one('wall', 0.55 * Math.min(1, 0.4 + (energy || 200) / 1200), 1.15); };
    // a ricochet off the tile: a second, lighter strike as the deformed bullet hits again
    A.ricochet = () => { if (ok()) one('wall', 0.22, 1.35, 0.06 + Math.random() * 0.08); };
    A.thud = (vol) => { vol = vol == null ? 1 : vol; if (ok()) one(vol > 0.45 ? 'fall' : 'thump', (0.5 + vol * 0.7) * near(), 0.85); };
    A.tink = (dull) => { if (ok()) one('casing', dull ? 0.18 : 0.22, dull ? 0.7 : 1.7); };
    A.step = (k) => { if (ok()) one('step', (0.25 + 0.35 * (k == null ? 1 : k)) * near(), 0.9 + Math.random() * 0.2); };
    A.playerStep = (pace) => { if (ok()) one('step', 0.14 + pace * 0.2, 0.88 + pace * 0.16); };
    A.drip = () => { if (ok()) one('drip', 0.1 * near(), 1.5); };
    // the room's air handling: a recorded air-conditioner hum, looped, panned toward the grille
    function startVent() {
      if (ventSrc || !bufs.vent) return;
      ventSrc = ctx.createBufferSource(); ventSrc.buffer = bufs.vent; ventSrc.loop = true; ventSrc.loopStart = 0.5; ventSrc.loopEnd = bufs.vent.duration - 0.5; ventSrc.connect(ventGain); ventSrc.start();
    }
    A.ventilation = (distance, side) => {
      if (!ctx || !ventGain) return;
      const gain = document.hidden ? 0 : 0.5 / (1 + distance * 0.27);
      ventGain.gain.setTargetAtTime(gain, ctx.currentTime, 0.12);
      if (ventPan) ventPan.pan.setTargetAtTime(side * 0.76, ctx.currentTime, 0.08);
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden && ctx && ventGain) ventGain.gain.setTargetAtTime(0, ctx.currentTime, 0.12); });

    // ---- the subject's voice. One mouth: a new sound only cuts in if it matters more than the one playing
    // (a scream interrupts a moan; a moan waits for a scream to finish), and breathing pauses while he vocalizes.
    const PRI = { yelp: 4, scream: 5, cry: 3, moan: 2, groan: 2, grunt: 3, cough: 4, gasp: 4 };
    const voiceNow = { src: null, end: 0, pri: 0 };
    const say = (group, gain, rate) => {
      if (!ok()) return false;
      const t = ctx.currentTime, pr = PRI[group] || 1;
      if (t < voiceNow.end && pr <= voiceNow.pri) return false;
      const k = pick(group); if (!k) return false;
      if (voiceNow.src && t < voiceNow.end) { try { voiceNow.g.gain.setTargetAtTime(0, t, 0.03); voiceNow.src.stop(t + 0.12); } catch (e) { /* already ended */ } }
      const r = (rate || 1) * (0.96 + Math.random() * 0.08), p = play(k, gain * near(), 0, r);
      voiceNow.src = p.s; voiceNow.g = p.g; voiceNow.pri = pr; voiceNow.end = t + bufs[k].duration / r;
      return true;
    };
    A.speaking = () => ctx && ctx.currentTime < voiceNow.end;
    // pain 0-1, weak 0-1 (shock: a bleeding-out person goes quiet and hoarse)
    A.yelp = (pain, weak) => say('yelp', (0.55 + 0.4 * pain) * (1 - 0.6 * (weak || 0)));
    A.scream = (pain, weak) => say('scream', (0.6 + 0.35 * pain) * (1 - 0.6 * (weak || 0)));
    A.moan = (pain, weak) => say(Math.random() < 0.5 && takes('groan').length ? 'groan' : 'moan', (0.35 + 0.35 * pain) * (1 - 0.5 * (weak || 0)), 1 - 0.06 * (weak || 0));
    A.cry = (pain, weak) => (takes('cry').length ? say('cry', (0.35 + 0.25 * pain) * (1 - 0.5 * (weak || 0))) : A.moan(pain, weak));
    A.grunt = (pain) => say('grunt', 0.5 + 0.4 * pain);
    A.groan = (pain) => A.moan(pain, 0);
    A.cough = () => say('cough', 0.6);
    A.gasp = () => say('gasp', 0.55, 0.85);
    // ---- breathing: one recorded inhale at the start of each breath and one exhale halfway through, picked to fit
    // the breathing rate, and as loud as the effort behind it (quiet breathing is barely audible across a room).
    // Unconscious with a slack airway: snoring (stertor). Blood in the airway adds a wet gurgle. Agonal breaths are
    // the separate gasp recordings (fired by the breathing cycle itself).
    let lastPhase = 0;
    A.breath = (phase, rate, effort, gurgle, mode) => {
      if (!ok() || rate < 1) { lastPhase = phase; return; }
      const cyc = Math.PI * 2, a = ((lastPhase % cyc) + cyc) % cyc, b = ((phase % cyc) + cyc) % cyc; lastPhase = phase;
      const startIn = b < a, startOut = a < Math.PI && b >= Math.PI;
      if (!startIn && !startOut) return;
      if (A.speaking()) return;
      const period = 60 / rate, k = near();
      if (mode === 'snore') { if (startIn) one('snore', 0.32 * k, period < 3 ? 1.1 : 1); return; }
      if (mode !== 'awake') return;
      const g = Math.min(0.75, 0.03 + effort * 0.42) * k, rt = Math.min(1.3, Math.max(0.9, 3.2 / period)); // faster breathing: shorter, quicker breaths
      const p = one(startIn ? 'inhale' : 'exhale', g, rt);
      if (p) { const len = p.s.buffer.duration / rt, room = period * 0.5; if (len > room) { const t = ctx.currentTime; p.g.gain.setValueAtTime(g, t + room * 0.75); p.g.gain.linearRampToValueAtTime(0, t + room); p.s.stop(t + room + 0.02); } }
      if (gurgle && startOut && Math.random() < 0.6) one('gurgle', 0.3 * k, 1);
    };
    return A;
  };
})();
