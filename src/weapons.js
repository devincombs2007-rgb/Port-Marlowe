// Weapons and their projectiles. m kg, d m, v m/s (muzzle), len m (bullet length).
// cd = effective nose-on drag in tissue, calibrated against published 10% gel penetration.
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const G = (root.GSW = root.GSW || {});
  G.WEAPONS = [
    { key: '1', name: '.22 LR pistol', cls: 'pistol', load: '40 gr lead round nose', rpm: 300, spread: 0.004, loud: 0.35, recoil: 0.3,
      bullet: { m: 0.0026, d: 0.0057, v: 320, len: 0.011, cd: 1.2, boneDeform: 1.5 } },
    { key: '2', name: '9×19 mm pistol', cls: 'pistol', load: '124 gr FMJ', rpm: 300, spread: 0.004, loud: 0.6, recoil: 0.6,
      bullet: { m: 0.008, d: 0.00901, v: 360, len: 0.015, cd: 0.6, boneDeform: 1.1 } },
    { key: '3', name: '9×19 mm pistol', cls: 'pistol', load: '124 gr JHP', rpm: 300, spread: 0.004, loud: 0.6, recoil: 0.6,
      bullet: { m: 0.008, d: 0.00901, v: 350, len: 0.015, cd: 0.42, boneDeform: 1.25, expMax: 1.65, vExp: 240, expLen: 0.035 } },
    { key: '4', name: '.45 ACP pistol', cls: 'pistol', load: '230 gr FMJ', rpm: 260, spread: 0.004, loud: 0.65, recoil: 0.8,
      bullet: { m: 0.0149, d: 0.01147, v: 255, len: 0.017, cd: 0.6, boneDeform: 1.1 } },
    { key: '5', name: '.357 Magnum revolver', cls: 'revolver', load: '125 gr JHP', rpm: 180, spread: 0.004, loud: 0.85, recoil: 1.0,
      bullet: { m: 0.0081, d: 0.00907, v: 440, len: 0.014, cd: 0.42, boneDeform: 1.25, expMax: 1.7, vExp: 250, expLen: 0.03 } },
    { key: '6', name: '5.56×45 mm rifle', cls: 'rifle', load: '55 gr FMJ (M193)', rpm: 400, spread: 0.0015, loud: 1.0, recoil: 0.5,
      bullet: { m: 0.00356, d: 0.0057, v: 960, len: 0.019, cd: 0.2, cdYaw: 0.42, boneDeform: 1.3, yawOn: 0.1, yawLen: 0.06, vFrag: 760, retain: 0.5, fragR: 0.024 } },
    { key: '7', name: '7.62×39 mm rifle', cls: 'rifle', load: '123 gr FMJ (M43)', rpm: 400, spread: 0.002, loud: 1.0, recoil: 0.8,
      bullet: { m: 0.0079, d: 0.0079, v: 715, len: 0.0265, cd: 0.2, cdYaw: 0.5, boneDeform: 1.15, yawOn: 0.24, yawLen: 0.11, yawRest: 0.6 } },
    { key: '8', name: '.308 Win hunting rifle', cls: 'rifle', load: '150 gr soft point', rpm: 60, spread: 0.001, loud: 1.1, recoil: 1.2,
      bullet: { m: 0.0097, d: 0.00782, v: 860, len: 0.028, cd: 0.38, boneDeform: 1.2, expMax: 2.0, vExp: 480, expLen: 0.04, retain: 0.7, fragR: 0.014 } },
    { key: '9', name: '12 ga shotgun', cls: 'shotgun', load: '00 buckshot (9 pellets)', rpm: 90, spread: 0.0125, pellets: 9, loud: 1.15, recoil: 1.5,
      bullet: { m: 0.0035, d: 0.0084, v: 400, len: 0.0084, cd: 0.48, boneDeform: 1.2 } },
    { key: '0', name: '12 ga shotgun', cls: 'shotgun', load: '1 oz rifled slug', rpm: 90, spread: 0.003, loud: 1.2, recoil: 1.8,
      bullet: { m: 0.0284, d: 0.0185, v: 480, len: 0.022, cd: 0.6, boneDeform: 1.25 } },
  ];
  for (const w of G.WEAPONS) w.energy = 0.5 * w.bullet.m * w.bullet.v ** 2 * (w.pellets || 1);
})();
