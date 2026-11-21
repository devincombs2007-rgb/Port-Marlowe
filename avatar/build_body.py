"""Procedural full body (tee, arms, hands, shorts, legs, socks, sneakers) in the head's frame (~cm, y up, z forward).
Proportions follow the mirror shots: lean athletic build, ~178 cm; relaxed A-pose."""
import sys, json, numpy as np
from scipy.interpolate import CubicSpline
sys.path.insert(0, sys.argv[2]); from glb import vertex_normals
S = sys.argv[1]
rng = np.random.default_rng(11)
FLOOR = -164.0

def srgb2lin(c):
    c = np.asarray(c, float); return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def hexlin(h):
    h = h.lstrip('#'); return list(srgb2lin([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]))
sk = json.load(open(f'{S}/work/skin.json'))['skin_bgr'][::-1]
skin_lin = list(srgb2lin(np.array(sk) / 255 * np.array([0.93, 0.90, 0.88])))
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
    fc = pos[tris].mean(1)
    if (np.einsum('ij,ij->i', fn, fc - ref_fn(fc)) < 0).mean() > 0.5: tris = tris[:, [0, 2, 1]]
    return tris

def cap(pos, tris, ring_idx, center):
    c = len(pos); pos = np.vstack([pos, center])
    t = [[ring_idx[j], ring_idx[(j + 1) % len(ring_idx)], c] for j in range(len(ring_idx))]
    return pos, np.vstack([tris, t])

