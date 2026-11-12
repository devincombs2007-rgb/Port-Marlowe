// Calibration check: penetration depth in bare 10% ballistic gelatin (no skin, no bone).
require('../src/ballistics.js'); require('../src/weapons.js');
const G = globalThis.GSW;
const gel = { maxDist: 3, sample(p, m, out) { out.inBody = p.z < 0 && p.z > -2.5; out.seg = 'gel'; out.prim = null; }, cavity() {} };
for (const w of G.WEAPONS) {
  const r = G.simulate(w.bullet, { x: 0, y: 0, z: 0.05 }, { x: 0, y: 0, z: -1 }, gel, () => 0.5);
  const maxTc = Math.max(...r.track.map((t) => t.rtc)), maxPc = Math.max(...r.track.map((t) => t.rpc));
  console.log((w.name + ' ' + w.load).padEnd(48), 'E0', r.E0.toFixed(0).padStart(5), 'J  depth', (r.depth * 100).toFixed(0).padStart(3),
    'cm  tempCav Ø', (maxTc * 200).toFixed(1).padStart(5), 'cm  permCav Ø', (maxPc * 2000).toFixed(0).padStart(3), 'mm', r.fragmented ? 'FRAG' : '', r.expanded ? 'EXP' : '');
}
