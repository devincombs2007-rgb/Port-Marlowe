"""Procedural full body in the head's frame (~cm, y up, z forward).
Target: 5'8" (172.7 cm), 125 lb, lean/ripped. Outfits: tee + shorts, or shirtless (defined torso) + shorts."""
import sys, json, numpy as np
from scipy.interpolate import CubicSpline
sys.path.insert(0, sys.argv[2]); from glb import vertex_normals
S = sys.argv[1]
hp = json.load(open(f'{S}/work/head_params.json'))
TOP = hp['skull_center'][1] + hp['skull_radii'][1]          # top of skull
HEIGHT = 172.7
FLOOR_D = -164.0                                            # design floor; legs are remapped to the real floor below
FLOOR = TOP - HEIGHT
LS = (FLOOR - (-60)) / (FLOOR_D - (-60))                    # leg length scale (applied below the waistband)
LY = lambda y: np.where(y < -60, -60 + (y + 60) * LS, y)

def srgb2lin(c):
    c = np.asarray(c, float); return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def hexlin(h):
    h = h.lstrip('#'); return list(srgb2lin([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]))
skin_lin = list(srgb2lin(np.array(hp['skin_bgr'][::-1]) / 255 * np.array([0.99, 0.97, 0.95])))
ss = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(np.clip((np.asarray(x) - a) / (b - a), 0, 1))

def grid_tris(K, NA, closed=True):
    t = []
    for i in range(K - 1):
        for j in range(NA if closed else NA - 1):
            a = i * NA + j; b = i * NA + (j + 1) % NA
            t += [[a, a + NA, b], [b, a + NA, b + NA]]
    return np.array(t)
def orient(pos, tris, ref_fn):
    fn = np.cross(pos[tris[:, 1]] - pos[tris[:, 0]], pos[tris[:, 2]] - pos[tris[:, 0]])
    if (np.einsum('ij,ij->i', fn, pos[tris].mean(1) - ref_fn(pos[tris].mean(1))) < 0).mean() > 0.5: tris = tris[:, [0, 2, 1]]
    return tris
def cap(pos, tris, ring_idx, center):
    c = len(pos); pos = np.vstack([pos, center])
    return pos, np.vstack([tris, [[ring_idx[j], ring_idx[(j + 1) % len(ring_idx)], c] for j in range(len(ring_idx))]])
def nearest_ref(cl):
    return lambda fc: cl[np.argmin(np.linalg.norm(fc[:, None, :] - cl[None], axis=2), 1)]
