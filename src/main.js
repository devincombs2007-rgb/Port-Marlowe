// Port Marlowe - a physics-based ship sinking sandbox.
import { createWorld, iceDamagePlan, applyBreach } from './sim/setup.js';
import { Ocean } from './fluid/ocean.js';
import { Particles, BUBBLE, JET, SPRAY, SILT, DEBRIS, SNOW, FLAKE, STEAM } from './render/particles.js';
import { Renderer } from './render/renderer.js';
import { Sound } from './audio/sound.js';
import { MATERIALS, MAT, SPACE, SOLID, OPEN, EMPTY, SIDE } from './sim/materials.js';
import { CELL, P_ATM, gaugePressure, waterTemperature } from './sim/constants.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view');
let world, renderer, ocean, particles, sound = new Sound();
const state = { time: 0, speed: 1, paused: false, tool: 'grab', years: 0, yearRate: 0, scenario: 'iceberg', hover: null, log: [], follow: true, startDate: new Date(Date.UTC(1912, 3, 14, 23, 39, 40)) };
let iceSchedule = [];
let lastFrame = performance.now();
let lights = true, lightsOutAt = -1;

function init(scenario) {
  state.scenario = scenario;
  world = createWorld({ substeps: 8 });
  // settle quietly
  for (let i = 0; i < 240; i++) world.step(1 / 30);
  world.time = 0; world.events.length = 0;
  ocean = new Ocean(world.env);
  particles = new Particles();
  if (renderer) { renderer.world = world; renderer.meta = world.ship.meta; renderer.invalidateAll(); }
  else renderer = new Renderer(canvas, world, world.ship.meta);
  renderer.night = scenario !== 'sandbox';
  for (const b of world.bodies) b.lit = true;
  state.time = 0; state.years = 0; state.yearRate = 0; state.log = []; lights = true; lightsOutAt = -1;
  iceSchedule = [];
  if (scenario === 'iceberg') {
    state.startDate = new Date(Date.UTC(1912, 3, 14, 23, 39, 40));
    iceSchedule = iceDamagePlan(world).map(d => ({ ...d, at: 2 + d.t * 9 }));
    log('23:39:40 — "Iceberg, right ahead!" The berg scrapes the starboard bow.');
  } else {
    state.startDate = new Date(Date.UTC(1912, 3, 10, 12, 0, 0));
    log('Intact ship, calm sea. Use the tools to damage her.');
  }
  renderer.cam.x = 0; renderer.cam.y = 8; fitZoom();
  setSpeed(1);
}
function fitZoom() {
  renderer.resize();
  const narrow = canvas.clientWidth < 860;
  renderer.cam.z = Math.max(1.2, (canvas.clientWidth * (narrow ? 0.96 : 0.82)) / 280);
}

function log(msg) {
  const d = new Date(state.startDate.getTime() + state.time * 1000);
  const stamp = state.years > 0.02 ? `${d.getUTCFullYear()}` : d.toISOString().slice(11, 19);
  state.log.unshift({ stamp, msg });
  state.log.length = Math.min(state.log.length, 7);
  $('log').innerHTML = state.log.map(l => `<li><span class="t">${l.stamp}</span>${l.msg}</li>`).join('');
}

