// Headless physics checks: hydrostatics, flooding timeline, breakup.
import { createWorld, iceDamagePlan, applyBreach, calibrate } from '../src/sim/setup.js';
import { MATERIALS, MAT, SPACE, SOLID, OPEN, EMPTY } from '../src/sim/materials.js';
import { CELL } from '../src/sim/constants.js';

const t0 = Date.now();
const world = createWorld({ substeps: Number(process.env.SUB || 10) });
const ship = world.ship, g = ship.grid;
console.log('build ms', Date.now() - t0);
console.log('calibration', world.calibration);
let steel = 0, total = 0, cells = 0;
for (let k = 0; k < g.n; k++) { total += g.mass[k]; if (g.kind[k] === SOLID) steel += g.mass[k]; if (g.kind[k] !== EMPTY) cells++; }
console.log('cells', cells, 'mass t', (total / 1000).toFixed(0), 'solid t', (steel / 1000).toFixed(0));
console.log('bodies', ship.bodies.length, 'joints', ship.joints.length, 'rooms', ship.rooms.length, 'elements', ship.elements.length, 'walls', ship.walls.length);
const faceEls = ship.elements.filter(e => e.type === 'face');
console.log('face elements (unintended openings to sea):', faceEls.length);
const byRoom = new Map();
for (const e of faceEls) byRoom.set(e.a, (byRoom.get(e.a) || 0) + 1);
for (const [r, n] of [...byRoom].slice(0, 12)) { const R = ship.rooms[r]; console.log('  room', r, R.label, 'cells', R.cells.length, 'faces', n, 'x', R.x0.toFixed(1), R.x1.toFixed(1), 'y', R.y0.toFixed(1), R.y1.toFixed(1)); }
// block coefficient
{
  let V = 0;
  for (let k = 0; k < g.n; k++) { if (!g.isEnvelope(k)) continue; const y = g.cy((k / g.w) | 0); if (y < 10.54) V += CELL * CELL * g.breadth[k]; }
  console.log('Cb (envelope below 10.54 m)', (V / (259.08 * 28.19 * 10.54)).toFixed(3), 'V', V.toFixed(0));
}
const mid = ship.joints.filter(j => j.kind === 'weld');
for (const j of mid) if (j.id % 4 === 0) console.log('weld', j.id, 'x', j.xCut.toFixed(1), 'A', j.A.toFixed(2), 'I', j.I.toFixed(0), 'na', j.na.toFixed(2), 'Mu GNm', (j.Mu / 1e9).toFixed(2), 'Mp', (j.Mp / 1e9).toFixed(2), j.expansion ? 'EXP' : '');
console.log('rooms by size:'); [...ship.rooms].sort((a, b) => b.cap - a.cap).slice(0, 8).forEach(r => console.log('  ', r.label, r.cap.toFixed(0), 'm3', 'els', r.els.length));

function report(tag) {
  const s = world.stats;
  const f = world.flooding.stats;
  const hull = world.bodies.filter(b => b.kind === 'hull');
  const yMin = Math.min(...hull.map(b => b.wbox.y0)), yMax = Math.max(...hull.map(b => b.wbox.y1));
  console.log(`${tag} t=${(world.time / 60).toFixed(1)}min dF=${s.draughtF.toFixed(2)} dA=${s.draughtA.toFixed(2)} trim=${(s.trim * 180 / Math.PI).toFixed(2)}deg flood=${f.floodedTonnes.toFixed(0)}t inflow=${(f.inflowTps * 60).toFixed(0)}t/min maxStress=${s.maxRatio.toFixed(2)}@${s.maxRatioJoint} pieces=${world.pieceCount} y=[${yMin.toFixed(1)},${yMax.toFixed(1)}]`);
}
// settle intact
let tt = Date.now();
for (let i = 0; i < 600; i++) world.step(1 / 60);
console.log('600 steps ms', Date.now() - tt);
report('intact');
for (let i = 0; i < 1200; i++) world.step(1 / 20);
report('intact');

if (process.env.NODAMAGE) process.exit(0);
// iceberg
for (const d of iceDamagePlan(world)) applyBreach(world, d.k, d.area);
world.flooding.debug = !!process.env.DEBUG;
const dt = Number(process.env.DT || 0.1);
let next = 0;
const events = [];
tt = Date.now();
const tEnd = Number(process.env.TEND || 3.5 * 3600);
while (world.time < tEnd) {
  world.step(dt);
  for (const e of world.events) {
    if (['crack', 'break', 'implode', 'seabed', 'panel', 'burst-open', 'implode-glass'].includes(e.type)) {
      if (e.type === 'implode-glass' && Math.random() > 0.05) continue;
      console.log(`  [${(world.time / 60).toFixed(1)}min] ${e.type} ${e.why || ''} ${e.kind || ''} ${e.name || ''} x=${(e.x ?? 0).toFixed(0)} y=${(e.y ?? 0).toFixed(0)} ${e.v ? 'v=' + e.v.toFixed(1) : ''}`);
    }
  }
  world.events.length = 0;
  if (world.time >= next) {
    report('flood');
    // compartments
    const zones = new Array(16).fill(0), zcap = new Array(16).fill(0);
    for (const r of ship.rooms) { zones[r.zone] += Math.min(r.water, r.cap); zcap[r.zone] += r.cap; }
    console.log('   zones%', zones.map((w, i) => Math.round(100 * w / Math.max(1, zcap[i]))).join(' '));
    next += Number(process.env.EVERY || 600);
  }
  const hull = world.bodies.filter(b => b.kind === 'hull' && b.alive);
  if (hull.every(b => b.landed)) { report('landed'); break; }
}
console.log('sim wall ms', Date.now() - tt);
report('end');
