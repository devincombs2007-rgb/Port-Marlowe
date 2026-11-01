// Near-field ocean surface: a column-based shallow-water / wave-equation
// solver (1 m columns) that the hull displaces, two-way coupled with ship
// buoyancy through Environment.surface(). Splashes spawn spray particles.

export class Ocean {
  constructor(env, x0 = -700, x1 = 700, dx = 1) {
    this.env = env;
    this.x0 = x0; this.dx = dx;
    this.n = Math.round((x1 - x0) / dx);
    this.h = new Float32Array(this.n);     // surface elevation
    this.v = new Float32Array(this.n);     // vertical velocity
    this.foam = new Float32Array(this.n);
    this.prevSub = new Float32Array(this.n);
    this.sub = new Float32Array(this.n);
    env.flip = { x0, dx, n: this.n, h: this.h };
    this.splashes = [];
  }
  // How much hull volume (per metre of length) sits in each column near the surface.
  sampleDisplacement(bodies, grid) {
    const sub = this.sub; sub.fill(0);
    for (const b of bodies) {
      if (!b.alive || b.wbox.y0 > 4 || b.wbox.y1 < -14) continue;
      const cells = b.cells;
      const step = cells.length > 4000 ? 3 : 1;
      for (let q = 0; q < cells.length; q += step) {
        const v = grid.vdisp[cells[q]];
        if (v <= 0) continue;
        const X = b.wx(b.gx[q], b.gy[q]), Y = b.wy(b.gx[q], b.gy[q]);
        if (Y > 2 || Y < -12) continue;
        const i = ((X - this.x0) / this.dx) | 0;
        if (i < 0 || i >= this.n) continue;
        const w = Y > 0 ? 0.25 : 1;
        sub[i] += v * step * w / 28;
      }
    }
  }
  step(dt, bodies, grid) {
    const n = this.n, h = this.h, v = this.v;
    this.sampleDisplacement(bodies, grid);
    if (!this.primed) { this.prevSub.set(this.sub); this.primed = true; return; }
    // displacement change pushes water out sideways: raise neighbours
    for (let i = 2; i < n - 2; i++) {
      const d = (this.sub[i] - this.prevSub[i]) / this.dx;
      if (d !== 0) {
        const s = Math.max(-0.12, Math.min(0.12, d * 0.06 * dt * 60));
        h[i - 2] += s * 0.25; h[i + 2] += s * 0.25; h[i - 1] += s * 0.25; h[i + 1] += s * 0.25;
        if (Math.abs(d) > 0.6) { this.foam[i] = Math.min(1, this.foam[i] + Math.abs(d) * 0.1); if (Math.random() < 0.3) this.splashes.push(this.x0 + i * this.dx, Math.min(3, Math.abs(d))); }
      }
      this.prevSub[i] = this.sub[i];
    }
    // wave equation with dispersion-like smoothing, sub-stepped (c = sqrt(g d))
    const c = 9, k = c * c / (this.dx * this.dx);
    const sub = Math.max(1, Math.ceil(dt * c / this.dx * 1.4));
    const h2 = dt / sub;
    for (let s = 0; s < sub; s++) {
      for (let i = 1; i < n - 1; i++) {
        const blocked = this.sub[i] > 6 ? 0.2 : 1;
        v[i] += h2 * k * (h[i - 1] + h[i + 1] - 2 * h[i]) * blocked;
        v[i] *= 1 - 0.35 * h2;
      }
      for (let i = 1; i < n - 1; i++) h[i] += h2 * v[i];
    }
    // absorbing edges
    const edge = 80;
    for (let i = 0; i < edge; i++) { const f = 1 - 0.06 * (1 - i / edge); h[i] *= f; v[i] *= f; h[n - 1 - i] *= f; v[n - 1 - i] *= f; }
    for (let i = 0; i < n; i++) { if (h[i] > 2.5) h[i] = 2.5; if (h[i] < -2.5) h[i] = -2.5; this.foam[i] *= 1 - 0.4 * dt; }
  }
}
