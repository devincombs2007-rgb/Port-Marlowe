// Procedural Web Audio: ocean ambience, rushing water, groaning steel,
// fractures, implosions. No samples needed.
export class Sound {
  constructor() { this.enabled = true; this.ctx = null; }
  start() {
    if (this.ctx || !this.enabled) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.5; this.master.connect(c.destination);
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 1800; this.lp.connect(this.master);
    const noise = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const d = noise.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    this.noise = noise;
    const loop = (freq, q) => { const s = c.createBufferSource(); s.buffer = noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.lp); s.start(); return g; };
    this.amb = loop(380, 0.6);
    this.rush = loop(700, 0.9);
    this.rumble = loop(70, 1.2);
  }
  toggle() { this.enabled = !this.enabled; if (this.master) this.master.gain.value = this.enabled ? 0.5 : 0; if (this.enabled) this.start(); }
  update(world, renderer, state) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const under = renderer.cam.y < -2;
    this.lp.frequency.setTargetAtTime(under ? 320 : 2200, t, 0.3);
    this.amb.gain.setTargetAtTime(under ? 0.15 : 0.35 + 0.1 * Math.sin(t * 0.4), t, 0.5);
    const inflow = Math.max(0, world.flooding.stats.inflowTps || 0);
    this.rush.gain.setTargetAtTime(Math.min(0.6, Math.sqrt(inflow) * 0.06) * (state.paused ? 0 : 1), t, 0.4);
    this.rumble.gain.setTargetAtTime(Math.min(0.8, world.stats.maxRatio * 0.6), t, 0.4);
    if (!state.paused && Math.random() < world.stats.maxRatio * 0.01) this.groan(world.stats.maxRatio * 0.6);
  }
  burst(dur, f0, f1, vol, type = 'noise') {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); g.connect(this.lp);
    if (type === 'noise') {
      const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(t + dur);
    } else {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      o.connect(g); o.start(t); o.stop(t + dur);
    }
  }
  groan(v) { this.burst(1.6 + Math.random(), 50 + Math.random() * 40, 30 + Math.random() * 20, 0.25 * v, 'sawtooth'); }
  crack(v) { this.burst(2.5, 3000, 60, 0.9 * v); this.burst(3, 90, 25, 0.8 * v, 'sine'); }
  boom(v) { this.burst(1.2, 600, 40, 0.8 * v); this.burst(1.5, 70, 20, 0.9 * v, 'sine'); }
  glass() { for (let i = 0; i < 4; i++) this.burst(0.15 + Math.random() * 0.2, 6000, 2000, 0.12, 'noise'); }
  bell() { for (let i = 0; i < 3; i++) setTimeout(() => { this.burst(1.6, 1320, 1300, 0.35, 'sine'); this.burst(1.2, 2650, 2600, 0.1, 'sine'); }, i * 650); }
  rocket() { this.burst(2.5, 2500, 400, 0.2); setTimeout(() => this.burst(0.6, 900, 100, 0.5), 3000); }
  scrape() { this.burst(0.8, 1400, 300, 0.25); }
}
