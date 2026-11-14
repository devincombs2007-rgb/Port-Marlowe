// Opening: black; a bare bulb on a cord flickers on and swings, lighting the room; vision starts blurred and clears;
// then the hands bring the pistol up. The bulb stays as the room's main light, still swaying a little. Firing is held
// until the gun is up.
(function () {
  const G = (window.GSW = window.GSW || {});
  G.Intro = function ({ scene, canvas, gun, room }) {
    const ceil = room.y1, pivot = new THREE.Group(); pivot.position.set(0, ceil, 1.4); scene.add(pivot);
    const L = 0.95; // cord length (m)
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, L, 6), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 })); cord.position.y = -L / 2; pivot.add(cord);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.6 })); rose.position.y = -0.01; pivot.add(rose);
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.055, 14), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.5, metalness: 0.2 })); holder.position.y = -L - 0.02; pivot.add(holder);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xffc070, emissiveIntensity: 0, roughness: 0.15, transparent: true, opacity: 0.92 });
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.032, 20, 16), glassMat); glass.scale.set(1, 1.25, 1); glass.position.y = -L - 0.075; pivot.add(glass);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.03, 14), glassMat); neck.position.y = -L - 0.045; pivot.add(neck);
    const bulb = new THREE.PointLight(0xffd29a, 0, 14, 1.6); bulb.position.y = -L - 0.08; pivot.add(bulb);
    bulb.castShadow = true; bulb.shadow.mapSize.set(512, 512); bulb.shadow.bias = -0.002; bulb.shadow.radius = 3;
    // every other light in the room fades in only to a fill level: the bulb is the light
    const others = []; scene.traverse((o) => { if (o.isLight && o !== bulb && !o.parent.isCamera && !(gun && o.parent === gun.g)) others.push([o, o.intensity]); });
    const FILL = 0.38, BULB = 2.4;
    const I = { t: -1, done: false };
    const fade = document.createElement('div'); Object.assign(fade.style, { position: 'absolute', inset: '0', background: '#000', pointerEvents: 'none', opacity: '0', transition: 'none', zIndex: '5' });
    canvas.parentNode.appendChild(fade);
    const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
    I.start = () => { I.t = 0; I.done = false; for (const [o] of others) o.intensity = 0; fade.style.opacity = '1'; if (gun) gun.raise = 0; };
    I.active = () => I.t >= 0 && !I.done;
    // switch-on flicker: on / off / on / off / on (s)
    const FLICK = [[0.6, 1], [0.66, 0], [0.78, 1], [0.86, 0], [1.02, 1]];
    let sway0 = 0.33, swayT = 0;
    I.update = (dt) => {
      if (I.t < 0) return;
      // the bulb keeps swinging, slowly settling to a gentle sway (pendulum, g/L)
      swayT += dt; const w = Math.sqrt(9.81 / L), amp = 0.04 + sway0 * Math.exp(-swayT / 14);
      pivot.rotation.z = amp * Math.cos(w * swayT); pivot.rotation.x = amp * 0.35 * Math.sin(w * swayT * 0.97 + 0.8);
      if (I.done) return;
      I.t += dt; const t = I.t;
      let on = 0; for (const [ft, v] of FLICK) if (t >= ft) on = v;
      bulb.intensity = on * BULB; glassMat.emissiveIntensity = on * 2.2;
      fade.style.opacity = String(1 - ease((t - 0.55) / 0.7));
      const fill = ease((t - 1.4) / 2.2) * FILL; for (const [o, i0] of others) o.intensity = i0 * fill;
      const blur = 9 * (1 - ease((t - 0.8) / 3.4)), dim = 0.75 + 0.25 * ease((t - 0.8) / 3.0);
      canvas.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px) brightness(' + dim.toFixed(2) + ')' : '';
      if (gun) gun.raise = ease((t - 3.3) / 0.9);
      if (t > 4.4) { I.done = true; canvas.style.filter = ''; fade.style.opacity = '0'; if (gun) gun.raise = 1; for (const [o, i0] of others) o.intensity = i0 * FILL; bulb.intensity = BULB; glassMat.emissiveIntensity = 2.2; }
    };
    return I;
  };
})();
