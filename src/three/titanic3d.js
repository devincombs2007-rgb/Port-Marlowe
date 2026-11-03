// RMS Titanic in 3D, lofted from the same hull lines, deck heights and
// fittings as the structural model: 269.06 m long, 28.19 m beam, keel to
// funnel tops 53.3 m. Built in ship coordinates (x toward the bow, y up from
// the keel, z to port) as two halves split at the aft expansion joint so the
// hull can break exactly where the real one did.
import * as THREE from 'three';
import { X0, LOA, HB, stemXb, sternXb, hullTop, halfBreadth, deckZ, FUNNEL_LEN, FUNNEL_BREADTH, FUNNEL_RAKE } from '../ship/titanic.js';
import { hullTextures, houseTexture, deckTexture, nameTexture, HULL_U, HULL_V } from './textures.js';

const STARBOARD = -1, PORT = 1;

function inHull(xb, z) { return z >= 0 && z <= hullTop(xb) + 1e-3 && xb >= stemXb(z) && xb <= sternXb(z); }
function zLow(xb) {
  const top = hullTop(xb);
  for (let z = 0; z <= top; z += 0.04) if (inHull(xb, z)) return z;
  return null;
}

export function buildTitanic3D(meta, xBreak) {
  const tex = hullTextures(meta, { waterline: 10.54 });
  const deckTex = deckTexture();
  const hullMat = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.62, metalness: 0.25 });
  const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.85 });
  const bottomMat = new THREE.MeshStandardMaterial({ color: 0x5a201c, roughness: 0.8 });
  const tornMat = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1, side: THREE.DoubleSide });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.7 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 0.6, metalness: 0.4 });
  const emissiveMats = [hullMat];

  const bow = new THREE.Group(), stern = new THREE.Group();
  bow.name = 'bow'; stern.name = 'stern';
  const sectionOf = (x) => (x > xBreak ? bow : stern);

  // ------------------------------------------------------------- hull
  function hullPart(xa, xb2, group) {
    const xs = [];
    for (let x = xa; x <= xb2 + 1e-6; x += 0.5) xs.push(Math.min(x, xb2));
    if (xs[xs.length - 1] < xb2) xs.push(xb2);
    const M = 30;
    const cols = [];
    for (const x of xs) {
      const xbv = X0 - x;
      if (xbv < 0 || xbv > LOA) continue;
      const lo = zLow(xbv); if (lo === null) continue;
      const hi = hullTop(xbv);
      if (hi - lo < 0.15) continue;
      const col = [];
      for (let j = 0; j <= M; j++) { const y = lo + (hi - lo) * j / M; col.push([x, y, Math.max(0.05, halfBreadth(xbv, y))]); }
      cols.push(col);
    }
    const pos = [], uv = [], idx = [];
    const side = (s) => {
      const base = pos.length / 3;
      for (const col of cols) for (const [x, y, b] of col) { pos.push(x, y, s * b); uv.push(x / HULL_U, y / HULL_V); }
      for (let i = 0; i + 1 < cols.length; i++) for (let j = 0; j < M; j++) {
        const a = base + i * (M + 1) + j, b2 = a + M + 1;
        if (s > 0) idx.push(a, b2, a + 1, b2, b2 + 1, a + 1); else idx.push(a, a + 1, b2, b2, a + 1, b2 + 1);
      }
    };
    side(PORT); side(STARBOARD);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, hullMat); mesh.castShadow = true;
    group.add(mesh);
    // deck (top) and keel (bottom) strips
    const strip = (j, mat, flip, uvScale) => {
      const p = [], u = [], ix = [];
      cols.forEach((col, i) => { const [x, y, b] = col[j]; p.push(x, y, -b, x, y, b); u.push(x / uvScale, -b / uvScale, x / uvScale, b / uvScale); });
      for (let i = 0; i + 1 < cols.length; i++) { const a = i * 2; if (flip) ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
      gg.setIndex(ix); gg.computeVertexNormals();
      group.add(new THREE.Mesh(gg, mat));
    };
    strip(M, deckMat, true, 8);
    strip(0, bottomMat, false, 8);
    // end caps (the torn break face, or the closed stem/stern)
    const cap = (col, outward) => {
      const p = [], ix = [];
      for (const [x, y, b] of col) p.push(x, y, -b, x, y, b);
      for (let j = 0; j < M; j++) { const a = j * 2; if (outward > 0) ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); gg.setIndex(ix); gg.computeVertexNormals();
      group.add(new THREE.Mesh(gg, tornMat));
    };
    cap(cols[0], -1); cap(cols[cols.length - 1], 1);
    return cols;
  }
  const xStern = X0 - LOA + 0.02, xStem = X0 - 0.02;
  hullPart(xBreak, xStem, bow);
  hullPart(xStern, xBreak, stern);

  // ------------------------------------------------------- superstructure
  const houseKinds = {
    b: houseTexture('b'), a: houseTexture('a'), prom: houseTexture('promenade'), house: houseTexture('house'),
  };
  for (const k of Object.values(houseKinds)) emissiveMats.push(k);
  const houseMats = {};
  const houseMat = (kind, len, h) => {
    const t = houseKinds[kind];
    const map = t.map.clone(), em = t.emissiveMap.clone();
    map.needsUpdate = em.needsUpdate = true;
    map.repeat.set(len / 4, h / 2.8); em.repeat.copy(map.repeat);
    const m = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.75 });
    emissiveMats.push(m);
    return m;
  };
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.8 });
  const boatDeckMat = new THREE.MeshStandardMaterial({ map: deckTex.clone(), roughness: 0.85 });
  boatDeckMat.map.repeat.set(20, 3.5); boatDeckMat.map.needsUpdate = true;
  const houses = [
    { a: 57.6, b: 225.6, lo: 'B', hi: 'A', hb: HB - 0.03, kind: 'b', top: roofMat },
    { a: 58.6, b: 121.0, lo: 'A', hi: 'BOAT', hb: HB - 0.15, kind: 'a', top: boatDeckMat },
    { a: 121.0, b: 216.5, lo: 'A', hi: 'BOAT', hb: HB - 0.15, kind: 'prom', top: boatDeckMat },
    { a: 59.4, b: 71.8, lo: 'BOAT', hi: 'HOUSE', hb: 8.6, kind: 'house', top: roofMat },
    { a: 84.2, b: 93.0, lo: 'BOAT', hi: 'HOUSE', hb: 6.0, kind: 'house', top: roofMat },
    { a: 98.0, b: 107.6, lo: 'BOAT', hi: 'HOUSE', hb: 5.0, kind: 'house', top: roofMat },
    { a: 120.5, b: 140.5, lo: 'BOAT', hi: 'HOUSE', hb: 6.5, kind: 'house', top: roofMat },
    { a: 151.9, b: 159.2, lo: 'BOAT', hi: 'HOUSE', hb: 6.0, kind: 'house', top: roofMat },
    { a: 166.0, b: 178.0, lo: 'BOAT', hi: 'HOUSE', hb: 6.5, kind: 'house', top: roofMat },
    { a: 196.0, b: 212.0, lo: 'BOAT', hi: 'HOUSE', hb: 7.0, kind: 'house', top: roofMat },
  ];
  const addBox = (x0, x1, y0, y1, hb, sideMat, topMat, group) => {
    const L = x1 - x0, Hh = y1 - y0;
    const geo = new THREE.BoxGeometry(L, Hh, 2 * hb);
    const mats = [whiteMat, whiteMat, topMat, whiteMat, sideMat, sideMat];
    const m = new THREE.Mesh(geo, mats);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  for (const h of houses) {
    const xa = X0 - h.b, xb2 = X0 - h.a;
    const parts = xa < xBreak && xb2 > xBreak ? [[xa, xBreak], [xBreak, xb2]] : [[xa, xb2]];
    for (const [p0, p1] of parts) {
      const xm = (p0 + p1) / 2;
      const y0 = deckZ(h.lo, X0 - xm) - 0.02, y1 = deckZ(h.hi, X0 - xm);
      addBox(p0, p1, y0, y1, h.hb, houseMat(h.kind, p1 - p0, y1 - y0), h.top, sectionOf(xm));
    }
  }
  // bridge wing cabs and wheelhouse front
  const boatY = (xbv) => deckZ('BOAT', xbv);
  for (const s of [STARBOARD, PORT]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 1.6), whiteMat);
    c.position.set(X0 - 60.4, boatY(60.4) + 1.15, s * (HB - 0.8)); bow.add(c);
  }
  // sidelights: green starboard, red port (on the bridge wing cabs)
  const sideLight = (color, s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color })); m.position.set(X0 - 60.4, boatY(60.4) + 1.9, s * (HB + 0.05)); bow.add(m); return m; };
  const navLights = [sideLight(0x33ff66, STARBOARD), sideLight(0xff3322, PORT)];

  // ventilator cowls on the boat deck and forecastle
  const ventMat = new THREE.MeshStandardMaterial({ color: 0xe6e1d4, roughness: 0.7 });
  const ventInner = new THREE.MeshStandardMaterial({ color: 0x8a2a22 });
  const vent = (xbv, z, base, h = 2.4, r = 0.55) => {
    const g = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.75, h, 12), ventMat); pipe.position.y = h / 2; g.add(pipe);
    const cowl = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), ventMat); cowl.position.y = h + 0.2; cowl.rotation.z = -Math.PI / 2.3; g.add(cowl);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 14), ventInner); mouth.position.set(r * 0.9, h + 0.25, 0); mouth.rotation.y = Math.PI / 2; g.add(mouth);
    const x = X0 - xbv; g.position.set(x, base, z); sectionOf(x).add(g);
  };
  for (const xbv of [95, 100, 116, 124, 142, 160, 172, 188]) for (const s of [-1, 1]) vent(xbv, s * 9.5, boatY(xbv));
  for (const xbv of [8, 13, 30]) for (const s of [-1, 1]) vent(xbv, s * 4, deckZ('B', xbv), 1.8, 0.45);
  // cargo cranes in the well decks
  for (const xbv of [43, 54, 227, 236]) for (const s of [-1, 1]) {
    const g = new THREE.Group(); const x = X0 - xbv;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.2, 10), whiteMat); post.position.y = 1.6; g.add(post);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.3, 0.3), whiteMat); jib.position.set(xbv < 100 ? -2.3 : 2.3, 3.6, 0); jib.rotation.z = xbv < 100 ? 0.45 : -0.45; g.add(jib);
    g.position.set(x, deckZ('C', xbv), s * 6); sectionOf(x).add(g);
  }

  // ------------------------------------------------------------- funnels
  const buff = new THREE.MeshStandardMaterial({ color: 0xc4883c, roughness: 0.55, side: THREE.DoubleSide });
  const black = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.45, side: THREE.DoubleSide });
  const funnels = meta.funnels.map((f, i) => {
    const g = new THREE.Group();
    const h = f.yTop - f.yBase;
    const mk = (y0, y1, mat) => {
      const geo = new THREE.CylinderGeometry(1, 1, y1 - y0, 40, 4, true);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k) + (y0 + y1) / 2;
        p.setXYZ(k, p.getX(k) * FUNNEL_LEN / 2 + y * f.rake, y, p.getZ(k) * FUNNEL_BREADTH / 2);
      }
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, mat);
    };
    g.add(mk(0, h - 4.3, buff)); g.add(mk(h - 4.3, h, black));
    const ring = mk(-0.2, 1.0, new THREE.MeshStandardMaterial({ color: 0xe0dbcf })); ring.scale.set(1.06, 1, 1.06); g.add(ring);
    // steam/whistle pipes on the forward face
    if (!f.dummy) for (const dz of [-0.7, 0, 0.7]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, h + 1.5, 8), buff);
      pipe.position.set(FUNNEL_LEN / 2 + 0.25 + (h / 2) * f.rake, h / 2 + 0.75, dz); pipe.rotation.z = -Math.atan(f.rake); g.add(pipe);
    }
    const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    cap.scale.set(FUNNEL_LEN / 2 * 0.98, FUNNEL_BREADTH / 2 * 0.98, 1); cap.rotation.x = -Math.PI / 2; cap.position.set(h * f.rake, h - 0.6, 0); g.add(cap);
    // guy wires (stays)
    const lines = [];
    for (const [dx, dz] of [[-6, -10], [-6, 10], [6, -10], [6, 10], [-9, -6], [-9, 6]]) lines.push(h * f.rake + dx * 0.05, h - 6, 0, dx, -0.2, dz);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x5a574f, transparent: true, opacity: 0.3 })));
    g.position.set(f.xBase, f.yBase, 0);
    g.userData = { base: [f.xBase, f.yBase], top: [f.xBase + h * f.rake, f.yBase + h] };
    return g;
  });

  // -------------------------------------------------------- masts, crow's nest
  const mastMat = new THREE.MeshStandardMaterial({ color: 0xb48a52, roughness: 0.6 });
  const masts = meta.masts.map((m, i) => {
    const g = new THREE.Group();
    const h = m.yTop - m.yBase;
    const geo = new THREE.CylinderGeometry(0.24, 0.46, h, 12, 8);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k) + h / 2; p.setXYZ(k, p.getX(k) + y * m.rake, y, p.getZ(k)); }
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mastMat));
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
    light.position.set((h - 4) * m.rake, h - 4, 0); g.add(light); navLights.push(light);
    g.position.set(m.xBase, m.yBase, 0);
    g.userData = { top: [m.xBase + h * m.rake, m.yBase + h] };
    return g;
  });
  // crow's nest: 95 ft above the waterline on the foremast (~39.5 m above keel)
  const fore = masts.reduce((a, b) => (b.position.x > a.position.x ? b : a));
  const nestY = 39.5 - fore.position.y;
  const nest = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.1, 1.15, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x6e5c44, roughness: 0.9, side: THREE.DoubleSide }));
  barrel.position.y = 0.62; nest.add(barrel);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 24), new THREE.MeshStandardMaterial({ color: 0x5b4630 }));
  nest.add(floor);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.9, roughness: 0.3 }));
  bell.position.set(-0.75, 1.5, 0.55); nest.add(bell);
  nest.position.set(nestY * (1 / 12), nestY, 0);
  fore.add(nest);
  const nestWorldLocal = [fore.position.x + nest.position.x, fore.position.y + nestY];

  // antenna wires between the mastheads, forestay and backstay
  const main = masts.find(m => m !== fore);
  const wireGeo = new THREE.BufferGeometry();
  const ft = fore.userData.top, mt = main.userData.top;
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    ft[0], ft[1] - 1, -0.6, mt[0], mt[1] - 1, -0.6, ft[0], ft[1] - 1, 0.6, mt[0], mt[1] - 1, 0.6,
  ], 3));
  const antenna = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x5a574f, transparent: true, opacity: 0.3 }));
  const stays = new THREE.BufferGeometry();
  stays.setAttribute('position', new THREE.Float32BufferAttribute([ft[0], ft[1] - 2, 0, X0 - 0.3, deckZ('B', 0.3) + 1, 0], 3));
  bow.add(new THREE.LineSegments(stays, new THREE.LineBasicMaterial({ color: 0x5a574f, transparent: true, opacity: 0.35 })));

  // ---------------------------------------------------- rudder & propellers
  const bronze = new THREE.MeshStandardMaterial({ color: 0x9c7a3c, metalness: 0.85, roughness: 0.35 });
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(4.7, 13.2, 0.7), new THREE.MeshStandardMaterial({ color: 0x4e1d18, roughness: 0.8 }));
  rudder.position.set(X0 - 257.0, 0.4 + 6.6, 0); stern.add(rudder);
  const prop = (d, blades, x, z) => {
    const g = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.SphereGeometry(d * 0.09, 12, 10), bronze); g.add(hub);
    for (let k = 0; k < blades; k++) {
      const bl = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bronze);
      bl.scale.set(0.18, d * 0.25, d * 0.12); bl.position.y = d * 0.25;
      const pivot = new THREE.Group(); pivot.rotation.x = k * Math.PI * 2 / blades; bl.rotation.y = 0.5; pivot.add(bl); g.add(pivot);
    }
    g.position.set(x, 4.4, z); stern.add(g); return g;
  };
  // wing propellers 23 ft 6 in (3 blades), centre 16 ft 6 in (4 blades)
  const props = [prop(7.16, 3, X0 - 241.5, -6.6), prop(7.16, 3, X0 - 241.5, 6.6), prop(5.03, 4, X0 - 253.7, 0)];
  // shaft bossings
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 22, 10), steelMat); b.rotation.z = Math.PI / 2; b.position.set(X0 - 231, 4.4, s * 5.6); stern.add(b); }

  // ------------------------------------------------------- names (decals)
  const name = (lines, x, y, w, s, group) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: nameTexture(lines), transparent: true, depthWrite: false }));
    m.position.set(x, y, s * (halfBreadth(X0 - x, y) + 0.05));
    if (s < 0) m.rotation.y = Math.PI;
    group.add(m);
  };
  for (const s of [STARBOARD, PORT]) name(['TITANIC'], X0 - 6.5, 21.6, 7.5, s, bow);
  for (const s of [STARBOARD, PORT]) { const n = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: nameTexture(['TITANIC', 'LIVERPOOL']), transparent: true, depthWrite: false })); n.position.set(X0 - 267.6, 19.5, s * 4.5); n.rotation.y = s > 0 ? -1.2 : Math.PI + 1.2; stern.add(n); }

  // ----------------------------------------------------- railings
  const rail = [];
  const railAlong = (deck, a, b, hb, s) => {
    let px = null, py = null;
    for (let xbv = a; xbv <= b; xbv += 1.5) {
      const x = X0 - xbv, y = (deck === 'TOP' ? hullTop(xbv) : deckZ(deck, xbv)) + 1.05;
      const z = s * (hb === null ? halfBreadth(xbv, y - 1) - 0.1 : hb);
      rail.push(x, y - 1.05, z, x, y, z);
      if (px !== null) rail.push(px, py, z, x, y, z);
      px = x; py = y;
    }
  };
  for (const s of [-1, 1]) {
    railAlong('TOP', 1, 39, null, s); railAlong('TOP', 39, 57.6, null, s);
    railAlong('BOAT', 58.6, 216.5, HB - 0.2, s); railAlong('TOP', 225.6, 268, null, s); railAlong('TOP', 237, 268.5, null, s);
  }
  const railGeo = new THREE.BufferGeometry(); railGeo.setAttribute('position', new THREE.Float32BufferAttribute(rail, 3));
  const railMat = new THREE.LineBasicMaterial({ color: 0xb8b2a4, transparent: true, opacity: 0.45 });
  // split rail segments between sections
  const rb = [], rs = [];
  for (let i = 0; i < rail.length; i += 6) ((rail[i] + rail[i + 3]) / 2 > xBreak ? rb : rs).push(...rail.slice(i, i + 6));
  for (const [arr, gp] of [[rb, bow], [rs, stern]]) { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); gp.add(new THREE.LineSegments(gg, railMat)); }

  // -------------------------------------------------- deck lights (lamps)
  const lamps = [];
  for (const [xbv, y, grp] of [[30, 25, bow], [70, 31, bow], [110, 31, bow], [150, 31, bow], [190, 31, stern], [250, 26, stern]]) {
    const l = new THREE.PointLight(0xffc98a, 60, 90, 2);
    l.position.set(X0 - xbv, y + 6, 0); grp.add(l); lamps.push(l);
  }

  return { bow, stern, funnels, masts, fore, main, antenna, nest, nestLocal: nestWorldLocal, props, emissiveMats, navLights, lamps, materials: { whiteMat, steelMat } };
}

