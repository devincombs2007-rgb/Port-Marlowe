// Physics Lab: the fundamentals running live, each with its checks.
import { connectedTanks, ventTanks, tiltTanks, doorDemo, boatDemo, frameRateTest, convergenceTest, repeatabilityTest, detachmentTest, glassTest, ledgerTest } from './physics2/demos.js';
import { FixedClock } from './physics2/clock.js';
import { DATA } from './physics2/params.js';

const DT = 1 / 240;
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function setupCanvas(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  return { g, w, h };
}
function plot(g, x, y, w, h, series, cols, yMin, yMax, label) {
  g.strokeStyle = css('--line'); g.lineWidth = 1; g.strokeRect(x, y, w, h);
  if (!series.length) return;
  const t0 = series[0][0], t1 = Math.max(t0 + 1e-6, series[series.length - 1][0]);
  cols.forEach((c, k) => {
    g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath();
    series.forEach((p, i) => { const X = x + (p[0] - t0) / (t1 - t0) * w, Y = y + h - (p[k + 1] - yMin) / (yMax - yMin) * h; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.stroke();
  });
  g.fillStyle = css('--dim'); g.font = '11px ' + css('--mono');
  g.fillText(label, x + 6, y + 13); g.fillText(`${t1.toFixed(0)} s`, x + w - 34, y + h - 5);
}
function arrow(g, x, y, dx, dy, col) {
  const L = Math.hypot(dx, dy); if (L < 2) return;
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
  const a = Math.atan2(dy, dx);
  g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx - 7 * Math.cos(a - 0.4), y + dy - 7 * Math.sin(a - 0.4)); g.lineTo(x + dx - 7 * Math.cos(a + 0.4), y + dy - 7 * Math.sin(a + 0.4)); g.fill();
}
const WATER = () => css('--water'), AIR = () => css('--air');

// ----------------------------------------------------------- demo cards
const cards = [];
function card(id, make, duration, draw, readout) {
  const el = document.getElementById(id);
  const C = { el, make, duration, draw, readout, clock: new FixedClock(DT), S: make(), speed: Number(el.dataset.speed || 1), paused: false };
  el.querySelectorAll('[data-sp]').forEach(b => b.addEventListener('click', () => { C.speed = Number(b.dataset.sp); C.paused = C.speed === 0; el.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('on', x === b)); }));
  el.querySelector('[data-reset]').addEventListener('click', () => { C.S = C.make(); C.clock = new FixedClock(DT); });
  el.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('on', Number(x.dataset.sp) === C.speed));
  cards.push(C);
  return C;
}
function renderChecks(C) {
  const list = C.el.querySelector('.checks');
  const done = C.S.t >= C.duration;
  const checks = C.S.checks();
  list.innerHTML = (done ? '' : `<li class="run">Running — ${C.S.t.toFixed(0)} of ${C.duration} s simulated; checks settle at the end.</li>`) +
    checks.map(c => `<li class="${c.pass ? 'ok' : done ? 'bad' : 'wait'}"><span class="mk">${c.pass ? '✓' : done ? '✗' : '…'}</span><span class="nm">${c.name}</span><b>${c.value}</b><i>expected ${c.target}${c.note ? ' · ' + c.note : ''}</i></li>`).join('');
}

// 1. connected tanks
card('c-tanks', connectedTanks, 60, (S, g, w, h) => {
  const sc = Math.min((w - 40) / 4.4, (h * 0.55) / 3.2), ox = 20, oz = h * 0.6;
  const X = (u) => ox + u * sc, Z = (z) => oz - z * sc;
  const [a, b] = S.net.nodes;
  for (const c of [a, b]) {
    g.fillStyle = AIR(); g.fillRect(X(c.u0), Z(c.z1), (c.u1 - c.u0) * sc, (c.z1 - c.z0) * sc);
    g.fillStyle = WATER(); g.fillRect(X(c.u0), Z(c.h), (c.u1 - c.u0) * sc, (c.h - c.z0) * sc);
    g.strokeStyle = css('--steel'); g.lineWidth = 3; g.strokeRect(X(c.u0), Z(c.z1), (c.u1 - c.u0) * sc, (c.z1 - c.z0) * sc);
  }
  g.fillStyle = css('--bg'); g.fillRect(X(1.98), Z(0.65), 0.24 * sc, 0.6 * sc);
  g.fillStyle = WATER(); g.fillRect(X(1.98), Z(0.65), 0.24 * sc, 0.6 * sc);
  const Q = S.ids.pipe.Q.reduce((s, q) => s + q, 0);
  arrow(g, X(2.1), Z(0.35), Q * 40, 0, css('--accent'));
  g.fillStyle = css('--text'); g.font = '12px ' + css('--mono');
  g.fillText(`${a.h.toFixed(3)} m`, X(0.6), Z(a.h) - 6); g.fillText(`${b.h.toFixed(3)} m`, X(2.8), Z(b.h) - 6);
  plot(g, 20, h * 0.66, w - 40, h * 0.3, S.series, [css('--accent'), css('--water-line')], 0, 2.6, 'level A / B (m)');
}, (S) => `Flow ${S.ids.pipe.Q.reduce((s, q) => s + q, 0).toFixed(3)} m³/s · water error ${S.net.waterError().toExponential(1)} m³`);

