// Audio. Gunshots and the pump / bolt cycling are real recordings (src/sounds.js, public domain),
// played into a concrete-room reverb because the originals were recorded outdoors. If a recording
// fails to decode, a synthesized shot is used instead. Impacts, casings, body falls, dripping and
// the subject's own sounds (grunts, breathing, coughing, agonal gasps, groans) are synthesized.
(function () {
  const G = (window.GSW = window.GSW || {});
  // blast: [duration s, lowpass start Hz, lowpass end Hz, gain], thump: [f0, f1, dur, gain], crack gain, tail gain
  const PROFILE = {
    '.22 LR pistol': { blast: [0.07, 7500, 2200, 0.45], thump: [260, 90, 0.07, 0.25], crack: 0, tail: 0.18, action: 'slide' },
    '9×19 mm pistol': { blast: [0.1, 6000, 900, 0.85], thump: [190, 48, 0.13, 0.75], crack: 0.12, tail: 0.3, action: 'slide' },
    '.45 ACP pistol': { blast: [0.13, 3600, 500, 0.9], thump: [140, 36, 0.18, 1.0], crack: 0, tail: 0.34, action: 'slide' },
    '.357 Magnum revolver': { blast: [0.14, 7000, 700, 1.05], thump: [170, 38, 0.2, 1.0], crack: 0.35, tail: 0.42, action: 'none' },
    '5.56×45 mm rifle': { blast: [0.12, 9000, 1100, 1.0], thump: [210, 55, 0.12, 0.7], crack: 0.9, tail: 0.45, action: 'bolt-carrier' },
    '7.62×39 mm rifle': { blast: [0.15, 6500, 700, 1.05], thump: [150, 40, 0.18, 1.0], crack: 0.7, tail: 0.48, action: 'bolt-carrier' },
    '.308 Win hunting rifle': { blast: [0.18, 7500, 600, 1.15], thump: [130, 32, 0.24, 1.15], crack: 1.0, tail: 0.55, action: 'bolt' },
    '12 ga shotgun': { blast: [0.2, 4200, 380, 1.15], thump: [105, 28, 0.28, 1.3], crack: 0.15, tail: 0.55, action: 'pump' },
  };
  // weapon -> [recording, gain, action recording, action gain, action delay s]
  const REC = {
    '.22 LR pistol': ['22', 0.5], '9×19 mm pistol': ['9mm', 0.85], '.45 ACP pistol': ['45', 0.95], '.357 Magnum revolver': ['rev', 1.0],
    '5.56×45 mm rifle': ['ar15', 1.0], '7.62×39 mm rifle': ['ak', 1.0], '.308 Win hunting rifle': ['bolt', 1.0, 'boltcycle', 0.5, 0.55], '12 ga shotgun': ['sg', 1.0, 'pump', 0.5, 0.4],
  };
  G.Audio = function () {
    const bufs = {};
    let ctx = null, noise = null, master = null, wet = null, dry = null, breathG = null, breathF = null, gurgG = null;
    let ventGain = null, ventPan = null, muted = false;
    const A = {
      dist: 3,
      get muted() { return muted; },
      set muted(value) {
        muted = value;
        if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.03);
      },
    };
    A.init = () => {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const sr = ctx.sampleRate;
        noise = ctx.createBuffer(1, sr * 2, sr);
        const ch = noise.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        // impulse response of a hard, tiled 8 x 9 x 3 m room: dense early reflections, ~1.1 s tail
        const ir = ctx.createBuffer(2, sr * 1.3, sr);
        for (let c = 0; c < 2; c++) {
          const dch = ir.getChannelData(c);
          for (let i = 0; i < dch.length; i++) { const t = i / sr; dch[i] = (Math.random() * 2 - 1) * Math.exp(-t * 5.2) * (t < 0.012 ? t / 0.012 : 1); }
          for (const [t, g] of [[0.011, 0.7], [0.019, 0.55], [0.027, 0.5], [0.041, 0.4], [0.058, 0.3]]) dch[Math.floor((t + c * 0.0013) * sr)] += g * (c ? 1 : -1);
        }
        const conv = ctx.createConvolver(); conv.buffer = ir;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.001; comp.release.value = 0.12;
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; dry = ctx.createGain(); wet = ctx.createGain(); wet.gain.value = 0.32;
        dry.connect(comp); dry.connect(conv); conv.connect(wet); wet.connect(comp); comp.connect(master); master.connect(ctx.destination);
        // continuous breath and airway-gurgle beds, modulated every frame
        const mk = (type, f, q, output = dry) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(output); s.start(); return [g, fl]; };
        [breathG, breathF] = mk('bandpass', 900, 0.8); [gurgG] = mk('bandpass', 260, 3);
        // The vent combines air noise with a faint motor hum.
        ventGain = ctx.createGain();
        ventGain.gain.value = 0;
        ventPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        ventGain.connect(ventPan || comp);
        if (ventPan) ventPan.connect(comp);
        const [air] = mk('lowpass', 420, 0.7, ventGain);
        air.gain.value = 0.6;
        const motor = ctx.createOscillator(), motorGain = ctx.createGain();
        motor.type = 'triangle';
        motor.frequency.value = 108;
        motorGain.gain.value = 0.05;
        motor.connect(motorGain);
        motorGain.connect(ventGain);
        motor.start();
        // decode the embedded recordings
        for (const k in G.SOUNDS || {}) {
          try {
            const bin = atob(G.SOUNDS[k].split(',')[1]), u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            const pr = ctx.decodeAudioData(u8.buffer, (b) => { bufs[k] = b; }, () => {});
            if (pr && pr.catch) pr.catch(() => {});
          } catch (e) { /* fall back to synthesis for this one */ }
        }
      } catch (e) { ctx = null; }
    };
    const ok = () => ctx && !A.muted;
    const burst = (dur, f0, f1, gain, type, q, at) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + (at || 0);
      s.buffer = noise; f.type = type || 'lowpass'; f.Q.value = q || 0.7; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.0015); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(f); f.connect(g); g.connect(dry); s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.03);
    };
    const tone = (dur, f0, f1, gain, at, type) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + (at || 0);
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(dry); o.start(t); o.stop(t + dur + 0.03);
    };
    const click = (at, f, gain) => burst(0.018, f, f * 0.8, gain, 'bandpass', 4, at);
    const play = (k, gain, at, rate) => {
      const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[k]; s.playbackRate.value = rate || 1; g.gain.value = gain;
      s.connect(g); g.connect(dry); s.start(ctx.currentTime + (at || 0));
    };
    A.loaded = () => Object.keys(bufs);
    // play a random take from a recorded group (e.g. 'fall' -> fall_1..4); returns false if none decoded
    const one = (group, gain, rate, at) => { const ks = Object.keys(bufs).filter((k) => k.startsWith(group + '_')); if (!ks.length) return false; play(ks[Math.floor(Math.random() * ks.length)], gain, at || 0, (rate || 1) * (0.94 + Math.random() * 0.12)); return true; };
    const near = () => 1 / (1 + A.dist * 0.3);
    A.shot = (w) => {
      if (!ok()) return;
      const r = REC[w.name];
      if (r && bufs[r[0]]) {
        // tiny pitch variation so repeated shots are not identical
        play(r[0], r[1] * 1.25, 0, 0.97 + Math.random() * 0.06);
        if (r[2] && bufs[r[2]]) play(r[2], r[3], r[4], 1);
        return;
      }
      const p = PROFILE[w.name] || PROFILE['9×19 mm pistol'], [bd, f0, f1, bg] = p.blast, [t0, t1, td, tg] = p.thump;
      burst(0.012, 14000, 6000, bg * 0.9, 'highpass', 0.5);            // initial pressure spike
      burst(bd, f0, f1, bg);                                           // muzzle blast body
      burst(bd * 2.4, f0 * 0.35, 120, bg * 0.5);                       // low rumble
      tone(td, t0, t1, tg);                                            // chest thump
      if (p.crack) { burst(0.004, 16000, 9000, p.crack, 'highpass', 0.7); burst(0.03, 5200, 3000, p.crack * 0.35, 'bandpass', 1.2, 0.002); } // supersonic crack
      burst(1.0, 1100, 140, p.tail * 0.3, 'lowpass', 0.7, 0.03);       // room boom
      // the action cycling
      if (p.action === 'slide') { click(0.035, 3200, 0.12); click(0.075, 2400, 0.16); }
      else if (p.action === 'bolt-carrier') { click(0.03, 2600, 0.14); click(0.062, 1900, 0.2); tone(0.12, 520, 300, 0.035, 0.065, 'triangle'); /* buffer spring */ }
      else if (p.action === 'pump') { burst(0.09, 900, 2600, 0.2, 'bandpass', 1.5, 0.38); click(0.47, 1700, 0.25); burst(0.09, 2600, 900, 0.2, 'bandpass', 1.5, 0.6); click(0.69, 2100, 0.28); }
      else if (p.action === 'bolt') { click(0.45, 2400, 0.16); burst(0.08, 1200, 2200, 0.1, 'bandpass', 2, 0.5); click(0.62, 1500, 0.2); burst(0.08, 2200, 1200, 0.1, 'bandpass', 2, 0.72); click(0.84, 2800, 0.2); }
    };
    // bullet into the body: a dull wet slap; bone adds a sharp crack
    A.impact = (bone, energy) => {
      if (!ok()) return;
      const e = Math.min(1, 0.35 + (energy || 300) / 2500);
      if (one('flesh', 0.9 * e * near())) { if (bone) one('thump', 0.7 * e * near(), 1.25, 0.005); return; }
      burst(0.06, 900, 180, 0.4 * e, 'lowpass', 1); tone(0.09, 120, 60, 0.35 * e); burst(0.05, 2400, 900, 0.12 * e, 'bandpass', 1.5, 0.004);
      if (bone) { click(0.003, 1900, 0.3 * e); click(0.011, 1300, 0.22 * e); burst(0.05, 3000, 700, 0.14 * e, 'bandpass', 2, 0.006); }
    };
    A.wall = (energy) => { if (!ok()) return; if (one('wall', 0.55 * Math.min(1, 0.4 + (energy || 200) / 1200), 1.15)) return; const e = Math.min(1, 0.3 + (energy || 200) / 1500); burst(0.04, 6000, 1800, 0.3 * e, 'bandpass', 1.4); tone(0.05, 420, 160, 0.2 * e); for (let i = 0; i < 4; i++) click(0.05 + Math.random() * 0.35, 3500 + Math.random() * 3000, 0.03 * e); };
    A.thud = (vol) => { vol = vol == null ? 1 : vol; if (ok() && one(vol > 0.45 ? 'fall' : 'thump', (0.5 + vol * 0.7) * near(), 0.85)) return; if (ok()) { tone(0.22, 85, 34, 0.9 * vol); burst(0.16, 420, 90, 0.4 * vol, 'lowpass'); } };
    A.tink = (dull) => { if (!ok()) return; if (one('casing', dull ? 0.18 : 0.22, dull ? 0.7 : 1.7)) return; if (dull) burst(0.05, 900, 300, 0.12, 'lowpass'); else { const f = 5200 + Math.random() * 1800; tone(0.07, f, f * 0.7, 0.05); tone(0.05, f * 1.52, f, 0.025); } };
    // footsteps: recorded steps on concrete, softer for a shuffling wounded step
    A.step = (k) => { if (ok()) one('step', (0.25 + 0.35 * (k == null ? 1 : k)) * near(), 0.9 + Math.random() * 0.2); };
    A.playerStep = (pace) => {
      if (!ok()) return;
      const gain = 0.14 + pace * 0.2;
      if (one('step', gain, 0.88 + pace * 0.16)) return;
      burst(0.11, 1300, 250, gain * 0.6, 'lowpass');
      tone(0.09, 120, 52, gain * 0.28);
    };
    A.ventilation = (distance, side) => {
      if (!ctx || !ventGain) return;
      const gain = document.hidden ? 0 : 0.19 / (1 + distance * 0.27);
      ventGain.gain.setTargetAtTime(gain, ctx.currentTime, 0.12);
      if (ventPan) ventPan.pan.setTargetAtTime(side * 0.76, ctx.currentTime, 0.08);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && ctx && ventGain) ventGain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    });
    // a ricochet: the deformed bullet tumbling away makes a falling, wavering whine
    A.ricochet = () => {
      if (!ok()) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f0 = 2600 + Math.random() * 1600, dur = 0.35 + Math.random() * 0.25;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 18 + Math.random() * 14; lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency);
      o.type = 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(dry); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    };
    A.drip = () => { if (ok() && one('drip', 0.1 * near(), 1.5)) return; if (ok()) tone(0.035, 900 + Math.random() * 700, 300, 0.02); };
    // ---- the subject's voice: a glottal source (sawtooth) through two vowel formants
    const voice = (dur, f0, f1, gain, vowel, at, rough) => {
      const t = ctx.currentTime + (at || 0), o = ctx.createOscillator(), g = ctx.createGain(), mix = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
      if (rough) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 28 + Math.random() * 14; lg.gain.value = f0 * 0.12; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
      const k = gain / (1 + A.dist * 0.35);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(k, t + Math.min(0.05, dur * 0.25)); g.gain.setValueAtTime(k, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      for (const [f, q, a] of vowel) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = ctx.createGain(); bg.gain.value = a; o.connect(b); b.connect(bg); bg.connect(mix); }
      mix.connect(g); g.connect(dry); o.start(t); o.stop(t + dur + 0.05);
      // breath noise under the voice
      const s = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(); s.buffer = noise; nf.type = 'bandpass'; nf.frequency.value = 1400; ng.gain.setValueAtTime(k * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(nf); nf.connect(ng); ng.connect(dry); s.start(t, Math.random()); s.stop(t + dur + 0.03);
    };
    const UH = [[620, 5, 1], [1150, 6, 0.5], [2500, 6, 0.15]], AH = [[760, 5, 1], [1250, 6, 0.6], [2600, 6, 0.2]], OH = [[480, 5, 1], [880, 6, 0.45], [2400, 6, 0.1]];
    // synthetic voice is off by default: it does not hold up next to the recorded gunshots
    A.voice = false;
    const said = { t: -9 };
    A.grunt = (pain) => { if (ok() && ctx.currentTime - said.t > 0.5 && one('grunt', (0.5 + 0.4 * pain) * near(), 1, 0.08)) { said.t = ctx.currentTime; return; } if (ok() && A.voice) voice(0.16 + 0.2 * pain, 150 + 60 * pain, 95, 0.5 + 0.4 * pain, pain > 0.6 ? AH : UH, 0.06 + Math.random() * 0.05, pain > 0.5); };
    A.groan = (pain) => { if (ok() && ctx.currentTime - said.t > 1.5 && one('groan', (0.4 + 0.35 * pain) * near(), 0.95)) { said.t = ctx.currentTime; return; } if (ok() && A.voice) voice(0.7 + Math.random() * 0.8, 120 + 40 * pain, 88, 0.3 + 0.3 * pain, OH, 0, true); };
    A.cough = () => { if (!ok()) return; if (one('cough', 0.6 * near(), 0.95)) return; const k = 1 / (1 + A.dist * 0.35); for (const at of [0, 0.19]) { burst(0.11, 2600, 500, 0.5 * k, 'bandpass', 1.1, at); tone(0.09, 240, 110, 0.2 * k, at, 'sawtooth'); } burst(0.2, 500, 180, 0.12 * k, 'bandpass', 4, 0.05); };
    // agonal gasp: a slow, snoring inhalation
    A.gasp = () => { if (!ok()) return; if (one('gasp', 0.55 * near(), 0.85)) return; const k = 1 / (1 + A.dist * 0.35); burst(0.55, 500, 1500, 0.4 * k, 'bandpass', 2.2); tone(0.45, 70, 95, 0.12 * k, 0.03, 'sawtooth'); };
    // per-frame: breathing loudness follows the breathing cycle and effort; gurgle when blood is in the airway
    A.breath = (phase, rate, effort, gurgle) => {
      if (!ctx || !breathG) return;
      const k = A.muted ? 0 : 1 / (1 + A.dist * 0.5), sn = Math.sin(phase), flow = Math.abs(sn) * (rate > 1 ? 1 : 0);
      breathG.gain.setTargetAtTime(k * flow * effort * 0.22, ctx.currentTime, 0.04);
      breathF.frequency.setTargetAtTime(sn > 0 ? 1300 : 700, ctx.currentTime, 0.05); // inhale brighter than exhale
      gurgG.gain.setTargetAtTime(k * flow * (gurgle ? 0.3 : 0) * (0.5 + 0.5 * Math.random()), ctx.currentTime, 0.03);
    };
    return A;
  };
})();