// ------------------------------------------------------------------ boats
const boatCache = new Map();
export function makeLifeboat(id) {
  const collapsible = 'ABCD'.includes(id), cutter = id === '1' || id === '2';
  const L = collapsible ? 8.38 : cutter ? 7.62 : 9.14, B = collapsible ? 2.44 : cutter ? 2.13 : 2.77, D = collapsible ? 0.9 : 1.2;
  const key = collapsible ? 'c' : cutter ? 'k' : 'b';
  let proto = boatCache.get(key);
  if (!proto) {
    proto = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: collapsible ? 0xb9b2a0 : 0xf2eee4, emissive: 0x2a2924, roughness: 0.7, side: THREE.DoubleSide }));
    outer.scale.set(L / 2, D, B / 2); proto.add(outer);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 }));
    inner.scale.set(L / 2 * 0.94, B / 2 * 0.9, 1); inner.rotation.x = -Math.PI / 2; inner.position.y = -0.25; proto.add(inner);
    const gun = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 40), new THREE.MeshStandardMaterial({ color: 0x6b4a2a }));
    gun.scale.set(L / 2, B / 2, 1); gun.rotation.x = Math.PI / 2; proto.add(gun);
    for (let k = -2; k <= 2; k++) { const th = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, B * 0.85), new THREE.MeshStandardMaterial({ color: 0x8a6a44 })); th.position.set(k * L / 6, -0.15, 0); proto.add(th); }
    boatCache.set(key, proto);
  }
  const g = proto.clone();
  g.userData = { L, B, D };
  return g;
}