// 2. sealed vs vented
card('c-vent', ventTanks, 900, (S, g, w, h) => {
  const n = S.runs.length, cw = (w - 40) / n, sc = Math.min(cw / 2.8, h * 0.5 / 5.2);
  const seaY = 24;
  g.fillStyle = css('--sea'); g.fillRect(0, seaY, w, h * 0.62 - seaY);
  g.strokeStyle = css('--water-line'); g.beginPath(); g.moveTo(0, seaY); g.lineTo(w, seaY); g.stroke();
  S.runs.forEach((r, i) => {
    const c = r.net.nodes[r.T];
    const ox = 20 + i * cw + (cw - 2 * sc) / 2;
    const X = (u) => ox + u * sc, Z = (z) => seaY - z * sc;
    g.fillStyle = AIR(); g.fillRect(X(0), Z(-1), 2 * sc, 3 * sc);
    g.fillStyle = WATER(); g.fillRect(X(0), Z(c.h), 2 * sc, (c.h + 4) * sc);
    g.strokeStyle = css('--steel'); g.lineWidth = 3; g.strokeRect(X(0), Z(-1), 2 * sc, 3 * sc);
    if (r.ventArea > 0) { g.strokeStyle = css('--steel'); g.lineWidth = r.ventArea > 0.001 ? 4 : 1.5; g.beginPath(); g.moveTo(X(1), Z(-1)); g.lineTo(X(1), seaY - 12); g.stroke(); }
    const q = r.net.openings[0].Q.reduce((s, x) => s + x, 0);
    arrow(g, X(0) - 18, Z(-3.85), Math.min(30, q * 400), 0, css('--accent'));
    g.fillStyle = css('--text'); g.font = '11px ' + css('--mono');
    g.fillText(`${(c.pAir / 1e5).toFixed(2)} bar`, X(0.25), Z(-1.3));
    g.fillText(`${(c.V / c.Vcap * 100).toFixed(0)} % full`, X(0.25), Z(-1.3) + 14);
    g.fillStyle = css('--dim'); g.fillText(S.labels[i], X(0) - 6, h * 0.62 - 6);
  });
  const ser = S.runs[0].series.map((p, k) => [p[0], p[1], S.runs[1].series[k] ? S.runs[1].series[k][1] : 0, S.runs[2].series[k] ? S.runs[2].series[k][1] : 0]);
  plot(g, 20, h * 0.66, w - 40, h * 0.3, ser, [css('--accent'), css('--warn'), css('--bad')], 0, 1.05, 'fraction full: vented / restricted / sealed');
}, (S) => S.runs.map((r, i) => `${S.labels[i]}: ${(r.net.nodes[r.T].pAir / 1e5).toFixed(3)} bar`).join(' · '));