def limb(centers, rf, rs, NA=28, fwd=np.array([0, 0, 1.0]), bulge=None):
    """rings around a centre-line (front/side radii); bulge(i, theta, outward_sign) adds radius per vertex"""
    centers = np.asarray(centers, float)
    T = np.gradient(centers, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
    th = np.linspace(0, 2 * np.pi, NA, endpoint=False); rings = []
    for i, (c, a, f_, s_) in enumerate(zip(centers, T, rf, rs)):
        e1 = fwd - a * (a @ fwd); e1 /= np.linalg.norm(e1); e2 = np.cross(a, e1)
        extra = bulge(i, th, np.sign(e2[0]) if abs(e2[0]) > 1e-6 else 1.0) if bulge else 0
        rings.append(c + ((f_ + extra) * np.cos(th))[:, None] * e1 + ((s_ + extra) * np.sin(th))[:, None] * e2)
    rings = np.array(rings); pos = rings.reshape(-1, 3)
    return pos, orient(pos, grid_tris(len(rings), NA), nearest_ref(centers)), rings
def ring_tube(ring, r, sides=10, drop=0.0):
    ring = np.vstack([ring, ring[:1]]) - np.array([0, drop, 0])
    T = np.gradient(ring, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
    cen = ring.mean(0); out = []; th = np.linspace(0, 2 * np.pi, sides, endpoint=False)
    for p, t in zip(ring, T):
        e1 = p - cen; e1 -= t * (e1 @ t); e1 /= np.linalg.norm(e1); e2 = np.cross(t, e1)
        out.append(p + r * (np.cos(th)[:, None] * e1 + np.sin(th)[:, None] * e2))
    out = np.array(out); P = out.reshape(-1, 3)
    return P, orient(P, grid_tris(len(out), sides), nearest_ref(ring))

parts = {}
def add(name, pos, tris, legs=False, col=None):
    pos = np.asarray(pos, float).copy()
    if legs: pos[:, 1] = LY(pos[:, 1])
    p = parts.setdefault(name, {'P': [], 'T': [], 'C': [], 'n': 0})
    p['P'].append(pos); p['T'].append(np.asarray(tris) + p['n']); p['n'] += len(pos)
    p['C'].append(np.ones((len(pos), 3)) if col is None else col)

# ------------------------------------------------------------------ torso cross-sections (lean V-taper)
LV = np.array([
    # y,     W,    D,    zc,   n
    [-13.4, 5.9, 6.0, -6.1, 2.0],
    [-14.8, 8.7, 7.0, -5.9, 2.2],
    [-16.4, 12.6, 7.9, -5.6, 2.5],
    [-18.4, 15.6, 8.7, -5.3, 2.8],
    [-21.0, 16.9, 9.2, -5.0, 2.9],
    [-25.0, 16.3, 9.7, -5.0, 2.7],
    [-30.0, 15.3, 10.0, -4.9, 2.5],
    [-35.0, 14.3, 9.7, -4.8, 2.4],
    [-42.0, 12.8, 8.9, -4.7, 2.3],
    [-50.0, 11.8, 8.3, -4.6, 2.2],
    [-55.0, 12.1, 8.4, -4.6, 2.2],
    [-60.5, 12.7, 8.7, -4.6, 2.2]])
cs = [CubicSpline(-LV[:, 0], LV[:, k]) for k in range(5)]
NA = 128; ang = np.linspace(-np.pi, np.pi, NA, endpoint=False)

def section(yy, shrink=0.0):
    Wd, Dd, zc, nn = [float(c(-yy)) for c in cs[1:]]
    Wd -= shrink; Dd -= shrink
    ca, sa = np.cos(ang), np.sin(ang)
    r = (np.abs(ca / Dd) ** nn + np.abs(sa / Wd) ** nn) ** (-1 / nn)
    return r, zc

# ---- TEE
ys = -np.linspace(13.4, 60.5, 64); rings = []
for yy in ys:
    r, zc = section(yy)
    ca, sa = np.cos(ang), np.sin(ang)
    py = yy - 2.6 * ss(-17.0, -13.4, yy) * ((ca + 1) / 2) ** 1.6
    pec = 0.6 * np.exp(-((yy + 29.5) / 4.0) ** 2) * np.clip(ca, 0, 1) ** 2 * np.clip(np.abs(sa) * 2.4, 0, 1)
    fold = 0.15 * np.sin(ang * 5 + yy * 0.4) * ss(-40, -55, yy)
    rr = r + pec + fold
    rings.append(np.stack([rr * sa, py, zc + rr * ca], -1))
rings = np.array(rings); pos = rings.reshape(-1, 3)
tris = orient(pos, grid_tris(len(rings), NA), lambda fc: np.c_[np.zeros(len(fc)), fc[:, 1], np.full(len(fc), -4.8)])
add('tee', pos, tris); add('tee', *ring_tube(rings[0], 0.42, drop=0.2)); add('tee', *ring_tube(rings[-1], 0.33))

# ---- SHIRTLESS TORSO with muscle definition
def bump(x, y, cx, cy, rx, ry, p=2.0):
    d = (np.abs(x - cx) / rx) ** p + (np.abs(y - cy) / ry) ** p
    t = np.clip(1 - d, 0, 1); return t * t * (3 - 2 * t)          # smooth edge: no ring artefacts
def seg_dist(x, y, a, b):
    a = np.array(a); b = np.array(b); ab = b - a
    t = np.clip(((x - a[0]) * ab[0] + (y - a[1]) * ab[1]) / (ab @ ab), 0, 1)
    return np.hypot(x - (a[0] + t * ab[0]), y - (a[1] + t * ab[1]))
def muscles(x, y, ca):
    wf = np.clip(ca * 2.2 + 0.2, 0, 1); wb = np.clip(-ca * 2.2 + 0.2, 0, 1); ax = np.abs(x)
    d = np.zeros_like(x)
    # pectorals: soft top, crisp lower border; sternum groove
    for s in (-1, 1):
        ry = np.where(y < -28.0, 4.2, 6.8)
        d += 1.05 * bump(x, y, s * 6.9, -28.0, 7.2, ry, 2.2) * wf
    d -= 0.35 * np.exp(-(x / 1.0) ** 2) * ss(-35, -31, y) * ss(-18, -22, y) * wf
    # clavicles
    d += 0.28 * np.exp(-((y - (-16.6 - 0.06 * ax)) / 0.7) ** 2) * ss(1.5, 3, ax) * (1 - ss(12, 14, ax)) * wf
    # six-pack: three rows of paired blocks, linea alba and tendinous grooves between them
    for cy, h, rx_ in ((-38.2, 0.46, 2.45), (-43.5, 0.48, 2.6), (-48.8, 0.42, 2.7)):
        for s in (-1, 1):
            d += h * bump(x, y, s * (3.0 + 0.1 * (cy + 38)), cy, rx_, 2.55, 2.5) * wf
    d -= 0.28 * np.exp(-(x / 0.55) ** 2) * ss(-55, -51, y) * ss(-33, -36, y) * wf
    d += 0.30 * bump(x, y, 0, -54.0, 5.2, 2.4, 2.4) * wf                           # lower abs
    d -= 0.75 * np.exp(-((x / 0.7) ** 2 + ((y + 52.6) / 0.75) ** 2)) * wf          # navel
    # obliques, V-cut (iliac furrow), serratus
    for s in (-1, 1):
        d += 0.38 * bump(x, y, s * 9.6, -49.5, 2.6, 5.5, 2.2) * wf
        dv = seg_dist(x, y, (s * 9.4, -51.0), (s * 4.4, -60.5))
        d -= 0.5 * np.exp(-(dv / 0.75) ** 2) * ss(-62, -50, y) * wf
        for yy in (-33.5, -37.0, -40.5):
            d += 0.28 * np.exp(-(((x - s * (11.6 + 0.12 * (yy + 33.5))) / 1.1) ** 2 + ((y - yy) / 1.0) ** 2)) * np.clip(np.abs(ca) * 3, 0, 1)
    # back: spine groove, erectors, shoulder blades, lats
    d -= 0.34 * np.exp(-(x / 1.1) ** 2) * ss(-56, -50, y) * ss(-18, -21, y) * wb
    d += 0.3 * np.exp(-((ax - 2.6) / 1.3) ** 2) * ss(-55, -49, y) * ss(-38, -42, y) * wb
    for s in (-1, 1):
        d += 0.35 * bump(x, y, s * 7.4, -28.0, 4.2, 5.4, 2.0) * wb
        d += 0.5 * bump(x, y, s * 11.2, -34.0, 4.0, 8.0, 2.0) * np.clip(-ca * 1.5 + 0.6, 0, 1)
    d *= 1 - ss(-56, -59, y)          # nothing proud of the surface inside the shorts
    return d
ys2 = -np.linspace(12.6, 60.5, 150); rings = []; disp = []
for yy in ys2:
    r, zc = section(yy, shrink=0.55 + 0.9 * ss(-52.5, -55.5, yy))
    if yy > -13.4: r = r * (1 - 0.1 * ss(-13.4, -12.6, yy))   # hug the neck at the top
    ca, sa = np.cos(ang), np.sin(ang)
    dd = muscles(r * sa, np.full(NA, yy), ca)
    rr = r + dd; disp.append(dd)
    rings.append(np.stack([rr * sa, np.full(NA, yy), zc + rr * ca], -1))
rings = np.array(rings); disp = np.array(disp); pos = rings.reshape(-1, 3)
tris = orient(pos, grid_tris(len(rings), NA), lambda fc: np.c_[np.zeros(len(fc)), fc[:, 1], np.full(len(fc), -4.8)])
pd = np.pad(disp, ((1, 1), (0, 0)), mode='edge')
def cv2_blur(a):   # light blur of the curvature map (wraps around the torso)
    import cv2
    return cv2.GaussianBlur(np.tile(a, (1, 3)).astype(np.float32), (0, 0), 1.2)[:, a.shape[1]:2 * a.shape[1]]
lap = (np.roll(disp, 1, 1) + np.roll(disp, -1, 1) - 2 * disp) + (pd[:-2] + pd[2:] - 2 * disp)
ao = 1 - np.clip(cv2_blur(lap) * 2.4, -0.05, 0.3) - 0.08 * np.clip(-disp, 0, 1)          # darker in grooves -> reads as definition
add('torso_skin', pos, tris, col=np.repeat(ao.reshape(-1, 1), 3, 1) * np.array([1.0, 0.985, 0.97]))

# ------------------------------------------------------------------ ARMS, SLEEVES, HANDS
for sx in (1, -1):
    ctrl = np.array([[12.0, -23.4, -5.5], [17.3, -26.6, -5.7], [19.8, -38.5, -6.1], [21.2, -50.5, -6.3], [22.1, -63.0, -5.0], [22.7, -76.0, -3.6]])
    ctrl[:, 0] *= sx
    u = np.r_[0, np.cumsum(np.linalg.norm(np.diff(ctrl, axis=0), axis=1))]
    spl = CubicSpline(u, ctrl); L = u[-1]
    t = np.linspace(0, L, 70); C = spl(t); f = t / L
    kf = [0.0, 0.10, 0.28, 0.48, 0.58, 0.80, 1.0]
    rF = CubicSpline(kf, [3.9, 4.2, 4.05, 3.3, 3.7, 2.9, 1.9])(f)
    rS = CubicSpline(kf, [4.1, 4.5, 3.8, 3.4, 3.9, 3.2, 2.6])(f)
    g = lambda c, w: np.exp(-((f - c) / w) ** 2)
    def arm_bulge(i, th, out):
        fr = np.cos(th); side = np.sin(th) * out          # side > 0: outer side of the arm
        b = 0.95 * g(0.09, 0.075)[i] * np.clip(0.45 + 0.55 * side, 0, 1)          # deltoid cap
        b += 0.85 * g(0.33, 0.09)[i] * np.clip(fr, 0, 1) ** 1.5                    # biceps
        b += 0.7 * g(0.27, 0.10)[i] * np.clip(-fr, 0, 1) ** 1.5                     # triceps
        b += 0.38 * g(0.58, 0.07)[i] * np.clip(0.7 * fr + 0.7 * side, 0, 1) ** 1.5 # brachioradialis
        return b
    P, Tt, R = limb(C, rF, rS, 30, bulge=arm_bulge)
    add('skin_body', P, Tt)
    ns = int(0.36 * 70)
    Ps, Ts, Rs = limb(C[:ns], rF[:ns] + 1.15, rS[:ns] + 1.2, 30)
    add('tee', Ps, Ts); add('tee', *ring_tube(Rs[-1], 0.3))
    # hand
    w0 = C[-1]; ax = (C[-1] - C[-3]); ax /= np.linalg.norm(ax)
    side = np.array([sx * 1.0, 0, 0]); side -= ax * (ax @ side); side /= np.linalg.norm(side)
    across = np.cross(ax, side) * sx
    hs = np.linspace(0, 1, 14); palm_c = w0[None] + ax[None] * (hs * 9.4)[:, None]
    pw = 2.8 + 1.2 * np.sin(np.pi * np.clip(hs * 0.9 + 0.1, 0, 1)) ** 0.6; pt = 1.4 + 0.2 * np.sin(np.pi * hs)
    th = np.linspace(0, 2 * np.pi, 22, endpoint=False)
    pr = np.array([c + pw_ * np.cos(th)[:, None] * across + pt_ * np.sin(th)[:, None] * side for c, pw_, pt_ in zip(palm_c, pw, pt)])
    Pp = pr.reshape(-1, 3); Tp = orient(Pp, grid_tris(len(pr), 22), nearest_ref(palm_c))
    Pp, Tp = cap(Pp, Tp, np.arange(22), w0 - ax * 0.3); add('skin_body', Pp, Tp)
    for fi, (off, flen) in enumerate([(2.45, 7.1), (0.85, 7.9), (-0.85, 7.5), (-2.35, 6.0)]):
        base = palm_c[-1] + across * off - ax * 0.6; s_ = np.linspace(0, 1, 12); curl = 0.55 + 0.1 * fi
        path = base[None] + ax[None] * (np.sin(s_ * curl) / curl * flen)[:, None] - side[None] * ((1 - np.cos(s_ * curl)) / curl * flen)[:, None]
        rad = 0.78 - 0.21 * s_ - 0.05 * abs(fi - 1.5)
        Pf, Tf, _ = limb(path, rad, rad, 10, fwd=across)
        Pf, Tf = cap(Pf, Tf, np.arange(10) + 110, path[-1] + (path[-1] - path[-2]) * 0.6); add('skin_body', Pf, Tf)
    tb = w0 + ax * 2.4 + across * 2.45 - side * 0.8; s_ = np.linspace(0, 1, 10)
    tdir = ax * 0.75 + across * 0.35 - side * 0.55; tdir /= np.linalg.norm(tdir)
    path = tb[None] + tdir[None] * (s_ * 6.1)[:, None] + ax[None] * (s_ ** 2)[:, None]
    Pf, Tf, _ = limb(path, 1.1 - 0.33 * s_, 0.95 - 0.28 * s_, 10, fwd=across)
    Pf, Tf = cap(Pf, Tf, np.arange(10) + 90, path[-1] + tdir * 0.5); add('skin_body', Pf, Tf)

# ------------------------------------------------------------------ SHORTS
LVP = np.array([[-55.0, 11.5, 7.7, -4.6, 2.3], [-59.5, 12.1, 8.1, -4.6, 2.3], [-63.0, 13.2, 8.5, -4.5, 2.3]])
csp = [CubicSpline(-LVP[:, 0], LVP[:, k]) for k in range(5)]
ysp = -np.linspace(55, 63, 10); rings = []
for yy in ysp:
    Wd, Dd, zc, nn = [float(c(-yy)) for c in csp[1:]]
    r = (np.abs(np.cos(ang) / Dd) ** nn + np.abs(np.sin(ang) / Wd) ** nn) ** (-1 / nn)
    rings.append(np.stack([r * np.sin(ang), np.full(NA, yy), zc + r * np.cos(ang)], -1))
rings = np.array(rings); pos = rings.reshape(-1, 3)
tris = orient(pos, grid_tris(len(rings), NA), lambda fc: np.c_[np.zeros(len(fc)), fc[:, 1], np.full(len(fc), -4.4)])
pos, tris = cap(pos, tris, np.arange(NA) + (len(rings) - 1) * NA, [0, -63.0, -4.5])
add('shorts', pos, tris, legs=True); add('shorts', *ring_tube(rings[6], 0.42), legs=True)
for sx in (1, -1):
    yl = np.linspace(-61, -99, 34); kk = ss(-62, -84, yl)
    x = sx * (4.8 + 3.5 * kk + np.clip(np.abs(yl) - 84, 0, None) * 0.04); z = -4.4 + 0.2 * kk
    rad = 8.8 - 1.4 * kk - np.clip(np.abs(yl) - 84, 0, None) * 0.015
    P, Tt, R = limb(np.stack([x, yl, z], -1), rad * (1.05 + 0.05 * (1 - kk)), rad, 44)
    add('shorts', P, Tt, legs=True); add('shorts', *ring_tube(R[-1], 0.33), legs=True)

# ------------------------------------------------------------------ LEGS, SOCKS, SNEAKERS
for sx in (1, -1):
    yk = np.array([-90, -100, -110, -115, -122, -130, -140, -150, -157.5])
    x = sx * (8.1 + (np.abs(yk) - 90) * 0.035)
    z = np.array([-4.0, -3.8, -3.6, -3.6, -4.3, -4.9, -4.6, -4.2, -4.4])
    rf = np.array([6.2, 6.0, 5.3, 4.8, 5.3, 5.7, 4.6, 3.5, 3.1])
    rs = np.array([6.3, 6.1, 5.2, 4.7, 5.0, 5.1, 4.1, 3.1, 2.8])
    tt = np.linspace(0, 1, len(yk)); t2 = np.linspace(0, 1, 50)
    C = np.stack([CubicSpline(tt, x)(t2), CubicSpline(tt, yk)(t2), CubicSpline(tt, z)(t2)], -1)
    RF = CubicSpline(tt, rf)(t2); RS = CubicSpline(tt, rs)(t2)
    def leg_bulge(i, th, out):   # quad sweep above the knee, calf head at the back
        yy = C[i, 1]; fr = np.cos(th)
        return 0.35 * np.exp(-((yy + 104) / 6) ** 2) * np.clip(fr, 0, 1) ** 1.5 + 0.4 * np.exp(-((yy + 128) / 5) ** 2) * np.clip(-fr, 0, 1) ** 1.5
    P, Tt, R = limb(C, RF, RS, 28, bulge=leg_bulge); add('skin_body', P, Tt, legs=True)
    sock = C[:, 1] < -141
    P, Tt, R = limb(C[sock], RF[sock] + 0.3, RS[sock] + 0.3, 28)
    add('socks', P, Tt, legs=True); add('socks', *ring_tube(R[0], 0.3), legs=True)
    ank = C[-1]; yaw = np.radians(6) * sx
    fdir = np.array([np.sin(yaw), 0, np.cos(yaw)]); lat = np.array([np.cos(yaw), 0, -np.sin(yaw)])
    st = np.linspace(0, 1, 30); zpos = -6.3 + st * 26.0
    wid = 3.75 + 0.85 * np.sin(np.pi * np.clip(st * 1.05, 0, 1)) + 0.3 * st
    wid *= np.where(st > 0.88, np.sqrt(np.clip((1 - st) / 0.12, 0.05, 1)), 1) * np.where(st < 0.06, np.sqrt(np.clip(st / 0.06, 0.25, 1)), 1)
    top = FLOOR_D + 3.0 + np.where(st < 0.32, 6.8 - st * 3.5, 5.7 - (st - 0.32) * 5.4)
    top = np.where(st > 0.85, FLOOR_D + 3.0 + (top - FLOOR_D - 3.0) * np.clip((1 - st) / 0.15, 0.2, 1) ** 0.5, top)
    bot = FLOOR_D + 2.6 + np.clip(st - 0.85, 0, 1) * 6
    thh = np.linspace(0, 2 * np.pi, 30, endpoint=False)
    def shoe_sec(i, inflate, ytop, ybot):
        yt = ytop[i] + inflate; yb = ybot[i] - inflate * 0.3
        hw = wid[i] + inflate; yc = (yt + yb) / 2; hh = (yt - yb) / 2
        cx = np.sign(np.cos(thh)) * np.abs(np.cos(thh)) ** 0.7; sy = np.sin(thh)
        sy = np.where(sy < 0, -np.abs(sy) ** 0.35, np.abs(sy) ** 0.9)
        b0 = np.array([ank[0], 0, ank[2]]) + fdir * zpos[i]
        return b0[None] + (hw * cx)[:, None] * lat[None] + np.c_[np.zeros(30), yc + hh * sy, np.zeros(30)]
    for nm, infl, yts, ybs in (('shoe_upper', 0.0, top, bot),
                               ('shoe_sole', 0.45, FLOOR_D + 3.0 + np.clip(st - 0.86, 0, 1) * 5, np.full(len(st), FLOOR_D) + np.clip(st - 0.86, 0, 1) * 7)):
        sec = np.array([shoe_sec(i, infl, yts, ybs) for i in range(len(st))])
        Pu = sec.reshape(-1, 3)
        axl = np.array([np.array([ank[0], 0, ank[2]]) + fdir * zz + [0, (a + b) / 2, 0] for zz, a, b in zip(zpos, yts, ybs)])
        Tu = orient(Pu, grid_tris(len(sec), 30), nearest_ref(axl))
        Pu, Tu = cap(Pu, Tu, np.arange(30), axl[0]); Pu, Tu = cap(Pu, Tu, np.arange(30) + 29 * 30, axl[-1])
        add(nm, Pu, Tu, legs=True)

META = {
    'tee': dict(name='Tee', color=hexlin('#2f5db8') + [1], rough=0.88,
                extras={'group': 'body_tee', 'swatches': {'Royal': '#2f5db8', 'Heather blue': '#6d8db6', 'White': '#e9e9e7', 'Black': '#1c1d20', 'Grey': '#8b8d91'}}),
    'torso_skin': dict(name='TorsoSkin', color=skin_lin + [1], rough=0.5, extras={'group': 'body_shirtless'}),
    'skin_body': dict(name='BodySkin', color=skin_lin + [1], rough=0.52, extras={'group': 'body'}),
    'shorts': dict(name='Shorts', color=hexlin('#141518') + [1], rough=0.7, extras={'group': 'body'}),
    'socks': dict(name='Socks', color=hexlin('#ebebe8') + [1], rough=0.9, extras={'group': 'body'}),
    'shoe_upper': dict(name='ShoeUpper', color=hexlin('#a7abb1') + [1], rough=0.32, extras={'group': 'body', 'metal': 0.5}),
    'shoe_sole': dict(name='ShoeSole', color=hexlin('#f1f1ef') + [1], rough=0.6, extras={'group': 'body'}),
}
for k, p in parts.items():
    P = np.vstack(p['P']); T = np.vstack(p['T']); d = dict(pos=P, tris=T, nrm=vertex_normals(P, T), meta=json.dumps(META[k]))
    if k == 'torso_skin': d['col'] = np.clip(np.vstack(p['C']), 0, 1)
    np.savez(f'{S}/work/body_{k}.npz', **d)
    print(f'body_{k}: {len(P)} verts {len(T)} tris')
allp = np.vstack([np.vstack(p['P']) for p in parts.values()])
print(f'height check: skull top {TOP:.1f}, floor {allp[:, 1].min():.1f} -> {TOP - allp[:, 1].min():.1f} cm')