// ---------------------------------------------------------------- people
// A simple, properly proportioned figure (1.75 m). Used for the captain, the
// lookouts and officers; crowds use instanced capsules.
export function makeFigure({ coat = 0x1b2236, trousers = 0x161b28, cap = null, beard = false, skin = 0xd8b49a, hat = 0x111111 } = {}) {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.72, 4, 8), m(trousers)); leg.position.set(0, 0.45, s * 0.1); g.add(leg); }
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.5, 4, 10), m(coat)); body.position.y = 1.15; body.scale.set(0.8, 1, 1); g.add(body);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.55, 4, 8), m(coat)); arm.position.set(0, 1.12, s * 0.27); arm.rotation.x = s * 0.08; g.add(arm); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), m(skin)); head.position.y = 1.58; g.add(head);
  if (beard) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10, 0, Math.PI * 2, Math.PI / 2.2, Math.PI / 2), m(0xeeeeee)); b.position.set(0.05, 1.55, 0); b.scale.set(0.9, 1.1, 1); g.add(b); }
  if (cap) {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.08, 16), m(cap)); crown.position.y = 1.71; g.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.122, 0.122, 0.05, 16), m(0x111111)); band.position.y = 1.66; g.add(band);
    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.18), m(0x111111)); peak.position.set(0.12, 1.645, 0); g.add(peak);
  } else {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.1, 14), m(hat)); h.position.y = 1.7; g.add(h);
  }
  return g;
}
