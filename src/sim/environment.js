// The ocean: free surface (analytic swell + live fluid-sim surface where the
// near-field FLIP simulation runs), seabed relief, currents.

import { CELL } from './constants.js';

export class Environment {
  constructor(opts = {}) {
    this.seabedDepth = opts.seabedDepth ?? 3800;    // Titanic wreck site: ~3,800 m
    this.swellAmp = opts.swellAmp ?? 0;             // m (14 Apr 1912: flat calm)
    this.swellPeriod = opts.swellPeriod ?? 9;
    this.time = 0;
    this.flip = null;                               // { x0, dx, n, h: Float32Array }
    this.flipBlend = 0.6;
    this.mudLift = null;                            // visual mud berms
    this.mudX0 = -4000; this.mudDx = 1; this.mudN = 0;
    this.current = opts.current ?? 0.03;            // abyssal current, m/s
    this.surfaceTemp = opts.surfaceTemp ?? -2;
    this.seed = opts.seed ?? 7;
    this.initMud();
  }
  initMud() {
    this.mudX0 = -6000; this.mudDx = 1.0; this.mudN = 12000;
    this.mudLift = new Float32Array(this.mudN);
  }
  swell(x, t = this.time) {
    if (this.swellAmp <= 0) return 0;
    const k = (2 * Math.PI) ** 2 / (9.81 * this.swellPeriod * this.swellPeriod);
    const w = 2 * Math.PI / this.swellPeriod;
    return this.swellAmp * (Math.sin(k * x - w * t) + 0.35 * Math.sin(1.7 * k * x - 1.3 * w * t + 1.1));
  }
  // free-surface height at x
  surface(x) {
    let h = this.swell(x);
    const f = this.flip;
    if (f && f.h) {
      const u = (x - f.x0) / f.dx;
      if (u > 0 && u < f.n - 1) {
        const i = u | 0, t = u - i;
        const v = f.h[i] * (1 - t) + f.h[i + 1] * t;
        // fade the fluid-sim surface out near the edges of its domain
        const edge = Math.min(u, f.n - 1 - u) / (f.n * 0.08);
        const wgt = Math.min(1, edge) * this.flipBlend;
        h += v * wgt;
      }
    }
    return h;
  }
  seabedBase(x) {
    const d = this.seabedDepth;
    return -d + 7 * Math.sin(x / 830 + 0.4) + 3.2 * Math.sin(x / 290 + 2.1) + 1.1 * Math.sin(x / 61 + 0.7) + 0.35 * Math.sin(x / 13.7);
  }
  seabedY(x) { return this.seabedBase(x); }
  // surface of the mud as drawn (with berms pushed up by impacts)
  mudY(x) {
    let y = this.seabedBase(x);
    const u = (x - this.mudX0) / this.mudDx;
    if (u > 0 && u < this.mudN - 1) {
      const i = u | 0, t = u - i;
      y += this.mudLift[i] * (1 - t) + this.mudLift[i + 1] * t;
    }
    return y;
  }
  pushMud(x, amount, radius = 6) {
    const c = Math.round((x - this.mudX0) / this.mudDx);
    const r = Math.ceil(radius / this.mudDx);
    for (let i = -r; i <= r; i++) {
      const q = c + i;
      if (q < 0 || q >= this.mudN) continue;
      const w = Math.exp(-(i * i) / (r * r * 0.4));
      this.mudLift[q] = Math.min(12, this.mudLift[q] + amount * w);
    }
  }
  seabedNormal(x) {
    const h = 1.0;
    const dy = this.seabedBase(x + h) - this.seabedBase(x - h);
    const nx = -dy / (2 * h), ny = 1;
    const l = Math.hypot(nx, ny);
    return [nx / l, ny / l];
  }
}
