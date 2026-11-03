// Crowds: passengers and crew on deck (moving to the boat stations, then aft
// as the bow goes down), the band, and people in the water after 02:18.
import * as THREE from 'three';
import { X0, HB, deckZ, hullTop } from '../ship/titanic.js';
import * as H from '../replay/history.js';

const smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
function rnd(i, k) { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }

function personGeometry() {
  const body = new THREE.CapsuleGeometry(0.2, 1.05, 3, 8); body.translate(0, 0.72, 0);
  const head = new THREE.SphereGeometry(0.12, 8, 6); head.translate(0, 1.62, 0);
  const merged = new THREE.BufferGeometry();
  const parts = [body, head].map(g => g.toNonIndexed());
  const pos = [], nor = [];
  for (const p of parts) { pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return merged;
}

export class Crowd {
  constructor(bowGroup, sternGroup, scene, xBreak) {
    this.N = 520;
    this.xBreak = xBreak;
    const geo = personGeometry();
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    this.bow = new THREE.InstancedMesh(geo, mat, this.N); this.stern = new THREE.InstancedMesh(geo, mat, this.N);
    for (const m of [this.bow, this.stern]) { m.frustumCulled = false; m.count = 0; }
    const palette = [0x1b1b1f, 0x2a2420, 0x3a2f2a, 0x22283a, 0x4a3b33, 0x6b5a4a, 0x2d2d2d, 0x5c2a2a, 0xd8d2c0, 0x8a7a64];
    const c = new THREE.Color();
    for (let i = 0; i < this.N; i++) { c.setHex(palette[(rnd(i, 1) * palette.length) | 0]); this.bow.setColorAt(i, c); this.stern.setColorAt(i, c); }
    bowGroup.add(this.bow); sternGroup.add(this.stern);
    // people in the water: lifebelt (white cork jacket) + head
    const wgeo = new THREE.TorusGeometry(0.32, 0.12, 6, 12); wgeo.rotateX(Math.PI / 2);
    this.water = new THREE.InstancedMesh(wgeo, new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.9 }), 1500);
    this.water.count = 0; this.water.frustumCulled = false; scene.add(this.water);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.s = new THREE.Vector3(1, 1, 1); this.p = new THREE.Vector3();
  }
  // deck position of person i at time t (ship coordinates)
  spot(i, t) {
    const r1 = rnd(i, 2), r2 = rnd(i, 3), r3 = rnd(i, 4);
    const active = t > H.T(0, 5) ? 1 : 0.08;
    if (r3 > active) return null;
    // boat deck between the boat stations (most), some on the well decks and poop
    let xb, deck, z;
    const boats = H.BOATS;
    const b = boats[(r1 * boats.length) | 0];
    // stand inboard of the stowed boats until they are swung out (~00:30)
    const edge = t < H.T(0, 30) ? HB - 4.8 : HB - 1.6;
    if (r2 < 0.75) { xb = b.xb + (r2 - 0.4) * 20; deck = 'BOAT'; z = (b.side === 's' ? -1 : 1) * (edge - r3 * 3.2); }
    else if (r2 < 0.87) { xb = 40 + r1 * 15; deck = 'TOP'; z = (r3 - 0.5) * 18; }
    else { xb = 238 + r1 * 26; deck = 'TOP'; z = (r3 - 0.5) * 16; }
    // after the boats are gone the crowd moves aft toward the poop
    const aft = smooth((t - (H.T(1, 50) + r1 * 900)) / 600);
    if (aft > 0) { xb = xb + (225 + r2 * 40 - xb) * aft; if (xb > 236) deck = 'TOP'; else deck = 'BOAT'; z *= 0.8; }
    // fewer remain as the boats leave
    const launched = boats.filter(bb => bb.at < t).length;
    if (r1 < launched / 34 && r2 < 0.75 && t < H.T(2, 0)) return null;
    const x = X0 - xb;
    const y = deck === 'BOAT' ? deckZ('BOAT', xb) : hullTop(xb);
    if (xb < 57 && xb > 39) return [x, deckZ('C', xb), z];
    return [x, y, z];
  }
  update(t, secPose, apply) {
    const { m, q, e, s, p } = this;
    let nb = 0, ns = 0, nw = 0;
    const sink = t > H.T(1, 30);
    for (let i = 0; i < this.N; i++) {
      const sp = this.spot(i, t);
      if (!sp) continue;
      const isBow = sp[0] > this.xBreak;
      const pose = isBow ? secPose.bow : secPose.stern;
      // in the water once their deck goes under (or the section is gone)
      if (sink) { const [, wy] = apply(pose, sp[0], sp[1]); if (wy < 0.4) continue; }
      const sway = Math.sin(t * 1.3 + i) * 0.04;
      e.set(0, rnd(i, 7) * 6.28, sway); q.setFromEuler(e);
      p.set(sp[0], sp[1], sp[2]);
      s.set(1, 0.92 + rnd(i, 9) * 0.16, 1);
      m.compose(p, q, s);
      if (isBow) this.bow.setMatrixAt(nb++, m); else this.stern.setMatrixAt(ns++, m);
    }
    this.bow.count = nb; this.stern.count = ns;
    this.bow.instanceMatrix.needsUpdate = true; this.stern.instanceMatrix.needsUpdate = true;
    // in the water: from the bridge going under to ~03:15
    if (t > H.T(2, 14)) {
      const n = Math.round(1500 * smooth((t - H.T(2, 14)) / 420) * (1 - smooth((t - H.T(2, 50)) / 1800)));
      for (let i = 0; i < n; i++) {
        const a = rnd(i, 11) * 6.28, r = 12 + Math.pow(rnd(i, 12), 0.6) * 170;
        const x = -40 + Math.cos(a) * r * 1.4, z = Math.sin(a) * r;
        p.set(x, 0.05 + Math.sin(t * 0.8 + i) * 0.06, z);
        q.identity(); s.set(1, 1, 1); m.compose(p, q, s);
        this.water.setMatrixAt(nw++, m);
      }
    }
    this.water.count = nw; this.water.instanceMatrix.needsUpdate = true;
  }
}
