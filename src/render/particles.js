// Visual particles: air bubbles (Boyle expansion while rising), inflow jets,
// spray, silt clouds, debris, rust flakes and marine snow.
import { P_ATM, RHO_SEA, G } from '../sim/constants.js';

export const BUBBLE = 0, JET = 1, SPRAY = 2, SILT = 3, DEBRIS = 4, SNOW = 5, FLAKE = 6, STEAM = 7;
const CAP = 9000;

export class Particles {
  constructor() {
    this.x = new Float32Array(CAP); this.y = new Float32Array(CAP);
    this.vx = new Float32Array(CAP); this.vy = new Float32Array(CAP);
    this.r = new Float32Array(CAP); this.life = new Float32Array(CAP);
    this.t = new Uint8Array(CAP); this.n = 0;
  }
  add(type, x, y, vx, vy, r, life) {
    let i = this.n;
    if (i >= CAP) { i = (Math.random() * CAP) | 0; } else this.n++;
    this.t[i] = type; this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.r[i] = r; this.life[i] = life;
  }
  step(dt, env) {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      const t = this.t[i];
      let x = this.x[i], y = this.y[i], vx = this.vx[i], vy = this.vy[i], r = this.r[i], life = this.life[i] - dt;
      const surf = env.surface(x);
      if (t === BUBBLE) {
        const vt = Math.min(1.6, 0.25 + r * 2.2);
        vy += (vt - vy) * Math.min(1, dt * 3); vx *= 1 - dt; vx += (Math.random() - 0.5) * 0.6 * dt;
        // Boyle: radius grows as pressure falls
        const d0 = Math.max(0, surf - y), d1 = Math.max(0, surf - (y + vy * dt));
        r *= Math.cbrt((P_ATM + RHO_SEA * G * d0) / (P_ATM + RHO_SEA * G * d1));
        if (y > surf - 0.2) { life = 0; }
      } else if (t === JET || t === SPRAY) {
        vy -= 9.81 * dt;
        if (t === SPRAY && y < surf && vy < 0) life = 0;
      } else if (t === SILT) {
        vx *= 1 - 0.3 * dt; vy *= 1 - 0.5 * dt; vy -= 0.02 * dt; vx += (Math.random() - 0.5) * 0.08; r += dt * 0.25;
      } else if (t === DEBRIS) {
        if (y < surf) { vy += (-0.6 - vy) * dt * 0.5; vx *= 1 - 0.4 * dt; } else vy -= 9.81 * dt;
        if (y < env.seabedY(x)) { y = env.seabedY(x); vx = vy = 0; }
      } else if (t === SNOW) {
        vy = -0.05; vx = 0.04 + Math.sin(y * 0.3 + x * 0.1) * 0.03;
      } else if (t === FLAKE) {
        vy += (-0.15 - vy) * dt; vx *= 0.98;
      } else if (t === STEAM) {
        vy += (3 - vy) * dt * 0.5; vx += (1.5 - vx) * dt * 0.3; r += dt * 1.6;
      }
      x += vx * dt; y += vy * dt;
      if (life > 0) {
        this.t[w] = t; this.x[w] = x; this.y[w] = y; this.vx[w] = vx; this.vy[w] = vy; this.r[w] = r; this.life[w] = life; w++;
      }
    }
    this.n = w;
  }
}
