// Titanic: The Final Hours - a real-time 3D reconstruction.
// Everything runs on the ship's clock at 1x real time: 23:39 on 14 April 1912
// to 08:30 the next morning, then an epilogue on the wreck.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld } from './sim/setup.js';
import { Replay } from './replay/replay.js';
import * as H from './replay/history.js';
import { buildTitanic3D, makeLifeboat, makeFigure } from './three/titanic3d.js';
import { buildIceberg } from './three/iceberg3d.js';
import { buildEnvironment, updateEnvironment } from './three/environment3d.js';
import { Particles } from './three/fx3d.js';
import { Crowd } from './three/people3d.js';
import { CHAPTERS, chapterAt } from './three/story.js';
import { Sound } from './audio/sound.js';
import { X0, HB, deckZ, LOA, DESIGN_DRAUGHT } from './ship/titanic.js';

const $ = (id) => document.getElementById(id);
const smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (t) => { const s = Math.floor(t + 23 * 3600 + 40 * 60); return `${String(Math.floor(s / 3600) % 24).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const D2R = Math.PI / 180;

// ------------------------------------------------------------ simulation
const world = createWorld({ substeps: 2 });
const replay = new Replay(world);
const meta = world.ship.meta;
const BOW_IMPACT = replay.bowPath.impact, STERN_IMPACT = replay.sternPath.impact;

// ------------------------------------------------------------ renderer
const canvas = $('view');
const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 30000);
camera.position.set(400, 30, -300);
scene.add(camera);
const E = buildEnvironment(scene, world.env, { lowPower });
const rov = new THREE.SpotLight(0xdcecff, 0, 1500, 0.8, 0.6, 2.0);
rov.position.set(0, 0, 0); camera.add(rov); camera.add(rov.target); rov.target.position.set(0, 0, -1);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.8, 0.5, 0.78);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ------------------------------------------------------------ the ship
const model = buildTitanic3D(meta, replay.xBreak);
function sectionRig(content, cx) {
  const root = new THREE.Group(), yaw = new THREE.Group(), yawIn = new THREE.Group(), roll = new THREE.Group();
  yaw.position.set(cx, 0, 0); yawIn.position.set(-cx, 0, 0);
  roll.position.set(0, 10, 0); content.position.set(0, -10, 0);
  root.add(yaw); yaw.add(yawIn); yawIn.add(roll); roll.add(content);
  scene.add(root);
  return { root, yaw, roll, content };
}
const bowRig = sectionRig(model.bow, replay.bowC[0]);
const sternRig = sectionRig(model.stern, replay.sternC[0]);
model.funnels.forEach((f, i) => (i < 3 ? model.bow : model.stern).add(f));
model.bow.add(model.fore); model.stern.add(model.main); model.bow.add(model.antenna);

// lifeboats & davits
const boatY = (xb) => deckZ('BOAT', xb);
const davitGeo = (() => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.2, 0.1), new THREE.Vector3(0, 3.1, 0.9), new THREE.Vector3(0, 2.9, 1.9)]); return new THREE.TubeGeometry(c, 16, 0.11, 6); })();
const davitMat = new THREE.MeshStandardMaterial({ color: 0xe5e0d3, roughness: 0.6 });
const boats = H.BOATS.map((bt) => {
  const g = makeLifeboat(bt.id);
  scene.add(g);
  const side = bt.side === 's' ? -1 : 1;
  const L = g.userData.L;
  const content = X0 - bt.xb > replay.xBreak ? model.bow : model.stern;
  if (!bt.float && !'CD'.includes(bt.id)) {
    for (const dx of [-L * 0.42, L * 0.42]) {
      const d = new THREE.Mesh(davitGeo, davitMat);
      d.position.set(X0 - bt.xb + dx, boatY(bt.xb), side * (HB - 0.6));
      if (side < 0) d.rotation.y = Math.PI;
      content.add(d);
    }
  }
  return { bt, g, side, content, L };
});
const falls = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xd8d0bc }));
falls.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8 * 6), 3));
falls.frustumCulled = false; scene.add(falls);

// people: Captain Smith on the starboard bridge wing, Fleet & Lee in the
// crow's nest, Murdoch and Lightoller at the boats, the band by the entrance
const captain = makeFigure({ coat: 0x12162a, cap: 0xf4f4f0, beard: true });
captain.position.set(X0 - 60.2, boatY(60.2), -12.2); captain.rotation.y = 0; model.bow.add(captain);
const murdoch = makeFigure({ coat: 0x12162a, cap: 0x12162a });
murdoch.position.set(X0 - 80, boatY(80), -11.8); model.bow.add(murdoch);
const lightoller = makeFigure({ coat: 0x12162a, cap: 0x12162a });
lightoller.position.set(X0 - 76, boatY(76), 11.8); lightoller.rotation.y = Math.PI; model.bow.add(lightoller);
const lookouts = [makeFigure({ coat: 0x1a1a1a }), makeFigure({ coat: 0x25221e })];
lookouts[0].position.set(0.25, 0.05, -0.45); lookouts[1].position.set(-0.1, 0.05, 0.45);
for (const l of lookouts) { l.rotation.y = 0; model.nest.add(l); }
const band = [];
for (let i = 0; i < 8; i++) { const f = makeFigure({ coat: 0x0e1424, cap: 0x0e1424 }); f.position.set(X0 - 94 + (i % 4) * 0.9, boatY(94), -4 + Math.floor(i / 4) * 1.2); f.rotation.y = -Math.PI / 2; model.bow.add(f); band.push(f); }
const crowd = new Crowd(model.bow, model.stern, scene, replay.xBreak);

// iceberg, Carpathia
const berg = buildIceberg();
scene.add(berg);
const carpathia = (() => {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(164.6, 11, 19.5), new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.7 }));
  hull.position.y = 2; g.add(hull);
  for (const s of [-1, 1]) { const bow = new THREE.Mesh(new THREE.ConeGeometry(9.75, 14, 4, 1), hull.material); bow.rotation.z = s * -Math.PI / 2; bow.rotation.x = Math.PI / 4; bow.position.set(s * 89, 2, 0); bow.scale.set(1, 1, 0.8); g.add(bow); }
  const sup = new THREE.Mesh(new THREE.BoxGeometry(70, 7, 15), new THREE.MeshStandardMaterial({ color: 0xe1ddd2 })); sup.position.y = 11; g.add(sup);
  const fun = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 16, 20), new THREE.MeshStandardMaterial({ color: 0xc0462a })); fun.position.y = 22; g.add(fun);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.62, 2.62, 3.5, 20), new THREE.MeshStandardMaterial({ color: 0x111111 })); top.position.y = 28.5; g.add(top);
  for (const x of [-65, -38, 38, 65]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 32, 8), new THREE.MeshStandardMaterial({ color: 0x6b5a44 })); m.position.set(x, 23, 0); g.add(m); }
  const lights = new THREE.Mesh(new THREE.BoxGeometry(150, 0.6, 19.7), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); lights.position.y = 5; g.add(lights);
  g.userData.lights = lights;
  scene.add(g); return g;
})();
const CARP_Z = 520;

// seabed debris field: coal, fittings, plating, and five boilers from No. 1 boiler room
const debris = (() => {
  const g = new THREE.Group();
  const N = 1800;
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 }), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const xb = BOW_IMPACT.x, xs = STERN_IMPACT.x;
  for (let i = 0; i < N; i++) {
    const u = Math.random();
    const x = lerp(xs - 120, xb + 40, Math.pow(u, 0.8)) + (Math.random() - 0.5) * 120;
    const z = (Math.random() - 0.5) * 300 * (0.4 + Math.random());
    p.set(x, world.env.seabedY(x) + 0.2, z);
    e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); q.setFromEuler(e);
    const sz = Math.random() < 0.06 ? 3 + Math.random() * 4 : 0.3 + Math.random() * 1.2;
    s.set(sz, sz * (0.15 + Math.random() * 0.5), sz * (0.4 + Math.random()));
    m.compose(p, q, s); inst.setMatrixAt(i, m);
  }
  g.add(inst);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.6, 24), new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.9 }));
    const x = lerp(xs, xb, 0.32) + i * 9; b.rotation.z = Math.PI / 2; b.position.set(x, world.env.seabedY(x) + 2.2, -30 + i * 6); g.add(b);
  }
  g.visible = false; scene.add(g); return g;
})();

// particles
const smoke = new Particles(scene, 2500);
const glow = new Particles(scene, 2500, { additive: true, fog: false });
const sea = new Particles(scene, 6000);
const flash = new THREE.PointLight(0xfff4e0, 0, 900, 1.2); scene.add(flash);
const lanterns = (() => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(20 * 3), 3));
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(0.25, 'rgba(255,190,110,0.7)'); gr.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.1, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a0 }));
  p.frustumCulled = false; scene.add(p); return p;
})();

// rusticles for the epilogue
const rusticles = (() => {
  const geo = new THREE.ConeGeometry(0.12, 1, 5); geo.translate(0, -0.5, 0);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x8a3d18, roughness: 1 }), 2600);
  inst.count = 0; inst.frustumCulled = false; scene.add(inst); return inst;
})();

// ------------------------------------------------------------ timeline
const timeline = (() => {
  const ev = H.EVENTS.map(([t, text, fx]) => ({ t, text, fx }));
  for (const b of H.BOATS) if (!b.float) ev.push({ t: b.at, text: `Lifeboat ${b.id} reaches the water from the ${b.side === 's' ? 'starboard' : 'port'} side with about ${b.n} aboard${b.note ? `, ${b.note}` : ''}.` });
  H.ROCKETS.forEach((t, i) => ev.push({ t, text: i === 0 ? 'Fourth Officer Boxhall fires the first white distress rocket from the bridge.' : null, fx: 'rocket' }));
  ev.push({ t: BOW_IMPACT.t, text: `The bow section strikes the seabed at ${(BOW_IMPACT.v * 3.6).toFixed(0)} km/h, 3,800 m down, burying its stem about 18 m in the mud.`, fx: 'impact', at: 'bow' });
  ev.push({ t: STERN_IMPACT.t, text: `The stern section lands ${Math.round(Math.abs(BOW_IMPACT.x - STERN_IMPACT.x))} m from the bow at ${(STERN_IMPACT.v * 3.6).toFixed(0)} km/h and spins to face the other way. Its decks pancake together.`, fx: 'impact', at: 'stern' });
  for (let i = 0; i < 4; i++) ev.push({ t: H.T(2, 20, 25 + i * 9), fx: 'implode' });
  return ev.sort((a, b) => a.t - b.t);
})();

const state = { t: H.START, prev: H.START, paused: true, story: true, cam: 'cinema', started: false, epiT: 0, epi: false, lastShot: '', fade: 0, yawOff: 0, pitchOff: 0, speed: 1, lens: 0 };
const sound = new Sound();

// ------------------------------------------------------------ poses
function rollAt(t) {
  const k = [[H.T(23, 40), 0], [H.T(0, 0), -0.6], [H.T(0, 45), 0.2], [H.T(1, 20), 2.5], [H.T(1, 50), 4.8], [H.T(2, 10), 6], [H.T(2, 16), 3.5], [H.BREAK_DONE, 2]];
  return replay.keyed(k, t) * D2R;
}
function wp(pose, x, y, z = 0) {
  const c = Math.cos(pose.a), s = Math.sin(pose.a);
  return new THREE.Vector3(pose.ox + c * x - s * y, pose.oy + s * x + c * y, z);
}
let secPose = null;
function poseShip(t) {
  const sec = replay.sections(t);
  secPose = sec;
  const r = t < H.BREAK_DONE ? rollAt(t) : rollAt(H.BREAK_DONE) * (1 - smooth((t - H.BREAK_DONE) / 60));
  for (const [rig, pose, isStern] of [[bowRig, sec.bow, false], [sternRig, sec.stern, true]]) {
    rig.root.position.set(pose.ox, pose.oy, 0);
    rig.root.rotation.set(0, 0, pose.a);
    rig.roll.rotation.x = r;
    rig.yaw.rotation.y = isStern && t > H.STERN_GONE ? Math.PI * 0.92 * smooth((t - H.STERN_GONE) / (STERN_IMPACT.t - H.STERN_GONE)) : 0;
    rig.content.scale.y = pose.squash || 1;
  }
  // funnels: on the ship until their stays part, then fall and sink
  model.funnels.forEach((f, i) => {
    const owner = i < 3 ? model.bow : model.stern;
    const fp = replay.funnelPose(i, t, i < 3 ? sec.bow : sec.stern);
    if (fp.extra === 0 && !fp.sunk) {
      if (f.parent !== owner) owner.add(f);
      f.position.set(fp.base[0], fp.base[1], 0); f.rotation.set(0, 0, 0);
    } else {
      if (f.parent !== scene) scene.add(f);
      const b = wp(fp.pose, fp.base[0], fp.base[1]);
      f.position.set(b.x, b.y, i === 0 ? -6 * smooth((t - H.FUNNEL_FALLS[0]) / 4) : 0);
      f.rotation.set(i === 0 ? -0.35 * smooth((t - H.FUNNEL_FALLS[0]) / 4) : 0, 0, fp.pose.a + fp.extra);
    }
  });
  model.antenna.visible = t < H.BREAK_START + 20;
  return sec;
}

function placeBoats(t) {
  const fl = falls.geometry.attributes.position; let fi = 0;
  for (const B of boats) {
    const { bt, g, side } = B;
    let st = replay.boatState(bt, t);
    g.visible = true;
    if (bt.float && !st) {
      // collapsibles A and B lashed on the officers' quarters roof
      if (g.parent !== model.bow) model.bow.add(g);
      g.position.set(X0 - 66 + (side > 0 ? 2 : -2), deckZ('HOUSE', 66) + 0.5, side * 5);
      g.rotation.set(bt.flip ? 0 : 0, 0, 0);
      continue;
    }
    if (!st || st.mode === 'gone') { g.visible = false; continue; }
    if (st.mode === 'davit') {
      if (g.parent !== B.content) B.content.add(g);
      const swing = smooth((t - H.T(0, 20)) / 600);
      const collapsibleOnDeck = 'CD'.includes(bt.id);
      g.position.set(X0 - bt.xb, boatY(bt.xb) + (collapsibleOnDeck ? 0.6 : 1.6), side * (collapsibleOnDeck ? 9.5 : lerp(HB - 2.2, HB + 1.1, swing)));
      g.rotation.set(0, 0, 0);
      continue;
    }
    if (g.parent !== scene) scene.add(g);
    if (st.mode === 'lowering') {
      g.position.set(st.x, st.y, side * (HB + 1.1));
      g.rotation.set(0, 0, 0);
      // the falls from the davit heads
      const top = wp(secPose.bow, X0 - bt.xb, boatY(bt.xb) + 3.2);
      if (fi < 8) { for (const dx of [-B.L * 0.42, B.L * 0.42]) { fl.setXYZ(fi * 2, st.x + dx, top.y, side * (HB + 1.2)); fl.setXYZ(fi * 2 + 1, st.x + dx, st.y + 0.8, side * (HB + 1.1)); fi++; } }
      continue;
    }
    const tau = t - bt.at;
    let z = side * (HB + 2 + (bt.float ? 25 : 260) * (1 - Math.exp(-tau / 900)));
    const pi = H.PICKUP_ORDER.indexOf(bt.id);
    if (pi >= 0) { const tp = lerp(H.T(4, 10), H.T(8, 30), pi / (H.PICKUP_ORDER.length - 1)); z = lerp(z, CARP_Z - 26 + (pi % 4) * 4, smooth((t - (tp - 1500)) / 1500)); }
    g.position.set(st.x, st.y - 0.1, z);
    g.rotation.set(bt.flip ? Math.PI : Math.sin(t * 0.6 + bt.xb) * 0.03, (bt.xb % 7) * 0.2, st.a || 0);
  }
  const lp = lanterns.geometry.attributes.position;
  boats.forEach((B, i) => { const on = B.g.visible && B.g.parent === scene && !B.bt.float && t < H.T(5, 0) && !(state.cam === 'boat' && B === state.povBoat); if (on) lp.setXYZ(i, B.g.position.x + B.L * 0.4, B.g.position.y + 1.4, B.g.position.z); else lp.setXYZ(i, 0, -9999, 0); });
  lp.needsUpdate = true;
  for (let i = fi * 2; i < 16; i++) fl.setXYZ(i, 0, -9999, 0);
  fl.needsUpdate = true;
}

function placeIceberg(t) {
  const tau = t - H.T(23, 39, 40);
  berg.visible = tau < 900;
  if (!berg.visible) return;
  const x = replay.icebergX(t);
  const side = -(HB + berg.userData.width / 2 - 4);
  const z = tau < -29 ? -4 : tau < 0 ? lerp(-4, side, smooth((tau + 29) / 29)) : side - 30 * smooth(tau / 120);
  berg.position.set(x, 0, z);
  berg.rotation.y = 0.25 + tau * 0.0004;
}

// ------------------------------------------------------------ camera director
const shotLib = ['wideS', 'bowQ', 'sternQ', 'aerial', 'deck', 'waterline', 'portWide', 'funnels', 'orbit', 'crowsnest', 'bridge', 'boatPOV'];
function launchShot(t) {
  for (const b of H.BOATS) if (!b.float && t > b.at - 55 && t < b.at + 12) return b;
  return null;
}
function shotAt(t) {
  const sec = secPose;
  const C = wp(sec.bow, 135, 16);
  const nest = wp(sec.bow, model.nestLocal[0], model.nestLocal[1] + 1.65);
  if (t < -60) return { id: 'establish', pos: new THREE.Vector3(X0 + 150, 9, -125), look: new THREE.Vector3(X0 - 70, 16, 0), fov: 38 };
  if (t < -51) return { id: 'crow', pos: nest, look: nest.clone().add(new THREE.Vector3(160, -22, -6)), fov: 50, shake: 0.03 };
  if (t < -43) return { id: 'overbridge', pos: wp(sec.bow, X0 - 150, 62, 22), look: wp(sec.bow, X0 + 260, 4, -10), fov: 42 };
  if (t < -29) { const p = wp(sec.bow, X0 - 59.0, boatY(59) + 1.7, -11.4); return { id: 'bridge', pos: p, look: p.clone().add(new THREE.Vector3(140, -12, -4)), fov: 50 }; }
  if (t < -18) return { id: 'converge', pos: new THREE.Vector3(X0 + 60, 7, -170), look: new THREE.Vector3(X0 - 30, 9, -30), fov: 40 };
  if (t < 14) { const ix = replay.icebergX(t) - 40; return { id: 'scrape', pos: new THREE.Vector3(ix + 70, 34, -135), look: new THREE.Vector3(ix - 25, 6, -16), fov: 42 }; }
  if (t < 70) return { id: 'recede', pos: new THREE.Vector3(-170, 45, -260), look: new THREE.Vector3(-60, 8, -60), fov: 45 };
  const BI = BOW_IMPACT.t, SI = STERN_IMPACT.t;
  if (t >= H.T(2, 10) && t < H.STERN_GONE + 30) {
    if (t < H.T(2, 14)) return { id: 'plungeA', pos: C.clone().add(new THREE.Vector3(-150, 40, -250)), look: C, fov: 46 };
    return { id: 'plunge', pos: new THREE.Vector3(-30, 4, -300), look: new THREE.Vector3(-30, 30, 0), fov: 44 };
  }
  if (t >= H.STERN_GONE + 30 && t < BI + 30) {
    const c = wp(sec.bow, replay.bowC[0], replay.bowC[1]);
    const a = (t - H.STERN_GONE) * 0.012;
    return { id: 'bowDescent', pos: c.clone().add(new THREE.Vector3(-90 * Math.cos(a) - 40, t < BI ? -25 : 25, -150 + 30 * Math.sin(a))), look: c, fov: 45, follow: true };
  }
  if (t >= BI + 30 && t < SI + 30) {
    const c = wp(sec.stern, replay.sternC[0], replay.sternC[1]);
    return { id: 'sternDescent', pos: c.clone().add(new THREE.Vector3(70, t < SI ? -35 : 30, -140)), look: c, fov: 45, follow: true };
  }
  if (t >= SI + 30 && t < H.T(2, 40)) {
    // the wreck site, lit as if by a survey submersible
    const k = Math.floor((t - SI - 30) / 45) % 3, u = ((t - SI - 30) % 45) / 45;
    if (k === 0) { const y = world.env.seabedY(BOW_IMPACT.x); const a = -0.6 + u * 0.9; return { id: 'sbBow' + Math.floor(t / 45), pos: new THREE.Vector3(BOW_IMPACT.x - 30 + Math.cos(a) * 150, y + 40, Math.sin(a) * 150 - 40), look: new THREE.Vector3(BOW_IMPACT.x - 40, y + 8, 0), fov: 50 }; }
    if (k === 1) { const y = world.env.seabedY(STERN_IMPACT.x); const a = 0.4 + u * 0.8; return { id: 'sbStern' + Math.floor(t / 45), pos: new THREE.Vector3(STERN_IMPACT.x + Math.cos(a) * 120, y + 35, -Math.sin(a) * 120), look: new THREE.Vector3(STERN_IMPACT.x, y + 8, 0), fov: 50 }; }
    const mid = lerp(STERN_IMPACT.x, BOW_IMPACT.x, 0.25 + 0.5 * u), y = world.env.seabedY(mid);
    return { id: 'sbDebris' + Math.floor(t / 45), pos: new THREE.Vector3(mid, y + 14, -70), look: new THREE.Vector3(mid + 40, y + 2, 0), fov: 55 };
  }
  if (t >= H.T(2, 40) && t < H.T(3, 25)) {
    const k = Math.floor((t - H.T(2, 40)) / 60) % 3;
    if (k === 0) { const y = world.env.seabedY(BOW_IMPACT.x); const u = ((t - H.T(2, 40)) % 60) / 60; return { id: 'wreckBow' + Math.floor(t / 60), pos: new THREE.Vector3(BOW_IMPACT.x - 120 + 200 * u, y + 28, -55), look: new THREE.Vector3(BOW_IMPACT.x - 60 + 200 * u, y + 10, 0), fov: 50 }; }
    if (k === 1) {
      const afloat = boats.filter(B => B.g.visible && B.g.parent === scene && B.side < 0);
      const c = new THREE.Vector3(); afloat.forEach(B => c.add(B.g.position)); if (afloat.length) c.multiplyScalar(1 / afloat.length);
      return { id: 'silence' + Math.floor(t / 60), pos: c.clone().add(new THREE.Vector3(-45, 4, -40)), look: c.clone().add(new THREE.Vector3(10, 1, 0)), fov: 50 };
    }
    const y = world.env.seabedY(STERN_IMPACT.x); return { id: 'wreckStern' + Math.floor(t / 60), pos: new THREE.Vector3(STERN_IMPACT.x + 80, y + 35, -90), look: new THREE.Vector3(STERN_IMPACT.x, y + 10, 0), fov: 50 };
  }
  if (t >= H.T(3, 25)) {
    const cx = replay.carpathiaX(t);
    const k = Math.floor(t / 75) % 2;
    if (k) return { id: 'carpA' + Math.floor(t / 75), pos: new THREE.Vector3(cx - 260, 4, CARP_Z - 180), look: new THREE.Vector3(cx, 8, CARP_Z), fov: 40 };
    return { id: 'carpB' + Math.floor(t / 75), pos: new THREE.Vector3(cx + 200, 40, CARP_Z - 260), look: new THREE.Vector3(cx - 60, 2, CARP_Z - 40), fov: 45 };
  }
  // event shots
  for (const tr of H.ROCKETS) if (t > tr - 1 && t < tr + 9) return { id: 'rocket' + tr, pos: wp(sec.bow, X0 - 40, 12, -330), look: wp(sec.bow, X0 - 60, 92, -14), fov: 56 };
  const lb = launchShot(t);
  if (lb) {
    const side = lb.side === 's' ? -1 : 1;
    const p = wp(sec.bow, X0 - lb.xb + 26, 16, side * 48);
    const B = boats.find(q => q.bt === lb);
    const target = B && B.g.parent === scene ? B.g.position.clone() : wp(sec.bow, X0 - lb.xb, 20, side * (HB + 1));
    return { id: 'launch' + lb.id, pos: p, look: target, fov: 42, follow: true };
  }
  // the long middle: a rotating library of shots
  const idx = Math.floor((t - 70) / 52);
  let kind = shotLib[(idx * 7 + 3) % shotLib.length];
  if (kind === 'crowsnest' && t > H.T(1, 45)) kind = 'sternQ';
  if (kind === 'bridge' && t > H.T(2, 5)) kind = 'aerial';
  if (kind === 'boatPOV' && t < H.T(0, 42)) kind = 'wideS';
  const u = ((t - 70) % 52) / 52;
  const id = kind + idx;
  switch (kind) {
    case 'wideS': return { id, pos: C.clone().add(new THREE.Vector3(-60 + 60 * u, 26, -390)), look: C, fov: 40 };
    case 'bowQ': return { id, pos: wp(sec.bow, X0 + 60, 8, -95), look: wp(sec.bow, X0 - 60, 18), fov: 42 };
    case 'sternQ': return { id, pos: wp(sec.bow, -80, 14, -105), look: wp(sec.bow, 60, 20), fov: 42 };
    case 'aerial': return { id, pos: C.clone().add(new THREE.Vector3(-150 + 80 * u, 240, -230)), look: C, fov: 40 };
    case 'deck': { const p = wp(sec.bow, X0 - 205 + 70 * u, boatY(150) + 1.7, -10.5); return { id, pos: p, look: wp(sec.bow, X0 - 100 + 70 * u, boatY(100) + 1.2, -9), fov: 55 }; }
    case 'waterline': return { id, pos: wp(sec.bow, X0 - 10 - 40 * u, 1.2, -42), look: wp(sec.bow, 80, 7, -12), fov: 45 };
    case 'portWide': return { id, pos: C.clone().add(new THREE.Vector3(40 - 60 * u, 30, 380)), look: C, fov: 40 };
    case 'funnels': return { id, pos: wp(sec.bow, X0 - 30, 64, -48), look: wp(sec.bow, X0 - 160, 38), fov: 50 };
    case 'orbit': { const a = u * 1.2 + idx; return { id, pos: C.clone().add(new THREE.Vector3(Math.cos(a) * 420, 60, Math.sin(a) * 420)), look: C, fov: 40 }; }
    case 'crowsnest': return { id, pos: nest, look: nest.clone().add(new THREE.Vector3(80, -30, -10)), fov: 55, shake: 0.02 };
    case 'bridge': { const p = wp(sec.bow, X0 - 59.0, boatY(59) + 1.7, -11.4); return { id, pos: p, look: p.clone().add(new THREE.Vector3(-60, -4, -30)), fov: 55 }; }
    case 'boatPOV': { const b = boats.find(B => B.bt.side === 's' && !B.bt.float && t > B.bt.at + 60); const p = b ? b.g.position.clone().add(new THREE.Vector3(0, 1.6, 0)) : C.clone().add(new THREE.Vector3(0, 3, -300)); return { id, pos: p, look: C, fov: 42 }; }
  }
  return { id: 'wideS', pos: C.clone().add(new THREE.Vector3(0, 26, -390)), look: C, fov: 40 };
}

// manual camera modes
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true; orbit.maxDistance = 2500; orbit.enabled = false;
const look = new THREE.Vector3();
function applyCamera(dt) {
  const t = state.t;
  const mode = state.cam;
  orbit.enabled = mode === 'free';
  if (mode === 'free') {
    // keep orbiting whatever is the focus of the moment
    const sec = secPose;
    let focus = wp(sec.bow, 135, 15);
    if (t > H.STERN_GONE + 20 && t < BOW_IMPACT.t + 60) focus = wp(sec.bow, replay.bowC[0], replay.bowC[1]);
    else if (t > BOW_IMPACT.t + 60) focus = new THREE.Vector3((BOW_IMPACT.x + STERN_IMPACT.x) / 2, world.env.seabedY(BOW_IMPACT.x) + 10, 0);
    if (!state.freeInit || focus.distanceTo(orbit.target) > 400) { orbit.target.copy(focus); camera.position.copy(focus).add(new THREE.Vector3(-150, 60, -320)); state.freeInit = true; }
    else { const d = focus.clone().sub(orbit.target).multiplyScalar(Math.min(1, dt * 2)); orbit.target.add(d); camera.position.add(d); }
    camera.fov = 45; camera.updateProjectionMatrix();
    orbit.update();
    return;
  }
  let s;
  const sec = secPose;
  if (mode === 'cinema') s = shotAt(t);
  else if (mode === 'crow') { const p = wp(sec.bow, model.nestLocal[0], model.nestLocal[1] + 1.65); s = { id: 'crow', pos: p, look: p.clone().add(new THREE.Vector3(100, -14, 0)), fov: 60, shake: 0.03, pov: true }; }
  else if (mode === 'bridge') { const p = wp(sec.bow, X0 - 59.0, boatY(59) + 1.7, -11.4); s = { id: 'bridge', pos: p, look: p.clone().add(new THREE.Vector3(100, -5, 0)), fov: 60, pov: true }; }
  else if (mode === 'boat') {
    const b = boats.filter(B => !B.bt.float && t > B.bt.at + 240 && B.g.visible && B.g.parent === scene).pop();
    state.povBoat = b;
    const C = wp(sec.bow, 135, 15);
    s = b ? { id: 'boat' + b.bt.id, pos: b.g.position.clone().add(new THREE.Vector3(0, 1.6, 0)), look: C.clone(), fov: 50, pov: true }
      : { id: 'boatwait', pos: wp(sec.bow, X0 - 87.5, boatY(87.5) + 3, -16), look: wp(sec.bow, X0 - 87.5, 0, -40), fov: 55, pov: true };
  }
  // surface shots stay above the water (trim and swell would dip them under)
  if (!s.follow && t < H.STERN_GONE + 30 && s.pos.y < 1.6) s.pos.y = 1.6;
  if (s.pov) {
    // drag to look around
    const dir = s.look.clone().sub(s.pos).normalize();
    const yaw = Math.atan2(dir.z, dir.x) + state.yawOff, pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y))) + state.pitchOff;
    s.look = s.pos.clone().add(new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch)).multiplyScalar(100));
  }
  if (s.id !== state.lastShot) {
    if (mode === 'cinema' && state.lastShot && !s.follow) state.fade = 1;
    state.lastShot = s.id;
    camera.position.copy(s.pos); look.copy(s.look);
  } else {
    const k = s.follow ? Math.min(1, dt * 3) : 1;
    camera.position.lerp(s.pos, k); look.lerp(s.look, k);
  }
  if (s.shake) { camera.position.x += Math.sin(t * 1.7) * s.shake; camera.position.y += Math.sin(t * 2.3) * s.shake; }
  camera.lookAt(look);
  // keep the same horizontal framing on portrait screens (phones)
  let fov = state.lens ? 2 * Math.atan(12 / state.lens) / D2R : s.fov;   // focal length on a 36x24 mm frame
  if (camera.aspect < 16 / 9 && !s.pov) fov = Math.min(105, 2 * Math.atan(Math.tan(s.fov * D2R / 2) * (16 / 9) / camera.aspect * (camera.aspect < 1 ? 0.62 : 1)) / D2R);
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// ------------------------------------------------------------ effects
function spawnEffects(t, dt) {
  const sec = secPose;
  // smoke under way; roaring steam from 23:45 to about 00:35
  const steaming = t > H.STEAM[0] && t < H.STEAM[1];
  if (t < H.T(23, 41) || steaming) {
    model.funnels.forEach((f, i) => {
      if (i === 3 || f.parent === scene) return;
      const top = f.userData.top;
      const p = wp(sec.bow, top[0], top[1] + 0.5);
      const n = steaming ? 3 : 1;
      for (let k = 0; k < n; k++) {
        if (Math.random() > (steaming ? 0.9 : 0.5)) continue;
        const v = steaming ? 7 : 2;
        const shade = steaming ? 0.85 : 0.35;
        smoke.add(0, p.x + (Math.random() - 0.5) * 3, p.y, (Math.random() - 0.5) * 3, steaming ? 1 : -replay.shipSpeed(t) * 0.6, v + Math.random() * 3, (Math.random() - 0.5), steaming ? 3 : 4, steaming ? 9 : 14, shade, shade, shade * 1.02, steaming ? 2.6 : 1.5);
      }
    });
  }
  // bow wave and wake while under way
  const v = replay.shipSpeed(t);
  if (v > 0.5 && t < H.T(23, 45)) {
    for (let k = 0; k < 3; k++) {
      const s = Math.random() < 0.5 ? -1 : 1;
      sea.add(1, X0 - 1 - Math.random() * 8, 0.3, s * (1 + Math.random() * 3), -v * 0.9, 1.5 + Math.random() * 2, s * (2 + Math.random() * 3), 0.6, 1.4, 0.9, 0.95, 1);
    }
  }
  // air escaping, debris from the break
  if (t > H.T(1, 30) && t < H.T(2, 26)) {
    const n = t > H.BREAK_START ? 14 : 3;
    for (let k = 0; k < n; k++) {
      const isB = Math.random() < 0.5;
      const pose = isB ? sec.bow : sec.stern;
      const x = isB ? lerp(replay.xBreak, X0, Math.random()) : lerp(2, replay.xBreak, Math.random());
      const p = wp(pose, x, 20 + Math.random() * 8, (Math.random() - 0.5) * 24);
      if (p.y > 0 || p.y < -500) continue;
      sea.add(2, p.x, p.y, p.z, 0, 0.5, 0, 0.25 + Math.random() * 0.5, 30, 0.75, 0.88, 0.95);
    }
  }
  if (t > H.BREAK_START && t < H.T(2, 24)) {
    const p = wp(sec.bow, replay.xBreak, 6);
    for (let k = 0; k < 3; k++) sea.add(4, p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 26, (Math.random() - 0.5), -2, (Math.random() - 0.5), 0.4 + Math.random() * 0.8, 300, 0.12, 0.1, 0.09);
  }
  // rocket bursts
  for (const tr of H.ROCKETS) {
    const age = t - tr;
    if (age > 0 && age < 3.2) {
      const p = wp(replay.intact(tr), X0 - 60, 31 + 175 * (1 - (1 - age / 3.2) ** 2), -14);
      glow.add(1, p.x, p.y, p.z, 0, -2, 0, 2.2, 1.2, 1, 0.85, 0.6);
    }
    if (state.prev < tr + 3.2 && t >= tr + 3.2) {
      const p = wp(replay.intact(tr), X0 - 60, 206, -14);
      for (let k = 0; k < 90; k++) { const a = Math.random() * 6.28, b = Math.acos(Math.random() * 2 - 1), sp = 14 + Math.random() * 10; glow.add(1, p.x, p.y, p.z, Math.sin(b) * Math.cos(a) * sp, Math.cos(b) * sp, Math.sin(b) * Math.sin(a) * sp, 3.2, 3.5 + Math.random() * 2, 1, 0.97, 0.88); }
      flash.position.copy(p); flash.userData.until = t + 2.5;
    }
  }
  flash.intensity = flash.userData.until && t < flash.userData.until ? 4e6 * (flash.userData.until - t) / 2.5 : 0;
  // splash when the stern goes under, and when funnel 1 falls
  if (state.prev < H.STERN_GONE && t >= H.STERN_GONE) for (let k = 0; k < 500; k++) sea.add(1, -10 + (Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 8, 3 + Math.random() * 10, (Math.random() - 0.5) * 8, 1.4, 2.8, 0.92, 0.95, 1);
  const f1 = H.FUNNEL_FALLS[0] + 4.5;
  if (state.prev < f1 && t >= f1) { const p = model.funnels[0].position; for (let k = 0; k < 300; k++) sea.add(1, p.x + (Math.random() - 0.5) * 20, 0.5, p.z + (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, 4 + Math.random() * 9, (Math.random() - 0.5) * 6, 1.2, 2.4, 0.92, 0.95, 1); }
}
function impactPlume(which) {
  const I = which === 'bow' ? BOW_IMPACT : STERN_IMPACT;
  for (let k = 0; k < 1500; k++) {
    const x = I.x + (Math.random() - 0.5) * 200, z = (Math.random() - 0.5) * 120;
    sea.add(3, x, world.env.seabedY(x) + Math.random() * 6, z, (Math.random() - 0.5) * 10, Math.random() * 5, (Math.random() - 0.5) * 10, 6 + Math.random() * 8, 120 + Math.random() * 120, 0.42, 0.38, 0.32, 0.9);
  }
}

// ------------------------------------------------------------ story & UI
function fireEvents(t0, t1) {
  for (const e of timeline) {
    if (e.t <= t0 || e.t > t1) continue;
    if (e.text) subtitle(e);
    const fx = e.fx;
    if (fx === 'bell') sound.bell();
    if (fx === 'scrape') { sound.scrape(); setTimeout(() => sound.scrape(), 1300); setTimeout(() => sound.scrape(), 2600); }
    if (fx === 'crack') sound.crack(0.9);
    if (fx === 'rocket') sound.rocket();
    if (fx === 'boom') sound.boom(0.8);
    if (fx === 'implode') sound.boom(0.6);
    if (fx === 'impact') { impactPlume(e.at); sound.boom(1); }
  }
  for (const c of CHAPTERS) if (c.t > t0 && c.t <= t1 && state.story) titleCard(c);
}
let subTimer = 0;
function subtitle(e) {
  const el = $('sub');
  el.innerHTML = `<span class="t">${fmt(e.t)}</span>${e.text}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  const li = document.createElement('li'); li.innerHTML = `<span class="t">${fmt(e.t)}</span>${e.text}`;
  $('log').prepend(li); while ($('log').children.length > 40) $('log').lastChild.remove();
}
function titleCard(c) {
  const el = $('card');
  el.innerHTML = `<div class="num">Chapter ${CHAPTERS.indexOf(c) + 1} · ${fmt(c.t).slice(0, 5)}</div><div class="ttl">${c.title}</div><div class="sb">${c.sub}</div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function seek(t) {
  state.t = Math.max(H.START, Math.min(H.END, t)); state.prev = state.t;
  state.epi = false; state.epiT = 0; setRust(0);
  smoke.clear(); glow.clear(); sea.clear();
  $('log').innerHTML = '';
  $('card').classList.remove('show'); $('sub').classList.remove('show');
  for (const e of timeline) if (e.t <= state.t && e.text) { const li = document.createElement('li'); li.innerHTML = `<span class="t">${fmt(e.t)}</span>${e.text}`; $('log').prepend(li); }
  if (state.t > STERN_IMPACT.t + 30) { impactPlume('bow'); impactPlume('stern'); }
  state.lastShot = '';
  const c = CHAPTERS[chapterAt(state.t)];
  if (state.story && Math.abs(c.t - state.t) < 5) titleCard(c);
}
function setRust(y) {
  const k = Math.min(1, y / 114);
  const col = new THREE.Color(1, 1, 1).lerp(new THREE.Color(0.78, 0.42, 0.24), k);
  for (const m of [model.materials.whiteMat]) m.color.setRGB(0.91, 0.89, 0.85).lerp(new THREE.Color(0.55, 0.3, 0.17), k);
  for (const m of model.emissiveMats) if (m.color) m.color.copy(col);
  // rusticles hanging from the wreck
  const n = Math.floor(2600 * k);
  rusticles.count = n;
  if (n > 0) {
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const bow = i % 3 !== 0;
      const pose = bow ? replay.bowPose(H.END) : replay.sternPose(H.END);
      const x = bow ? lerp(replay.xBreak, X0 - 3, (i * 0.618) % 1) : lerp(3, replay.xBreak, (i * 0.618) % 1);
      const y = 8 + ((i * 0.37) % 1) * 14;
      const w = wp(pose, x, y, (i % 2 ? 1 : -1) * (HB + 0.1));
      p.copy(w); q.identity(); const len = (0.3 + ((i * 0.7311) % 1) * 2.2) * k; s.set(1, len, 1);
      mtx.compose(p, q, s); rusticles.setMatrixAt(i, mtx);
    }
    rusticles.instanceMatrix.needsUpdate = true;
  }
}
let epiIdx = 0;
function epilogue(dt) {
  state.epiT += dt;
  const years = Math.min(114.6, state.epiT * 114 / 100);
  setRust(years);
  while (epiIdx < H.EPILOGUE.length && 1912.3 + years >= H.EPILOGUE[epiIdx][0]) { const [y, text] = H.EPILOGUE[epiIdx++]; subtitle({ t: H.END, text: `<b>${Math.floor(y)}</b> — ${text}` }); }
  $('clock').textContent = `${Math.floor(1912 + years)}`;
  $('elapsed').textContent = `${Math.floor(years)} years on the seabed (time-lapse)`;
  const y = world.env.seabedY(BOW_IMPACT.x);
  if (state.cam === 'cinema') { const a = state.epiT * 0.03; camera.position.set(BOW_IMPACT.x - 20 + Math.cos(a) * 160, y + 45, Math.sin(a) * 160); camera.lookAt(BOW_IMPACT.x - 40, y + 10, 0); }
}

// ------------------------------------------------------------ HUD
let hudT = 0;
function hud(t) {
  if (performance.now() - hudT < 200) return; hudT = performance.now();
  if (!state.epi) {
    $('clock').textContent = `${t < 1200 ? 'Sun 14' : 'Mon 15'} Apr 1912 · ${fmt(t)}`;
    const since = t - H.T(23, 39, 40);
    $('elapsed').textContent = since < 0 ? `Collision in ${Math.ceil(-since)} s` : `${Math.floor(since / 3600)} h ${String(Math.floor(since / 60) % 60).padStart(2, '0')} m ${String(Math.floor(since) % 60).padStart(2, '0')} s after the collision`;
  }
  const ci = chapterAt(t);
  $('chapter').textContent = `${ci + 1}. ${CHAPTERS[ci].title}`;
  const sec = secPose;
  const trim = -sec.bow.a / D2R;
  const minY = (rig) => { const b = new THREE.Box3().setFromObject(rig.content); return b.min.y; };
  const bowD = Math.max(0, -minY(bowRig)), sternD = Math.max(0, -minY(sternRig));
  const boatsAway = H.BOATS.filter(b => b.at <= t).length;
  const people = H.BOATS.filter(b => b.at <= t).reduce((s, b) => s + b.n, 0);
  const rows = [
    ['Speed', t < H.T(23, 45) ? `${(replay.shipSpeed(t) / 0.514444).toFixed(1)} kn` : t > H.BREAK_DONE && t < STERN_IMPACT.t ? 'sinking' : 'stopped'],
    ['Trim, bow down', t < H.BREAK_DONE ? `${trim.toFixed(1)}°` : 'broken in two'],
    ['List', t < H.BREAK_DONE ? `${Math.abs(rollAt(t) / D2R).toFixed(1)}° ${rollAt(t) > 0 ? 'port' : 'starboard'}` : '—'],
    ['Bow depth', `${bowD.toFixed(0)} m`], ['Stern depth', `${sternD.toFixed(0)} m`],
    ['Lifeboats away', `${boatsAway} / 20`], ['In the boats', `≈ ${people}`], ['Rockets fired', `${H.ROCKETS.filter(x => x <= t).length} / 8`],
  ];
  $('stats').innerHTML = rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
  if (document.activeElement !== $('scrub')) $('scrub').value = String(Math.round(t));
}

// ------------------------------------------------------------ loop
let last = performance.now();
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!state.paused && state.started) {
    if (state.t < H.END) {
      state.t = Math.min(H.END, state.t + dt * state.speed);   // 1x real time by default
      fireEvents(state.prev, state.t);
      state.prev = state.t;
      if (state.t >= H.END && state.story) titleCard(CHAPTERS[CHAPTERS.length - 1]);
    } else { state.epi = true; }
  }
  const t = state.t;
  poseShip(state.epi ? H.END : t);
  placeBoats(state.epi ? H.END : t);
  placeIceberg(t);
  crowd.update(state.epi ? H.END : t, secPose, (pose, x, y) => { const c = Math.cos(pose.a), s = Math.sin(pose.a); return [pose.ox + c * x - s * y, pose.oy + s * x + c * y]; });
  // the people aboard
  captain.visible = t < H.T(2, 14); murdoch.visible = lightoller.visible = t < H.T(2, 15);
  for (const l of lookouts) l.visible = t < H.T(0, 25);
  for (const b of band) b.visible = t > H.T(0, 15) && t < H.T(2, 12);
  // Carpathia
  carpathia.visible = t > H.T(3, 20);
  carpathia.position.set(replay.carpathiaX(t), 0, CARP_Z);
  carpathia.userData.lights.visible = t < H.T(5, 30);
  debris.visible = t > STERN_IMPACT.t;
  // lights: on until 02:17:30, flickering from 02:15
  const flick = t > H.T(2, 15) && t < H.LIGHTS_OUT ? (Math.random() < 0.15 ? 0.15 : 1) : 1;
  const on = t < H.LIGHTS_OUT ? flick : 0;
  for (const m of model.emissiveMats) if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 1.0 * on;
  for (const l of model.lamps) l.intensity = 60 * on;
  for (const nl of model.navLights) nl.visible = on > 0.5;
  const dawn = smooth((t - H.T(4, 30)) / 4500);
  if (!state.paused && state.started) spawnEffects(t, dt);
  if (state.epi && !state.paused) epilogue(dt);
  else applyCamera(dt);
  updateEnvironment(E, camera, renderer, state.epi ? 0 : dawn, rov);
  if (rov.visible) { const d = Math.max(25, camera.position.distanceTo(look)); rov.intensity = Math.min(1.5e5, 0.9 * d * d); }
  E.water.material.uniforms.time.value += dt * 0.4;
  smoke.update(dt, camera, scene.fog, canvas.clientHeight * renderer.getPixelRatio());
  glow.update(dt, camera, null, canvas.clientHeight * renderer.getPixelRatio());
  sea.update(dt, camera, scene.fog, canvas.clientHeight * renderer.getPixelRatio());
  bloom.strength = camera.position.y < -50 ? 0.25 : 0.8;
  if (state.fade > 0) { $('fade').style.opacity = String(Math.min(1, state.fade)); state.fade -= dt * 3.2; } else $('fade').style.opacity = '0';
  sound.ambient && sound.ambient({ under: camera.position.y < 0, steam: t > H.STEAM[0] && t < H.STEAM[1] && camera.position.y > 0, paused: state.paused || !state.started });
  composer.render();
  hud(t);
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ controls
function setCam(m) {
  state.cam = m; state.lastShot = ''; state.yawOff = 0; state.pitchOff = 0; state.freeInit = false;
  document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === m));
}
document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => setCam(b.dataset.cam)));
$('play').addEventListener('click', () => { state.paused = !state.paused; $('play').textContent = state.paused ? 'Play' : 'Pause'; sound.start(); });
$('scrub').min = String(H.START); $('scrub').max = String(H.END);
$('scrub').addEventListener('input', (e) => seek(Number(e.target.value)));
$('nextch').addEventListener('click', () => { const i = chapterAt(state.t); if (i + 1 < CHAPTERS.length) { seek(CHAPTERS[i + 1].t); if (state.story) titleCard(CHAPTERS[i + 1]); } });
$('prevch').addEventListener('click', () => { let i = chapterAt(state.t); if (state.t - CHAPTERS[i].t < 5 && i > 0) i--; seek(CHAPTERS[i].t); if (state.story) titleCard(CHAPTERS[i]); });
$('storyBtn').addEventListener('click', () => { state.story = !state.story; $('storyBtn').classList.toggle('on', state.story); document.body.classList.toggle('story', state.story); if (state.story) setCam('cinema'); });
$('facts').addEventListener('click', () => document.body.classList.toggle('showfacts'));
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { state.speed = Number(b.dataset.speed); document.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', x === b)); }));
document.querySelectorAll('[data-lens]').forEach(b => b.addEventListener('click', () => { state.lens = Number(b.dataset.lens); document.querySelectorAll('[data-lens]').forEach(x => x.classList.toggle('on', x === b)); }));
const toggleUI = () => document.body.classList.toggle('clean');
$('hideui').addEventListener('click', toggleUI);
$('sound').addEventListener('click', () => { sound.toggle(); $('sound').classList.toggle('on', sound.enabled); });
function begin(story) {
  state.story = story; state.started = true; state.paused = false;
  document.body.classList.remove('intro'); document.body.classList.toggle('story', story);
  $('storyBtn').classList.toggle('on', story); $('play').textContent = 'Pause';
  setCam(story ? 'cinema' : 'free');
  sound.start();
  seek(H.START);
  if (story) titleCard(CHAPTERS[0]);
}
$('beginStory').addEventListener('click', () => begin(true));
$('beginExplore').addEventListener('click', () => begin(false));
// drag to look around in point-of-view cameras
let drag = null;
canvas.addEventListener('pointerdown', (e) => { if (state.cam !== 'free') drag = { x: e.clientX, y: e.clientY, yaw: state.yawOff, pitch: state.pitchOff }; });
window.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (state.cam === 'cinema') { setCam('free'); return; }
  state.yawOff = drag.yaw + (e.clientX - drag.x) * 0.004; state.pitchOff = Math.max(-1.2, Math.min(1.2, drag.pitch - (e.clientY - drag.y) * 0.004));
});
window.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); $('play').click(); } if (e.key === 'h' || e.key === 'H') toggleUI(); });

// facts (exact figures; the iceberg's are measured from its mesh)
{
  const ice = berg.userData;
  const fmtN = (n) => Math.round(n).toLocaleString('en-GB');
  $('factsBody').innerHTML = `
    <h4>RMS Titanic</h4>
    <div class="row"><span>Length overall</span><b>269.06 m (882 ft 9 in)</b></div>
    <div class="row"><span>Beam</span><b>28.19 m (92 ft 6 in)</b></div>
    <div class="row"><span>Keel to funnel tops</span><b>53.3 m (175 ft)</b></div>
    <div class="row"><span>Draught</span><b>10.54 m (34 ft 7 in)</b></div>
    <div class="row"><span>Displacement</span><b>52,310 tons</b></div>
    <div class="row"><span>Gross tonnage</span><b>46,328 GRT</b></div>
    <div class="row"><span>Speed at impact</span><b>22.5 kn (41.7 km/h)</b></div>
    <div class="row"><span>Aboard</span><b>2,208 (712 survived)</b></div>
    <h4>The iceberg (as modelled)</h4>
    <div class="row"><span>Length</span><b>${ice.length} m</b></div>
    <div class="row"><span>Height above water</span><b>${ice.height} m</b></div>
    <div class="row"><span>Depth of keel</span><b>${ice.keel.toFixed(0)} m</b></div>
    <div class="row"><span>Volume</span><b>${fmtN(ice.volume)} m³</b></div>
    <div class="row"><span>Mass</span><b>${fmtN(ice.mass / 1000)} t</b></div>
    <p>Witnesses estimated 15–30 m high and 60–120 m long; published mass estimates run from 75,000 t to over 1.5 million t. This berg floats in equilibrium: 10.5 % of glacial ice (917 kg/m³) shows above seawater (1,025 kg/m³).</p>
    <h4>Sources</h4>
    <p>British Wreck Commissioner’s Inquiry and US Senate Inquiry (1912); lifeboat launch reconstructions by Wormstedt, Fitch & Behe and S. Halpern; Halpern’s trim analysis; Ballard (1985). The descent speeds are estimates (bow ≈40 km/h, stern ≈50 km/h).</p>`;
}

resize();
poseShip(H.START); placeBoats(H.START); placeIceberg(H.START);
setCam('cinema');
requestAnimationFrame(frame);
window.__t3 = { state, seek, scene, camera, setCam, replay };