// 3. tilting containers
card('c-tilt', tiltTanks, 40, (S, g, w, h) => {
  const th = S.thetaAt(S.t);
  S.runs.forEach((r, i) => {
    const c = r.net.nodes[r.id];
    const sc = Math.min((w / 2 - 30) / 4.4, h * 0.5 / 2.4);
    const cx = (i + 0.5) * w / 2, cz = h * 0.5;
    g.save(); g.translate(cx, cz); g.scale(sc, -sc);
    // container in its own frame
    g.save(); g.rotate(th);
    g.beginPath(); g.rect(c.u0, c.z0, c.u1 - c.u0, c.z1 - c.z0); g.fillStyle = AIR(); g.fill(); g.clip();
    g.rotate(-th);
    // water: everything below the world-aligned surface line
    const s = c.surfaceZ(0), tp = c.tp;
    g.beginPath(); g.moveTo(-5, s + tp * (-5 - c.xc)); g.lineTo(5, s + tp * (5 - c.xc)); g.lineTo(5, -5); g.lineTo(-5, -5); g.closePath();
    g.fillStyle = WATER(); g.fill();
    g.restore();
    g.save(); g.rotate(th); g.strokeStyle = css('--steel'); g.lineWidth = 3 / sc; g.strokeRect(c.u0, c.z0, c.u1 - c.u0, c.z1 - c.z0); g.restore();
    // water centre of gravity
    const cg = c.waterCG();
    g.fillStyle = css('--accent'); g.beginPath(); g.arc(cg.x, cg.z, 5 / sc, 0, 7); g.fill();
    g.restore();
    g.fillStyle = css('--dim'); g.font = '11px ' + css('--mono');
    g.fillText(S.labels[i], cx - 70, 40);
    g.fillText(`CG shift ${(r.yb * 100).toFixed(1)} cm`, cx - 70, 54);
  });
  g.fillStyle = css('--text'); g.font = '12px ' + css('--mono');
  g.fillText(`container heel ${(th * 180 / Math.PI).toFixed(2)}°`, 16, 18);
  const ser = S.psiSeries.filter((_, i) => i % 6 === 0).map(p => [p[0], p[1] * 180 / Math.PI]);
  plot(g, 20, h * 0.74, w - 40, h * 0.22, ser, [css('--accent')], -3, 3, 'free-surface tilt ψ (deg), broad tank');
}, (S) => `Surface tilt ${(S.runs[0].psi * 180 / Math.PI).toFixed(3)}° (broad) · ${(S.runs[1].psi * 180 / Math.PI).toFixed(3)}° (narrow)`);

// 4. door
let doorDir = 'b';
const doorCard = card('c-door', () => doorDemo(doorDir), 240, (S, g, w, h) => {
  const sc = Math.min((w - 200) / 6.2, h * 0.5 / 3.2), ox = 20, oz = h * 0.58;
  const X = (u) => ox + u * sc, Z = (z) => oz - z * sc;
  const [l, r] = S.net.nodes;
  g.fillStyle = css('--sea'); g.fillRect(0, Z(3), X(0) - 2, Z(0) - Z(3));
  for (const c of [l, r]) {
    g.fillStyle = AIR(); g.fillRect(X(c.u0), Z(c.z1), (c.u1 - c.u0) * sc, 3 * sc);
    g.fillStyle = WATER(); g.fillRect(X(c.u0), Z(Math.min(c.h, 3)), (c.u1 - c.u0) * sc, Math.min(c.h, 3) * sc);
    g.strokeStyle = css('--steel'); g.lineWidth = 3; g.strokeRect(X(c.u0), Z(c.z1), (c.u1 - c.u0) * sc, 3 * sc);
  }
  // door (side elevation): opening in the wall, leaf darkens as it opens
  const d = S.door;
  g.fillStyle = d.theta > 0 ? WATER() : css('--door'); g.fillRect(X(3.0), Z(1.98), 0.1 * sc, 1.98 * sc);
  // plan inset
  const px = w - 110, pz = 30, L = 46;
  g.strokeStyle = css('--dim'); g.lineWidth = 1; g.strokeRect(px - 60, pz - 24, 150, 74);
  g.fillStyle = css('--dim'); g.font = '10px ' + css('--mono'); g.fillText('plan view', px - 56, pz - 12);
  g.strokeStyle = css('--steel'); g.lineWidth = 3; g.beginPath(); g.moveTo(px - 50, pz + 14); g.lineTo(px, pz + 14); g.moveTo(px + L, pz + 14); g.lineTo(px + 80, pz + 14); g.stroke();
  const sgn = d.opensToward === 'b' ? 1 : -1;
  g.strokeStyle = css('--door'); g.lineWidth = 4; g.beginPath(); g.moveTo(px, pz + 14); g.lineTo(px + Math.cos(d.theta) * L, pz + 14 + sgn * Math.sin(d.theta) * L); g.stroke();
  g.fillStyle = css('--dim'); g.fillText('flooding', px - 56, pz + 2); g.fillText('dry', px - 56, pz + 44);
  // loads
  g.fillStyle = css('--text'); g.font = '12px ' + css('--mono');
  const latchMax = DATA.doors.cabin_latch_strength.value;
  g.fillText(`pressure force ${(Math.abs(d.F) / 1e3).toFixed(2)} kN · torque ${Math.abs(d.tau).toFixed(0)} N·m`, 16, h * 0.66);
  g.fillText(d.opensToward === 'b' ? `latch load ${d.latchLoad.toFixed(0)} / ${latchMax} N ${d.latched ? '' : '— FAILED'}` : `door stop carries ${d.stopLoad.toFixed(0)} N`, 16, h * 0.66 + 16);
  const frac = d.opensToward === 'b' ? Math.min(1, d.latchLoad / latchMax) : Math.min(1, d.stopLoad / DATA.doors.frame_stop_strength.value);
  g.fillStyle = css('--line'); g.fillRect(16, h * 0.66 + 24, w - 32, 6);
  g.fillStyle = frac > 0.8 ? css('--bad') : css('--accent'); g.fillRect(16, h * 0.66 + 24, (w - 32) * frac, 6);
  plot(g, 20, h * 0.8, w - 40, h * 0.17, S.series.map(p => [p[0], p[1], p[2], p[3]]), [css('--accent'), css('--water-line'), css('--door')], 0, 3, 'levels L / R (m) and door angle (rad)');
}, (S) => `${S.door.events.length ? S.door.events.map(e => `${e.type} failed at ${e.t.toFixed(1)} s`).join(', ') : 'door holding'} · water error ${S.net.waterError().toExponential(1)} m³`);
document.getElementById('doorDir').addEventListener('click', (e) => {
  doorDir = doorDir === 'b' ? 'a' : 'b';
  e.target.textContent = doorDir === 'b' ? 'Door opens toward the dry room' : 'Door opens into the flooding room';
  doorCard.S = doorDemo(doorDir); doorCard.clock = new FixedClock(DT);
});