// --------------------------------------------------------------- events
let lastBreach = 0, implodeLogT = -99, glassLogT = -99;
function handleEvents() {
  const ev = world.events;
  for (const e of ev) {
    switch (e.type) {
      case 'crack': log('Hull girder cracking — plating tears at the strength deck.'); sound.groan(1); renderer.shake = 4; break;
      case 'break':
        if (e.kind === 'weld') {
          log(`<b>Hull girder failure.</b> The ship breaks apart (${e.why}).`);
          sound.crack(1); renderer.shake = 14;
          for (let i = 0; i < 160; i++) particles.add(DEBRIS, e.x + (Math.random() - 0.5) * 12, e.y + (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 6, Math.random() * 3, 0.2 + Math.random() * 0.6, 400);
          for (let i = 0; i < 300; i++) particles.add(BUBBLE, e.x + (Math.random() - 0.5) * 14, e.y + (Math.random() - 0.5) * 20, 0, 0, 0.1 + Math.random() * 0.4, 60);
          lights = false; lightsOutAt = state.time;
        } else { log(`${e.name} collapses — ${e.why}.`); sound.crack(0.5); renderer.shake = 5; }
        renderer.invalidateAll();
        break;
      case 'implode':
        if (state.time - implodeLogT > 4) { log(`Implosion at ${Math.round(-e.y)} m depth — trapped air pocket collapses (Δp ${(e.dp / 1e5).toFixed(1)} bar).`); implodeLogT = state.time; }
        sound.boom(Math.min(1, e.dp / 2e6 + 0.3)); renderer.shake = Math.max(renderer.shake, 6);
        for (let i = 0; i < 40; i++) particles.add(BUBBLE, e.x + (Math.random() - 0.5) * 4, e.y + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, Math.random() * 4, 0.15 + Math.random() * 0.5, 50);
        renderer.invalidateAll();
        break;
      case 'implode-glass': case 'burst-glass':
        if (state.time - glassLogT > 20) { log(`Windows give way under ${(Math.abs(e.dp) / 1e5).toFixed(2)} bar.`); glassLogT = state.time; }
        sound.glass(); renderer.invalidateAll(); break;
      case 'burst-open': if (e.mat === MAT.WTDOOR) log('A watertight door is forced open by the pressure.'); else if (e.mat === MAT.SKYLIGHT) log('The glass dome over the Grand Staircase shatters.'); renderer.invalidateAll(); break;
      case 'panel': renderer.invalidateAll(); sound.groan(0.4); break;
      case 'seabed': {
        const b = world.bodies[e.body];
        if (b.kind === 'hull' && e.v > 2) { log(`A section strikes the seabed at ${(e.v * 3.6).toFixed(0)} km/h, ploughing into the mud.`); sound.boom(1); renderer.shake = 10; }
        break;
      }
    }
  }
  ev.length = 0;
  // mud plumes
  const mp = world.mudPlume;
  for (let i = 0; i < mp.length; i += 3) if (Math.random() < 0.25) particles.add(SILT, mp[i] + (Math.random() - 0.5) * 3, mp[i + 1] + Math.random() * 2, (Math.random() - 0.5) * 2.5, Math.random() * 1.6, 1 + Math.random() * 2, 40 + Math.random() * 60);
  mp.length = 0;
  // bubbles and inflow jets from the flooding solver
  const fl = world.flooding;
  const bs = fl.bubbleSources;
  for (let i = 0; i < bs.length; i += 3) {
    const n = Math.min(6, Math.ceil(bs[i + 2] * 2));
    for (let q = 0; q < n; q++) if (particles.n < 8000) particles.add(BUBBLE, bs[i] + (Math.random() - 0.5), bs[i + 1], 0, 0.3, 0.05 + Math.random() * 0.12, 30);
  }
  const js = fl.jets;
  for (let i = 0; i < js.length; i += 5) {
    if (Math.random() > 0.5) continue;
    const x = js[i], y = js[i + 1], q = js[i + 2];
    const v = Math.min(14, 2 + q * 6);
    particles.add(JET, x, y, (Math.random() - 0.5) * v * 0.6, (Math.random() - 0.3) * v * 0.4, 0.12 + Math.random() * 0.1, 0.6);
  }
  // splashes from the surface solver
  for (let i = 0; i < ocean.splashes.length; i += 2) {
    const x = ocean.splashes[i], s = ocean.splashes[i + 1];
    for (let q = 0; q < 6; q++) particles.add(SPRAY, x + (Math.random() - 0.5) * 2, world.env.surface(x), (Math.random() - 0.5) * 4, 2 + Math.random() * 4 * s, 0.15 + Math.random() * 0.2, 3);
  }
  ocean.splashes.length = 0;
}

// --------------------------------------------------------------- corrosion
function corrode(years) {
  const g = world.ship.grid, n = g.n;
  if (years <= 0) return;
  let changed = false;
  for (let k = 0; k < n; k++) {
    const kd = g.kind[k];
    if (kd === EMPTY) continue;
    const m = MATERIALS[g.mat[k]];
    if (!m.rustRate) continue;
    const b = world.bodies[g.block[k]];
    if (!b || b.y > -5) continue;
    const before = g.rust[k];
    const r = before + years * m.rustRate * (0.5 + g.seed[k]) * (kd === SPACE ? 0.35 : 1);
    g.rust[k] = Math.min(1, r);
    if (r > 0.93 && kd === SOLID && Math.random() < 0.02 * years) { world.destroyCell(k); changed = true; if (Math.random() < 0.3) particles.add(FLAKE, b.wx(world.ship.cxs[k], world.ship.cys[k]), b.wy(world.ship.cxs[k], world.ship.cys[k]), 0, 0, 0.1, 30); }
  }
  state.rustAcc = (state.rustAcc || 0) + years;
  if (state.rustAcc > 1 || changed) {
    state.rustAcc = 0;
    for (const j of world.joints) if (j.kind === 'weld' && j.state < 2) { const failed = j.fibers.map(f => f.failed); world.ship.computeSection(j); j.fibers.forEach((f, i) => { if (failed[i]) f.failed = true; }); world.ship.sectionProps(j); }
    renderer.invalidateAll();
  }
}

// --------------------------------------------------------------- loop
function frame(now) {
  const dtReal = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!state.paused) {
    let simDt = dtReal * state.speed;
    const t0 = performance.now();
    while (simDt > 1e-6) {
      const h = Math.min(0.05, simDt);
      world.step(h);
      state.time += h; simDt -= h;
      // scripted iceberg damage
      for (const d of iceSchedule) if (!d.done && state.time >= d.at) { d.done = true; applyBreach(world, d.k, d.area); renderer.invalidateAll(); sound.scrape(); }
      handleEvents();
      if (performance.now() - t0 > 22) break; // keep the frame responsive
    }
    ocean.step(dtReal, world.bodies, world.ship.grid);
    particles.step(dtReal * Math.min(4, state.speed), world.env);
    if (state.yearRate > 0) { const y = dtReal * state.yearRate; state.years += y; corrode(y); }
  }
  // ambience particles
  if (renderer.cam.y < -60 && particles.n < 7000) {
    const [l, t] = renderer.toWorld(0, 0), [r, b] = renderer.toWorld(canvas.clientWidth, canvas.clientHeight);
    for (let i = 0; i < 3; i++) particles.add(SNOW, l + Math.random() * (r - l), t - Math.random() * (t - b) * 0.2, 0, 0, 0.1, 60);
  }
  if (state.scenario === 'iceberg' && state.time < 1800 && Math.random() < 0.6) {
    for (const f of world.bodies.filter(b => b.kind === 'funnel' && b.alive).slice(0, 3)) {
      const X = f.wx(f.aabb.x1 - 1, f.aabb.y1), Y = f.wy(f.aabb.x1 - 1, f.aabb.y1);
      if (Y > 5) particles.add(STEAM, X, Y, 0.5, 2, 0.4, 6);
    }
  }
  // power: dynamos aft keep the lights on until the hull fails or they flood
  const elec = world.ship.rooms.filter(r => r.zone === 12 && r.deck <= 3);
  const elecFlooded = elec.length && elec.every(r => r.water > 0.6 * r.cap);
  if (lights && elecFlooded) { lights = false; lightsOutAt = state.time; log('The dynamos flood. The lights go out.'); }
  renderer.powered = lights;
  renderer.flicker = lights && world.stats.maxRatio > 0.7 ? 0.6 + Math.random() * 0.4 : 1;
  // camera follow
  if (state.follow) {
    const tgt = followTarget();
    if (tgt) { const c = renderer.cam; c.x += (tgt[0] - c.x) * 0.04; c.y += (tgt[1] - c.y) * 0.04; }
  }
  sound.update(world, renderer, state);
  state.particles = particles; state.ocean = ocean;
  renderer.draw(state);
  hud();
  requestAnimationFrame(frame);
}
function followTarget() {
  const hull = world.bodies.filter(b => b.kind === 'hull' && b.alive);
  if (!hull.length) return null;
  // follow the heaviest connected piece
  const pieces = new Map();
  for (const b of hull) { const p = pieces.get(b.piece) || { m: 0, x: 0, y: 0 }; p.m += b.ms; p.x += b.ms * b.x; p.y += b.ms * b.y; pieces.set(b.piece, p); }
  let best = null;
  for (const p of pieces.values()) if (!best || (state.followDeep ? p.y < best.y / best.m * p.m : p.m > best.m)) best = p;
  let x = best.x / best.m, y = best.y / best.m;
  if (y > -20) y = Math.max(y, 6);
  return [x, y];
}

