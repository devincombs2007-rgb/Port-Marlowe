// Canvas 2D renderer: night sky, ocean with depth absorption, ship blocks
// (exterior paint or cutaway), floodwater in every room, particles, seabed,
// abyssal darkness with an ROV floodlight, rust.

import { CELL } from '../sim/constants.js';
import { MATERIALS, MAT, EMPTY, SOLID, SPACE, OPEN, SIDE } from '../sim/materials.js';
import { BUBBLE, JET, SPRAY, SILT, DEBRIS, SNOW, FLAKE, STEAM } from './particles.js';

const PX = 4; // texture pixels per cell

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const MAT_RGB = MATERIALS.map(m => hex(m.color || '#777777'));

export class Renderer {
  constructor(canvas, world, meta) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.world = world; this.meta = meta;
    this.cam = { x: 0, y: 6, z: 4 };
    this.mode = 'cutaway';
    this.tex = new Map();
    this.dirty = new Set();
    this.stars = Array.from({ length: 260 }, () => [Math.random(), Math.random() * 0.7, Math.random()]);
    this.mouse = { x: 0, y: 0, wx: 0, wy: 0 };
    this.visibility = 0.55;
    this.night = true;
    this.shake = 0;
    this.powered = true;
    this.mudPattern = null;
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.cv.width = Math.floor(this.cv.clientWidth * dpr);
    this.cv.height = Math.floor(this.cv.clientHeight * dpr);
  }
  toWorld(sx, sy) {
    const W = this.cv.width / this.dpr, H = this.cv.height / this.dpr, c = this.cam;
    return [(sx - W / 2) / c.z + c.x, -(sy - H / 2) / c.z + c.y];
  }
  invalidateAll() { this.tex.clear(); }
  invalidateBody(i) { this.tex.delete(i + ':ext'); this.tex.delete(i + ':cut'); }

  // ---------------------------------------------------------- ship texture
  bodyTexture(b, mode) {
    const key = b.index + ':' + mode;
    let t = this.tex.get(key);
    if (t) return t;
    const g = this.world.ship.grid;
    const x0 = b.aabb.x0, y1 = b.aabb.y1;
    const w = Math.max(1, Math.round((b.aabb.x1 - b.aabb.x0) / CELL)), h = Math.max(1, Math.round((b.aabb.y1 - b.aabb.y0) / CELL));
    const cv = document.createElement('canvas'); cv.width = w * PX; cv.height = h * PX;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w * PX, h * PX);
    const d = img.data;
    const meta = this.meta;
    const wl = meta.designDraught;
    for (let q = 0; q < b.cells.length; q++) {
      const k = b.cells[q];
      const kind = g.kind[k];
      if (kind === EMPTY) continue;
      const ci = Math.round((b.gx[q] - CELL / 2 - x0) / CELL), cj = Math.round((y1 - b.gy[q] - CELL / 2) / CELL);
      const m = g.mat[k];
      let [r, gg, bb] = this.cellColor(k, m, kind, b.gx[q], b.gy[q], mode, wl);
      const rust = g.rust[k];
      if (rust > 0.01 && (MATERIALS[m].rustRate > 0)) {
        const rr = Math.min(1, rust * 1.6);
        const tone = 0.6 + 0.4 * g.seed[k];
        r = r * (1 - rr) + 128 * tone * rr; gg = gg * (1 - rr) + 58 * tone * rr; bb = bb * (1 - rr) + 28 * tone * rr;
      }
      for (let py = 0; py < PX; py++) for (let px = 0; px < PX; px++) {
        const o = ((cj * PX + py) * w * PX + ci * PX + px) * 4;
        const n = ((g.seed[k] * 7919 + px * 13 + py * 31) % 17) / 17 - 0.5;
        let f = 1 + n * 0.07;
        // plate seams & deck edges
        if (mode === 'ext' && kind !== SPACE && py === 0 && g.kind[k + g.w] === EMPTY) f *= 1.25;
        d[o] = Math.min(255, r * f); d[o + 1] = Math.min(255, gg * f); d[o + 2] = Math.min(255, bb * f); d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // decorations
    ctx.save();
    ctx.scale(PX / CELL, PX / CELL);
    ctx.translate(-x0, y1); ctx.scale(1, -1); // grid coords
    this.decorate(ctx, b, mode, g);
    ctx.restore();
    t = { cv, x0, y1 };
    this.tex.set(key, t);
    return t;
  }

  cellColor(k, m, kind, x, y, mode, wl) {
    const g = this.world.ship.grid;
    const isSuper = (g.flags[k] & 1) !== 0;
    if (mode === 'ext') {
      if (m === MAT.FUNNEL) {
        const f = this.meta.funnels.find(f => Math.abs(f.xBase - x) < 25);
        if (f && y > f.yTop - 4.3) return [22, 20, 18];
        return [196, 138, 58];
      }
      if (m === MAT.MAST) return [190, 150, 100];
      if (m === MAT.RUDDER) return [120, 34, 26];
      if (m === MAT.BOAT) return [240, 238, 230];
      if (isSuper) return m === MAT.WDECK ? [196, 172, 128] : [234, 230, 218];
      if (m === MAT.WDECK) return [178, 150, 104];
      if (y < wl - 0.6) return [112, 34, 28];           // anti-fouling red below the boot-top
      if (y < wl + 0.1) return [28, 28, 28];
      if (y > this.meta.hullTop(x) - 0.9 && y < this.meta.hullTop(x) - 0.55) return [206, 168, 72]; // gilt sheer line
      return [20, 21, 23];
    }
    // cutaway
    if (kind === SPACE) {
      const c = MAT_RGB[m];
      return [c[0] * 0.72, c[1] * 0.72, c[2] * 0.72];
    }
    if (kind === OPEN) return g.gate[k] ? [120, 150, 160] : [70, 64, 58];
    if (m === MAT.FUNNEL) { const f = this.meta.funnels.find(f => Math.abs(f.xBase - x) < 25); return f && y > f.yTop - 4.3 ? [22, 20, 18] : [196, 138, 58]; }
    if (m === MAT.BHD) return [150, 156, 162];
    if (m === MAT.HULL || m === MAT.KEEL) return y < wl - 0.6 ? [96, 36, 30] : [34, 36, 40];
    if (isSuper && m === MAT.SUPER) return [214, 210, 198];
    return MAT_RGB[m];
  }

  decorate(ctx, b, mode, g) {
    const meta = this.meta;
    const inB = (x, y) => x >= b.aabb.x0 && x <= b.aabb.x1 && y >= b.aabb.y0 && y <= b.aabb.y1;
    // portholes and windows
    for (const p of meta.portholes) {
      if (!inB(p.x, p.y) || g.block[p.k] !== b.index) continue;
      if (g.kind[p.k] === EMPTY) continue;
      const broken = g.sideArea[p.k] > 0 && p.type !== SIDE.PROMENADE;
      ctx.fillStyle = mode === 'ext' ? (broken ? '#050608' : '#c9c2a0') : 'rgba(250,240,200,0.5)';
      if (p.type === SIDE.WINDOW) ctx.fillRect(p.x - 0.45, p.y - 0.4, 0.9, 0.85);
      else if (p.type === SIDE.PROMENADE) { if (mode === 'ext') { ctx.fillStyle = '#3a3630'; ctx.fillRect(p.x - 0.6, p.y - 0.8, 1.2, 1.7); } }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, 0.22, 0, 7); ctx.fill(); }
    }
    // breaches drawn as torn holes
    for (let q = 0; q < b.cells.length; q++) {
      const k = b.cells[q];
      if (g.side[k] === SIDE.BREACH) { ctx.fillStyle = '#000'; ctx.fillRect(b.gx[q] - 0.3, b.gy[q] - 0.12, 0.6, 0.24); }
    }
    if (mode === 'ext' && b.kind === 'hull') {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.05;
      for (let x = Math.ceil(b.aabb.x0 / 9) * 9; x < b.aabb.x1; x += 9) { ctx.beginPath(); ctx.moveTo(x, 0.5); ctx.lineTo(x, meta.hullTop(x)); ctx.stroke(); }
      // name on the bow and stern
      if (b.aabb.x1 > 255 && b.aabb.x0 < 258) {
        ctx.save(); ctx.translate(255.5, meta.hullTop(255) - 2.2); ctx.scale(1, -1);
        ctx.fillStyle = '#d8c27a'; ctx.font = 'bold 1.4px Georgia, serif'; ctx.fillText('TITANIC', -4, 0); ctx.restore();
      }
    }
    if (mode === 'cut') {
      // boilers & engines
      ctx.save();
      for (const hv of meta.heavy) {
        if (hv.x1 < b.aabb.x0 || hv.x0 > b.aabb.x1) continue;
        ctx.fillStyle = 'rgba(30,26,24,0.55)';
        if (hv.tonnes > 600 && hv.y1 - hv.y0 < 6) {
          // boilers: double-ended, 15 ft 9 in diameter
          for (let x = hv.x0 + 0.3; x < hv.x1 - 4; x += 6.1) {
            if (x + 5.8 < b.aabb.x0 || x > b.aabb.x1) continue;
            ctx.fillStyle = '#2a211c'; ctx.beginPath(); ctx.roundRect(x, hv.y0, 5.8, 4.8, 1.6); ctx.fill();
            ctx.fillStyle = 'rgba(255,110,30,0.55)'; ctx.fillRect(x + 0.6, hv.y0 + 0.5, 0.9, 0.7); ctx.fillRect(x + 4.3, hv.y0 + 0.5, 0.9, 0.7);
          }
        } else if (hv.tonnes > 1000) {
          ctx.fillStyle = '#26221f'; ctx.fillRect(hv.x0 + 1, hv.y0, hv.x1 - hv.x0 - 2, hv.y1 - hv.y0 - 1.5);
          ctx.fillStyle = '#3d3732'; for (let x = hv.x0 + 2; x < hv.x1 - 2; x += 4) ctx.fillRect(x, hv.y1 - 3.5, 2.4, 2.6);
        }
      }
      ctx.restore();
    }
  }

  // ------------------------------------------------------------- frame
  draw(state) {
    const ctx = this.ctx, W = this.cv.width / this.dpr, H = this.cv.height / this.dpr;
    const world = this.world, env = world.env, cam = this.cam;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sk = this.shake > 0 ? this.shake : 0;
    const shx = (Math.random() - 0.5) * sk, shy = (Math.random() - 0.5) * sk;
    this.shake *= 0.9;
    const z = cam.z;
    const sy0 = (y) => H / 2 - (y - cam.y) * z + shy;
    const sx0 = (x) => W / 2 + (x - cam.x) * z + shx;
    const [wl, wt] = this.toWorld(0, 0), [wr, wb] = this.toWorld(W, H);
    // sky
    const horizon = sy0(0);
    if (horizon > 0) {
      const sg = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
      if (this.night && this.dawn > 0) { const d = this.dawn; sg.addColorStop(0, `rgb(${3 + 60 * d},${6 + 90 * d},${13 + 140 * d})`); sg.addColorStop(1, `rgb(${13 + 220 * d},${22 + 150 * d},${38 + 110 * d})`); }
      else if (this.night) { sg.addColorStop(0, '#03060d'); sg.addColorStop(1, '#0d1626'); }
      else { sg.addColorStop(0, '#5e8fbf'); sg.addColorStop(1, '#c9dcea'); }
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, Math.min(H, horizon));
      if (this.night) {
        ctx.fillStyle = '#fff';
        if (this.replay) this.drawHorizonLights(ctx, W, horizon);
        for (const [sx, syy, b] of this.stars) {
          if (this.dawn > 0.6) break;
          const y = syy * horizon; if (y > horizon - 4) continue;
          ctx.globalAlpha = 0.3 + 0.7 * b * (0.8 + 0.2 * Math.sin(state.time * 2 + b * 40));
          ctx.fillRect(sx * W, y, b > 0.9 ? 2 : 1, b > 0.9 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
      }
    }
    // underwater backdrop: absorption with depth
    const top = Math.max(0, horizon);
    if (top < H) {
      const g2 = ctx.createLinearGradient(0, top, 0, H);
      const dTop = Math.max(0, -wt), dBot = Math.max(0, -wb);
      g2.addColorStop(0, this.waterColor(dTop, 1)); g2.addColorStop(1, this.waterColor(dBot, 1));
      ctx.fillStyle = g2; ctx.fillRect(0, top, W, H - top);
    }
    // god rays / surface light
    // seabed (behind)
    const seaTop = -env.seabedDepth + 30;
    // particles behind: marine snow
    // ship
    ctx.save();
    ctx.setTransform(this.dpr * z, 0, 0, -this.dpr * z, this.dpr * (W / 2 - z * cam.x + shx), this.dpr * (H / 2 + z * cam.y + shy));
    const mode = this.mode === 'exterior' ? 'ext' : 'cut';
    if (this.replay) this.drawReplayBack(ctx, this.replay.t);
    for (const b of world.bodies) {
      if (!b.alive) continue;
      const wbx = b.wbox;
      if (wbx.x1 < wl - 5 || wbx.x0 > wr + 5 || wbx.y1 < wb - 5 || wbx.y0 > wt + 5) continue;
      const t = this.bodyTexture(b, mode);
      ctx.save();
      ctx.transform(b.c, b.s, -b.s, b.c, b.x, b.y);
      ctx.translate(-b.comX, -b.comY);
      if (b.squash && b.squash < 1) { ctx.translate(0, b.aabb.y0); ctx.scale(1, b.squash); ctx.translate(0, -b.aabb.y0); }
      ctx.save();
      ctx.translate(t.x0, t.y1); ctx.scale(CELL / PX, -CELL / PX);
      ctx.imageSmoothingEnabled = z * CELL / PX < 1.5;
      ctx.drawImage(t.cv, 0, 0);
      ctx.restore();
      if (mode === 'cut') this.drawWater(ctx, b);
      if (this.overlay === 'stress') this.drawStress(ctx, b);
      ctx.restore();
    }
    // rigging (antenna between mastheads)
    this.drawRigging(ctx);
    if (this.replay) this.drawReplayFront(ctx, this.replay.t);
    // particles
    this.drawParticles(ctx, state, mode);
    ctx.restore();
    // ocean surface & water overlay
    this.drawOcean(ctx, W, H, sx0, sy0, wl, wr, state);
    // seabed in front
    this.drawSeabed(ctx, W, H, sx0, sy0, wl, wr);
    // lights of the ship at night
    if (this.night && this.powered) this.drawShipLights(ctx, sx0, sy0, z);
    // abyssal darkness
    this.drawDarkness(ctx, W, H, wt, wb);
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // inspect highlight
    if (state.hover) this.drawHover(ctx, state.hover, sx0, sy0, z);
  }

  waterColor(depth, a) {
    // red and green absorbed first; near-black below ~250 m
    const k = Math.exp(-depth / 70);
    const kd = Math.exp(-depth / 260);
    const r = Math.round(4 + 22 * k), g = Math.round(14 + 70 * k * (this.night ? 0.45 : 1) + 18 * kd), b = Math.round(24 + 90 * k * (this.night ? 0.5 : 1) + 30 * kd);
    return `rgba(${r},${g},${b},${a})`;
  }

  drawWater(ctx, b) {
    const sh = this.world.ship, g = sh.grid, fl = this.world.flooding;
    // per-cell floodwater, drawn as cell quads; surface cells get a highlight
    ctx.fillStyle = 'rgba(38,104,140,0.78)';
    ctx.beginPath();
    let any = false;
    for (let q = 0; q < b.cells.length; q++) {
      const k = b.cells[q];
      if (g.kind[k] !== SPACE) continue;
      const f = fl.cellWaterFrac[k];
      if (f < 0.04) continue;
      any = true;
      const x = b.gx[q] - CELL / 2, y = b.gy[q] - CELL / 2;
      ctx.rect(x, y, CELL, CELL * (f > 0.95 ? 1 : f) + 0.01);
    }
    if (any) ctx.fill();
  }

  drawStress(ctx, b) {
    for (const j of this.world.joints) {
      if (j.kind !== 'weld' || (j.a !== b.index)) continue;
      const r = Math.min(1.2, j.ratioF);
      ctx.fillStyle = `rgba(${Math.round(255 * Math.min(1, r * 1.4))},${Math.round(255 * Math.max(0, 1 - r))},40,${0.25 + 0.5 * Math.min(1, r)})`;
      ctx.fillRect(j.ax - 1.2, (j.yBot ?? 0) - 0.5, 2.4, (j.yTop ?? 20) - (j.yBot ?? 0) + 1);
    }
  }

  drawRigging(ctx) {
    const masts = this.world.bodies.filter(b => b.kind === 'mast' && b.alive);
    if (masts.length < 2) return;
    const tops = masts.map(b => { let best = 0; for (let q = 0; q < b.cells.length; q++) if (b.gy[q] > b.gy[best]) best = q; return [b.wx(b.gx[best], b.gy[best]), b.wy(b.gx[best], b.gy[best])]; });
    const fore = masts.find(m => m.name === 'Foremast'), main = masts.find(m => m.name === 'Mainmast');
    if (!fore || !main || fore.piece !== main.piece) return;
    ctx.strokeStyle = 'rgba(200,190,170,0.5)'; ctx.lineWidth = 0.08;
    ctx.beginPath(); ctx.moveTo(tops[0][0], tops[0][1] - 1); ctx.lineTo(tops[1][0], tops[1][1] - 1); ctx.stroke();
  }

  drawParticles(ctx, state, mode) {
    const P = state.particles;
    for (let i = 0; i < P.n; i++) {
      const t = P.t[i], x = P.x[i], y = P.y[i], r = P.r[i];
      if (t === BUBBLE) { ctx.fillStyle = 'rgba(190,225,240,0.55)'; ctx.beginPath(); ctx.arc(x, y, Math.max(0.06, r), 0, 7); ctx.fill(); }
      else if (t === JET) { if (mode !== 'cut') continue; ctx.fillStyle = 'rgba(140,200,230,0.7)'; ctx.fillRect(x - r / 2, y - r / 2, r, r); }
      else if (t === SPRAY) { ctx.fillStyle = 'rgba(230,245,255,0.75)'; ctx.fillRect(x - r / 2, y - r / 2, r, r); }
      else if (t === SILT) { ctx.fillStyle = `rgba(120,108,88,${Math.min(0.22, P.life[i] * 0.02)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      else if (t === DEBRIS) { ctx.fillStyle = '#5a4634'; ctx.fillRect(x - r, y - r * 0.4, r * 2, r * 0.8); }
      else if (t === SNOW) { ctx.fillStyle = 'rgba(220,230,220,0.35)'; ctx.fillRect(x, y, 0.12, 0.12); }
      else if (t === FLAKE) { ctx.fillStyle = 'rgba(150,70,30,0.8)'; ctx.fillRect(x, y, 0.15, 0.1); }
      else if (t === STEAM) { ctx.fillStyle = `rgba(230,230,230,${Math.min(0.25, P.life[i] * 0.05)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    }
  }

  drawOcean(ctx, W, H, sx0, sy0, wl, wr, state) {
    const env = this.world.env;
    const step = Math.max(1, 3 / this.cam.z);
    const yS = sy0(0);
    if (yS > H + 40) { this.drawDeepTint(ctx, W, H); return; }
    // water body in front of the hull (semi-transparent: we see the hull through it)
    const pts = [];
    for (let x = wl - step; x <= wr + step; x += step) pts.push([sx0(x), sy0(env.surface(x))]);
    const alpha = this.mode === 'exterior' ? 0.55 : 0.34;
    const g = ctx.createLinearGradient(0, yS - 10, 0, Math.min(H, yS + 60 * this.cam.z) + 1);
    g.addColorStop(0, `rgba(14,48,70,${alpha})`); g.addColorStop(1, `rgba(3,14,24,${Math.min(0.85, alpha + 0.3)})`);
    ctx.beginPath(); ctx.moveTo(pts[0][0], H + 10);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(pts[pts.length - 1][0], H + 10); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    // surface line + foam
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = this.night ? 'rgba(150,185,210,0.55)' : 'rgba(240,250,255,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
    const oc = state.ocean;
    if (oc) {
      ctx.fillStyle = 'rgba(235,245,250,0.6)';
      for (let i = 0; i < oc.n; i += 2) {
        const f = oc.foam[i]; if (f < 0.05) continue;
        const x = oc.x0 + i * oc.dx; if (x < wl || x > wr) continue;
        ctx.globalAlpha = Math.min(0.8, f); ctx.fillRect(sx0(x) - 2, sy0(env.surface(x)) - 1, 4 + f * 6, 2);
      }
      ctx.globalAlpha = 1;
    }
  }
  drawDeepTint(ctx, W, H) {
    ctx.fillStyle = this.mode === 'exterior' ? 'rgba(2,10,18,0.4)' : 'rgba(2,10,18,0.22)';
    ctx.fillRect(0, 0, W, H);
  }

  drawSeabed(ctx, W, H, sx0, sy0, wl, wr) {
    const env = this.world.env;
    const yTop = sy0(-env.seabedDepth + 15);
    if (yTop > H) return;
    const step = Math.max(0.5, 2 / this.cam.z);
    ctx.beginPath(); ctx.moveTo(-10, H + 10);
    for (let x = wl - 2; x <= wr + 2; x += step) ctx.lineTo(sx0(x), sy0(env.mudY(x)));
    ctx.lineTo(W + 10, H + 10); ctx.closePath();
    const g = ctx.createLinearGradient(0, sy0(-env.seabedDepth + 6), 0, sy0(-env.seabedDepth - 30));
    g.addColorStop(0, '#6d6555'); g.addColorStop(0.15, '#4f483c'); g.addColorStop(1, '#1d1a15');
    ctx.fillStyle = g; ctx.fill();
    // sediment texture
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let x = Math.floor(wl / 3) * 3; x < wr; x += 3) {
      const h = (Math.sin(x * 12.9898) * 43758.5453) % 1;
      ctx.fillRect(sx0(x), sy0(env.mudY(x)) + 3 + Math.abs(h) * 18 * this.cam.z / 4, Math.max(1, 1.2 * this.cam.z), 1);
    }
  }

  drawShipLights(ctx, sx0, sy0, z) {
    const g = this.world.ship.grid, fl = this.world.flooding;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const rad = Math.max(2, 1.6 * z);
    for (const p of this.meta.portholes) {
      const k = p.k;
      if (g.kind[k] !== SPACE || fl.cellWaterFrac[k] > 0.5) continue;
      const b = this.world.bodies[g.block[k]];
      if (!b || !b.alive || !b.lit) continue;
      const X = b.wx(this.world.ship.cxs[k], this.world.ship.cys[k]), Y = b.wy(this.world.ship.cxs[k], this.world.ship.cys[k]);
      const x = sx0(X), y = sy0(Y);
      if (x < -20 || y < -20 || x > this.cv.width || y > this.cv.height) continue;
      const under = Y < this.world.env.surface(X);
      ctx.fillStyle = under ? 'rgba(90,160,120,0.16)' : 'rgba(255,214,140,0.22)';
      ctx.beginPath(); ctx.arc(x, y, rad * (this.flicker || 1), 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  drawDarkness(ctx, W, H, wt, wb) {
    // light falls off with depth; an ROV floodlight follows the cursor
    const dMid = Math.max(0, -this.cam.y);
    const dark = Math.min(0.97, (1 - Math.exp(-dMid / 180)) * (1 - this.visibility * 0.75) + (this.night ? 0.12 : 0));
    if (dark < 0.02) return;
    if (!this.dcv) this.dcv = document.createElement('canvas');
    const d = this.dcv;
    if (d.width !== this.cv.width) { d.width = this.cv.width; d.height = this.cv.height; }
    const c = d.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, d.width, d.height);
    // only underwater part gets darkness (sky stays)
    const yS = H / 2 + this.cam.y * this.cam.z;
    const yStart = Math.max(0, Math.min(H, yS));
    const gr = c.createLinearGradient(0, yStart * this.dpr, 0, d.height);
    const dTop = Math.max(0, -wt), dBot = Math.max(0, -wb);
    const f = (dd) => Math.min(0.97, (1 - Math.exp(-dd / 160)) * (1 - this.visibility * 0.7) + (this.night ? 0.1 : 0));
    gr.addColorStop(0, `rgba(0,3,6,${f(dTop)})`); gr.addColorStop(1, `rgba(0,3,6,${f(dBot)})`);
    c.fillStyle = gr; c.fillRect(0, yStart * this.dpr, d.width, d.height);
    c.globalCompositeOperation = 'destination-out';
    const mx = this.mouse.x * this.dpr, my = this.mouse.y * this.dpr;
    const R = Math.max(W, H) * 0.32 * this.dpr;
    const lg = c.createRadialGradient(mx, my, 0, mx, my, R);
    lg.addColorStop(0, 'rgba(0,0,0,0.95)'); lg.addColorStop(0.55, 'rgba(0,0,0,0.5)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = lg; c.beginPath(); c.arc(mx, my, R, 0, 7); c.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(d, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // ------------------------------------------------------- replay layers
  drawBoat(ctx, st, side, id) {
    if (!st || st.mode === 'gone') return;
    ctx.save();
    ctx.translate(st.x, st.y); ctx.rotate(st.a || 0);
    const L = id === 'A' || id === 'B' || id === 'C' || id === 'D' ? 8.3 : id === '1' || id === '2' ? 7.6 : 9.1;
    ctx.globalAlpha = side === 'p' ? 0.6 : 1;
    if (st.flip) {
      ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.ellipse(0, 0.2, L / 2, 0.55, 0, 0, Math.PI); ctx.fill();
    } else {
      ctx.fillStyle = '#f1ece0';
      ctx.beginPath(); ctx.moveTo(-L / 2, 1.1); ctx.lineTo(L / 2, 1.1); ctx.quadraticCurveTo(L / 2 - 0.4, -0.1, L / 2 - 1.4, -0.25); ctx.lineTo(-L / 2 + 1.4, -0.25); ctx.quadraticCurveTo(-L / 2 + 0.4, -0.1, -L / 2, 1.1); ctx.fill();
      ctx.fillStyle = '#9b3a2c'; ctx.fillRect(-L / 2 + 0.6, 0.85, L - 1.2, 0.18);
      if (st.mode !== 'davit') {
        // people (dark figures) and a lantern
        ctx.fillStyle = '#2a2622';
        const n = Math.min(14, Math.max(3, Math.round(L * 1.4)));
        for (let i = 0; i < n; i++) ctx.fillRect(-L / 2 + 1 + i * (L - 2) / n, 1.1, 0.32, 0.55 + ((i * 7) % 3) * 0.08);
        if (this.night && this.dawn < 0.7) { ctx.fillStyle = 'rgba(255,214,140,0.95)'; ctx.fillRect(L / 2 - 1.2, 1.7, 0.25, 0.3); }
      }
      if (st.mode === 'lowering' || st.mode === 'davit') { ctx.strokeStyle = 'rgba(220,210,190,0.7)'; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(-L / 2 + 0.8, 1.1); ctx.lineTo(-L / 2 + 0.8, 1.1 + (st.mode === 'davit' ? 1.3 : 30)); ctx.moveTo(L / 2 - 0.8, 1.1); ctx.lineTo(L / 2 - 0.8, 1.1 + (st.mode === 'davit' ? 1.3 : 30)); ctx.stroke(); }
    }
    ctx.restore();
  }
  drawIceberg(ctx, t, front) {
    const rp = this.replay;
    if (t > -1 + 600 || t < -60) return;
    const xc = rp.icebergX(t);
    ctx.save(); ctx.translate(xc, 0);
    if (!front) {
      ctx.fillStyle = 'rgba(120,170,200,0.35)';
      ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-90, -40); ctx.lineTo(-40, -95); ctx.lineTo(30, -110); ctx.lineTo(85, -55); ctx.lineTo(70, 0); ctx.fill();
    } else {
      const g = ctx.createLinearGradient(0, 22, 0, 0);
      g.addColorStop(0, '#dfe9ee'); g.addColorStop(1, '#8fa9b8');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-62, 0); ctx.lineTo(-50, 8); ctx.lineTo(-38, 12); ctx.lineTo(-22, 21); ctx.lineTo(-12, 17); ctx.lineTo(4, 23); ctx.lineTo(16, 14); ctx.lineTo(34, 11); ctx.lineTo(50, 6); ctx.lineTo(64, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.3; ctx.stroke();
    }
    ctx.restore();
  }
  drawReplayBack(ctx, t) {
    const rp = this.replay;
    this.drawIceberg(ctx, t, false);
    for (const bt of this.boatList) if (bt.side === 'p') this.drawBoat(ctx, rp.boatState(bt, t), 'p', bt.id);
    // Carpathia: one red-and-black funnel, four masts
    if (t > rp.carpathiaT0) {
      const x = rp.carpathiaX(t);
      ctx.save(); ctx.translate(x, 0); ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#16181b'; ctx.beginPath(); ctx.moveTo(-85, -7); ctx.lineTo(85, -7); ctx.lineTo(88, 9); ctx.lineTo(-87, 9); ctx.fill();
      ctx.fillStyle = '#d9d4c6'; ctx.fillRect(-35, 9, 60, 6); ctx.fillRect(-20, 15, 30, 3);
      ctx.fillStyle = '#b8452a'; ctx.fillRect(-6, 15, 7, 15); ctx.fillStyle = '#111'; ctx.fillRect(-6, 26, 7, 4);
      ctx.strokeStyle = '#3a342c'; ctx.lineWidth = 0.6; for (const mx of [-70, -45, 45, 70]) { ctx.beginPath(); ctx.moveTo(mx, 9); ctx.lineTo(mx, 38); ctx.stroke(); }
      if (this.dawn < 0.8) { ctx.fillStyle = 'rgba(255,220,150,0.9)'; for (let i = -80; i < 80; i += 6) ctx.fillRect(i, 3, 0.8, 0.8); }
      ctx.restore();
    }
  }
  drawReplayFront(ctx, t) {
    const rp = this.replay;
    for (const bt of this.boatList) if (bt.side === 's') this.drawBoat(ctx, rp.boatState(bt, t), 's', bt.id);
    this.drawIceberg(ctx, t, true);
    // ship's way through the water: bow wave & passing foam
    const v = rp.shipSpeed(t);
    if (v > 0.3) {
      const S = t * v;
      ctx.fillStyle = `rgba(230,240,245,${Math.min(0.6, v / 12)})`;
      for (let i = -40; i < 40; i++) { const x = ((i * 23.7 - S) % 900 + 900) % 900 - 450; ctx.fillRect(x, -0.1, 3 + (i % 3), 0.25); }
      const bx = rp.apply(rp.intact(t), rp.meta.X0 - 1, 0)[0];
      ctx.beginPath(); ctx.ellipse(bx, 0.3, 6 * v / 11.6, 1.3 * v / 11.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    // distress rockets: white stars bursting ~150 m above the bridge
    for (const tr of rp.rockets) {
      const dt = t - tr;
      if (dt < 0 || dt > 10) continue;
      const [bx, by] = rp.apply(rp.intact(tr), rp.meta.X0 - 60, 31);
      if (dt < 3) {
        const y = by + 150 * (1 - (1 - dt / 3) ** 2);
        ctx.strokeStyle = 'rgba(255,235,200,0.9)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(bx, by + Math.max(0, y - by - 20)); ctx.lineTo(bx, y); ctx.stroke();
      } else {
        const u = (dt - 3) / 7;
        ctx.fillStyle = `rgba(255,250,235,${1 - u})`;
        for (let i = 0; i < 14; i++) {
          const ang = i / 14 * Math.PI * 2, r = 4 + 22 * u;
          ctx.beginPath(); ctx.arc(bx + Math.cos(ang) * r, by + 150 + Math.sin(ang) * r - 18 * u * u, 1.2 * (1 - u) + 0.3, 0, 7); ctx.fill();
        }
      }
    }
  }
  drawHorizonLights(ctx, W, horizon) {
    const rp = this.replay, t = rp.t;
    // the mystery ship's light (probably SS Californian, ~10 miles off)
    if (t > rp.californianT[0] && t < rp.californianT[1]) {
      ctx.fillStyle = 'rgba(255,240,210,0.85)'; ctx.fillRect(W * 0.12, horizon - 3, 2, 2); ctx.fillRect(W * 0.12 + 5, horizon - 2, 1.5, 1.5);
    }
  }

  drawHover(ctx, h, sx0, sy0, z) {
    if (!h.room) return;
    ctx.strokeStyle = 'rgba(232,196,120,0.9)'; ctx.lineWidth = 1;
    ctx.strokeRect(sx0(h.x) - 4, sy0(h.y) - 4, 8, 8);
  }
}