// 5. lifeboat
card('c-boat', boatDemo, 110, (S, g, w, h) => {
  const b = S.b;
  // camera follows the boat down the ship's side
  const sc = Math.min((w - 40) / 13, h / 13.5), ox = w / 2;
  const zc = Math.max(5.2, Math.min(15.4, b.z + 1.6));
  const X = (x) => ox + x * sc, Z = (z) => h / 2 - (z - zc) * sc;
  g.fillStyle = css('--sea'); g.fillRect(0, Z(0), w, h - Z(0));
  g.strokeStyle = css('--water-line'); g.beginPath(); g.moveTo(0, Z(0)); g.lineTo(w, Z(0)); g.stroke();
  // davits
  g.strokeStyle = css('--steel'); g.lineWidth = 3;
  for (const f of S.falls) { g.beginPath(); g.moveTo(X(f.head[0]), Z(f.head[1] + 1.5)); g.lineTo(X(f.head[0]), Z(f.head[1])); g.stroke(); }
  // falls: taut ones straight and coloured by load, slack ones sagging
  for (const f of S.falls) {
    const hx = b.wx(f.hook[0], f.hook[1]), hz = b.wz(f.hook[0], f.hook[1]);
    const load = f.T / f.breakLoad;
    g.strokeStyle = f.broken ? css('--bad') : load > 0.5 ? css('--warn') : css('--rope'); g.lineWidth = 2;
    g.beginPath(); g.moveTo(X(f.head[0]), Z(f.head[1]));
    if (f.slack) g.quadraticCurveTo(X((f.head[0] + hx) / 2 + 0.6), Z((f.head[1] + hz) / 2 - 0.8), X(hx), Z(hz)); else g.lineTo(X(hx), Z(hz));
    g.stroke();
    g.fillStyle = css('--text'); g.font = '11px ' + css('--mono');
    g.fillText(`${(f.T * f.parts / 1e3).toFixed(1)} kN`, X(f.head[0]) + (f.head[0] > 0 ? 6 : -58), Z(f.head[1]) + 14);
  }
  // hull
  g.save(); g.translate(X(b.x), Z(b.z)); g.rotate(-b.ang); g.scale(sc, -sc); g.translate(-b.c[0], -b.c[1]);
  const L = S.boat.L, D = S.boat.D;
  g.beginPath(); g.moveTo(-L / 2, D); g.quadraticCurveTo(-L / 2 + 0.6, 0.1, -L / 2 + 1.8, 0); g.lineTo(L / 2 - 1.8, 0); g.quadraticCurveTo(L / 2 - 0.6, 0.1, L / 2, D); g.closePath();
  g.fillStyle = css('--boat'); g.fill(); g.strokeStyle = css('--steel'); g.lineWidth = 1.5 / sc; g.stroke();
  g.fillStyle = css('--people');
  for (const p of S.people) { g.fillRect(p.u - 0.08, p.z + 0.3, 0.16, 0.7); g.beginPath(); g.arc(p.u, p.z + 1.12, 0.11, 0, 7); g.fill(); }
  g.restore();
  g.fillStyle = css('--text'); g.font = '12px ' + css('--mono');
  g.fillText(S.phase, 16, h - 12);
}, (S) => `pitch ${(-S.b.ang * 180 / Math.PI).toFixed(2)}° · hauling part ${S.falls.map(f => (f.haul / 1e3).toFixed(2)).join(' / ')} kN · ${S.people.length} aboard, ${(S.b.m / 1e3).toFixed(2)} t`);

