// Ocean, sky, stars, seabed, and the transition from the moonless surface to
// the abyss (fog colour and density with depth, ROV floodlights deep down).
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { waterNormals, sedimentTexture } from './textures.js';

export function buildEnvironment(scene, env, opts = {}) {
  const out = {};
  // sky dome: night gradient, warming to dawn after 04:30
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { dawn: { value: 0 }, under: { value: 0 } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vp; uniform float dawn; uniform float under;
      void main(){
        float h = clamp(vp.y, -1.0, 1.0);
        vec3 nightTop = vec3(0.004,0.008,0.02), nightHor = vec3(0.02,0.035,0.06);
        vec3 dawnTop = vec3(0.16,0.25,0.42), dawnHor = vec3(0.95,0.62,0.45);
        vec3 top = mix(nightTop, dawnTop, dawn), hor = mix(nightHor, dawnHor, dawn);
        vec3 c = mix(hor, top, pow(max(h,0.0), 0.45));
        if (h < 0.0) c = hor * 0.4;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(18000, 32, 16), skyMat);
  scene.add(sky);
  out.sky = sky; out.skyMat = skyMat;
  // stars: brightness by magnitude, a faint Milky Way band
  const N = 6000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  let s = 3;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < N; i++) {
    let x, y, z;
    do { x = r() * 2 - 1; y = r(); z = r() * 2 - 1; } while (x * x + y * y + z * z > 1 || y < 0.02);
    if (i < 2400) { // band
      const t = r() * Math.PI * 2; x = Math.cos(t); z = Math.sin(t) * 0.35 + (r() - 0.5) * 0.25; y = Math.abs(Math.sin(t)) * 0.75 + (r() - 0.5) * 0.18 + 0.05;
    }
    const l = Math.hypot(x, y, z);
    pos.set([x / l * 16000, Math.max(0.01, y / l) * 16000, z / l * 16000], i * 3);
    const m = Math.pow(r(), 5) * 0.75 + 0.1;
    col.set([m, m, m * (0.9 + r() * 0.2)], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 3, map: dot, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, depthWrite: false }));
  scene.add(stars); out.stars = stars;
  // the ocean (flat calm that night: "like a millpond")
  const water = new Water(new THREE.PlaneGeometry(36000, 36000), {
    textureWidth: opts.lowPower ? 512 : 1024, textureHeight: opts.lowPower ? 512 : 1024, waterNormals: waterNormals(),
    sunDirection: new THREE.Vector3(0.3, 0.6, -0.4).normalize(), sunColor: 0x000000, waterColor: 0x000a12,
    distortionScale: 0.35, fog: true, alpha: 1.0,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 14;
  // Water.js adds a constant grey (vec3(0.1)) to the reflection term: fine by
  // day, wrong on a moonless night. Remove it so the sea reads black.
  water.material.fragmentShader = water.material.fragmentShader.replace('vec3( 0.1 ) + reflectionSample * 0.9', 'vec3( 0.0 ) + reflectionSample * 0.8');
  water.material.needsUpdate = true;
  scene.add(water); out.water = water;
  // the surface seen from below
  const under = new THREE.Mesh(new THREE.PlaneGeometry(36000, 36000), new THREE.MeshBasicMaterial({ color: 0x0a2a3a, side: THREE.BackSide, transparent: true, opacity: 0.9, fog: true }));
  under.rotation.x = -Math.PI / 2; under.position.y = -0.05; scene.add(under); out.under = under;
  // seabed: abyssal plain, 3,800 m down, gently undulating sediment
  const sedi = sedimentTexture(); sedi.repeat.set(220, 220);
  const sb = new THREE.PlaneGeometry(9000, 9000, 260, 260);
  sb.rotateX(-Math.PI / 2);
  const p = sb.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, env.seabedY(x) + 1.2 * Math.sin(z / 37 + x / 53) + 0.4 * Math.sin(z / 9.1 - x / 13));
  }
  sb.computeVertexNormals();
  const seabed = new THREE.Mesh(sb, new THREE.MeshStandardMaterial({ map: sedi, color: 0x9a9080, roughness: 1 }));
  seabed.receiveShadow = true;
  scene.add(seabed); out.seabed = seabed;
  // lights: starlight, a dim sky hemisphere; ROV floodlight for the abyss
  const hemi = new THREE.HemisphereLight(0x29364a, 0x05080c, 0.35); scene.add(hemi); out.hemi = hemi;
  const moonless = new THREE.DirectionalLight(0x8ea3c4, 0.18); moonless.position.set(-300, 800, -500); scene.add(moonless); out.dir = moonless;
  const dawnSun = new THREE.DirectionalLight(0xffb27a, 0); dawnSun.position.set(3000, 400, -2000); scene.add(dawnSun); out.sun = dawnSun;
  scene.fog = new THREE.FogExp2(0x02060b, 0.00018);
  out.fog = scene.fog;
  return out;
}

// Called every frame with the camera's depth.
export function updateEnvironment(E, camera, renderer, dawn, rov) {
  const y = camera.position.y;
  const under = y < 0;
  const depth = Math.max(0, -y);
  E.skyMat.uniforms.dawn.value = dawn;
  E.stars.material.opacity = Math.max(0, 1 - dawn * 1.4);
  E.sky.visible = !under || depth < 40;
  E.stars.visible = !under;
  E.water.visible = !under;
  E.under.visible = under && depth < 250;
  E.sun.intensity = dawn * 1.4;
  E.dir.intensity = 0.18 + dawn * 0.4;
  E.hemi.intensity = 0.35 + dawn * 0.9;
  if (under) {
    // sunlight/starlight dies away within the first ~250 m; below that the
    // only light is the (virtual) submersible's floodlights
    const k = Math.exp(-depth / 60);
    const c = new THREE.Color(0.002 + 0.01 * k * (0.3 + dawn), 0.004 + 0.03 * k, 0.008 + 0.05 * k);
    E.fog.color.copy(c);
    E.fog.density = depth > 150 ? 0.0028 : 0.012 + 0.006 * (1 - k);
    renderer.setClearColor(c);
    E.hemi.intensity = depth > 150 ? 0.5 : 0.08 + 0.3 * k;
    E.hemi.color.setRGB(0.55, 0.7, 0.85); E.hemi.groundColor.setRGB(0.12, 0.1, 0.08);
    E.dir.intensity = 0.05 * k;
  } else {
    E.hemi.color.setHex(0x29364a); E.hemi.groundColor.setHex(0x05080c);
    E.fog.color.setRGB(0.012 + dawn * 0.4, 0.02 + dawn * 0.3, 0.035 + dawn * 0.3);
    E.fog.density = 0.00012;
    renderer.setClearColor(0x000000);
  }
  if (rov) {
    rov.visible = under && depth > 120;
    rov.intensity = rov.visible ? 6e4 : 0;
  }
}