// --------------------------------------------------------------- HUD
let hudT = 0;
function hud() {
  if (performance.now() - hudT < 120) return;
  hudT = performance.now();
  const d = new Date(state.startDate.getTime() + state.time * 1000);
  if (state.years > 0) d.setTime(d.getTime() + state.years * 365.25 * 86400e3);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  $('clock').textContent = `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${d.toISOString().slice(11, 19)}`;
  const el = state.time;
  $('elapsed').textContent = state.years > 0.01 ? `${state.years.toFixed(1)} years on the seabed` : `T+${Math.floor(el / 3600)}h ${String(Math.floor(el / 60) % 60).padStart(2, '0')}m ${String(Math.floor(el) % 60).padStart(2, '0')}s`;
  const s = world.stats, f = world.flooding.stats;
  const hull = world.bodies.filter(b => b.kind === 'hull' && b.alive);
  const deepest = Math.max(...hull.map(b => -b.y));
  const pieces = new Set(hull.map(b => b.piece)).size;
  const deg = (r) => (r * 180 / Math.PI).toFixed(1) + '°';
  let mass = 0; for (const b of world.bodies) if (b.alive) mass += b.ms;
  const reserve = Math.max(0, 1 - (mass + f.floodedTonnes * 1000) / (hull.reduce((a, b) => a + b.V, 0) * 1025));
  const rows = [
    ['Trim (bow down)', deg(s.trim)],
    ['Draught fwd / aft', `${s.draughtF.toFixed(1)} / ${s.draughtA.toFixed(1)} m`],
    ['Floodwater', `${Math.round(f.floodedTonnes).toLocaleString()} t`],
    ['Inflow from sea', `${Math.max(0, Math.round(f.inflowTps * 60)).toLocaleString()} t/min`],
    ['Reserve buoyancy', `${(reserve * 100).toFixed(0)} %`],
    ['Hull girder stress', `${Math.round(s.maxRatio * 100)} % of failure`],
    ['Pieces', `${pieces}`],
    ['Deepest section', `${Math.max(0, deepest).toFixed(0)} m`],
    ['Pressure there', `${(1 + gaugePressure(Math.max(0, deepest)) / P_ATM).toFixed(1)} atm`],
    ['Water temperature', `${waterTemperature(Math.max(0, deepest)).toFixed(1)} °C`],
  ];
  $('stats').innerHTML = rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
  $('stressbar').style.width = Math.min(100, s.maxRatio * 100) + '%';
  $('stressbar').className = s.maxRatio > 0.8 ? 'bad' : s.maxRatio > 0.5 ? 'warn' : '';
  // compartments
  const zw = new Array(16).fill(0), zc = new Array(16).fill(0);
  for (const r of world.ship.rooms) if (r.deck <= 4 && r.mat !== MAT.TANK) { zw[r.zone] += Math.min(r.water, r.cap); zc[r.zone] += r.cap; }
  $('comps').innerHTML = world.ship.meta.shortCompartments.map((n, i) => {
    const p = zc[i] ? zw[i] / zc[i] : 0;
    return `<div class="comp" title="${world.ship.meta.compartments[i]}: ${Math.round(p * 100)}% flooded"><i style="height:${Math.round(p * 100)}%"></i><span>${n}</span></div>`;
  }).reverse().join('');
  // hover
  const h = state.hover;
  $('inspect').innerHTML = h && h.room ? `<b>${h.room.label}</b><br>${Math.round(100 * Math.min(1, h.room.water / h.room.cap))}% flooded · ${Math.round(h.room.cap)} m³<br>Air ${h.room.vented ? 'vented' : 'trapped'} · ${(h.room.pAir / 1e5).toFixed(2)} bar` : h && h.mat ? `<b>${h.mat}</b>${h.rust > 0.01 ? `<br>Corrosion ${(h.rust * 100).toFixed(0)}%` : ''}` : 'Hover the ship to inspect a space.';
}

