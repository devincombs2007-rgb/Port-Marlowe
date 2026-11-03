// The iceberg. Witnesses put it 50-100 ft (15-30 m) above the water - about
// as high as the boat deck - and 200-400 ft (60-120 m) long; this one is
// 115 m long and 20 m high. Its
// underwater body is sized so it floats in equilibrium: glacial ice
// (917 kg/m^3) in seawater (1025 kg/m^3) floats with 10.5 % of its volume
// above the surface. Volume and mass are measured from the mesh itself.
import * as THREE from 'three';

function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    const wgt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
    r += wgt * hash(xi + dx, yi + dy, zi + dz);
  }
  return r * 2 - 1;
}
const fbm = (x, y, z) => noise3(x, y, z) * 0.55 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.27 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.13 + noise3(x * 9, y * 9, z * 9) * 0.05;

function meshVolume(geo) {
  const p = geo.attributes.position, idx = geo.index;
  let V = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const n = idx ? idx.count : p.count;
  for (let i = 0; i < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1); c.fromBufferAttribute(p, i2);
    V += a.dot(b.clone().cross(c)) / 6;
  }
  return Math.abs(V);
}

export function buildIceberg() {
  const L = 115, Hgt = 20, W = 52;
  const geo = new THREE.IcosahedronGeometry(1, 6);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  // shape: a peaked berg above water, a broad keel below
  let below = 1;
  const shape = (scaleBelow) => {
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const n = fbm(v.x * 2.2 + 3, v.y * 2.2, v.z * 2.2 + 1);
      let x = v.x * L / 2, z = v.z * W / 2, y;
      if (v.y >= 0) {
        // two peaks (as in the photographs from the Prinz Adalbert & Birma)
        const peak = Math.exp(-((v.x + 0.25) ** 2) / 0.08) * 1.0 + Math.exp(-((v.x - 0.35) ** 2) / 0.05) * 0.7;
        y = Math.pow(v.y, 0.8) * Hgt * (0.45 + 0.55 * peak) * (1 + 0.25 * n);
        x *= 1 + 0.12 * n; z *= 1 + 0.18 * n;
      } else {
        y = v.y * 88 * scaleBelow * (1 + 0.2 * n);
        x *= 1.25 + 0.15 * n; z *= 1.3 + 0.15 * n;
      }
      p.setXYZ(i, x, y, z);
    }
  };
  const base = Float32Array.from(p.array);
  const volumes = (s) => { p.array.set(base); shape(s); p.needsUpdate = true; return meshVolume(geo); };
  // split volume above/below by clipping: estimate above-water volume by
  // shaping with no keel and mirroring
  const aboveV = (() => { p.array.set(base); shape(0.0001); return meshVolume(geo); })();
  // find keel depth scale that gives 10.5 % above water
  let lo = 0.2, hi = 4;
  for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; const tot = volumes(mid); if (aboveV / tot > 0.1054) lo = mid; else hi = mid; }
  below = (lo + hi) / 2;
  const total = volumes(below);
  geo.computeVertexNormals();
  // colour: compacted blue-white ice, darker below
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), n = fbm(p.getX(i) * 0.05, y * 0.05, p.getZ(i) * 0.05);
    const t = y > 0 ? 0.88 + 0.1 * n : 0.55 + 0.15 * n;
    col[i * 3] = 0.78 * t; col[i * 3 + 1] = 0.88 * t; col[i * 3 + 2] = 0.95 * t;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.0, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const mass = total * 917;
  mesh.userData = { length: L, height: Hgt, width: W, volume: total, mass, keel: 88 * below };
  return mesh;
}