def limb(centers, rf, rs, NA=28, fwd=np.array([0, 0, 1.0])):
    """rings around a centre-line; elliptical (front/side radii), oriented by a fixed forward vector"""
    centers = np.asarray(centers, float)
    T = np.gradient(centers, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
    th = np.linspace(0, 2 * np.pi, NA, endpoint=False)
    rings = []
    for c, a, f_, s_ in zip(centers, T, rf, rs):
        e1 = fwd - a * (a @ fwd); e1 /= np.linalg.norm(e1); e2 = np.cross(a, e1)
        rings.append(c + f_ * np.cos(th)[:, None] * e1 + s_ * np.sin(th)[:, None] * e2)
    rings = np.array(rings); K = len(rings)
    pos = rings.reshape(-1, 3); tris = grid_tris(K, NA)
    cl = centers
    def ref(fc):
        d = np.linalg.norm(fc[:, None, :] - cl[None], axis=2); return cl[np.argmin(d, 1)]
    return pos, orient(pos, tris, ref), rings

parts = {}
def add(name, pos, tris, meta):
    pos = np.asarray(pos, float); tris = np.asarray(tris)
    parts.setdefault(name, {'P': [], 'T': [], 'meta': meta, 'n': 0})
    p = parts[name]; p['P'].append(pos); p['T'].append(tris + p['n']); p['n'] += len(pos)

# ------------------------------------------------------------------ TEE (torso)
lv = np.array([
    # y,     W,    D,    zc,   n
    [-13.4, 6.3, 6.6, -5.0, 2.0],
    [-14.8, 9.2, 7.6, -5.0, 2.2],
    [-16.4, 13.6, 8.6, -5.0, 2.5],
    [-18.4, 17.4, 9.4, -5.0, 2.8],
    [-21.0, 19.2, 10.0, -5.0, 2.9],
    [-25.0, 18.6, 10.6, -5.0, 2.7],
    [-30.0, 17.4, 11.0, -5.0, 2.5],
    [-35.0, 16.4, 10.8, -4.9, 2.4],
    [-42.0, 14.9, 10.0, -4.7, 2.3],
    [-50.0, 14.0, 9.4, -4.6, 2.2],
    [-55.0, 14.4, 9.5, -4.6, 2.2],
    [-60.5, 14.95, 9.75, -4.6, 2.2]])
cs = [CubicSpline(-lv[:, 0], lv[:, k]) for k in range(5)]
ys = -np.linspace(13.4, 60.5, 64); NA = 112
ang = np.linspace(-np.pi, np.pi, NA, endpoint=False)
rings = []
for yy in ys:
    Wd, Dd, zc, nn = [float(c(-yy)) for c in cs[1:]]
    ca, sa = np.cos(ang), np.sin(ang)
    r = (np.abs(ca / Dd) ** nn + np.abs(sa / Wd) ** nn) ** (-1 / nn)
    k = ss(-17.0, -13.4, yy)
    py = yy - 2.6 * k * ((ca + 1) / 2) ** 1.6                                  # crew neck dips in front
    pec = 0.9 * np.exp(-((yy + 31.5) / 4.0) ** 2) * np.clip(ca, 0, 1) ** 2 * np.clip(np.abs(sa) * 2.4, 0, 1)
    lat = 0.6 * np.exp(-((yy + 33) / 6) ** 2) * np.clip(np.abs(sa) - 0.6, 0, 1) * 2
    fold = 0.15 * np.sin(ang * 5 + yy * 0.4) * ss(-40, -55, yy)
    rr = r + pec + lat + fold
    rings.append(np.stack([rr * sa, py, zc + rr * ca], -1))
rings = np.array(rings); pos = rings.reshape(-1, 3); tris = grid_tris(len(rings), NA)
tris = orient(pos, tris, lambda fc: np.c_[np.zeros(len(fc)), fc[:, 1], np.full(len(fc), -4.8)])
add('tee', pos, tris, None)
def ring_tube(ring, r, sides=10, drop=0.0):
    """thick rolled edge (collar / hem) following a closed ring"""
    ring = np.vstack([ring, ring[:1]]) - np.array([0, drop, 0])
    T = np.gradient(ring, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
    cen = ring.mean(0); out = []
    th = np.linspace(0, 2 * np.pi, sides, endpoint=False)
    for p, t in zip(ring, T):
        e1 = p - cen; e1 -= t * (e1 @ t); e1 /= np.linalg.norm(e1); e2 = np.cross(t, e1)
        out.append(p + r * (np.cos(th)[:, None] * e1 + np.sin(th)[:, None] * e2))
    out = np.array(out); P = out.reshape(-1, 3); Tt = grid_tris(len(out), sides)
    return P, orient(P, Tt, lambda fc: ring[np.argmin(np.linalg.norm(fc[:, None] - ring[None], axis=2), 1)])
add('tee', *ring_tube(rings[0], 0.45, drop=0.2), None)
add('tee', *ring_tube(rings[-1], 0.35), None)

# ------------------------------------------------------------------ ARMS + SLEEVES + HANDS
for sx in (1, -1):
    ctrl = np.array([[13.0, -24.2, -5.6], [19.2, -27.4, -5.8], [21.8, -38.5, -6.2], [23.4, -50.5, -6.4], [24.4, -63.0, -5.0], [25.0, -75.0, -3.6]])
    ctrl[:, 0] *= sx
    u = np.r_[0, np.cumsum(np.linalg.norm(np.diff(ctrl, axis=0), axis=1))]
    spl = CubicSpline(u, ctrl); L = u[-1]
    t = np.linspace(0, L, 60); C = spl(t); f = t / L
    # radius profile (front/back, side): deltoid, biceps, elbow, forearm, wrist
    kf = [0.0, 0.10, 0.28, 0.48, 0.58, 0.80, 1.0]
    rF = CubicSpline(kf, [4.6, 5.2, 5.0, 3.8, 4.3, 3.3, 2.0])(f)
    rS = CubicSpline(kf, [4.8, 5.5, 4.7, 3.9, 4.6, 3.6, 2.9])(f)
    P, Tt, R = limb(C, rF, rS, 26)
    add('skin_body', P, Tt, None)
    # sleeve: to mid-biceps, looser than the arm
    ns = int(0.36 * 60)
    Ps, Ts, Rs = limb(C[:ns], rF[:ns] + 0.8 + 0.2 * (1 - f[:ns] / f[ns]), rS[:ns] + 0.9 + 0.2 * (1 - f[:ns] / f[ns]), 26)
    add('tee', Ps, Ts, None)
    add('tee', *ring_tube(Rs[-1], 0.3), None)
    # hand: palm + four fingers + thumb, relaxed, palm facing the thigh
    w0 = C[-1]; ax = (C[-1] - C[-3]); ax /= np.linalg.norm(ax)
    side = np.array([sx * 1.0, 0, 0]); side -= ax * (ax @ side); side /= np.linalg.norm(side)  # palm normal points to the body (-side)
    across = np.cross(ax, side) * sx                                                        # forward (thumb side) on both hands
    hs = np.linspace(0, 1, 14)
    palm_c = w0[None] + ax[None] * (hs * 10.0)[:, None]
    pw = 3.0 + 1.3 * np.sin(np.pi * np.clip(hs * 0.9 + 0.1, 0, 1)) ** 0.6     # half width across
    pt = 1.5 + 0.2 * np.sin(np.pi * hs)                                         # half thickness
    th = np.linspace(0, 2 * np.pi, 22, endpoint=False)
    pr = np.array([c + pw_ * np.cos(th)[:, None] * across + pt_ * np.sin(th)[:, None] * side for c, pw_, pt_ in zip(palm_c, pw, pt)])
    Pp = pr.reshape(-1, 3); Tp = grid_tris(len(pr), 22)
    Tp = orient(Pp, Tp, lambda fc: palm_c[np.argmin(np.linalg.norm(fc[:, None] - palm_c[None], axis=2), 1)])
    Pp, Tp = cap(Pp, Tp, np.arange(22), w0 - ax * 0.3)
    add('skin_body', Pp, Tp, None)
    tip_base = palm_c[-1]
    for fi, (off, flen) in enumerate([(2.6, 7.5), (0.9, 8.4), (-0.9, 8.0), (-2.5, 6.4)]):
        base = tip_base + across * off - ax * 0.6
        s_ = np.linspace(0, 1, 12)
        curl = 0.55 + 0.1 * fi
        path = base[None] + ax[None] * (np.sin(s_ * curl) / curl * flen)[:, None] - side[None] * ((1 - np.cos(s_ * curl)) / curl * flen)[:, None]
        rad = 0.82 - 0.22 * s_ - 0.06 * abs(fi - 1.5)
        Pf, Tf, Rf = limb(path, rad, rad, 10, fwd=across)
        Pf, Tf = cap(Pf, Tf, np.arange(10) + 11 * 10, path[-1] + (path[-1] - path[-2]) * 0.6)
        add('skin_body', Pf, Tf, None)
    tb = w0 + ax * 2.5 + across * 2.6 - side * 0.8
    s_ = np.linspace(0, 1, 10)
    tdir = (ax * 0.75 + across * 0.35 - side * 0.55); tdir /= np.linalg.norm(tdir)
    path = tb[None] + tdir[None] * (s_ * 6.5)[:, None] + ax[None] * (s_ ** 2 * 1.0)[:, None]
    Pf, Tf, _ = limb(path, 1.15 - 0.35 * s_, 1.0 - 0.3 * s_, 10, fwd=across)
    Pf, Tf = cap(Pf, Tf, np.arange(10) + 9 * 10, path[-1] + tdir * 0.5)
    add('skin_body', Pf, Tf, None)

# ------------------------------------------------------------------ SHORTS
lvp = np.array([[-55.0, 13.9, 9.0, -4.6, 2.3], [-59.5, 14.5, 9.3, -4.6, 2.3], [-63.0, 15.3, 9.4, -4.5, 2.3]])
csp = [CubicSpline(-lvp[:, 0], lvp[:, k]) for k in range(5)]
ysp = -np.linspace(55, 63, 10); rings = []
for yy in ysp:
    Wd, Dd, zc, nn = [float(c(-yy)) for c in csp[1:]]
    r = (np.abs(np.cos(ang) / Dd) ** nn + np.abs(np.sin(ang) / Wd) ** nn) ** (-1 / nn)
    rings.append(np.stack([r * np.sin(ang), np.full(NA, yy), zc + r * np.cos(ang)], -1))
rings = np.array(rings); pos = rings.reshape(-1, 3); tris = grid_tris(len(rings), NA)
tris = orient(pos, tris, lambda fc: np.c_[np.zeros(len(fc)), fc[:, 1], np.full(len(fc), -4.4)])
pos, tris = cap(pos, tris, np.arange(NA) + (len(rings) - 1) * NA, [0, -63.0, -4.5])
add('shorts', pos, tris, None)
add('shorts', *ring_tube(rings[6], 0.45), None)   # waistband roll (just below the tee hem)
LEG_TOP = {1: np.array([8.6, -74.0, -4.2]), -1: np.array([-8.6, -74.0, -4.2])}
for sx in (1, -1):
    yl = np.linspace(-61, -99, 34)
    kk = ss(-62, -84, yl)
    x = sx * (5.5 + 3.8 * kk + np.clip(np.abs(yl) - 84, 0, None) * 0.04); z = -4.4 + 0.2 * kk
    C = np.stack([x, yl, z], -1)
    rad = 10.0 - 1.6 * kk - np.clip(np.abs(yl) - 84, 0, None) * 0.015
    P, Tt, R = limb(C, rad * (1.05 + 0.05 * (1 - kk)), rad, 44)
    add('shorts', P, Tt, None)
    add('shorts', *ring_tube(R[-1], 0.35), None)

# ------------------------------------------------------------------ LEGS, SOCKS, SNEAKERS
for sx in (1, -1):
    yk = np.array([-90, -100, -110, -115, -122, -130, -140, -150, -157.5])
    x = sx * (9.4 + (np.abs(yk) - 90) * 0.035)
    z = np.array([-4.0, -3.8, -3.6, -3.6, -4.2, -4.8, -4.6, -4.2, -4.4])
    rf = np.array([6.8, 6.6, 5.9, 5.3, 5.7, 6.2, 5.2, 3.9, 3.4])
    rs = np.array([6.9, 6.7, 5.8, 5.2, 5.4, 5.6, 4.6, 3.4, 3.0])
    tt = np.linspace(0, 1, len(yk)); t2 = np.linspace(0, 1, 50)
    C = np.stack([CubicSpline(tt, x)(t2), CubicSpline(tt, yk)(t2), CubicSpline(tt, z)(t2)], -1)
    RF = CubicSpline(tt, rf)(t2); RS = CubicSpline(tt, rs)(t2)
    P, Tt, R = limb(C, RF, RS, 28)
    add('skin_body', P, Tt, None)
    sock = C[:, 1] < -141
    P, Tt, R = limb(C[sock], RF[sock] + 0.3, RS[sock] + 0.3, 28)
    add('socks', P, Tt, None); add('socks', *ring_tube(R[0], 0.32), None)
    # sneaker: loft along the foot from heel to toe, slight toe-out
    ank = C[-1]; yaw = np.radians(6) * sx
    fdir = np.array([np.sin(yaw), 0, np.cos(yaw)]); lat = np.array([np.cos(yaw), 0, -np.sin(yaw)])
    st = np.linspace(0, 1, 30)
    zpos = -6.6 + st * 27.0                                          # along foot, relative to ankle
    wid = 3.9 + 0.9 * np.sin(np.pi * np.clip(st * 1.05, 0, 1)) + 0.3 * st
    wid *= np.where(st > 0.88, np.sqrt(np.clip((1 - st) / 0.12, 0.05, 1)), 1)
    wid *= np.where(st < 0.06, np.sqrt(np.clip(st / 0.06, 0.25, 1)), 1)
    top = FLOOR + 3.0 + np.where(st < 0.32, 7.0 - st * 3.5, 5.9 - (st - 0.32) * 5.6)
    top = np.where(st > 0.85, FLOOR + 3.0 + (top - FLOOR - 3.0) * np.clip((1 - st) / 0.15, 0.2, 1) ** 0.5, top)
    bot = FLOOR + 2.6 + np.clip(st - 0.85, 0, 1) * 6
    th = np.linspace(0, 2 * np.pi, 30, endpoint=False)
    def section(i, inflate=0.0, ytop=None, ybot=None):
        yt = (top[i] if ytop is None else ytop[i]) + inflate; yb = (bot[i] if ybot is None else ybot[i]) - inflate * 0.3
        hw = wid[i] + inflate; yc = (yt + yb) / 2; hh = (yt - yb) / 2
        cx = np.sign(np.cos(th)) * np.abs(np.cos(th)) ** 0.7; sy = np.sin(th)
        sy = np.where(sy < 0, -np.abs(sy) ** 0.35, np.abs(sy) ** 0.9)
        base = np.array([ank[0], 0, ank[2]]) + fdir * zpos[i]
        return base[None] + (hw * cx)[:, None] * lat[None] + np.c_[np.zeros(30), yc + hh * sy, np.zeros(30)]
    up = np.array([section(i) for i in range(len(st))])
    Pu = up.reshape(-1, 3); Tu = grid_tris(len(up), 30)
    axisl = np.array([np.array([ank[0], 0, ank[2]]) + fdir * zz + [0, (tp + bt) / 2, 0] for zz, tp, bt in zip(zpos, top, bot)])
    Tu = orient(Pu, Tu, lambda fc: axisl[np.argmin(np.linalg.norm(fc[:, None] - axisl[None], axis=2), 1)])
    Pu, Tu = cap(Pu, Tu, np.arange(30), axisl[0]); Pu, Tu = cap(Pu, Tu, np.arange(30) + 29 * 30, axisl[-1])
    add('shoe_upper', Pu, Tu, None)
    stp = FLOOR + 3.0 + np.clip(st - 0.86, 0, 1) * 5; sbt = np.full(len(st), FLOOR) + np.clip(st - 0.86, 0, 1) * 7
    so = np.array([section(i, 0.45, stp, sbt) for i in range(len(st))])
    Ps = so.reshape(-1, 3); Ts = grid_tris(len(so), 30)
    axs = np.array([np.array([ank[0], 0, ank[2]]) + fdir * zz + [0, (a + b) / 2, 0] for zz, a, b in zip(zpos, stp, sbt)])
    Ts = orient(Ps, Ts, lambda fc: axs[np.argmin(np.linalg.norm(fc[:, None] - axs[None], axis=2), 1)])
    Ps, Ts = cap(Ps, Ts, np.arange(30), axs[0]); Ps, Ts = cap(Ps, Ts, np.arange(30) + 29 * 30, axs[-1])
    add('shoe_sole', Ps, Ts, None)

META = {
    'tee': dict(name='Tee', color=hexlin('#2f5db8') + [1], rough=0.88,
                extras={'group': 'body', 'swatches': {'Royal': '#2f5db8', 'Heather blue': '#6d8db6', 'White': '#e9e9e7', 'Black': '#1c1d20', 'Grey': '#8b8d91'}}),
    'skin_body': dict(name='BodySkin', color=skin_lin + [1], rough=0.55, extras={'group': 'body'}),
    'shorts': dict(name='Shorts', color=hexlin('#141518') + [1], rough=0.7, extras={'group': 'body'}),
    'socks': dict(name='Socks', color=hexlin('#ebebe8') + [1], rough=0.9, extras={'group': 'body'}),
    'shoe_upper': dict(name='ShoeUpper', color=hexlin('#a7abb1') + [1], rough=0.32, extras={'group': 'body', 'metal': 0.5}),
    'shoe_sole': dict(name='ShoeSole', color=hexlin('#f1f1ef') + [1], rough=0.6, extras={'group': 'body'}),
}
for k, p in parts.items():
    P = np.vstack(p['P']); T = np.vstack(p['T'])
    np.savez(f'{S}/work/body_{k}.npz', pos=P, tris=T, nrm=vertex_normals(P, T), meta=json.dumps(META[k]))
    print(f'body_{k}: {len(P)} verts {len(T)} tris')
