// HUD: subject monitor (top-left), weapon card, last-shot report, toolbar.
(function () {
  const G = (window.GSW = window.GSW || {});
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  G.UI = function (handlers) {
    const U = {}, ecg = $('ecg'), ex = ecg.getContext('2d');
    let ex0 = 0, phase = 0, lastY = 23, injN = -1;
    const guns = $('guns');
    G.WEAPONS.forEach((w, i) => {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = esc(w.key) + ' · ' + esc(w.name.replace(/ (pistol|rifle|revolver|shotgun|hunting rifle)$/, '')) + '<small>' + esc(w.load.replace(/ \(.*/, '')) + '</small>';
      b.title = w.name + ' — ' + w.load; b.addEventListener('click', () => handlers.weapon(i)); guns.appendChild(b);
    });
    $('bXray').addEventListener('click', () => handlers.xray());
    $('bTime').addEventListener('click', () => handlers.time());
    $('bSound').addEventListener('click', () => handlers.sound());
    $('bReset').addEventListener('click', () => handlers.reset());
    $('bHelp').addEventListener('click', () => { $('intro').hidden = false; });
    $('bStart').addEventListener('click', () => { $('intro').hidden = true; handlers.start(); });
    $('subjHead').addEventListener('click', () => { const m = $('subject').classList.toggle('min'); $('subjHead').setAttribute('aria-expanded', String(!m)); });
    if (window.innerWidth < 720) $('subject').classList.add('min');

    U.setWeapon = (w, i) => {
      [...guns.children].forEach((b, k) => b.classList.toggle('on', k === i));
      $('wKey').textContent = 'key ' + w.key; $('wName').textContent = w.name; $('wLoad').textContent = w.load;
      $('wVel').textContent = w.bullet.v + ' m/s'; $('wEn').textContent = Math.round(w.energy) + ' J';
    };
    U.setXray = (on) => $('bXray').setAttribute('aria-pressed', String(on));
    U.setTime = (x) => { $('bTime').textContent = 'Time ×' + x; };
    U.setSound = (on) => $('bSound').setAttribute('aria-pressed', String(on));
    U.setRange = (m) => { $('wRange').textContent = m.toFixed(1) + ' m'; };
    U.cross = (x, y) => { $('cross').style.transform = 'translate(' + x + 'px,' + y + 'px)'; };

    U.report = (r) => {
      $('report').hidden = !r; if (!r) return;
      $('rTag').textContent = r.tag;
      $('rBody').innerHTML = r.lines.map((l) => '<div class="' + (l.cls || '') + '">' + l.html + '</div>').join('');
    };
    const fmtT = (s) => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    const cls = (el, v, warn, crit, lowBad) => { el.className = (lowBad ? v < crit : v > crit) ? 'c' : (lowBad ? v < warn : v > warn) ? 'w' : ''; };
    U.update = (P, N) => {
      const [st, lv] = P.status(), se = $('status');
      se.textContent = st; se.className = 'status s' + lv;
      const pulse = P.arrest || P.dead;
      $('vHr').textContent = P.hr < 1 ? '0' : Math.round(P.hr); cls($('vHr'), pulse ? 999 : Math.abs(P.hr - 75), 35, 60);
      $('vBp').textContent = P.map < 3 ? '—/—' : Math.round(P.sys) + '/' + Math.round(P.dia); cls($('vBp'), P.map, 65, 50, true);
      $('vSp').textContent = P.map < 12 ? '—' : Math.round(P.spo2); cls($('vSp'), P.spo2, 92, 85, true);
      $('vRr').textContent = Math.round(P.rr); cls($('vRr'), P.rr < 6 ? 99 : P.rr, 24, 32);
      const f = P.frac(), lost = P.total - P.bv;
      $('vBv').textContent = (P.bv / 1000).toFixed(2) + ' L'; $('bvBar').style.width = (100 * P.bv / P.total).toFixed(1) + '%';
      $('vLost').textContent = Math.round(lost) + ' mL (' + (f * 100).toFixed(0) + '%)';
      $('vSplit').textContent = Math.round(P.lostExt) + ' / ' + Math.round(P.lostInt) + ' mL';
      $('vRate').textContent = P.bleedRate < 1 ? '0 mL/min' : P.bleedRate < 20 ? P.bleedRate.toFixed(1) + ' mL/min' : Math.round(P.bleedRate) + ' mL/min';
      $('vClass').textContent = P.hemClass(); $('vAvpu').textContent = P.avpu();
      let post = N.posture === 'stand' ? (N.pose === 'guard' ? 'Standing — guarding wound' : 'Standing') : N.posture === 'falling' ? 'Collapsing' : P.conscious ? 'Down — conscious' : 'Down — motionless';
      if (P.armsPara) post += ' · quadriplegic'; else if (P.legsPara) post += ' · paraplegic';
      $('vPost').textContent = post;
      $('vTime').textContent = P.tFirst == null ? '—' : fmtT(P.t - P.tFirst);
      const showCause = (P.arrest || P.dead || P.brainDestroyed) && (P.cause || P.brainDestroyed);
      $('causeRow').hidden = !showCause; if (showCause) $('vCause').textContent = P.cause || 'Catastrophic brain injury';
      if (P.injVer !== injN) {
        injN = P.injVer;
        $('iCount').textContent = P.injuries.length || 'none';
        $('inj').innerHTML = P.injuries.slice().reverse().map((i) => '<li class="v' + i.sev + '">' + esc(i.text) + (i.n > 1 ? ' ×' + i.n : '') + '</li>').join('');
      }
    };
    // ECG strip: sinus rhythm scaled by rate; wide slow complexes in arrest; flat when asystolic
    const wave = (p, wide) => {
      const g = (c, w, a) => a * Math.exp(-(((p - c) / w) ** 2));
      return wide ? g(0.3, 0.07, 0.5) - g(0.42, 0.08, 0.3) : g(0.16, 0.03, 0.12) - g(0.265, 0.008, 0.14) + g(0.285, 0.012, 1) - g(0.31, 0.01, 0.22) + g(0.5, 0.05, 0.25);
    };
    U.ecg = (P, dt) => {
      const W = ecg.width, H = ecg.height, hr = P.hr, step = Math.max(1, Math.round(dt * 95));
      const col = P.arrest || P.dead ? '#ff5a52' : '#58e6a0';
      for (let i = 0; i < step; i++) {
        phase += (hr / 60) * (dt / step);
        const y = H * 0.68 - (hr > 2 ? wave(phase % 1, P.arrest) * H * 0.55 : 0) + (Math.random() - 0.5) * 0.8;
        ex.fillStyle = '#05090b'; ex.fillRect(ex0, 0, 9, H);
        ex.strokeStyle = col; ex.lineWidth = 1.6; ex.beginPath(); ex.moveTo(ex0 - 1, lastY); ex.lineTo(ex0, y); ex.stroke();
        lastY = y; ex0++; if (ex0 >= W) { ex0 = 0; }
      }
    };
    return U;
  };
})();
