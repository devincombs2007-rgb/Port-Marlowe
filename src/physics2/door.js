// A hinged door in a wall opening. Water and air pressure on both faces are
// integrated over the leaf to give a force and a torque about the hinge line.
// The latch, hinges and door stop resist with finite strengths; once free,
// the leaf swings with its own inertia (plus the water it drags), and the
// opening area it uncovers feeds straight back into the flow network.
import { v } from './params.js';

export class HingedDoor {
  constructor({ net, opening, mass = v('doors.cabin_door_mass'), latchStrength = v('doors.cabin_latch_strength'),
    hingeStrength = v('doors.cabin_hinge_strength'), frameStrength = v('doors.frame_stop_strength'),
    opensToward = 'b', leak = v('openings.door_leak_fraction'), hinges = 2 }) {
    Object.assign(this, { net, opening, mass, latchStrength, hingeStrength, frameStrength, opensToward, leak, hinges });
    this.w = opening.width; this.hgt = opening.height;
    this.theta = 0; this.omega = 0; this.latched = true; this.failed = false; this.events = [];
    this.F = 0; this.tau = 0; this.latchLoad = 0; this.hingeLoad = 0; this.stopLoad = 0;
    this.Iself = mass * this.w * this.w / 3;
    opening.areaScale = leak;
  }
  // net force (N, + toward side b) and torque about the hinge from the pressure field
  loads() {
    const o = this.opening, net = this.net;
    const n = o.ns, dh = this.hgt / n;
    let F = 0;
    for (let i = 0; i < n; i++) {
      const [x, z] = o.slicePos(i);
      F += (net.pAt(o.a, x, z) - net.pAt(o.b, x, z)) * this.w * dh;
    }
    // pressure is uniform across the width, so it acts at mid-width
    return { F, tau: F * this.w / 2 };
  }
  step(dt, t = 0) {
    const { F, tau } = this.loads();
    this.F = F; this.tau = tau;
    const dir = this.opensToward === 'b' ? 1 : -1;
    const tauOpen = tau * dir;                    // + tends to open the door
    const Fopen = F * dir;
    if (this.failed) { this.theta = Math.PI / 2; this.opening.areaScale = 1; return; }
    if (this.theta <= 1e-9 && this.omega <= 0) {
      this.theta = 0; this.omega = 0;
      if (tauOpen > 0) {
        // latch at the free edge carries tau / w; the hinges carry the rest
        this.latchLoad = this.latched ? tauOpen / this.w : 0;
        this.hingeLoad = (Fopen - this.latchLoad) / this.hinges;
        this.stopLoad = 0;
        if (this.hingeLoad > this.hingeStrength) { this.failed = true; this.events.push({ t, type: 'hinges', F }); this.opening.areaScale = 1; return; }
        if (this.latched && this.latchLoad > this.latchStrength) { this.latched = false; this.events.push({ t, type: 'latch', F, tau, load: this.latchLoad }); }
        if (this.latched) { this.opening.areaScale = this.leak; return; }
      } else {
        // pushed shut against the stop: the frame takes it
        this.stopLoad = -Fopen; this.latchLoad = 0; this.hingeLoad = 0;
        if (this.stopLoad > this.frameStrength) { this.failed = true; this.events.push({ t, type: 'frame', F }); this.opening.areaScale = 1; return; }
        this.opening.areaScale = this.leak; return;
      }
    }
    // swinging leaf: torque falls with the projected area; water adds inertia and damping
    const rho = this.net.rho;
    const wet = 1;
    const Iadd = 0.1 * rho * this.hgt * Math.pow(this.w, 4) * wet;
    const damp = 0.2 * rho * this.hgt * Math.pow(this.w, 4) * Math.abs(this.omega) * this.omega * wet;
    const alpha = (tauOpen * Math.cos(this.theta) - damp) / (this.Iself + Iadd);
    this.omega += alpha * dt;
    this.theta += this.omega * dt;
    if (this.theta >= Math.PI / 2) { this.theta = Math.PI / 2; this.omega = Math.min(0, this.omega); }
    if (this.theta <= 0) { this.theta = 0; this.omega = 0; }
    this.opening.areaScale = Math.max(this.leak, Math.sin(this.theta));
  }
}