// --------------------------------------------------------------- input
function pick(wx, wy) {
  const g = world.ship.grid;
  for (const b of world.bodies) {
    if (!b.alive) continue;
    const wbx = b.wbox; if (wx < wbx.x0 || wx > wbx.x1 || wy < wbx.y0 || wy > wbx.y1) continue;
    const lx = b.lx(wx, wy), ly = b.ly(wx, wy);
    const i = g.col(lx), j = g.row(ly);
    if (!g.inb(i, j)) continue;
    const k = g.idx(i, j);
    if (g.kind[k] === EMPTY || g.block[k] !== b.index) continue;
    return { b, k, gx: lx, gy: ly };
  }
  return null;
}
let dragging = null, panning = null;
canvas.addEventListener('pointermove', (e) => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && touches.size === 2) {
    const [a, b] = [...touches.values()];
    renderer.cam.z = Math.max(0.05, Math.min(80, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d));
    state.follow = false; return;
  }
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  renderer.mouse.x = sx; renderer.mouse.y = sy;
  const [wx, wy] = renderer.toWorld(sx, sy);
  if (panning) { renderer.cam.x = panning.cx - (sx - panning.sx) / renderer.cam.z; renderer.cam.y = panning.cy + (sy - panning.sy) / renderer.cam.z; return; }
  if (dragging && world.drag) { world.drag.tx = wx; world.drag.ty = wy; }
  if (dragging && dragging.paint) applyTool(wx, wy, false);
  const p = pick(wx, wy);
  const g = world.ship.grid;
  state.hover = p ? { x: wx, y: wy, room: g.room[p.k] >= 0 ? world.ship.rooms[g.room[p.k]] : null, mat: MATERIALS[g.mat[p.k]].name, rust: g.rust[p.k] } : null;
});
const touches = new Map(); let pinch = null;
canvas.addEventListener('pointerdown', (e) => {
  touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (touches.size === 2) {
    const [a, b] = [...touches.values()];
    pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: renderer.cam.z };
    dragging = null; panning = null; world.drag = null; return;
  }
  sound.start();
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  const [wx, wy] = renderer.toWorld(sx, sy);
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 2 || e.button === 1 || state.tool === 'pan') { panning = { sx, sy, cx: renderer.cam.x, cy: renderer.cam.y }; state.follow = false; return; }
  dragging = { paint: state.tool !== 'grab' };
  applyTool(wx, wy, true);
});
const up = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; dragging = null; panning = null; world.drag = null; };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  const [wx, wy] = renderer.toWorld(sx, sy);
  const c = renderer.cam;
  c.z = Math.max(0.05, Math.min(80, c.z * Math.exp(-e.deltaY * 0.0015)));
  const [wx2, wy2] = renderer.toWorld(sx, sy);
  c.x += wx - wx2; c.y += wy - wy2;
}, { passive: false });

