// Particle effects: funnel steam, distress rockets, spray, air bubbles
// (expanding as they rise, Boyle's law), seabed silt clouds, debris.
import * as THREE from 'three';
import { spriteTexture } from './textures.js';

const sprite = spriteTexture();

export class Particles {
  constructor(scene, cap, { additive = false, fog = true } = {}) {
    this.cap = cap; this.n = 0;
    this.pos = new Float32Array(cap * 3); this.vel = new Float32Array(cap * 3);
    this.size = new Float32Array(cap); this.alpha = new Float32Array(cap); this.col = new Float32Array(cap * 3);
    this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.kind = new Uint8Array(cap); this.grow = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3); this.aSize = new THREE.BufferAttribute(this.size, 1);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1); this.aCol = new THREE.BufferAttribute(this.col, 3);
    for (const a of [this.aPos, this.aSize, this.aAlpha, this.aCol]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('size', this.aSize); g.setAttribute('alpha', this.aAlpha); g.setAttribute('color', this.aCol);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: sprite }, scale: { value: 800 }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying float va; varying vec3 vc; varying float vd; uniform float scale;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(size * scale / -mv.z, 0.0, 400.0); va = alpha; vc = color; vd = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying float va; varying vec3 vc; varying float vd; uniform vec3 fogColor; uniform float fogDensity;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); float f = 1.0 - exp(-fogDensity*fogDensity*vd*vd); vec3 c = mix(vc, fogColor, ${fog ? 'f' : '0.0'}); gl_FragColor = vec4(c, t.a * va * (1.0 - ${fog ? 'f*0.7' : '0.0'})); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  add(kind, x, y, z, vx, vy, vz, size, life, r, g, b, grow = 0) {
    let i = this.n < this.cap ? this.n++ : (Math.random() * this.cap) | 0;
    this.kind[i] = kind; this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3);
    this.size[i] = size; this.life[i] = life; this.max[i] = life; this.col.set([r, g, b], i * 3); this.grow[i] = grow;
  }
  clear() { this.n = 0; }
  update(dt, camera, fog, heightPx) {
    const P = this.pos, V = this.vel;
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      let life = this.life[i] - dt;
      if (life <= 0) continue;
      const k = this.kind[i];
      let vx = V[i * 3], vy = V[i * 3 + 1], vz = V[i * 3 + 2];
      let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      if (k === 0) { vy += (2.5 - vy) * dt * 0.4; vx += (1.2 - vx) * dt * 0.2; }          // steam / smoke
      else if (k === 1) { vy -= 9.81 * dt; vx *= 1 - dt * 0.5; vz *= 1 - dt * 0.5; }      // rocket stars / spray
      else if (k === 2) {                                                                // bubble
        const vt = Math.min(1.8, 0.3 + this.size[i] * 1.5);
        vy += (vt - vy) * dt * 2; if (y > -0.2) life = 0;
        this.size[i] *= 1 + dt * vy * 0.1 / (10 + Math.max(0, -y)) * 3;
      } else if (k === 3) { vx *= 1 - dt * 0.15; vy *= 1 - dt * 0.4; vz *= 1 - dt * 0.15; vy -= 0.01 * dt; }   // silt
      else if (k === 4) { vy += (-0.8 - vy) * dt * 0.6; }                                 // sinking debris
      x += vx * dt; y += vy * dt; z += vz * dt;
      const t = life / this.max[i];
      this.size[i] += this.grow[i] * dt;
      const a = k === 1 ? t : k === 0 ? Math.min(1, (1 - t) * 6) * t * 0.55 : k === 3 ? Math.min(1, (1 - t) * 3) * t * 0.5 : k === 2 ? 0.7 : 0.9;
      // compact
      P[w * 3] = x; P[w * 3 + 1] = y; P[w * 3 + 2] = z;
      V[w * 3] = vx; V[w * 3 + 1] = vy; V[w * 3 + 2] = vz;
      this.size[w] = this.size[i]; this.life[w] = life; this.max[w] = this.max[i]; this.kind[w] = k; this.grow[w] = this.grow[i];
      this.col[w * 3] = this.col[i * 3]; this.col[w * 3 + 1] = this.col[i * 3 + 1]; this.col[w * 3 + 2] = this.col[i * 3 + 2];
      this.alpha[w] = a;
      w++;
    }
    this.n = w;
    this.points.geometry.setDrawRange(0, w);
    for (const at of [this.aPos, this.aSize, this.aAlpha, this.aCol]) at.needsUpdate = true;
    this.mat.uniforms.scale.value = heightPx / (2 * Math.tan(camera.fov * Math.PI / 360));
    if (fog) { this.mat.uniforms.fogColor.value.copy(fog.color); this.mat.uniforms.fogDensity.value = fog.density; }
  }
}
