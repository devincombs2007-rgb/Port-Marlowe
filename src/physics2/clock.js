// Fixed-step simulation clock. Rendering may run at any rate; the physics
// always advances in identical steps, so outcomes do not depend on frame rate.
export class FixedClock {
  constructor(dt = 1 / 240, maxStepsPerFrame = 2400) { this.dt = dt; this.acc = 0; this.t = 0; this.steps = 0; this.max = maxStepsPerFrame; this.timeScale = 1; }
  // advance by a real frame time; returns the number of steps taken
  advance(frameDt, step) {
    this.acc += frameDt * this.timeScale;
    let n = 0;
    while (this.acc >= this.dt - 1e-15 && n < this.max) { step(this.dt); this.acc -= this.dt; this.t = ++this.steps * this.dt; n++; }
    if (n === this.max) this.acc = 0; // too slow to keep up: drop time rather than spiral
    return n;
  }
  get alpha() { return this.acc / this.dt; }
}
// FNV-1a hash over the exact bytes of a list of doubles (repeatability checks)
export function hashDoubles(arr) {
  const f = new Float64Array(arr), b = new Uint8Array(f.buffer);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
// deterministic RNG for anything stochastic inside physics
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
