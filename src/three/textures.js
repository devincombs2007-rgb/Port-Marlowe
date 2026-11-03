// Procedurally painted textures (no image downloads needed): hull plating
// with every porthole at its plan position, superstructure windows, pine
// deck planking, ocean normal map, seabed sediment, soft particle sprite.
import * as THREE from 'three';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rand(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export const HULL_U = 272, HULL_V = 26;   // texture spans x 0..272 m, y 0..26 m

export function hullTextures(meta, opts) {
  const pxU = 9, pxV = 40;
  const W = HULL_U * pxU, H = HULL_V * pxV;
  const c = canvas(W, H), e = canvas(W, H);
  const g = c.getContext('2d'), ge = e.getContext('2d');
  const Y = (y) => H - y * pxV, X = (x) => x * pxU;
  const wl = opts.waterline;
  // anti-fouling red below the boot-top, black boot-topping, black topsides
  g.fillStyle = '#16171a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#6b2420'; g.fillRect(0, Y(wl - 0.45), W, H);
  g.fillStyle = '#121214'; g.fillRect(0, Y(wl + 0.35), W, (0.8) * pxV);
  // plating strakes and butts
  const r = rand(7);
  for (let y = 1.3; y < 24; y += 1.85) {
    g.fillStyle = y < wl ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.035)';
    g.fillRect(0, Y(y), W, 2);
  }
  for (let x = 0; x < HULL_U; x += 9.1) {
    for (let y = 0.6; y < 24; y += 1.85) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(X(x + (Math.floor(y / 1.85) % 2) * 4.5), Y(y + 1.85), 1, 1.85 * pxV); }
  }
  // rivet speckle & grime
  for (let i = 0; i < 26000; i++) { const x = r() * W, y = r() * H; g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.05})`; g.fillRect(x, y, 1.5, 1.5); }
  // gilt sheer line just below the top of the shell
  g.strokeStyle = '#c9a24e'; g.lineWidth = 0.14 * pxV;
  g.beginPath();
  for (let x = 0; x <= HULL_U; x += 0.5) { const top = meta.hullTop(Math.min(270.4, Math.max(1.5, x))); const y = Y(top - 0.62); x === 0 ? g.moveTo(X(x), y) : g.lineTo(X(x), y); }
  g.stroke();
  // portholes (hull ones only; superstructure windows are on the houses)
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  for (const p of meta.portholes) {
    if (p.y > meta.hullTop(p.x) - 0.3) continue;
    if (p.type !== 1) continue;
    g.fillStyle = '#7d8a8f';
    g.beginPath(); g.ellipse(X(p.x), Y(p.y), 0.21 * pxU, 0.21 * pxV, 0, 0, 7); g.fill();
    g.fillStyle = '#1d2326';
    g.beginPath(); g.ellipse(X(p.x), Y(p.y), 0.16 * pxU, 0.16 * pxV, 0, 0, 7); g.fill();
    const lit = ((p.x * 13.7 + p.y * 7.1) % 1) < 0.72;
    if (lit) { ge.fillStyle = '#ffcf8a'; ge.beginPath(); ge.ellipse(X(p.x), Y(p.y), 0.17 * pxU, 0.17 * pxV, 0, 0, 7); ge.fill(); }
  }
  // anchors (hawse pipes) on the bow
  g.fillStyle = '#0a0a0a';
  g.beginPath(); g.ellipse(X(262.5), Y(17.6), 0.9 * pxU, 0.7 * pxV, 0, 0, 7); g.fill();
  const tex = new THREE.CanvasTexture(c), em = new THREE.CanvasTexture(e);
  for (const t of [tex, em]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }
  return { map: tex, emissiveMap: em };
}

// Superstructure side: white plating with rows of windows. One tile = 4 m x 2.8 m.
export function houseTexture(kind) {
  const W = 256, H = 180;
  const c = canvas(W, H), e = canvas(W, H);
  const g = c.getContext('2d'), ge = e.getContext('2d');
  g.fillStyle = '#e9e5da'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, H - 10, W, 10);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  const r = rand(kind.length * 17 + 3);
  if (kind === 'promenade') {
    // open promenade bays with stanchions
    g.fillStyle = '#2b2722'; g.fillRect(0, 34, W, H - 70);
    g.fillStyle = '#e9e5da'; for (let x = 0; x < W; x += 64) g.fillRect(x, 34, 9, H - 70);
    g.fillStyle = '#d7d1c3'; g.fillRect(0, H - 52, W, 16);
    ge.fillStyle = '#4a3a24'; ge.fillRect(0, 40, W, H - 90);
  } else {
    const n = kind === 'b' ? 2 : kind === 'house' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const w = kind === 'b' ? 70 : 52, x = (i + 0.5) * W / n - w / 2, y = kind === 'b' ? 46 : 52;
      g.fillStyle = '#3a3a36'; g.fillRect(x - 3, y - 3, w + 6, 76);
      g.fillStyle = '#1f2326'; g.fillRect(x, y, w, 70);
      g.fillStyle = '#e9e5da'; g.fillRect(x + w / 2 - 2, y, 4, 70);
      if (r() < 0.82) { ge.fillStyle = r() < 0.5 ? '#ffd79a' : '#ffc77a'; ge.fillRect(x, y, w, 70); ge.fillStyle = '#000'; ge.fillRect(x + w / 2 - 2, y, 4, 70); }
    }
  }
  const tex = new THREE.CanvasTexture(c), em = new THREE.CanvasTexture(e);
  for (const t of [tex, em]) { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map: tex, emissiveMap: em };
}

export function deckTexture() {
  const W = 512, H = 512, c = canvas(W, H), g = c.getContext('2d');
  const r = rand(99);
  g.fillStyle = '#a88b62'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 16) {
    for (let x = -((y / 16) % 4) * 64; x < W; x += 256) {
      const t = 0.85 + r() * 0.25;
      g.fillStyle = `rgb(${168 * t},${139 * t},${98 * t})`; g.fillRect(x, y, 256, 15);
      g.fillStyle = 'rgba(40,28,15,0.55)'; g.fillRect(x, y, 2, 15);
    }
    g.fillStyle = '#2b2116'; g.fillRect(0, y + 15, W, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

// Tileable ocean normal map from integer-frequency waves.
export function waterNormals() {
  const N = 256, c = canvas(N, N), g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const waves = [];
  const r = rand(5);
  for (let i = 0; i < 22; i++) waves.push([Math.round((r() - 0.5) * 16) || 1, Math.round((r() - 0.5) * 16), r() * 6.28, 0.6 / (1 + i * 0.25)]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let dx = 0, dy = 0;
    for (const [kx, ky, ph, a] of waves) { const s = Math.cos((kx * x + ky * y) / N * 6.283 + ph) * a; dx += s * kx; dy += s * ky; }
    const nx = -dx * 0.06, ny = -dy * 0.06, l = Math.hypot(nx, ny, 1);
    const o = (y * N + x) * 4;
    img.data[o] = (nx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function sedimentTexture() {
  const N = 512, c = canvas(N, N), g = c.getContext('2d');
  const r = rand(21);
  g.fillStyle = '#5d564a'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 9000; i++) { const s = 1 + r() * 4; g.fillStyle = `rgba(${r() < 0.5 ? '30,26,20' : '140,130,110'},${0.05 + r() * 0.12})`; g.beginPath(); g.arc(r() * N, r() * N, s, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function spriteTexture() {
  const N = 64, c = canvas(N, N), g = c.getContext('2d');
  const gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, N, N);
  return new THREE.CanvasTexture(c);
}

export function nameTexture(lines, color = '#d9b45c') {
  const c = canvas(1024, 256), g = c.getContext('2d');
  g.fillStyle = color; g.textAlign = 'center';
  g.font = 'bold 120px Georgia, "Times New Roman", serif';
  g.fillText(lines[0], 512, lines[1] ? 120 : 170);
  if (lines[1]) { g.font = 'bold 70px Georgia, serif'; g.fillText(lines[1], 512, 220); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
