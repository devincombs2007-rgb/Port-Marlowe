// Physiology: turns wound tracks into injuries, then runs circulation, respiration
// and brain perfusion forward in time. No treatment is modelled.
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const G = (root.GSW = root.GSW || {});
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

  G.Physiology = function (total) {
    const S = {
      total, bv: total, lostExt: 0, lostInt: 0, t: 0, tFirst: null,
      hr: 72, map: 93, sys: 120, dia: 80, spo2: 98, rr: 14, brainE: 1, anoxic: 0,
      wounds: [], injuries: [], injVer: 0,
      lung: { L: 1, R: 1 }, pneumo: { L: 0, R: 0 }, tension: { L: 0, R: 0 }, hemo: { L: 0, R: 0 }, abdoBlood: 0,
      periVol: 0, periRate: 0, pump: 1, heartDestroyed: false, airway: 1,
      apnea: false, apneaWhy: '', icpTimer: -1, brainDestroyed: false, brainInjury: 0, koForced: false,
      neurogenic: false, legsPara: false, armsPara: false, legBroken: { L: false, R: false }, armBroken: { L: false, R: false }, pelvisBroken: false,
      pain: 0, upright: true, vagal: 0, vagalAt: 0, vagalDone: false, stemDestroyed: false, stemTimer: -1, hemoptysis: false, motor: { mode: 'normal', t: 0 }, events: [], conscious: true, arrest: false, arrestT: 0, lowMapT: 0, dead: false, deadT: 0, cause: '', bleedRate: 0, shots: 0, lastHitT: -99,
    };
    const injMap = new Map();
    // one line per distinct injury; repeats are counted (returns true only the first time)
    const inj = (key, text, sev) => {
      S.injVer++;
      const o = injMap.get(key);
      if (o) { o.n++; return false; }
      const n = { text, sev, n: 1 }; injMap.set(key, n); S.injuries.push(n); return true;
    };
    // rate mL/min at normal pressure; clot = time constant (s) of natural slowing (0 = none)
    const wound = (label, rate, o = {}) => {
      const w = { label, rate, clot: o.clot || 0, ext: o.ext == null ? 1 : o.ext, cavity: o.cavity || null, side: o.side || null, venous: !!o.venous, t0: S.t, lost: 0, surf: o.surf || null };
      S.wounds.push(w); return w;
    };
    S.inj = inj;
    // involuntary motor state: normal | flaccid | decerebrate | tonic | clonic
    S.setMotor = (mode, t) => { S.motor.mode = mode; S.motor.t = t; S.events.push(mode); };

    // ---- interpret one projectile's result (from G.simulate)
    S.applyShot = function (res, surfWounds) {
      if (!res.hitBody || res.noPen) return [];
      if (S.tFirst == null) S.tFirst = S.t;
      S.shots++; S.lastHitT = S.t;
      const notes = [], surf = surfWounds && surfWounds.length ? surfWounds : null;
      const pickSurf = () => (surf ? surf[Math.floor(Math.random() * surf.length)] : null);
      let brainE = 0, brainstem = false, pain = 0.12;
      const cavOf = (prim) => res.cav.get(prim) || 0;
      const organBleed = (h, base, perVol, max) => Math.min(max, base + (h.vol + cavOf(h.prim)) * perVol);
      const seen = new Set();
      const handle = (prim, h) => {
        seen.add(prim);
        const cm2 = Math.PI * h.rpc * h.rpc * 1e4, name = prim.name;
        switch (prim.kind) {
          case 'cerebrum': case 'cerebellum': brainE += h.E + cavOf(prim) * 4e6; notes.push(name); break;
          case 'brainstem': brainE += h.E; brainstem = true; notes.push(name); break;
          case 'cord': case 'cauda': {
            const sev = clamp((h.rpc * 0.7 - h.dmin) / 0.012, 0, 1) + cavOf(prim) * 3e5;
            const lvl = prim.level, reg = lvl[0], n = +lvl.slice(1), complete = sev > 0.35;
            notes.push(name);
            if (prim.kind === 'cauda') { S.legsPara = true; inj('cauda', 'Cauda equina injury (' + lvl + ') — legs paralysed', 2); pain += 0.3; break; }
            if (reg === 'C') {
              S.legsPara = S.armsPara = true; S.neurogenic = true;
              if (n <= 4) { S.apnea = true; S.apneaWhy = 'high cervical cord transection (' + lvl + ')'; inj('cordC', 'Spinal cord ' + (complete ? 'transected' : 'injured') + ' at ' + lvl + ' — quadriplegia, breathing stopped', 2); }
              else inj('cordC', 'Spinal cord ' + (complete ? 'transected' : 'injured') + ' at ' + lvl + ' — quadriplegia, neurogenic shock', 2);
            } else {
              S.legsPara = true; if (reg === 'T' && n <= 6) S.neurogenic = true;
              inj('cord' + reg, 'Spinal cord ' + (complete ? 'transected' : 'injured') + ' at ' + lvl + ' — paraplegia', 2);
            }
            break;
          }
          case 'heart': {
            const destroyed = h.E + cavOf(prim) * 2e6 > 280 || cm2 > 5;
            const rate = clamp(cm2 * 900, 400, 4500);
            if (destroyed) { S.heartDestroyed = true; S.pump = Math.min(S.pump, 0.03); wound('Heart (ruptured)', 4500, { ext: 0.1, cavity: 'thorax', side: 'L', surf: pickSurf() }); inj('heartX', 'Heart ruptured — no effective output', 2); }
            else {
              S.pump *= 1 - clamp(cm2 / 7, 0.08, 0.6);
              if (cm2 < 1.3) { S.periRate += rate * 0.5; wound('Heart (perforated)', rate * 0.5, { ext: 0.05, cavity: 'thorax', side: 'L', surf: pickSurf() }); inj('heartP', 'Heart perforated — bleeding into pericardium (tamponade)', 2); }
              else { wound('Heart (lacerated)', rate, { ext: 0.08, cavity: 'thorax', side: 'L', surf: pickSurf() }); inj('heartL', 'Heart lacerated — massive haemorrhage into chest', 2); }
            }
            notes.push('Heart'); pain += 0.2; break;
          }
          case 'lung': {
            const sd = prim.side, big = h.rpc > 0.012 || cavOf(prim) > 2e-6;
            wound(name, big ? 450 : 60 + 250 * clamp(h.rpc / 0.02, 0, 1), { ext: 0.08, cavity: 'thorax', side: sd, clot: big ? 0 : 900, surf: pickSurf() });
            S.pneumo[sd] = Math.max(S.pneumo[sd], 1 / clamp(240 / (h.rpc / 0.0045), 35, 300));
            if (!S.tension[sd] && Math.random() < 0.3) S.tension[sd] = 1e-6;
            S.hemoptysis = true; inj('lung' + sd, name + ' perforated — pneumothorax / haemothorax', 1);
            notes.push(name); pain += 0.15; break;
          }
          case 'liver': wound('Liver', organBleed(h, 120, 1.5e7, 2500), { ext: 0.05, cavity: 'abdomen', surf: pickSurf() }); inj('liver' + (h.vol + cavOf(prim) > 3e-5 ? 'X' : ''), 'Liver ' + (h.vol + cavOf(prim) > 3e-5 ? 'shattered' : 'lacerated'), h.vol + cavOf(prim) > 3e-5 ? 2 : 1); notes.push(name); pain += 0.2; break;
          case 'spleen': wound('Spleen', organBleed(h, 100, 3e7, 1200), { ext: 0.05, cavity: 'abdomen', surf: pickSurf() }); inj('spleen', 'Spleen ' + (cavOf(prim) > 5e-6 ? 'ruptured' : 'lacerated'), 1); notes.push(name); pain += 0.15; break;
          case 'kidney': wound(name, organBleed(h, 80, 2.5e7, 900), { ext: 0.03, cavity: 'abdomen', surf: pickSurf() }); inj('kid' + prim.side, name + ' lacerated', 1); notes.push(name); pain += 0.2; break;
          case 'pancreas': wound('Pancreas', organBleed(h, 50, 1.5e7, 500), { ext: 0.03, cavity: 'abdomen' }); inj('panc', 'Pancreas lacerated', 1); notes.push(name); break;
          case 'stomach': wound('Stomach', organBleed(h, 40, 1e7, 300), { ext: 0.05, cavity: 'abdomen', clot: 1200 }); inj('stom', 'Stomach perforated', 1); notes.push(name); pain += 0.2; break;
          case 'bowel': wound(name, organBleed(h, 30, 0.8e7, 400), { ext: 0.05, cavity: 'abdomen', clot: 1500 }); inj('bowel' + name, name + ' perforated', 1); notes.push(name); pain += 0.2; break;
          case 'bladder': wound('Bladder', 15, { ext: 0.1, cavity: 'abdomen', clot: 900 }); inj('blad', 'Bladder perforated', 0); notes.push(name); break;
          case 'airway': S.hemoptysis = true; S.airway = Math.min(S.airway, 0.7); wound('Trachea', 25, { ext: 0.5, clot: 600, surf: pickSurf() }); inj('trach', 'Trachea perforated — airway bleeding', 1); notes.push(name); break;
          case 'eso': inj('eso', 'Esophagus perforated', 0); notes.push(name); break;
          case 'vessel': {
            const sev = clamp((h.rpc * 0.7 - h.dmin) / (2 * prim.rad), 0.15, 1);
            const key = 'v' + name;
            const w = wound(name, prim.rate * sev, { ext: prim.ext == null ? 0.05 : prim.ext, cavity: prim.cavity, side: prim.side, venous: prim.venous, surf: pickSurf() });
            if (!inj(key, name + (sev > 0.7 ? ' transected' : ' lacerated'), prim.rate >= 400 ? 2 : 1)) w.rate *= 0.4;
            notes.push(name); break;
          }
          case 'bone': {
            const b = prim.bone, sd = prim.side;
            notes.push(name);
            if (b === 'cartilage') break;
            pain += 0.2;
            const key = 'b' + name.replace(/ \(.*/, '');
            const txt = name.replace(/ \(posterior arch\)/, '') + ' fractured';
            if (b === 'femur') { S.legBroken[sd] = true; if (inj(key, txt + ' — leg cannot bear weight', 1)) wound(name + ' (fracture)', 30, { ext: 0.3, clot: 2400 }); }
            else if (b === 'tibia' || b === 'patella') { S.legBroken[sd] = true; if (inj(key, txt + ' — leg cannot bear weight', 1)) wound(name + ' (fracture)', 12, { ext: 0.5, clot: 1200 }); }
            else if (b === 'pelvis') { S.pelvisBroken = true; if (inj('bpelvis' + (sd || ''), txt, 1)) wound('Pelvic fracture', 60, { ext: 0.1, cavity: 'abdomen', clot: 3000 }); }
            else if (b === 'humerus' || b === 'forearm') { S.armBroken[sd] = true; if (inj(key, txt, 0)) wound(name + ' (fracture)', 8, { ext: 0.5, clot: 900 }); }
            else if (b === 'skull') inj(key, 'Skull perforated', 1);
            else inj(key, txt, b.endsWith('spine') ? 1 : 0);
            break;
          }
        }
      };
      for (const prim of res.order) handle(prim, res.hits.get(prim));
      // organs destroyed by the temporary cavity without being directly perforated
      for (const [prim, c] of res.cav) {
        if (seen.has(prim) || c < 1.5e-6) continue;
        const h = { prim, len: 0, E: 0, vol: 0, rpc: 0.004, dmin: 0.01, seg: prim.segObj };
        if (prim.kind === 'cord' || prim.kind === 'cauda') { if (c * 3e5 > 0.5) { h.dmin = -0.01; h.rpc = 0.01; handle(prim, h); } }
        else if (['liver', 'spleen', 'kidney', 'cerebrum', 'cerebellum', 'heart'].includes(prim.kind) && c > 4e-6) handle(prim, h);
      }
      // brain. What the body does next depends on what is left working:
      //  - brainstem gone: every muscle lets go at once (flaccid), breathing stops
      //  - hemispheres destroyed, lower brainstem intact: rigid extensor (decerebrate) posturing and
      //    agonal gasping for seconds to a minute before the brainstem fails too
      //  - smaller wound: tonic stiffening, often followed by clonic jerking, then coma or even wakefulness
      if (brainE > 0) {
        S.brainInjury += brainE; pain = 0;
        if (brainstem || S.brainInjury > 380) {
          S.stemDestroyed = S.brainDestroyed = true; S.apnea = true; S.apneaWhy = 'brainstem destruction'; S.conscious = false; S.koForced = true;
          S.setMotor('flaccid', 1e9); S.stemTimer = -1;
          inj('brainX', brainstem ? 'Brainstem destroyed — instant flaccid collapse' : 'Brain destroyed — instant flaccid collapse', 2);
        } else if (S.brainInjury > 150) {
          if (!S.brainDestroyed) { S.setMotor('decerebrate', 4 + Math.random() * 10); S.stemTimer = 20 + Math.random() * 70; }
          S.brainDestroyed = true; S.conscious = false; S.koForced = true;
          inj('brainD', 'Unsurvivable brain injury — extensor posturing, agonal breathing', 2);
        } else {
          const ko = Math.random() < 0.85;
          if (ko && !S.koForced) { S.koForced = true; S.setMotor('tonic', 1.5 + Math.random() * 3); }
          if (S.icpTimer < 0) S.icpTimer = lerp(900, 90, S.brainInjury / 150);
          inj('brain', 'Penetrating brain injury — ' + (ko ? 'unconscious, convulsing' : 'still conscious') + ', brain swelling', 2);
        }
      } else if (S.conscious && !S.vagalDone && Math.random() < 0.12) {
        // vasovagal reflex: the sight and shock of being shot drops heart rate and pressure a few seconds later
        S.vagalDone = true; S.vagalAt = S.t + 2 + Math.random() * 5;
      }
      // soft tissue wounds (muscle, fat, skin)
      for (const [seg, h] of res.softSeg) {
        const rate = 8 + h.len * 110 + h.vol * 4e6;
        const sf = surf && (surf.find((s) => s.seg === seg) || null);
        wound(seg.label + ' (soft tissue)', rate, { ext: ['thorax', 'abdomen', 'pelvis'].includes(seg.name) ? 0.6 : 0.9, clot: 420, surf: sf });
        if (res.depth < 0.03 && res.exited) inj('graze' + seg.name, 'Graze wound, ' + seg.label.toLowerCase(), 0);
        else inj('soft' + seg.name, 'GSW ' + seg.label.toLowerCase() + ' — skin and muscle', 0);
      }
      S.pain = clamp(S.pain + pain, 0, 1);
      return notes;
    };

    // ---- advance time
    S.step = function (dt) {
      S.t += dt;
      if (S.dead) { if (S.motor.mode !== 'flaccid') S.setMotor('flaccid', 1e9); S.deadT += dt; S.hr = Math.max(0, S.hr - dt * 0.6); S.map = 0; S.sys = S.dia = 0; S.rr = 0; S.spo2 = Math.max(0, S.spo2 - dt * 0.3); S.bleedRate = 0; for (const w of S.wounds) w.now = 0; return; }
      // bleeding
      let rate = 0;
      for (const w of S.wounds) {
        const pf = S.arrest ? 0.04 : w.venous ? 0.35 + (0.65 * S.map) / 93 : S.map / 93;
        const cf = w.clot ? Math.max(0.08, Math.exp(-(S.t - w.t0) / w.clot)) : 1;
        let r = w.rate * pf * cf;
        if (w.cavity === 'thorax' && w.side && S.hemo[w.side] > 2200) r *= 0.3; // contained
        const ml = Math.min(S.bv, (r * dt) / 60);
        w.now = r; w.lost += ml; S.bv -= ml; rate += r;
        S.lostExt += ml * w.ext; S.lostInt += ml * (1 - w.ext);
        if (w.cavity === 'thorax') S.hemo[w.side || 'L'] += ml * (1 - w.ext); else if (w.cavity === 'abdomen') S.abdoBlood += ml * (1 - w.ext);
      }
      S.bleedRate = rate;
      const frac = (S.total - S.bv) / S.total;
      // tamponade
      if (S.periRate > 0 && !S.arrest) S.periVol += (S.periRate * dt) / 60 * (S.map / 93);
      const tamp = 1 - clamp((S.periVol - 90) / 260, 0, 0.97);
      // lungs
      let tens = 1;
      for (const sd of ['L', 'R']) {
        let target = 1 - clamp(S.hemo[sd] / 2600, 0, 0.8);
        if (S.pneumo[sd]) target = Math.min(target, 0.15);
        S.lung[sd] += (target - S.lung[sd]) * clamp(dt * (S.pneumo[sd] || 1 / 60), 0, 1);
        if (S.tension[sd] && S.lung[sd] < 0.35) S.tension[sd] = Math.min(1, S.tension[sd] + dt / 480);
        tens *= 1 - 0.85 * (S.tension[sd] > 1e-3 ? S.tension[sd] : 0);
      }
      // involuntary motor sequences
      const M = S.motor;
      if (M.mode !== 'normal' && M.mode !== 'flaccid') {
        M.t -= dt;
        if (M.t <= 0) {
          if (M.mode === 'tonic' && Math.random() < 0.65) S.setMotor('clonic', 4 + Math.random() * 9);
          else S.setMotor(S.brainDestroyed || S.dead ? 'flaccid' : 'normal', 1e9);
        }
      }
      if (S.stemTimer > 0) { S.stemTimer -= dt; if (S.stemTimer <= 0) { S.apnea = true; S.apneaWhy = 'brainstem failure'; if (M.mode !== 'flaccid') S.setMotor('flaccid', 1e9); } }
      if (S.vagalAt && S.t >= S.vagalAt) { S.vagalAt = 0; S.vagal = 1; inj('vagal', 'Vasovagal faint — reflex drop in heart rate and pressure', 0); }
      if (S.vagal > 0) S.vagal = Math.max(0, S.vagal - dt / (S.upright ? 60 : 22));
      // raised intracranial pressure after a survivable brain wound
      if (S.icpTimer > 0) { S.icpTimer -= dt; if (S.icpTimer <= 0) { S.apnea = true; S.apneaWhy = 'brain herniation'; S.koForced = true; } }
      // circulation
      const g = frac < 0.15 ? 1 : frac < 0.3 ? lerp(1, 0.9, (frac - 0.15) / 0.15) : frac < 0.4 ? lerp(0.9, 0.6, (frac - 0.3) / 0.1) : frac < 0.5 ? lerp(0.6, 0.3, (frac - 0.4) / 0.1) : lerp(0.3, 0.08, (frac - 0.5) / 0.1);
      const pumpEff = S.pump * tamp * tens;
      let mapT = 93 * g * Math.min(1, pumpEff * 1.25) * (S.neurogenic ? 0.68 : 1);
      mapT *= 1 - 0.6 * S.vagal;
      if (S.spo2 < 55) mapT *= lerp(0.2, 1, (S.spo2 - 30) / 25);
      if (S.arrest) mapT = 0;
      S.map += (mapT - S.map) * clamp(dt / (S.arrest ? 2 : 4), 0, 1);
      // cardiac arrest
      if (!S.arrest) {
        S.lowMapT = S.map < 30 ? S.lowMapT + dt : 0;
        if (S.lowMapT > 8 || S.spo2 < 32 || (S.heartDestroyed && S.map < 35)) {
          S.arrest = true;
          S.cause = S.heartDestroyed ? 'Cardiac rupture' : S.spo2 < 40 ? 'Respiratory arrest → hypoxic cardiac arrest (' + (S.apneaWhy || (S.lung.L < 0.3 && S.lung.R < 0.3 ? 'bilateral lung collapse' : 'respiratory failure')) + ')'
            : tamp < 0.5 ? 'Cardiac tamponade' : tens < 0.5 ? 'Tension pneumothorax' : frac > 0.3 ? 'Exsanguination — ' + S.mainBleed() : S.neurogenic ? 'Neurogenic shock' : 'Circulatory collapse';
        }
      }
      if (S.arrest) S.arrestT += dt;
      // heart rate
      let hrT = 72 + (S.conscious ? 50 * S.pain : 0) + 78 * clamp((frac - 0.08) / 0.3, 0, 1) + 25 * clamp(1 - pumpEff, 0, 1) + (S.spo2 < 90 ? 20 : 0);
      if (S.tFirst != null && S.conscious) hrT += 18;
      if (frac > 0.44) hrT = lerp(hrT, 40, (frac - 0.44) / 0.08);
      hrT = Math.min(hrT, 168);
      if (S.vagal > 0.2) hrT = Math.min(hrT, lerp(hrT, 44, S.vagal * 1.5));
      if (S.neurogenic) hrT = Math.min(hrT, 58);
      if (S.spo2 < 50) hrT = Math.min(hrT, lerp(30, 90, (S.spo2 - 30) / 20));
      if (S.arrest) hrT = S.heartDestroyed ? 0 : Math.max(0, 45 - S.arrestT * 0.35);
      S.hr += (hrT - S.hr) * clamp(dt / 5, 0, 1);
      const pp = 40 * clamp(g * pumpEff * 1.1, 0, 1) * (S.map / 93 + 0.2);
      S.sys = S.map < 3 ? 0 : S.map + (pp * 2) / 3; S.dia = S.map < 3 ? 0 : Math.max(0, S.map - pp / 3);
      // respiration
      const agonal = S.arrest || S.brainE < 0.12 || (S.brainDestroyed && !S.apnea);
      S.agonal = agonal && !S.apnea && S.rr > 1;
      let rrT = S.apnea ? 0 : agonal ? Math.max(0, 6 - S.arrestT * 0.05) : 14 + 18 * clamp(frac / 0.4, 0, 1) + 10 * S.pain * (S.conscious ? 1 : 0.3) + 14 * (1 - (0.45 * S.lung.L + 0.55 * S.lung.R));
      S.rr += (rrT - S.rr) * clamp(dt / 4, 0, 1);
      const vent = S.apnea ? 0 : Math.min(1.2, (0.45 * S.lung.L + 0.55 * S.lung.R) * S.airway * clamp(S.rr / 14, 0, 1.9) * (agonal ? 0.25 : 1));
      const sT = vent >= 0.75 ? 98 : 98 * Math.pow(vent / 0.75, 0.6);
      S.spo2 += (sT - S.spo2) * clamp(dt / (sT < S.spo2 ? 100 : 25), 0, 1);
      // brain
      // standing costs the brain ~12 mmHg of perfusion pressure: a body that faints upright can come round lying flat
      const d = clamp((S.map - (S.upright ? 30 : 18)) / 40, 0, 1) * (S.spo2 / 97);
      if (d < 0.55) S.brainE = Math.max(0, S.brainE - ((0.55 - d) / 0.55 / 13) * dt); else S.brainE = Math.min(1, S.brainE + 0.04 * dt);
      if (d < 0.15) S.anoxic += dt; else S.anoxic = Math.max(0, S.anoxic - dt * 0.5);
      const was = S.conscious;
      S.conscious = !S.koForced && !S.brainDestroyed && S.brainE > (was ? 0.3 : 0.55);
      // convulsive syncope: brief myoclonic jerks as the cortex loses perfusion
      if (was && !S.conscious && !S.koForced && M.mode === 'normal' && Math.random() < 0.4) S.setMotor('clonic', 2.5 + Math.random() * 4);
      if (S.conscious) S.pain = Math.max(0, S.pain - dt * 0.0006);
      if (S.anoxic > 300 || (S.brainDestroyed && S.arrest)) {
        S.dead = true;
        if (S.brainDestroyed) S.cause = 'Catastrophic brain injury';
        else if (!S.cause) S.cause = 'Anoxic brain death';
      }
    };

    S.mainBleed = () => { let m = null; for (const w of S.wounds) if (!m || w.lost > m.lost) m = w; return m ? m.label.toLowerCase() : 'multiple wounds'; };
    S.frac = () => (S.total - S.bv) / S.total;
    S.hemClass = () => { const f = S.frac(); return f < 0.005 ? '—' : f < 0.15 ? 'Class I' : f < 0.3 ? 'Class II' : f < 0.4 ? 'Class III' : 'Class IV'; };
    S.avpu = () => (S.dead || S.brainDestroyed ? 'None' : !S.conscious ? (S.brainE > 0.2 && !S.koForced ? 'Responds to pain' : 'Unresponsive') : S.brainE < 0.6 || S.map < 60 ? 'Confused / drowsy' : 'Alert');
    S.status = () => {
      if (S.dead) return ['DECEASED', 3];
      if (S.stemDestroyed) return ['DEAD — brainstem destroyed', 3];
      if (S.brainDestroyed) return ['DYING — unsurvivable brain injury', 3];
      if (S.arrest) return ['CARDIAC ARREST', 3];
      if (!S.conscious) return ['ALIVE — unconscious', 2];
      const f = S.frac();
      if (f > 0.3 || S.spo2 < 85 || S.map < 60) return ['ALIVE — critical', 2];
      if (S.wounds.length) return ['ALIVE — wounded', 1];
      return ['ALIVE', 0];
    };
    S.alive = () => !S.dead && !S.stemDestroyed;
    return S;
  };
})();
