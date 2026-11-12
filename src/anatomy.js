// Anatomy data. All coordinates are authored in the standing "rest" frame:
// metres, Y up from the floor, +Z anterior (subject faces +Z), +X = subject's LEFT.
// Subject: adult male, 1.78 m, ~77 kg.
(function () {
  const G = (window.GSW = window.GSW || {});
  const SKIN = 0xc79a7c, SHORTS = 0x262b33, HAIR = 0x2a1d14;
  const COL = {
    bone: 0xe9e1c9, cart: 0xc5d3d8, brain: 0xe3a3a3, heart: 0xa82424, lung: 0xd98d8d, liver: 0x7a2c1c,
    stomach: 0xd69a74, spleen: 0x6b2a4c, kidney: 0x8c3a2a, bowel: 0xd9aa92, colon: 0xbf8a78, bladder: 0xdcc06a,
    artery: 0xd41a1a, vein: 0x2f52c4, cord: 0xf1e36a, airway: 0xa9cbdb, pancreas: 0xe0b25e, eso: 0xb98a8a,
  };
  const segs = {
    pelvis: [null, [0, 0.95, 0]], abdomen: ['pelvis', [0, 1.05, -0.03]], thorax: ['abdomen', [0, 1.2, -0.04]],
    neck: ['thorax', [0, 1.48, -0.03]], head: ['neck', [0, 1.585, -0.01]],
  };
  const lofts = [], skins = [], prims = [], deco = [];
  const SIDES = [['L', 1, 'Left'], ['R', -1, 'Right']];
  for (const [S, s] of SIDES) {
    segs['uarm' + S] = ['thorax', [0.2 * s, 1.43, -0.01]];
    segs['farm' + S] = ['uarm' + S, [0.2 * s, 1.13, -0.01]];
    segs['hand' + S] = ['farm' + S, [0.2 * s, 0.87, -0.01]];
    segs['thigh' + S] = ['pelvis', [0.09 * s, 0.93, 0]];
    segs['shin' + S] = ['thigh' + S, [0.09 * s, 0.5, 0]];
    segs['foot' + S] = ['shin' + S, [0.09 * s, 0.08, -0.01]];
  }
  const segLabel = { pelvis: 'Pelvis', abdomen: 'Abdomen', thorax: 'Chest', neck: 'Neck', head: 'Head' };
  for (const [S, , N] of SIDES) Object.assign(segLabel, {
    ['uarm' + S]: N + ' upper arm', ['farm' + S]: N + ' forearm', ['hand' + S]: N + ' hand',
    ['thigh' + S]: N + ' thigh', ['shin' + S]: N + ' lower leg', ['foot' + S]: N + ' foot',
  });

  // ---- helpers
  const L = (seg, rings, o = {}) => lofts.push({ seg, rings, axis: o.axis || 'y', n: o.n || 2, color: o.color || SKIN, colorFn: o.colorFn });
  const SE = (seg, c, r, color = SKIN) => skins.push({ seg, c, r, color });
  const E = (seg, kind, name, tissue, color, c, r, rot, meta) =>
    prims.push(Object.assign({ seg, type: 'ell', kind, name, tissue, color, c, r, rot: rot || null }, meta || {}));
  const C = (seg, kind, name, tissue, color, a, b, rad, meta) =>
    prims.push(Object.assign({ seg, type: 'cap', kind, name, tissue, color, a, b, rad }, meta || {}));
  const chain = (seg, kind, name, tissue, color, pts, rad, meta) => {
    for (let i = 0; i < pts.length - 1; i++) C(seg, kind, name, tissue, color, pts[i], pts[i + 1], rad, meta);
  };
  const lerpTab = (tab, y, col) => {
    if (y >= tab[0][0]) return tab[0][col];
    for (let i = 0; i < tab.length - 1; i++) {
      const a = tab[i], b = tab[i + 1];
      if (y <= a[0] && y >= b[0]) return a[col] + (b[col] - a[col]) * ((a[0] - y) / (a[0] - b[0]));
    }
    return tab[tab.length - 1][col];
  };

  // ================= SKIN =================
  // torso rings: [y, cx, cz, rx, rz]
  L('pelvis', [[0.8, 0, 0, 0.05, 0.06], [0.86, 0, -0.002, 0.15, 0.105], [0.92, 0, -0.005, 0.178, 0.118],
    [0.98, 0, -0.004, 0.174, 0.115], [1.03, 0, -0.002, 0.165, 0.108], [1.075, 0, 0, 0.155, 0.104]],
    { n: 2.4, colorFn: (y) => (y < 1.045 ? SHORTS : SKIN) });
  L('abdomen', [[1.0, 0, -0.002, 0.164, 0.107], [1.05, 0, 0.004, 0.156, 0.106], [1.1, 0, 0.005, 0.149, 0.104],
    [1.15, 0, 0.004, 0.15, 0.105], [1.2, 0, 0.002, 0.156, 0.111], [1.235, 0, 0.003, 0.16, 0.113]],
    { n: 2.4, colorFn: (y) => (y < 1.045 ? SHORTS : SKIN) });
  L('thorax', [[1.13, 0, 0, 0.148, 0.103], [1.2, 0, 0.002, 0.157, 0.112], [1.26, 0, 0.005, 0.167, 0.118],
    [1.32, 0, 0.005, 0.174, 0.122], [1.38, 0, 0.002, 0.176, 0.118], [1.42, 0, -0.004, 0.168, 0.106],
    [1.455, 0, -0.008, 0.145, 0.09], [1.485, 0, -0.012, 0.1, 0.07], [1.51, 0, -0.012, 0.06, 0.058]], { n: 2.4 });
  L('neck', [[1.46, 0, -0.012, 0.062, 0.062], [1.53, 0, -0.008, 0.056, 0.058], [1.6, 0, -0.004, 0.056, 0.06]]);
  L('head', [[1.553, 0, 0.052, 0.028, 0.03], [1.58, 0, 0.025, 0.055, 0.065], [1.61, 0, 0.012, 0.066, 0.082],
    [1.65, 0, 0.004, 0.074, 0.093], [1.69, 0, 0, 0.077, 0.097], [1.73, 0, -0.004, 0.075, 0.094],
    [1.76, 0, -0.006, 0.062, 0.08], [1.778, 0, -0.006, 0.04, 0.052], [1.786, 0, -0.006, 0.012, 0.016]], { n: 2.2 });
  SE('head', [0, 1.652, 0.098], [0.013, 0.023, 0.016]); // nose
  deco.push({ seg: 'head', c: [0, 1.737, -0.014], r: [0.08, 0.054, 0.099], color: HAIR });
  for (const [S, s] of SIDES) {
    SE('head', [0.078 * s, 1.672, -0.006], [0.006, 0.028, 0.016]); // ear
    deco.push({ seg: 'head', c: [0.031 * s, 1.692, 0.082], r: [0.011, 0.008, 0.011], color: 0x1c1a1a }); // eye
    const ax = 0.2 * s, lx = 0.09 * s;
    L('uarm' + S, [[1.478, ax, -0.01, 0.028, 0.03], [1.45, ax, -0.01, 0.05, 0.052], [1.41, ax, -0.01, 0.052, 0.054],
      [1.33, ax, -0.008, 0.047, 0.05], [1.25, ax, -0.008, 0.045, 0.048], [1.17, ax, -0.01, 0.04, 0.041], [1.115, ax, -0.01, 0.039, 0.04]]);
    L('farm' + S, [[1.15, ax, -0.01, 0.04, 0.041], [1.08, ax, -0.008, 0.043, 0.045], [1.0, ax, -0.008, 0.039, 0.04],
      [0.92, ax, -0.01, 0.03, 0.028], [0.86, ax, -0.01, 0.026, 0.023]]);
    L('hand' + S, [[0.885, ax, -0.01, 0.02, 0.024], [0.84, ax, -0.006, 0.016, 0.04], [0.79, ax, -0.004, 0.016, 0.046],
      [0.74, ax, -0.002, 0.014, 0.04], [0.692, ax, 0, 0.008, 0.02]]);
    const shortsFn = (y) => (y > 0.755 ? SHORTS : SKIN);
    L('thigh' + S, [[0.965, lx * 1.1, 0, 0.07, 0.075], [0.93, lx * 1.08, 0, 0.082, 0.088], [0.86, lx * 1.05, 0, 0.085, 0.09],
      [0.75, lx * 1.02, 0, 0.076, 0.08], [0.62, lx, 0, 0.064, 0.066], [0.53, lx, 0, 0.056, 0.058], [0.485, lx, 0, 0.054, 0.056]], { colorFn: shortsFn });
    L('shin' + S, [[0.525, lx, 0, 0.053, 0.055], [0.46, lx, -0.002, 0.05, 0.052], [0.38, lx, -0.012, 0.052, 0.058],
      [0.28, lx, -0.008, 0.044, 0.048], [0.16, lx, -0.004, 0.034, 0.037], [0.065, lx, -0.004, 0.032, 0.036]]);
    // foot: rings along Z: [z, cx, cy, rx, ry]
    L('foot' + S, [[-0.078, lx, 0.035, 0.018, 0.02], [-0.05, lx, 0.045, 0.034, 0.045], [0, lx, 0.05, 0.04, 0.05],
      [0.08, lx, 0.035, 0.045, 0.035], [0.15, lx * 1.02, 0.022, 0.047, 0.022], [0.188, lx * 1.02, 0.015, 0.03, 0.013]], { axis: 'z' });
    SE('shin' + S, [lx, 0.5, 0.004], [0.055, 0.06, 0.058]); // knee
    SE('farm' + S, [ax, 1.13, -0.01], [0.041, 0.044, 0.043]); // elbow
  }

  // ================= HEAD / NECK =================
  prims.push({ seg: 'head', type: 'shell', kind: 'bone', name: 'Skull (cranium)', tissue: 'bone', color: COL.bone, alpha: true,
    c: [0, 1.69, -0.005], r: [0.071, 0.083, 0.091], th: 0.0065, bone: 'skull' });
  E('head', 'bone', 'Facial bones', 'cancellous', COL.bone, [0, 1.64, 0.05], [0.05, 0.034, 0.03], null, { bone: 'face' });
  for (const [S, s, N] of SIDES)
    chain('head', 'bone', 'Mandible', 'bone', COL.bone, [[0.05 * s, 1.645, -0.004], [0.048 * s, 1.61, 0], [0.034 * s, 1.578, 0.052], [0, 1.568, 0.07]], 0.008, { bone: 'jaw' });
  E('head', 'cerebrum', 'Cerebrum', 'brain', COL.brain, [0, 1.708, -0.005], [0.061, 0.055, 0.08]);
  E('head', 'cerebellum', 'Cerebellum', 'brain', COL.brain, [0, 1.648, -0.043], [0.045, 0.022, 0.028]);
  C('head', 'brainstem', 'Brainstem', 'brain', 0xd9c08a, [0, 1.675, -0.012], [0, 1.62, -0.022], 0.012);

  // ================= SPINE =================
  const spineZ = [[1.6, -0.012], [1.54, -0.008], [1.48, -0.025], [1.4, -0.055], [1.32, -0.068], [1.24, -0.062], [1.18, -0.05], [1.11, -0.038], [1.05, -0.045]];
  const zs = (y) => lerpTab(spineZ, y, 1);
  const verts = [];
  for (let i = 1; i <= 7; i++) verts.push({ n: 'C' + i, y: 1.598 - (i - 1) * 0.0175, r: [0.013, 0.0085, 0.01], seg: 'neck', bone: 'cspine' });
  for (let i = 1; i <= 12; i++) verts.push({ n: 'T' + i, y: 1.47 - (i - 1) * 0.0235, r: [0.015 + i * 0.0006, 0.0115, 0.013 + i * 0.0004], seg: 'thorax', bone: 'tspine' });
  for (let i = 1; i <= 5; i++) verts.push({ n: 'L' + i, y: 1.182 - (i - 1) * 0.033, r: [0.024, 0.016, 0.019], seg: 'abdomen', bone: 'lspine' });
  const cordPts = [];
  for (const v of verts) {
    const z = zs(v.y), zc = z - v.r[2] - 0.008;
    E(v.seg, 'bone', 'Vertebra ' + v.n, 'cancellous', COL.bone, [0, v.y, z], v.r, null, { bone: v.bone, level: v.n });
    E(v.seg, 'bone', 'Vertebra ' + v.n + ' (posterior arch)', 'bone', COL.bone, [0, v.y, zc - 0.014], [v.r[0] * 0.9, v.r[1], 0.006], null, { bone: v.bone, level: v.n });
    cordPts.push({ p: [0, v.y, zc], v });
  }
  C('neck', 'cord', 'Spinal cord C1', 'cord', COL.cord, [0, 1.62, -0.024], cordPts[0].p, 0.006, { level: 'C1' });
  for (let i = 0; i < cordPts.length - 1; i++) {
    const a = cordPts[i], b = cordPts[i + 1];
    const cauda = i >= 20; // below L1/L2 the cord ends: cauda equina
    C(a.v.seg, cauda ? 'cauda' : 'cord', cauda ? 'Cauda equina (' + a.v.n + ')' : 'Spinal cord ' + a.v.n, 'cord', COL.cord, a.p, b.p, cauda ? 0.007 : 0.006, { level: a.v.n });
  }
  const vy = (n) => verts.find((v) => v.n === n).y;

  // ================= RIB CAGE =================
  const cage = [[1.47, 0.045, 0.04], [1.44, 0.085, 0.065], [1.4, 0.125, 0.088], [1.36, 0.14, 0.1], [1.3, 0.15, 0.107], [1.24, 0.152, 0.108], [1.18, 0.148, 0.103], [1.12, 0.138, 0.095]];
  const drops = [0.035, 0.05, 0.065, 0.075, 0.085, 0.09, 0.095, 0.1, 0.1, 0.095, 0.06, 0.035];
  const phiEnd = [160, 162, 163, 163, 162, 160, 155, 140, 128, 115, 80, 50];
  const sternZ = (y) => 0.068 + (1.45 - y) * 0.19;
  E('thorax', 'bone', 'Sternum (manubrium)', 'bone', COL.bone, [0, 1.424, 0.073], [0.027, 0.026, 0.007], [-0.2, 0, 0], { bone: 'sternum' });
  E('thorax', 'bone', 'Sternum', 'bone', COL.bone, [0, 1.325, 0.092], [0.019, 0.076, 0.007], [-0.19, 0, 0], { bone: 'sternum' });
  for (const [S, s, N] of SIDES) {
    let prevEnd = null;
    for (let i = 1; i <= 12; i++) {
      const yP = vy('T' + i) + 0.004, pts = [], n = 7;
      for (let k = 0; k <= n; k++) {
        const phi = ((14 + (phiEnd[i - 1] - 14) * (k / n)) * Math.PI) / 180;
        const y = yP - (drops[i - 1] * (1 - Math.cos(phi))) / 2;
        pts.push([s * lerpTab(cage, y, 1) * Math.sin(phi), y, 0.004 - lerpTab(cage, y, 2) * Math.cos(phi)]);
      }
      chain('thorax', 'bone', N + ' rib ' + i, 'bone', COL.bone, pts, 0.0055, { bone: 'rib', side: S });
      const end = pts[n];
      if (i <= 7) C('thorax', 'bone', 'Costal cartilage (' + N + ' ' + i + ')', 'cartilage', COL.cart, end, [0.014 * s, end[1] + 0.012, sternZ(end[1] + 0.012)], 0.005, { bone: 'cartilage', side: S });
      else if (i <= 10) C('thorax', 'bone', 'Costal margin (' + N + ')', 'cartilage', COL.cart, end, prevEnd, 0.005, { bone: 'cartilage', side: S });
      prevEnd = end;
    }
    C('thorax', 'bone', N + ' clavicle', 'bone', COL.bone, [0.02 * s, 1.447, 0.066], [0.172 * s, 1.455, -0.005], 0.007, { bone: 'clavicle', side: S });
    E('thorax', 'bone', N + ' scapula', 'bone', COL.bone, [0.105 * s, 1.36, -0.082], [0.05, 0.07, 0.006], [0, -0.4 * s, 0], { bone: 'scapula', side: S });
  }

  // ================= THORACIC / UPPER ABDOMINAL ORGANS =================
  E('thorax', 'heart', 'Heart', 'heart', COL.heart, [0.022, 1.315, 0.048], [0.043, 0.06, 0.036], [-0.45, 0, 0.55]);
  E('thorax', 'lung', 'Right lung', 'lung', COL.lung, [-0.08, 1.315, -0.005], [0.058, 0.115, 0.085], null, { side: 'R' });
  E('thorax', 'lung', 'Left lung', 'lung', COL.lung, [0.083, 1.315, -0.008], [0.052, 0.115, 0.082], null, { side: 'L' });
  E('thorax', 'liver', 'Liver', 'organ', COL.liver, [-0.055, 1.205, 0.02], [0.095, 0.058, 0.075]);
  E('thorax', 'stomach', 'Stomach', 'hollow', COL.stomach, [0.062, 1.19, 0.04], [0.052, 0.045, 0.04], [0, 0, 0.5]);
  E('thorax', 'spleen', 'Spleen', 'organ', COL.spleen, [0.115, 1.2, -0.045], [0.024, 0.052, 0.034]);
  E('abdomen', 'pancreas', 'Pancreas', 'organ', COL.pancreas, [0.012, 1.166, -0.004], [0.068, 0.014, 0.012]);
  E('abdomen', 'kidney', 'Left kidney', 'organ', COL.kidney, [0.062, 1.155, -0.055], [0.027, 0.052, 0.022], null, { side: 'L' });
  E('abdomen', 'kidney', 'Right kidney', 'organ', COL.kidney, [-0.064, 1.14, -0.055], [0.027, 0.052, 0.022], null, { side: 'R' });
  chain('neck', 'airway', 'Trachea', 'hollow', COL.airway, [[0, 1.565, 0.014], [0, 1.48, 0.004]], 0.009);
  chain('thorax', 'airway', 'Trachea', 'hollow', COL.airway, [[0, 1.48, 0.004], [0, 1.392, -0.006]], 0.009);
  chain('thorax', 'eso', 'Esophagus', 'hollow', COL.eso, [[0, 1.5, -0.012], [0.004, 1.38, -0.03], [0.012, 1.23, -0.028]], 0.006);

  // ---- great vessels. rate = mL/min for complete transection at normal pressure
  const V = (seg, name, color, pts, rad, rate, meta) => chain(seg, 'vessel', name, 'vessel', color, pts, rad, Object.assign({ rate }, meta));
  V('thorax', 'Aorta (ascending / arch)', COL.artery, [[0.004, 1.362, 0.03], [0.006, 1.405, 0.008], [0.02, 1.392, -0.03]], 0.0125, 5000, { cavity: 'thorax' });
  V('thorax', 'Thoracic aorta', COL.artery, [[0.02, 1.392, -0.03], [0.02, 1.33, -0.043], [0.014, 1.21, -0.034]], 0.011, 4500, { cavity: 'thorax' });
  V('abdomen', 'Abdominal aorta', COL.artery, [[0.014, 1.21, -0.034], [0.01, 1.14, -0.016], [0.008, 1.078, -0.016]], 0.009, 3500, { cavity: 'abdomen' });
  V('abdomen', 'Inferior vena cava', COL.vein, [[-0.018, 1.078, -0.016], [-0.02, 1.16, -0.014], [-0.02, 1.25, -0.006]], 0.0105, 1800, { cavity: 'abdomen', venous: true });
  V('thorax', 'Inferior vena cava', COL.vein, [[-0.02, 1.25, -0.006], [-0.016, 1.295, 0.02]], 0.0105, 1800, { cavity: 'thorax', venous: true });
  V('thorax', 'Superior vena cava', COL.vein, [[-0.026, 1.405, 0.014], [-0.02, 1.345, 0.024]], 0.009, 1500, { cavity: 'thorax', venous: true });
  V('thorax', 'Pulmonary vessels (right hilum)', COL.vein, [[0, 1.348, 0.032], [-0.045, 1.332, 0.002]], 0.009, 2500, { cavity: 'thorax', side: 'R' });
  V('thorax', 'Pulmonary vessels (left hilum)', COL.vein, [[0, 1.348, 0.032], [0.05, 1.335, 0]], 0.009, 2500, { cavity: 'thorax', side: 'L' });
  for (const [S, s, N] of SIDES) {
    V('thorax', N + ' subclavian artery', COL.artery, [[0.02 * s, 1.41, 0.004], [0.085 * s, 1.447, 0.012], [0.165 * s, 1.428, 0]], 0.0045, 1200, { cavity: 'thorax', side: S, ext: 0.3 });
    V('neck', N + ' carotid artery', COL.artery, [[0.02 * s, 1.445, 0.012], [0.03 * s, 1.56, 0.014], [0.03 * s, 1.612, 0.002]], 0.0035, 900, { ext: 0.85 });
    V('neck', N + ' jugular vein', COL.vein, [[0.04 * s, 1.45, 0.014], [0.043 * s, 1.6, 0.008]], 0.005, 450, { ext: 0.85, venous: true });
    V('uarm' + S, N + ' brachial artery', COL.artery, [[0.172 * s, 1.41, -0.004], [0.176 * s, 1.27, 0], [0.195 * s, 1.135, 0.014]], 0.0025, 300, { ext: 0.9 });
    V('farm' + S, N + ' radial artery', COL.artery, [[0.195 * s, 1.13, 0.012], [0.2 * s, 0.88, 0.01]], 0.0015, 70, { ext: 0.9 });
    V('pelvis', N + ' iliac artery', COL.artery, [[0.008, 1.078, -0.016], [0.055 * s, 0.985, 0.012], [0.076 * s, 0.925, 0.05]], 0.005, 1800, { cavity: 'abdomen' });
    V('thigh' + S, N + ' femoral artery', COL.artery, [[0.078 * s, 0.925, 0.05], [0.064 * s, 0.7, 0.016], [0.085 * s, 0.53, -0.03]], 0.004, 1100, { ext: 0.85 });
    V('thigh' + S, N + ' femoral vein', COL.vein, [[0.068 * s, 0.925, 0.046], [0.055 * s, 0.7, 0.01], [0.078 * s, 0.53, -0.034]], 0.0045, 500, { ext: 0.85, venous: true });
    V('shin' + S, N + ' popliteal / tibial artery', COL.artery, [[0.088 * s, 0.5, -0.03], [0.09 * s, 0.41, -0.022], [0.092 * s, 0.1, -0.012]], 0.0025, 350, { ext: 0.85 });
  }

  // ================= LOWER ABDOMEN / PELVIS =================
  E('abdomen', 'bowel', 'Small intestine', 'hollow', COL.bowel, [0, 1.06, 0.03], [0.108, 0.075, 0.055]);
  C('abdomen', 'bowel', 'Ascending colon', 'hollow', COL.colon, [-0.115, 0.99, 0.01], [-0.115, 1.125, 0.02], 0.024);
  C('abdomen', 'bowel', 'Transverse colon', 'hollow', COL.colon, [-0.105, 1.145, 0.05], [0.105, 1.15, 0.05], 0.021);
  C('abdomen', 'bowel', 'Descending colon', 'hollow', COL.colon, [0.118, 1.14, 0], [0.118, 0.99, 0], 0.02);
  chain('pelvis', 'bowel', 'Sigmoid colon / rectum', 'hollow', COL.colon, [[0.095, 0.975, 0], [0, 0.935, -0.04], [0, 0.875, -0.03]], 0.019);
  E('pelvis', 'bladder', 'Bladder', 'hollow', COL.bladder, [0, 0.925, 0.028], [0.034, 0.03, 0.03]);
  E('pelvis', 'bone', 'Sacrum', 'cancellous', COL.bone, [0, 0.985, -0.07], [0.045, 0.055, 0.02], [0.3, 0, 0], { bone: 'pelvis' });
  for (const [S, s, N] of SIDES) {
    E('pelvis', 'bone', 'Pelvis (' + N + ' ilium)', 'cancellous', COL.bone, [0.1 * s, 1.02, -0.03], [0.012, 0.055, 0.06], [0, 0.5 * s, 0], { bone: 'pelvis', side: S });
    E('pelvis', 'bone', 'Pelvis (' + N + ' acetabulum)', 'bone', COL.bone, [0.092 * s, 0.935, -0.005], [0.03, 0.03, 0.032], null, { bone: 'pelvis', side: S });
    C('pelvis', 'bone', 'Pelvis (pubis)', 'bone', COL.bone, [0.065 * s, 0.905, 0.045], [0, 0.895, 0.066], 0.011, { bone: 'pelvis' });
    C('pelvis', 'bone', 'Pelvis (' + N + ' ischium)', 'bone', COL.bone, [0.075 * s, 0.92, -0.01], [0.05 * s, 0.868, -0.035], 0.013, { bone: 'pelvis', side: S });
    // ---- leg
    const T = 'thigh' + S, SH = 'shin' + S, F = 'foot' + S, lx = 0.09 * s;
    E(T, 'bone', N + ' femur (head)', 'bone', COL.bone, [0.088 * s, 0.93, 0], [0.023, 0.023, 0.023], null, { bone: 'femur', side: S });
    chain(T, 'bone', N + ' femur', 'bone', COL.bone, [[0.09 * s, 0.93, 0], [0.132 * s, 0.905, -0.004], [0.094 * s, 0.53, 0.002]], 0.0135, { bone: 'femur', side: S });
    E(T, 'bone', N + ' femur (condyles)', 'cancellous', COL.bone, [lx, 0.512, 0], [0.04, 0.028, 0.03], null, { bone: 'femur', side: S });
    E(SH, 'bone', N + ' patella', 'bone', COL.bone, [lx, 0.502, 0.043], [0.021, 0.023, 0.01], null, { bone: 'patella', side: S });
    E(SH, 'bone', N + ' tibia (plateau)', 'cancellous', COL.bone, [lx, 0.468, 0], [0.038, 0.02, 0.028], null, { bone: 'tibia', side: S });
    C(SH, 'bone', N + ' tibia', 'bone', COL.bone, [0.084 * s, 0.46, 0.008], [0.086 * s, 0.085, 0], 0.0125, { bone: 'tibia', side: S });
    C(SH, 'bone', N + ' fibula', 'bone', COL.bone, [0.124 * s, 0.455, -0.016], [0.118 * s, 0.078, -0.01], 0.006, { bone: 'fibula', side: S });
    E(F, 'bone', N + ' foot (calcaneus)', 'cancellous', COL.bone, [lx, 0.04, -0.042], [0.02, 0.024, 0.034], null, { bone: 'foot', side: S });
    C(F, 'bone', N + ' foot (tarsals / metatarsals)', 'cancellous', COL.bone, [lx, 0.052, 0.005], [lx * 1.02, 0.022, 0.14], 0.016, { bone: 'foot', side: S });
    // ---- arm
    const ax = 0.2 * s;
    E('uarm' + S, 'bone', N + ' humerus (head)', 'bone', COL.bone, [0.19 * s, 1.432, -0.01], [0.022, 0.022, 0.022], null, { bone: 'humerus', side: S });
    C('uarm' + S, 'bone', N + ' humerus', 'bone', COL.bone, [0.193 * s, 1.425, -0.01], [ax, 1.14, -0.01], 0.0105, { bone: 'humerus', side: S });
    C('farm' + S, 'bone', N + ' radius', 'bone', COL.bone, [ax, 1.125, 0.004], [ax, 0.88, 0.002], 0.007, { bone: 'forearm', side: S });
    C('farm' + S, 'bone', N + ' ulna', 'bone', COL.bone, [ax, 1.135, -0.022], [ax, 0.88, -0.02], 0.0065, { bone: 'forearm', side: S });
    E('hand' + S, 'bone', N + ' hand (carpals / metacarpals)', 'cancellous', COL.bone, [ax, 0.81, -0.005], [0.008, 0.05, 0.034], null, { bone: 'hand', side: S });
    E('hand' + S, 'bone', N + ' hand (phalanges)', 'cancellous', COL.bone, [ax, 0.728, -0.002], [0.006, 0.034, 0.028], null, { bone: 'hand', side: S });
  }

  G.ANATOMY = { segs, segLabel, lofts, skins, prims, deco, SKIN, bloodVolume: 5400, massKg: 77, heightM: 1.78 };
})();