let lastPaint = 0;
function applyTool(wx, wy, first) {
  const now = performance.now();
  if (!first && now - lastPaint < 60) return;
  lastPaint = now;
  const p = pick(wx, wy);
  const g = world.ship.grid;
  if (state.tool === 'grab') {
    if (p && first) world.drag = { body: p.b.index, gx: p.gx, gy: p.gy, tx: wx, ty: wy, strength: 1 };
    return;
  }
  if (!p) return;
  if (state.tool === 'puncture') {
    // hole in the side plating, ~0.3 m^2 per click
    let k = p.k;
    if (g.kind[k] !== SPACE) { for (const d of [g.w, -g.w, 1, -1]) if (g.kind[k + d] === SPACE) { k = k + d; break; } }
    if (applyBreach(world, k, 0.3)) { renderer.invalidateBody(p.b.index); sound.scrape(); }
  } else if (state.tool === 'cut' || state.tool === 'bomb') {
    const R = state.tool === 'bomb' ? 4.5 : 1.0;
    const i0 = g.col(p.gx), j0 = g.row(p.gy), rr = Math.ceil(R / CELL);
    for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) {
      if (di * di + dj * dj > rr * rr) continue;
      if (!g.inb(i0 + di, j0 + dj)) continue;
      const k = g.idx(i0 + di, j0 + dj);
      if (g.kind[k] === EMPTY) continue;
      if (state.tool === 'cut' && g.kind[k] !== SOLID && Math.random() < 0.5) continue;
      world.destroyCell(k);
    }
    if (state.tool === 'bomb') {
      sound.boom(1); renderer.shake = 10;
      for (let i = 0; i < 80; i++) particles.add(DEBRIS, wx, wy, (Math.random() - 0.5) * 20, Math.random() * 14, 0.2 + Math.random() * 0.5, 300);
      for (const b of world.bodies) { const dx = b.x - wx, dy = b.y - wy, d2 = dx * dx + dy * dy + 100; b.vx += dx / d2 * 30; b.vy += dy / d2 * 30; }
    }
    renderer.invalidateAll();
  }
}

