// Plays the historical replay: advances ship's time, fires the narrative,
// spawns particles, drives the director camera and the HUD.
import * as H from './history.js';
import { Replay } from './replay.js';
import { BUBBLE, JET, SPRAY, SILT, DEBRIS, STEAM, FLAKE, SNOW } from '../render/particles.js';
import { MATERIALS, EMPTY } from '../sim/materials.js';
import { gaugePressure, waterTemperature, P_ATM } from '../sim/constants.js';

const smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export const fmtTime = (t) => {
  const s = Math.floor(t + 23 * 3600 + 40 * 60);
  const h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

export class Player {
  constructor(ctx) {
    Object.assign(this, ctx);       // world, renderer, particles, sound, log, $
    this.replay = new Replay(this.world);
    this.t = H.START;
    this.prevT = H.START - 1;
    this.speed = 1;
    this.paused = false;
    this.director = true;
    this.years = 0; this.epilogue = false;
    this.renderer.replay = this.replay;
    this.renderer.boatList = H.BOATS;
    Object.assign(this.replay, { rockets: H.ROCKETS, carpathiaT0: H.T(3, 25), californianT: [H.T(0, 45), H.T(2, 30)], t: H.START });
    this.timeline = this.buildTimeline();
    this.seek(H.START);
  }

  buildTimeline() {
    const r = this.replay;
    const ev = H.EVENTS.map(([t, text, fx]) => ({ t, text, fx }));
    for (const b of H.BOATS) {
      if (b.float) continue;
      ev.push({ t: b.at, text: `Lifeboat ${b.id} reaches the water from the ${b.side === 's' ? 'starboard' : 'port'} side with about ${b.n} aboard${b.note ? ` — ${b.note}` : ''}.`, boat: b.id });
    }
    H.ROCKETS.forEach((t, i) => ev.push({ t, text: i === 0 ? 'Fourth Officer Boxhall fires the first white distress rocket from the bridge. Eight will follow at intervals.' : `Distress rocket ${i + 1} of 8.`, fx: 'rocket', minor: i > 0 }));
    ev.push({ t: r.bowPath.impact.t, text: `The bow section strikes the seabed at ${(r.bowPath.impact.v * 3.6).toFixed(0)} km/h, 3,800 m down, burying its stem about 18 m in the mud.`, fx: 'impact', at: 'bow' });
    ev.push({ t: r.sternPath.impact.t, text: `The stern section lands ${Math.round(Math.abs(r.bowPath.impact.x - r.sternPath.impact.x))} m from the bow at ${(r.sternPath.impact.v * 3.6).toFixed(0)} km/h. Its decks pancake onto one another.`, fx: 'impact', at: 'stern' });
    for (let i = 0; i < 4; i++) ev.push({ t: H.T(2, 20, 25 + i * 9), fx: 'implode', silent: i > 0 });
    ev.sort((a, b) => a.t - b.t);
    return ev;
  }

  seek(t) {
    this.t = Math.max(H.START, Math.min(H.END, t));
    this.prevT = this.t;
    this.particles.n = 0;
    // rebuild the visible log from history
    this.logLines = [];
    const cap = this.$('caption'); if (cap) cap.classList.remove('show');
    for (const e of this.timeline) if (e.t <= this.t && e.text && !e.minor) this.logLines.push(e);
    this.renderLog();
    this.years = 0; this.epilogue = false;
    this.resetRust();
    this.replay.t = this.t;
    this.replay.flood(this.t);
  }
  renderLog() {
    const last = this.logLines.slice(-6).reverse();
    this.$('log').innerHTML = last.map((e, i) => `<li${i === 0 ? ' class="now"' : ''}><span class="t">${fmtTime(e.t)}</span>${e.text}</li>`).join('');
  }

  nextEventTime() {
    for (const e of this.timeline) if (e.t > this.t + 1 && e.text && !e.minor) return e;
    return null;
  }

  update(dtReal) {
    const r = this.replay, w = this.world;
    if (this.epilogue) { this.updateEpilogue(dtReal); return; }
    if (!this.paused) this.t = Math.min(H.END, this.t + dtReal * this.speed);
    const t = this.t, t0 = this.prevT;
    this.replay.t = t;
    // fire timeline events crossed this frame
    if (t > t0) for (const e of this.timeline) if (e.t > t0 && e.t <= t) this.fire(e);
    this.prevT = t;
    r.flood(t);
    this.ambient(dtReal, t);
    this.renderer.powered = t < H.LIGHTS_OUT;
    this.renderer.flicker = t > H.T(2, 15) && t < H.LIGHTS_OUT ? 0.55 + Math.random() * 0.45 : 1;
    this.renderer.dawn = smooth((t - H.T(4, 30)) / 4500);
    if (this.director) {
      this.direct(t, dtReal);
      // the floodlight (an ROV's lamp) stays on the subject while directing
      const R = this.renderer; R.mouse.x = R.cv.clientWidth / 2; R.mouse.y = R.cv.clientHeight * 0.45;
    }
    if (t >= H.END && !this.paused && !this.epilogue) this.startEpilogue();
  }

  fire(e) {
    if (e.text && !e.minor) { this.logLines.push(e); this.renderLog(); this.caption(e); }
    const s = this.sound;
    const fx = e.fx;
    if (fx === 'bell') s.bell();
    if (fx === 'scrape') { s.scrape(); setTimeout(() => s.scrape(), 1200); this.iceFall(); }
    if (fx === 'crack') { s.crack(0.8); this.renderer.shake = 6; }
    if (fx === 'rocket') s.rocket();
    if (fx === 'boom') { s.boom(0.8); this.renderer.shake = 5; }
    if (fx === 'implode') this.implode(e.silent);
    if (fx === 'impact') this.impact(e.at);
  }
  caption(e) {
    const c = this.$('caption');
    if (!c) return;
    c.innerHTML = `<span class="t">${fmtTime(e.t)}</span> ${e.text}`;
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  }

  iceFall() {
    const bowX = this.replay.apply(this.replay.intact(this.t), this.replay.meta.X0 - 48, 21)[0];
    for (let i = 0; i < 60; i++) this.particles.add(SPRAY, bowX + (Math.random() - 0.5) * 12, 24 + Math.random() * 10, -2 - Math.random() * 3, Math.random() * 2, 0.3 + Math.random() * 0.5, 2.2);
  }
  implode(silent) {
    const st = this.replay.stern[4] || this.replay.stern[0];
    for (let i = 0; i < 160; i++) this.particles.add(BUBBLE, st.x + (Math.random() - 0.5) * 40, st.y + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 6, Math.random() * 6, 0.2 + Math.random() * 0.7, 50);
    if (!silent) { this.sound.boom(1); this.renderer.shake = 8; } else this.sound.boom(0.5);
  }
  impact(which) {
    const r = this.replay, w = this.world;
    const p = which === 'bow' ? r.bowPath.impact : r.sternPath.impact;
    const env = w.env;
    for (let i = 0; i < 700; i++) {
      const x = p.x + (Math.random() - 0.5) * 160;
      this.particles.add(SILT, x, env.seabedY(x) + Math.random() * 8, (Math.random() - 0.5) * 9, Math.random() * 4, 2 + Math.random() * 5, 80 + Math.random() * 120);
    }
    for (let x = p.x - 90; x < p.x + 90; x += 1) env.pushMud(x, 0.06 * Math.exp(-((x - p.x) ** 2) / 2500), 4);
    this.sound.boom(1); this.renderer.shake = 10;
  }

  ambient(dt, t) {
    const P = this.particles, r = this.replay;
    // steam roaring from the funnels after the engines stop
    if (t > H.STEAM[0] && t < H.STEAM[1]) {
      for (let i = 0; i < 3; i++) {
        const f = r.funnels[i];
        const x = f.wx(f.aabb.x1 - 1, f.aabb.y1 - 1), y = f.wy(f.aabb.x1 - 1, f.aabb.y1 - 1);
        if (Math.random() < 0.8) P.add(STEAM, x + Math.random() * 3, y, 1 + Math.random(), 4 + Math.random() * 3, 0.6, 7);
      }
    } else if (t < H.T(23, 40, 30)) {
      for (let i = 0; i < 3; i++) {
        const f = r.funnels[i];
        if (Math.random() < 0.35) P.add(STEAM, f.wx(f.aabb.x1 - 2, f.aabb.y1), f.wy(f.aabb.x1 - 2, f.aabb.y1), -6, 1.5, 0.8, 5);
      }
    }
    // air pouring out as the ship goes under
    if (t > H.T(1, 30) && t < H.T(2, 26)) {
      const n = t > H.BREAK_START ? 10 : 2;
      for (const sec of [r.bow, r.stern]) {
        for (let i = 0; i < n; i++) {
          const b = sec[(Math.random() * sec.length) | 0];
          if (b.y > 2 || b.y < -900) continue;
          if (Math.random() < 0.5) P.add(BUBBLE, b.x + (Math.random() - 0.5) * 9, b.wbox.y1 - Math.random() * 6, 0, 0.5, 0.08 + Math.random() * 0.25, 30);
        }
      }
    }
    // coal, furniture and boilers spilling from the break
    if (t > H.BREAK_DONE && t < H.T(2, 25)) {
      const [hx, hy] = r.apply(r.sections(t).bow, r.xBreak, 6);
      if (hy < 0) for (let i = 0; i < 2; i++) P.add(DEBRIS, hx + (Math.random() - 0.5) * 6, hy + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 2, -3, 0.15 + Math.random() * 0.5, 600);
    }
    // marine snow when deep
    if (this.renderer.cam.y < -80 && P.n < 7000) {
      const [l, tp] = this.renderer.toWorld(0, 0), [rr, bt] = this.renderer.toWorld(this.renderer.cv.clientWidth, this.renderer.cv.clientHeight);
      for (let i = 0; i < 4; i++) P.add(SNOW, l + Math.random() * (rr - l), bt + Math.random() * (tp - bt), 0, 0, 0.1, 25);
    }
  }

  // --------------------------------------------------------------- camera
  shot(t) {
    const r = this.replay;
    const bi = r.bowPath.impact.t, si = r.sternPath.impact.t;
    const sec = r.sections(t);
    const ctr = (p, C) => r.apply(p, C[0], C[1]);
    if (t < H.T(23, 40, 30)) { const [x] = r.apply(sec.bow, 215, 0); return { x: x - 10, y: 14, w: 230 }; }
    if (t < H.T(23, 42)) return { x: 10, y: 14, w: 320, ease: 0.02 };
    if (t < H.BREAK_START - 60) return { x: 0, y: 12, w: 320 };
    if (t < H.STERN_GONE + 15) return { x: -20, y: 18, w: 360 };
    if (t < bi + 25) { const [x, y] = ctr(sec.bow, r.bowC); return { x, y: Math.max(y, -3790), w: 300, deep: true }; }
    if (t < si + 25) { const [x, y] = ctr(sec.stern, r.sternC); return { x, y: Math.max(y, -3790), w: 260, deep: true }; }
    if (t < H.T(3, 20)) { const bx = r.bowPath.impact.x, sx = r.sternPath.impact.x; return { x: (bx + sx) / 2, y: -3770, w: Math.abs(bx - sx) + 400, deep: true }; }
    // back at the surface for the rescue
    { const cx = this.replay.carpathiaX(t); return { x: cx - 140, y: 14, w: 560 }; }
  }
  direct(t, dt) {
    const s = this.shot(t), c = this.renderer.cam;
    const W = this.renderer.cv.clientWidth;
    const narrow = W < 860;
    // frame the shot in the part of the screen the status panel leaves free
    let left = 0, right = W;
    if (!narrow) {
      const p = this.$('panel'), pr = p && p.offsetParent ? p.getBoundingClientRect() : null;
      if (pr && pr.left > W * 0.6) right = pr.left - 8;
    }
    const z = ((right - left) * (narrow ? 0.98 : 0.94)) / s.w;
    const tx = s.x - ((left + right) / 2 - W / 2) / z;
    const k = Math.min(1, dt * (s.deep ? 2.5 : 1.4));
    // big jumps (surface <-> seabed) cut instead of panning through 3.8 km
    if (Math.abs(c.y - s.y) > 600 || Math.abs(c.x - tx) > 1500) { c.x = tx; c.y = s.y; c.z = z; return; }
    c.x += (tx - c.x) * k; c.y += (s.y - c.y) * k; c.z += (z - c.z) * k;
  }

  // --------------------------------------------------------------- HUD
  hud() {
    const r = this.replay, t = this.t, $ = this.$;
    if (this.epilogue) {
      $('clock').textContent = `${Math.floor(1912 + this.years)}`;
      $('elapsed').textContent = `${Math.floor(this.years)} years on the seabed`;
    } else {
      $('clock').textContent = `${t < 20 * 60 ? '14' : '15'} Apr 1912 · ${fmtTime(t)}`;
      const since = t - H.T(23, 39, 40);
      $('elapsed').textContent = since < 0 ? `Collision in ${Math.ceil(-since)} s` : `${Math.floor(since / 3600)}h ${String(Math.floor(since / 60) % 60).padStart(2, '0')}m ${String(Math.floor(since) % 60).padStart(2, '0')}s after the collision`;
    }
    const sec = r.sections(t);
    const trim = (-sec.bow.a * 180 / Math.PI);
    const depth = (list) => Math.max(0, -Math.min(...list.map(b => b.wbox.y0)));
    const bowD = depth(r.bow), sternD = depth(r.stern);
    const speedOf = (P, tt) => { if (tt < P.t0) return 0; const i = Math.min(P.n - 2, Math.floor((tt - P.t0) / P.dt)); return Math.hypot(P.x[i + 1] - P.x[i], P.y[i + 1] - P.y[i]) / P.dt; };
    const boats = H.BOATS.filter(b => b.at <= t);
    const people = boats.reduce((s, b) => s + b.n, 0);
    const rockets = H.ROCKETS.filter(x => x <= t).length;
    const phase = t < H.T(23, 39, 40) ? 'Under way, 22½ knots' : t < H.T(0, 5) ? 'Damage assessment' : t < H.T(2, 5) ? 'Lowering the boats' : t < H.BREAK_START ? 'Final plunge begins' : t < H.STERN_GONE ? 'Breaking apart' : t < r.sternPath.impact.t ? 'Falling to the seabed' : t < H.T(4, 10) ? 'Survivors adrift' : 'Rescue by Carpathia';
    const deep = Math.max(bowD, sternD);
    const rows = [
      ['Phase', phase],
      ['Speed', t < H.T(23, 44) ? `${(r.shipSpeed(t) / 0.5144).toFixed(1)} kn` : t > H.BREAK_DONE ? `bow ${(speedOf(r.bowPath, t) * 3.6).toFixed(0)} · stern ${(t > H.STERN_GONE ? speedOf(r.sternPath, t) * 3.6 : 0).toFixed(0)} km/h` : 'stopped'],
      ['Trim, bow down', t < H.BREAK_DONE ? `${trim.toFixed(1)}°` : 'broken in two'],
      ['Bow depth', `${bowD.toFixed(0)} m`],
      ['Stern depth', `${sternD.toFixed(0)} m`],
      ['Pressure', `${(1 + gaugePressure(deep) / P_ATM).toFixed(1)} atm`],
      ['Lifeboats away', `${boats.length} / 20`],
      ['In the boats', `≈ ${people}`],
      ['Distress rockets', `${rockets} / 8`],
      ['Water temp.', `${waterTemperature(deep).toFixed(1)} °C`],
    ];
    const zw = new Array(16).fill(0), zc = new Array(16).fill(0);
    for (const rm of this.world.ship.rooms) if (rm.deck <= 4 && rm.mat !== 0 && rm.label.indexOf('Double-bottom') < 0) { zw[rm.zone] += Math.min(rm.water, rm.cap); zc[rm.zone] += rm.cap; }
    const meta = this.world.ship.meta;
    $('comps').innerHTML = meta.shortCompartments.map((n, i) => { const p = zc[i] ? zw[i] / zc[i] : 0; return `<div class="comp" title="${meta.compartments[i]}: ${Math.round(p * 100)}% flooded"><i style="height:${Math.round(p * 100)}%"></i><span>${n}</span></div>`; }).reverse().join('');
    $('stats').innerHTML = rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
    const scrub = $('scrub');
    if (scrub && document.activeElement !== scrub) scrub.value = String(Math.round(t));
    const nx = this.nextEventTime();
    $('next').textContent = nx ? `Next ${fmtTime(nx.t)} ›` : 'Wreck today ›';
  }

  // --------------------------------------------------------------- epilogue
  resetRust() {
    const g = this.world.ship.grid;
    if (this.rustTouched) { g.rust.fill(0); this.renderer.invalidateAll(); this.rustTouched = false; }
  }
  startEpilogue() {
    this.epilogue = true; this.years = 0; this.epiIdx = 0; this.director = true;
    this.logLines.push({ t: this.t, text: 'Epilogue: 114 years on the seabed. Rusticles, iron-eating bacteria and wood-boring molluscs go to work.' });
    this.renderLog();
    const r = this.replay; this.replay.flood(H.T(3, 0)); this.t = H.END;
  }
  updateEpilogue(dt) {
    const r = this.replay, g = this.world.ship.grid;
    if (!this.paused) this.years = Math.min(114.6, this.years + dt * 3.5);
    while (this.epiIdx < H.EPILOGUE.length && 1912.3 + this.years >= H.EPILOGUE[this.epiIdx][0]) {
      const [y, text] = H.EPILOGUE[this.epiIdx++];
      const e = { t: H.END, text: `<b>${Math.floor(y)}</b> — ${text}` };
      this.logLines.push(e); this.renderLog(); this.caption({ t: H.END, text: e.text });
    }
    // corrosion as a function of years (deterministic per cell)
    if (!this._rt || performance.now() - this._rt > 500) {
      this._rt = performance.now();
      for (let k = 0; k < g.n; k++) {
        if (g.kind[k] === EMPTY) continue;
        const m = MATERIALS[g.mat[k]];
        if (!m.rustRate) continue;
        g.rust[k] = Math.min(0.97, this.years * m.rustRate * (0.45 + 1.1 * g.seed[k]) * 1.4);
      }
      this.rustTouched = true;
      this.renderer.invalidateAll();
    }
    r.poseAll(H.T(3, 0));
    const fl = this.world.flooding; fl.updatePositions(); fl.solveLevels(0); fl.distributeWater();
    if (this.director) {
      const bx = r.bowPath.impact.x, sx = r.sternPath.impact.x, c = this.renderer.cam;
      const W = this.renderer.cv.clientWidth;
      c.x = bx - 20; c.y = -3768; c.z += ((W * 0.92) / 300 - c.z) * Math.min(1, dt);
    }
    this.renderer.powered = false; this.renderer.dawn = 0;
  }
}