// ----------------------------------------------------------- frame-rate & extras
document.getElementById('runFR').addEventListener('click', async (e) => {
  const out = document.getElementById('frOut');
  e.target.disabled = true;
  const rows = [];
  const say = (h) => { out.innerHTML = h; };
  say('<p>Running the combined scenario (two tanks, a door, a boat on its falls) for 20 simulated seconds at four rendering rates…</p>');
  await new Promise(r => setTimeout(r, 30));
  const fr = frameRateTest(20);
  rows.push(`<h4>Same physics at any frame rate</h4><table><tr><th>Rendering</th><th>Frames</th><th>Physics steps</th><th>State hash</th></tr>${fr.map(r => `<tr><td>${r.label}</td><td>${r.frames}</td><td>${r.steps}</td><td class="${r.hash === fr[0].hash ? 'ok' : 'bad'}">${r.hash}</td></tr>`).join('')}</table>`);
  say(rows.join('') + '<p>Repeat runs and timestep convergence…</p>');
  await new Promise(r => setTimeout(r, 30));
  const rp = repeatabilityTest();
  rows.push(`<h4>Repeatability</h4><p class="${rp[0] === rp[1] ? 'ok' : 'bad'}">Two identical runs: ${rp[0]} / ${rp[1]}</p>`);
  const cv = convergenceTest();
  rows.push(`<h4>Timestep convergence (vs 1/960 s, at t = 12 s)</h4><table><tr><th>Step</th><th>Tank level</th><th>Door room</th><th>Boat height</th></tr>${cv.map(r => `<tr><td>1/${Math.round(1 / r.dt)} s</td><td>${(r.errTankLevel * 1000).toFixed(3)} mm</td><td>${(r.errDoorRoom * 1000).toFixed(3)} mm</td><td>${(r.errBoatZ * 1000).toFixed(3)} mm</td></tr>`).join('')}</table>`);
  const ex = [...detachmentTest(), ...glassTest(), ...ledgerTest()];
  rows.push(`<h4>Extras</h4><ul class="checks">${ex.map(c => `<li class="${c.pass ? 'ok' : 'bad'}"><span class="mk">${c.pass ? '✓' : '✗'}</span><span class="nm">${c.name}</span><b>${c.value}</b><i>expected ${c.target}${c.note ? ' · ' + c.note : ''}</i></li>`).join('')}</ul>`);
  say(rows.join(''));
  e.target.disabled = false;
});

// parameter table (units and provenance)
{
  const t = document.getElementById('params');
  let html = '';
  for (const [grp, items] of Object.entries(DATA)) {
    if (grp.startsWith('_')) continue;
    for (const [k, o] of Object.entries(items)) html += `<tr><td>${grp}.${k}</td><td>${Array.isArray(o.value) ? o.value.join(' × ') : o.value}</td><td>${o.unit}</td><td>${o.source ? 'source: ' + o.source : 'estimate' + (o.estimate ? ': ' + o.estimate : '')}</td></tr>`;
  }
  t.innerHTML = `<tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Provenance</th></tr>` + html;
}

// ----------------------------------------------------------- loop
let last = performance.now(), chk = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  for (const C of cards) {
    if (!C.paused && C.S.t < C.duration) { C.clock.timeScale = C.speed; C.clock.advance(dt, (h) => C.S.step(h)); }
    const cv = C.el.querySelector('canvas');
    const { g, w, h } = setupCanvas(cv);
    C.draw(C.S, g, w, h);
    C.el.querySelector('.readout').textContent = C.readout(C.S);
  }
  if (now - chk > 500) { chk = now; for (const C of cards) renderChecks(C); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