// --------------------------------------------------------------- controls
function setSpeed(s) {
  state.speed = s; state.paused = s === 0; state.yearRate = 0;
  document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', Number(b.dataset.speed) === s));
  document.querySelectorAll('[data-years]').forEach(b => b.classList.remove('on'));
}
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { sound.start(); setSpeed(Number(b.dataset.speed)); }));
document.querySelectorAll('[data-years]').forEach(b => b.addEventListener('click', () => {
  sound.start(); setSpeed(1); state.yearRate = Number(b.dataset.years);
  b.classList.add('on'); document.querySelectorAll('[data-speed]').forEach(x => x.classList.remove('on'));
  log(`Time-lapse: ${b.textContent} — corrosion and rusticles work on the wreck.`);
}));
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => {
  state.tool = b.dataset.tool;
  document.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b));
}));
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.view;
  if (v === 'stress') renderer.overlay = renderer.overlay === 'stress' ? null : 'stress';
  else { renderer.mode = v; document.querySelectorAll('[data-view]:not([data-view=stress])').forEach(x => x.classList.toggle('on', x === b)); }
  if (v === 'stress') b.classList.toggle('on', renderer.overlay === 'stress');
}));
$('scenario').addEventListener('change', (e) => init(e.target.value));
$('follow').addEventListener('click', () => { state.follow = true; fitZoom(); });
$('infoBtn').addEventListener('click', () => { document.body.classList.toggle('info'); $('infoBtn').classList.toggle('on'); });
$('visibility').addEventListener('input', (e) => { renderer.visibility = Number(e.target.value); });
$('sound').addEventListener('click', () => { sound.toggle(); $('sound').classList.toggle('on', sound.enabled); });
$('doors').addEventListener('click', () => {
  const g = world.ship.grid; let open = 0;
  for (let k = 0; k < g.n; k++) if (g.mat[k] === MAT.WTDOOR) { g.gate[k] = g.gate[k] ? 0 : 1; open += g.gate[k] ? 0 : 1; }
  log(open ? 'Watertight doors opened.' : 'Watertight doors closed from the bridge.');
});
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); setSpeed(state.paused ? 1 : 0); }
  if (e.key === 'c') renderer.mode = renderer.mode === 'cutaway' ? 'exterior' : 'cutaway';
  if (e.key === 'f') state.follow = true;
});
window.addEventListener('resize', () => renderer.resize());

init('iceberg');
renderer.resize();
if (matchMedia('(pointer: coarse)').matches) document.querySelector('[data-tool=pan]').click();
requestAnimationFrame(frame);
window.__pm = { get world() { return world; }, state, get renderer() { return renderer; } };
