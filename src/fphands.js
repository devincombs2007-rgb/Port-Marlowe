// First-person hands. Each hand is a palm with four three-joint fingers and a two-joint thumb, built from rounded
// capsules, posed per weapon: the firing hand wraps the grip (palm on the back strap, middle/ring/little fingers
// curled round the front strap, index finger on the trigger, thumb along the far side); the support hand cups the
// firing hand on a pistol or carries the handguard / forend of a long gun. Sleeves run back out of view.
(function () {
  const G = (window.GSW = window.GSW || {});
  const V3 = THREE.Vector3;
  // a capsule along +Y from 0 to len
  const capGeo = (r0, r1, len) => {
    const pts = [], n = 6;
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r0, r0 + Math.sin(a) * r0)); }
    for (let i = 0; i <= n; i++) { const a = (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r1, len - r1 + Math.sin(a) * r1)); }
    return new THREE.LatheGeometry(pts, 12);
  };
  G.FPHands = function (gun) {
    const skin = new THREE.MeshStandardMaterial({ color: 0x96593c, roughness: 0.55, metalness: 0 });
    const nail = new THREE.MeshStandardMaterial({ color: 0xd9a99a, roughness: 0.35 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x23282a, roughness: 0.95, side: THREE.DoubleSide });
    // hand frame: palm faces +Z, fingers point +Y, +X runs from the little finger to the index finger
    const FINGERS = [ // name, base x, lengths of three phalanges, radius
      ['index', 0.029, [0.041, 0.024, 0.019], 0.0088], ['middle', 0.009, [0.045, 0.028, 0.02], 0.009],
      ['ring', -0.011, [0.042, 0.026, 0.019], 0.0085], ['little', -0.029, [0.034, 0.02, 0.017], 0.0075],
    ];
    function makeHand(left) {
      const h = new THREE.Group(), s = left ? -1 : 1;
      // palm: a rounded, slightly tapered slab (wider at the knuckles than at the wrist), bevelled so it has no corners
      const sh = new THREE.Shape(); sh.moveTo(-0.03, -0.046); sh.lineTo(0.03, -0.046); sh.quadraticCurveTo(0.043, -0.044, 0.042, -0.02); sh.lineTo(0.04, 0.036); sh.quadraticCurveTo(0.039, 0.05, 0.026, 0.05); sh.lineTo(-0.026, 0.05); sh.quadraticCurveTo(-0.039, 0.05, -0.04, 0.036); sh.lineTo(-0.042, -0.02); sh.quadraticCurveTo(-0.043, -0.044, -0.03, -0.046);
      const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.007, bevelSegments: 4, curveSegments: 6 }); pg.translate(0, 0, -0.008); pg.computeVertexNormals();
      const palm = new THREE.Mesh(pg, skin); h.add(palm);
      // knuckles: a soft row on the back of the hand
      for (const [nm, bx] of [['i', 0.029], ['m', 0.009], ['r', -0.011], ['l', -0.029]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 10, 8), skin); k.scale.set(1, 0.9, 0.75); k.position.set(bx * s, 0.044, -0.008); h.add(k); }
      // soften the palm's edges with a rounded heel and knuckle row
      const heel = new THREE.Mesh(capGeo(0.016, 0.016, 0.07), skin); heel.rotation.z = Math.PI / 2; heel.position.set(0.035 * s, -0.04, 0.002); h.add(heel);
      const fingers = {};
      for (const [nm, bx, L, r] of FINGERS) {
        let parent = h; const segs = [];
        const root = new THREE.Group(); root.position.set(bx * s, 0.046, 0); parent.add(root); parent = root;
        L.forEach((len, k) => {
          const j = k === 0 ? root : new THREE.Group(); if (k) { j.position.y = L[k - 1]; parent.add(j); }
          const m = new THREE.Mesh(capGeo(r * (1 - k * 0.06), r * (0.95 - k * 0.08), len + r * 0.6), skin); m.position.y = -r * 0.3; j.add(m);
          if (k === 2) { const nl = new THREE.Mesh(new THREE.BoxGeometry(r * 1.3, len * 0.55, 0.002), nail); nl.position.set(0, len * 0.55, -r * 0.92); j.add(nl); }
          segs.push(j); parent = j;
        });
        fingers[nm] = segs;
      }
      // thumb: from the base of the palm, opposed
      const t0 = new THREE.Group(); t0.position.set(0.04 * s, -0.025, 0.012); h.add(t0);
      const tm = new THREE.Mesh(capGeo(0.013, 0.011, 0.05), skin); t0.add(tm);
      const t1 = new THREE.Group(); t1.position.y = 0.045; t0.add(t1); t1.add(new THREE.Mesh(capGeo(0.011, 0.0095, 0.034), skin));
      const tnl = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.016, 0.002), nail); tnl.position.set(0, 0.02, -0.0095); t1.add(tnl);
      fingers.thumb = [t0, t1];
      // wrist and sleeve, back toward the shooter
      // the forearm leaves the wrist sloping down toward the elbow (bent away from the index side)
      const arm = new THREE.Group(); arm.position.set(0, -0.045, 0); h.add(arm); h.userData.arm = arm;
      const wrist = new THREE.Mesh(capGeo(0.024, 0.028, 0.09), skin); wrist.rotation.x = Math.PI; arm.add(wrist);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.45, 14, 1, true), cloth); sleeve.position.y = -0.3; arm.add(sleeve);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.007, 6, 16), cloth); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.075; arm.add(cuff);
      h.userData.f = fingers; h.userData.s = s;
      return h;
    }
    // flex: [proximal, middle, distal] in radians, curling toward the palm (+Z); spread: sideways at the knuckle
    const pose = (hand, nm, flex, spread) => { const f = hand.userData.f[nm]; f.forEach((j, k) => { j.rotation.set(flex[k] || 0, 0, k === 0 ? (spread || 0) * hand.userData.s : 0); }); };
    const poseThumb = (hand, ax, ay, az, bend) => { const [t0, t1] = hand.userData.f.thumb; t0.rotation.set(ax, ay * hand.userData.s, az * hand.userData.s); t1.rotation.set(bend, 0, 0); };
    // orientation helper: palm normal and finger direction in gun space -> quaternion
    const orient = (obj, fingerDir, palmDir) => { const y = fingerDir.clone().normalize(), z = palmDir.clone().sub(y.clone().multiplyScalar(palmDir.dot(y))).normalize(), x = new V3().crossVectors(y, z); obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
    // grips in gun space: gun forward is -Z, up +Y, the shooter's right +X. f = distance forward, y = height.
    const GRIP = {
      glock: { f: -0.024, y: -0.058, rake: 0.1, trig: 0.04 }, m1911: { f: -0.028, y: -0.058, rake: 0.17, trig: 0.036 },
      target22: { f: -0.03, y: -0.055, rake: 0.32, trig: 0.05 }, revolver: { f: -0.03, y: -0.05, rake: 0.22, trig: 0.03 },
      ar15: { f: -0.04, y: -0.055, rake: 0.26, trig: 0.022, sup: { f: 0.24, y: 0.04, r: 0.0245 } },
      ak: { f: -0.04, y: -0.05, rake: 0.25, trig: 0.018, sup: { f: 0.2, y: 0.03, r: 0.02 } },
      bolt: { f: -0.06, y: -0.04, rake: 0.75, trig: 0.018, sup: { f: 0.2, y: 0.018, r: 0.022 } },
      pump: { f: -0.12, y: -0.02, rake: 0.8, trig: 0.014, sup: { f: 0.28, y: 0.019, r: 0.0225 } },
    };
    // aim a part (whose rest direction is `axis`) along a direction given in gun space
    const aimAt = (part, axis, dirGun, hand) => { const inv = hand.quaternion.clone().invert(); const d = dirGun.clone().normalize().applyQuaternion(inv); part.quaternion.setFromUnitVectors(axis, d); };
    const right = makeHand(false), leftH = makeHand(true);
    gun.g.add(right, leftH);
    function place(model) {
      const P = GRIP[model] || GRIP.glock;
      // firing hand: palm against the right side of the grip, fingers forward and wrapping round the front strap
      const down = new V3(0, -Math.cos(P.rake), Math.sin(P.rake)); // down the grip, raked back toward the shooter
      const fwd = new V3(0, 0, -1).sub(down.clone().multiplyScalar(-down.z)).normalize();
      orient(right, fwd, new V3(-1, 0, 0));
      right.position.set(0.034, P.y - 0.004, -P.f + 0.045);
      // the hand frame's +X (index side) should point up the grip: flip if needed
      const ix = new V3(1, 0, 0).applyQuaternion(right.quaternion); if (ix.dot(down) > 0) right.rotateY(Math.PI);
      aimAt(right.userData.arm, new V3(0, -1, 0), new V3(0.12, -0.5, 0.86), right); // forearm runs back and down from the grip toward the elbow
      pose(right, 'middle', [1.0, 1.45, 0.9]); pose(right, 'ring', [1.05, 1.45, 0.9]); pose(right, 'little', [1.1, 1.4, 0.9], -0.08);
      pose(right, 'index', [0.35, 0.95, 0.45], 0.06); // on the trigger
      aimAt(right.userData.f.thumb[0], new V3(0, 1, 0), new V3(-0.35, -0.15, -0.92), right); right.userData.f.thumb[1].rotation.set(0.2, 0, 0); // thumb forward along the far side of the frame
      leftH.visible = !!P.sup; // pistols: one-handed for now (the two-handed cup does not pose convincingly yet)
      if (P.sup) {
        // support hand under the handguard / forend, fingers wrapping up the far side
        const leftPalm = new V3(0, 1, 0);
        orient(leftH, new V3(-1, 0.15, -0.25), leftPalm); leftH.position.set(0.012, P.sup.y - P.sup.r - 0.02, -P.sup.f);
        aimAt(leftH.userData.arm, new V3(0, -1, 0), new V3(-0.25, -0.75, 0.6), leftH);
        for (const nm of ['index', 'middle', 'ring', 'little']) pose(leftH, nm, [0.9, 1.1, 0.7]);
        aimAt(leftH.userData.f.thumb[0], new V3(0, 1, 0), new V3(0.3, 0.35, -0.88), leftH); leftH.userData.f.thumb[1].rotation.set(0.25, 0, 0);
      } else {
        // two-handed pistol grip: the support hand wraps the firing hand's fingers, thumb forward along the frame
        orient(leftH, new V3(0.85, -0.15, -0.5), new V3(1, 0, 0.1)); leftH.position.set(-0.04, P.y - 0.02, -P.f + 0.03);
        aimAt(leftH.userData.arm, new V3(0, -1, 0), new V3(-0.3, -0.45, 0.84), leftH);
        for (const nm of ['index', 'middle', 'ring', 'little']) pose(leftH, nm, [0.75, 1.2, 0.8]);
        aimAt(leftH.userData.f.thumb[0], new V3(0, 1, 0), new V3(-0.15, 0.1, -0.98), leftH); leftH.userData.f.thumb[1].rotation.set(0.1, 0, 0); // support thumb forward along the frame
      }
    }
    const H = { right, left: leftH, place };
    return H;
  };
})();
