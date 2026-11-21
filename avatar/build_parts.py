"""Procedural parts around the reconstructed head: ears, curly hair, hoodie bust, plinth.
Units: canonical face frame, ~cm. x = subject's left/right, y up, z forward."""
import sys, json, numpy as np, cv2
from scipy.interpolate import CubicSpline
from scipy.spatial import cKDTree
sys.path.insert(0, sys.argv[2]); from glb import vertex_normals
S = sys.argv[1]
rng = np.random.default_rng(7)
X = np.load(f'{S}/work/shape.npy')[:468]
H = np.load(f'{S}/work/head.npz')
hp = json.load(open(f'{S}/work/head_params.json'))
C = np.array(hp['C']); NR, NC = int(H['NR']), int(H['NC']); W = NC + 1
NRH = 176
skin_bgr = None

def srgb2lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def hexlin(h):
    h = h.lstrip('#'); return srgb2lin([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])

def save(name, pos, tris, meta, col=None, nrm=None):
    pos = np.asarray(pos, float); tris = np.asarray(tris, np.int64)
    if nrm is None: nrm = vertex_normals(pos, tris)
    d = dict(pos=pos, tris=tris, nrm=nrm, meta=json.dumps(meta))
    if col is not None: d['col'] = np.asarray(col, float)
    np.savez(f'{S}/work/{name}.npz', **d)
    print(f'{name}: {len(pos)} verts {len(tris)} tris')

def orient_outward(pos, tris, centers):
    """flip winding so face normals point away from `centers` (per-face reference points)"""
    fn = np.cross(pos[tris[:, 1]] - pos[tris[:, 0]], pos[tris[:, 2]] - pos[tris[:, 0]])
    fc = pos[tris].mean(1)
    if (np.einsum('ij,ij->i', fn, fc - centers) < 0).mean() > 0.5: tris = tris[:, [0, 2, 1]]
    return tris

# ---------------------------------------------------------------- head radius lookup (for collisions)
G = H['pos'][:NR * W].reshape(NR, W, 3)[:NRH, :NC]
Rg = np.linalg.norm(G - C, axis=2)
th = np.radians(np.linspace(3, 154, NRH)); ph = np.radians(np.linspace(-180, 180, NC, endpoint=False))
def head_r(q):
    d = q - C; r = np.linalg.norm(d, axis=-1); d = d / r[..., None]
    t = np.degrees(np.arccos(np.clip(d[..., 1], -1, 1))); p = np.degrees(np.arctan2(d[..., 0], d[..., 2]))
    fi = np.clip((t - 3) / (151) * (NRH - 1), 0, NRH - 1.001); fj = (p + 180) / 360 * NC
    i0 = np.floor(fi).astype(int); j0 = np.floor(fj).astype(int) % NC; j1 = (j0 + 1) % NC
    a = fi - i0; b = fj - np.floor(fj)
    rr = (Rg[i0, j0] * (1 - a) * (1 - b) + Rg[i0 + 1, j0] * a * (1 - b) + Rg[i0, j1] * (1 - a) * b + Rg[i0 + 1, j1] * a * b)
    return r, rr, d
def push_out(q, margin):
    r, rr, d = head_r(q); bad = r < rr + margin
    q = q.copy(); q[bad] = C + d[bad] * (rr[bad] + margin)[:, None]
    return q
def surf_x(y, z, side):
    """x of head surface at (y,z) on the given side (+1/-1), by marching"""
    for x in np.linspace(0, 12, 600):
        q = np.array([[side * x, y, z]]); r, rr, _ = head_r(q)
        if r[0] > rr[0]: return side * x
    return side * 8

# ---------------------------------------------------------------- skin tone
sk = json.load(open(f'{S}/work/head_params.json'))['skin_bgr'][::-1]
skin_lin = srgb2lin(np.array(sk) / 255)

# ---------------------------------------------------------------- EARS
def build_ear(side):
    ns, na = 16, 64
    s = np.linspace(0, 1, ns); al = np.linspace(0, 2 * np.pi, na, endpoint=False)
    S_, A_ = np.meshgrid(s, al, indexing='ij')
    sa = np.sin(A_)
    a = (1.72 + 0.32 * sa) * 1.06              # half width (wider at top, narrow lobe)
    b = np.where(sa > 0, 3.25, 3.35) * 1.06    # half height
    u = (1 - S_) * a * np.cos(A_); v = (1 - S_) * b * sa
    deg = np.degrees(A_) % 360
    def band(x, c, wdt):  # smooth bump 1 at c, 0 beyond wdt (degrees, circular)
        dd = np.minimum(np.abs(x - c), 360 - np.abs(x - c)); return np.clip(1 - dd / wdt, 0, 1) ** 2 * (3 - 2 * np.clip(1 - dd / wdt, 0, 1))
    front = band(deg, 180, 55)                 # attachment side
    lobe = band(deg, 268, 40)
    rimk = (1 - front) * (1 - 0.85 * lobe)
    w = np.zeros_like(S_)
    w += np.where(S_ < 0.2, 0.42 * np.sin(np.pi * np.clip(S_ / 0.2, 0, 1)) ** 0.8, 0) * rimk
    w += np.where((S_ > 0.3) & (S_ < 0.54), 0.30 * np.sin(np.pi * np.clip((S_ - 0.3) / 0.24, 0, 1)), 0) * (1 - front) * (1 - lobe)
    w += np.where(S_ > 0.54, -0.55 * np.sin(np.pi / 2 * np.clip((S_ - 0.54) / 0.46, 0, 1)), 0) * (1 - lobe)
    w += lobe * 0.12 * (1 - S_)
    w -= front * 0.55 * (1 - S_) ** 0.5        # tuck front edge into the head
    tilt = np.tan(np.radians(40))
    w += (u + a) * tilt * (1 - 0.5 * front)
    # back skirt rings: from rim toward the head
    rim_u, rim_v, rim_w = u[0], v[0], w[0]
    sk_rings = []
    for k, t in enumerate(np.linspace(0.2, 1.0, 6)):
        sk_rings.append(np.stack([rim_u * (1 - 0.18 * t), rim_v * (1 - 0.12 * t), rim_w * (1 - t) - 0.9 * t - 0.05], -1))
    front_grid = np.stack([u, v, w], -1)            # ns x na x 3 (row0 = rim)
    grid = np.concatenate([np.stack(sk_rings[::-1]), front_grid], 0)  # skirt (inner->rim) then front (rim->center)
    nrows = grid.shape[0]
    # local frame -> head
    y_e = 1.25; z_e = X[234, 2] - 0.7 - 1.72
    x_s = surf_x(y_e, z_e, side) - side * 0.25
    O = np.array([x_s, y_e, z_e])
    rot = np.radians(14)  # ears lean back slightly
    uhat = np.array([0, np.sin(rot), -np.cos(rot)]); vhat = np.array([0, np.cos(rot), np.sin(rot)]); what = np.array([side, 0, 0])
    P = O + grid[..., 0:1] * uhat + grid[..., 1:2] * vhat + grid[..., 2:3] * what
    pos = P.reshape(-1, 3)
    tris = []
    for i in range(nrows - 1):
        for j in range(na):
            p0 = i * na + j; p1 = i * na + (j + 1) % na; p2 = p0 + na; p3 = p1 + na
            tris += [[p0, p2, p1], [p1, p2, p3]]
    cidx = len(pos); pos = np.vstack([pos, P[-1].mean(0)])
    for j in range(na): tris.append([(nrows - 1) * na + j, cidx, (nrows - 1) * na + (j + 1) % na])
    tris = np.array(tris)
    # orient: front surface should face +what (outward)
    fn = np.cross(pos[tris[:, 1]] - pos[tris[:, 0]], pos[tris[:, 2]] - pos[tris[:, 0]])
    rows_front = (tris[:, 0] // na) >= len(sk_rings)
    if (fn[rows_front] @ what).mean() < 0: tris = tris[:, [0, 2, 1]]
    return pos, tris

ep, et = [], []; off = 0
for side in (1, -1):
    p, t = build_ear(side); ep.append(p); et.append(t + off); off += len(p)
ear_pos = np.vstack(ep); ear_tris = np.vstack(et)
save('ears', ear_pos, ear_tris, dict(name='Ears', color=list(skin_lin * np.array([1.0, 0.95, 0.94])) + [1], rough=0.55))

# ---------------------------------------------------------------- HAIR
Hpos = H['pos'][:NR * W].reshape(NR, W, 3)[:NRH, :NC].reshape(-1, 3)
Hn = H['nrm'][:NR * W].reshape(NR, W, 3)[:NRH, :NC].reshape(-1, 3)
isface = H['isface'].reshape(-1)
ss = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(np.clip((x - a) / (b - a), 0, 1))
x, y, z = Hpos.T; ax = np.abs(x)
ear_top = 4.7
front_hl = 7.7 - 0.045 * x ** 2                       # frontal hairline (fringe covers it)
hair = np.zeros(len(Hpos), bool)
hair |= (z > -1.0) & (y > np.maximum(front_hl, ear_top + 0.3))
hair |= (z <= -1.0) & (z > -3.0) & (y > ear_top + 0.2)
hair |= (z <= -3.0) & (z > -2.2 - 6.2) & (y > ear_top)                               # above ear
hair |= (z <= -2.4) & (z > -3.9) & (y > 3.4) & (ax > 5)                                # short sideburn tops
hair |= (z <= -8.4) & (y > -6.3 + 2.8 * (np.clip(ax / 7.5, 0, 1)) ** 2 + 2.0 * ss(-8.4, -10.5, -z) * 0)   # back / nape
hair |= (z <= -8.4) & (z > -9.6) & (y > ear_top - 3.5 * ss(-8.4, -9.6, z * -1 + 0))
hair |= (z <= -7.0) & (y > -2.6 - 2.2 * ss(-7.0, -9.5, z))                           # behind the ear, down to the nape line
hair &= ~(isface & (y < front_hl))
# local hair length & flow
t_top = ss(4.5, 10.5, y); front = ss(-2.0, 4.0, z); back = ss(-6.5, -11.5, z)
L_side = 0.8 + 1.4 * ss(ear_top, ear_top + 4.0, y) ** 1.2   # taper: short at the ears
L_top = 5.4 + 0.8 * front
L_back = 0.7 + 3.0 * ss(-6.3, 9.5, y) ** 1.4               # taper: tight at the nape
Lh = (L_side * (1 - t_top) + L_top * t_top) * (1 - back) + L_back * back
thick = np.where(t_top > 0.5, 1, 0)

# blue-noise roots (dart throwing on candidate verts)
cand = np.where(hair)[0]; rng.shuffle(cand)
spacing = 0.46 + 0.06 * (1 - t_top[cand])
tree_pts = []; roots = []
grid_h = {}
def key(p, c=0.7): return tuple(np.floor(p / c).astype(int))
for idx, sp_ in zip(cand, spacing):
    p = Hpos[idx]; k = key(p); ok = True
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for q in grid_h.get((k[0] + dx, k[1] + dy, k[2] + dz), []):
                    if np.sum((Hpos[q] - p) ** 2) < sp_ * sp_: ok = False; break
                if not ok: break
            if not ok: break
        if not ok: break
    if ok: roots.append(idx); grid_h.setdefault(k, []).append(idx)
roots = np.array(roots)
print('hair roots', len(roots))

def frames(sp):
    T = np.gradient(sp, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-9
    a = np.array([0.3, 1, 0.2]); N = np.cross(T[0], a); N /= np.linalg.norm(N)
    Ns = [N]
    for k in range(1, len(sp)):
        n = Ns[-1] - T[k] * (Ns[-1] @ T[k]); n /= np.linalg.norm(n) + 1e-9; Ns.append(n)
    Ns = np.array(Ns); B = np.cross(T, Ns)
    return T, Ns, B

def tube(sp, rad, sides):
    T, N, B = frames(sp)
    ang = np.linspace(0, 2 * np.pi, sides, endpoint=False)
    dirs = np.cos(ang)[None, :, None] * N[:, None, :] + np.sin(ang)[None, :, None] * B[:, None, :]
    P = sp[:, None, :] + rad[:, None, None] * dirs
    M = len(sp); tris = []
    for i in range(M - 1):
        for j in range(sides):
            a0 = i * sides + j; a1 = i * sides + (j + 1) % sides
            tris += [[a0, a1, a0 + sides], [a1, a1 + sides, a0 + sides]]
    tris = np.array(tris)
    fn = np.cross(P.reshape(-1, 3)[tris[0, 1]] - P.reshape(-1, 3)[tris[0, 0]], P.reshape(-1, 3)[tris[0, 2]] - P.reshape(-1, 3)[tris[0, 0]])
    if fn @ dirs.reshape(-1, 3)[tris[0, 0]] < 0: tris = tris[:, [0, 2, 1]]
    return P.reshape(-1, 3), tris, dirs.reshape(-1, 3)

root_c = hexlin('#2a1b11'); mid_c = hexlin('#523a25'); tip_c = hexlin('#7f5f3d'); tip_sun = hexlin('#a6835a')
HP, HT, HN, HC = [], [], [], []; voff = 0
up = np.array([0, 1, 0.]); fwd = np.array([0, 0, 1.]); down = -up
def rot_about(v, k, a):
    k = k / np.linalg.norm(k); return v * np.cos(a) + np.cross(k, v) * np.sin(a) + k * (k @ v) * (1 - np.cos(a))
for ri in roots:
    p0 = Hpos[ri]; n = Hn[ri]; L = Lh[ri] * rng.uniform(0.75, 1.15)
    tt, fr, bk = t_top[ri], front[ri], back[ri]
    d_top = n * 1.25 + fwd * (0.25 + 0.7 * fr) + up * 0.1
    d_side = n * 0.6 + down * 0.7 - fwd * 0.25
    d_back = n * 0.6 + down * 0.8
    d = (d_top * tt + d_side * (1 - tt)) * (1 - bk) + d_back * bk
    d = d / np.linalg.norm(d) + rng.normal(0, 0.28, 3); d /= np.linalg.norm(d)
    turns = max(L / rng.uniform(1.4, 2.0), 0.7)
    M = int(np.clip(8 + turns * 7, 10, 20))
    t = np.linspace(0, 1, M)
    # spine: arc that bends progressively around a random axis (clumpy C/S shapes) + gravity on the fringe
    bend_axis = np.cross(d, rng.normal(size=3)); bend = rng.uniform(0.4, 1.3) * rng.choice([-1, 1])
    seg = L / (M - 1); spine = [p0 - n * 0.2]; dd = d.copy()
    for k in range(1, M):
        dd = rot_about(dd, bend_axis, bend / (M - 1)); dd = dd + down * (0.03 + 0.10 * fr * tt); dd /= np.linalg.norm(dd)
        spine.append(spine[-1] + dd * seg)
    spine = np.array(spine)
    e1 = np.cross(d, n + 1e-3 * rng.normal(size=3)); e1 /= np.linalg.norm(e1); e2 = np.cross(d, e1)
    rc = (0.45 + 0.35 * tt) * min(1.0, 0.35 + L / 3.5) * rng.uniform(0.75, 1.25) * np.clip(t * 3.0, 0.2, 1)
    phase = rng.uniform(0, 2 * np.pi); wsign = rng.choice([-1, 1])
    w_ = wsign * 2 * np.pi * turns * t + phase
    spine = spine + rc[:, None] * (np.cos(w_)[:, None] * e1 + np.sin(w_)[:, None] * e2)
    spine[1:] = push_out(spine[1:], 0.3)
    rt = (0.34 + 0.12 * tt) * min(1.0, 0.55 + L / 4.0) * rng.uniform(0.85, 1.2) * (1 - 0.55 * t ** 1.5)
    P, Tt, Nn = tube(spine, rt, 6)
    tcol = np.repeat(t, 6)
    tc = tip_sun if rng.random() < 0.35 * (0.4 + tt) else tip_c
    jit = rng.uniform(0.82, 1.15)
    c1 = root_c + (mid_c - root_c) * np.clip(tcol / 0.45, 0, 1)[:, None]
    c2 = mid_c + (tc - mid_c) * (np.clip((tcol - 0.45) / 0.55, 0, 1) ** 1.2)[:, None]
    c = np.where(tcol[:, None] < 0.45, c1, c2)
    ao = 0.4 + 0.6 * np.clip(tcol * 1.5, 0, 1)
    c = c * jit * ao[:, None]
    HP.append(P); HT.append(Tt + voff); HN.append(Nn); HC.append(c); voff += len(P)

# inner hair mass: offset shell over the hair region (hides scalp between curls)
hm = hair.reshape(NRH, NC)
hm_d = cv2.dilate(np.tile(hm.astype(np.uint8), (1, 3)), np.ones((3, 3), np.uint8))[:, NC:2 * NC] > 0
dist = cv2.distanceTransform(np.pad(np.tile(hm.astype(np.uint8), (1, 3)), 1), cv2.DIST_L2, 5)[1:-1, 1:-1][:, NC:2 * NC]
edge = np.clip(dist / 6.0, 0, 1).reshape(-1)
noise = (np.sin(x * 1.7 + 0.3) * np.sin(y * 1.9) * np.sin(z * 1.6 + 1) * 0.5 + 0.5)
off_ = (0.62 * Lh * (0.4 + 0.6 * t_top) * (0.8 + 0.4 * noise)) * edge + 0.15
shell = Hpos + Hn * off_[:, None]
shell = shell.reshape(NRH, NC, 3)
keep = hm_d
st = []; mapv = -np.ones((NRH, NC), int); pts = []
for i in range(NRH):
    for j in range(NC):
        if keep[i, j]: mapv[i, j] = len(pts); pts.append(shell[i, j])
for i in range(NRH - 1):
    for j in range(NC):
        a, b, c_, d_ = mapv[i, j], mapv[i, (j + 1) % NC], mapv[i + 1, j], mapv[i + 1, (j + 1) % NC]
        if min(a, b, c_, d_) >= 0: st += [[a, c_, b], [b, c_, d_]]
pts = np.array(pts); st = np.array(st)
fn = np.cross(pts[st[:, 1]] - pts[st[:, 0]], pts[st[:, 2]] - pts[st[:, 0]])
if (np.einsum('ij,ij->i', fn, pts[st].mean(1) - C) < 0).mean() > 0.5: st = st[:, [0, 2, 1]]
sc_ = ((root_c + mid_c) * 0.5)[None] * (0.8 + 0.4 * noise[keep.reshape(-1)])[:, None]
save('hairbase', pts, st, dict(name='HairBase', color=[1, 1, 1, 1], rough=0.75), col=np.clip(sc_, 0, 1))
# ---- outer layer: short curls lying across the hair-mass surface (fills the crown / back)
sn = vertex_normals(pts, st)
offk = off_[keep.reshape(-1)]; ttk = t_top[keep.reshape(-1)]; frk = front[keep.reshape(-1)]; bkk = back[keep.reshape(-1)]
candB = np.where(offk > 0.9)[0]; rng.shuffle(candB)
treeB = {}; rootsB = []
for idx in candB:
    p = pts[idx]; k = key(p, 0.6); ok = True
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for q in treeB.get((k[0] + dx, k[1] + dy, k[2] + dz), []):
                    if np.sum((pts[q] - p) ** 2) < 0.52 ** 2: ok = False; break
                if not ok: break
            if not ok: break
        if not ok: break
    if ok: rootsB.append(idx); treeB.setdefault(k, []).append(idx)
print('surface curls', len(rootsB))
for idx in rootsB:
    p0 = pts[idx]; n = sn[idx]; tt, fr, bk = ttk[idx], frk[idx], bkk[idx]
    flow = (fwd * (0.4 + 0.8 * fr) + up * 0.05) * tt * (1 - bk) + down * (1 - tt * (1 - bk))
    flow = flow - n * (flow @ n) + rng.normal(0, 0.45, 3); flow -= n * (flow @ n); flow /= np.linalg.norm(flow) + 1e-9
    L = rng.uniform(1.6, 2.8); turns = L / rng.uniform(1.2, 1.7); M = int(np.clip(7 + turns * 7, 9, 18))
    t = np.linspace(0, 1, M)
    spine = p0[None] - n[None] * 0.35 + flow[None] * (L * t)[:, None] + n[None] * (0.35 * np.sin(np.pi * t))[:, None]
    e1 = n; e2 = np.cross(flow, n)
    rc = rng.uniform(0.45, 0.72) * np.clip(t * 2.5, 0.3, 1)
    w_ = rng.choice([-1, 1]) * 2 * np.pi * turns * t + rng.uniform(0, 6.3)
    spine = spine + rc[:, None] * (np.cos(w_)[:, None] * e1 + np.sin(w_)[:, None] * e2)
    rt = rng.uniform(0.30, 0.40) * (1 - 0.5 * t ** 1.5)
    P, Tt, Nn = tube(spine, rt, 6)
    tcol = np.repeat(t, 6); tc = tip_sun if rng.random() < 0.3 else tip_c
    c = mid_c * 0.8 + (tc - mid_c * 0.8) * (np.clip(tcol, 0, 1) ** 0.9)[:, None]
    c = c * rng.uniform(0.82, 1.12) * (0.6 + 0.4 * np.clip(tcol * 2, 0, 1))[:, None]
    HP.append(P); HT.append(Tt + voff); HN.append(Nn); HC.append(c); voff += len(P)
hair_pos = np.vstack(HP); hair_tris = np.vstack(HT); hair_col = np.vstack(HC)
save('hair', hair_pos, hair_tris, dict(name='HairCurls', color=[1, 1, 1, 1], rough=0.55), col=np.clip(hair_col, 0, 1), nrm=np.vstack(HN))

# ---------------------------------------------------------------- HOODIE
lv = np.array([
    # y,     W,    D,    zc,   n
    [-11.8, 6.0, 6.2, -6.0, 2.0],
    [-12.8, 6.8, 6.9, -5.9, 2.0],
    [-14.2, 9.4, 8.0, -5.6, 2.2],
    [-15.8, 13.8, 9.0, -5.2, 2.5],
    [-17.5, 17.6, 9.6, -4.8, 2.8],
    [-19.6, 20.0, 10.0, -4.4, 3.0],
    [-22.2, 20.9, 10.2, -4.2, 3.0],
    [-26.0, 20.6, 10.5, -4.0, 2.8],
    [-30.5, 19.6, 10.6, -3.9, 2.6],
    [-34.5, 19.0, 10.4, -3.9, 2.5]])
cs = [CubicSpline(-lv[:, 0], lv[:, k]) for k in range(5)]
ys = -np.concatenate([np.linspace(11.8, 22.2, 34), np.linspace(22.2, 34.5, 26)[1:]])
NA = 128
ang = np.linspace(-np.pi, np.pi, NA, endpoint=False)  # 0 = front (+z)
rings = []
for yy in ys:
    Wd, Dd, zc, nn = [c(-yy) for c in cs[1:]]
    ca, sa = np.cos(ang), np.sin(ang)
    r = (np.abs(ca / Dd) ** nn + np.abs(sa / Wd) ** nn) ** (-1 / nn)
    px = r * sa; pz = zc + r * ca
    k = ss(-17.5, -11.8, yy)                         # neckline dips in front
    py = yy - 2.2 * k * ((ca + 1) / 2) ** 1.5
    # soft folds
    fold = 0.22 * np.sin(ang * 7 + yy * 0.35) * ss(-15, -22, yy) + 0.15 * np.sin(ang * 3 - yy * 0.5)
    pec = 0.6 * np.exp(-((yy + 25.5) / 3.5) ** 2) * np.clip(ca, 0, 1) ** 2 * (np.abs(sa) * 2.2).clip(0, 1)
    rr = 1 + (fold + pec) / np.maximum(r, 1)
    PX = px * rr; PZ = zc + (pz - zc) * rr
    # creases separating the arms from the chest/back
    cr = np.exp(-((np.abs(PX) - (Wd - 11.0)) / 1.7) ** 2) * 1.3 * ss(-21.0, -25.5, yy)
    PZ = PZ - np.sign(PZ - zc) * cr * np.abs(np.cos(ang)) ** 0.5
    rings.append(np.stack([PX, py, PZ], -1))
rings = np.array(rings)
K = len(rings)
pos = rings.reshape(-1, 3); tris = []
for i in range(K - 1):
    for j in range(NA):
        a = i * NA + j; b = i * NA + (j + 1) % NA
        tris += [[a, a + NA, b], [b, a + NA, b + NA]]
cb = len(pos); pos = np.vstack([pos, [[0, ys[-1], cs[3](-ys[-1])]]])
for j in range(NA): tris.append([(K - 1) * NA + j, (K - 1) * NA + (j + 1) % NA, cb])
tris = np.array(tris)
cent = np.c_[np.zeros(len(tris)), pos[tris].mean(1)[:, 1], np.full(len(tris), -4.3)]
tris = orient_outward(pos, tris, cent)
# collar lip (rolled rib) at the neck opening
lipc = rings[0].copy(); lipc_c = lipc.mean(0)
lip_sp = np.vstack([lipc, lipc[:1]])
hood_parts = [(pos, tris)]
def torus_along(path, r, sides=10, squash=1.0):
    P, Tt, Nn = tube(path, r, sides)
    return P, Tt
Pl, Tl = torus_along(lip_sp - np.array([0, 0.25, 0]), np.full(len(lip_sp), 0.42), 10)
hood_parts.append((Pl, Tl))
# hood lying on the shoulders
psi = np.radians(np.linspace(-150, 150, 80))
hx = 9.8 * np.sin(psi); hz = -5.2 - 10.6 * np.cos(psi)
hy = -14.3 - 3.5 * (np.abs(psi) / np.radians(150)) ** 1.5
path = np.stack([hx, hy, hz], -1)
hr = 3.5 - 2.6 * (np.abs(psi) / np.radians(150)) ** 1.1
Ph, Th, _ = tube(path, hr, 18)
Ph = Ph.reshape(80, 18, 3); cen = path[:, None, :]
Ph = cen + (Ph - cen) * np.array([1, 0.5, 1]); Ph[..., 1] -= 0.0         # flatten vertically
Ph[..., 1] += 0.0
hood_parts.append((Ph.reshape(-1, 3), Th))
hp_, ht_ = [], []; off = 0
for p, t in hood_parts: hp_.append(p); ht_.append(t + off); off += len(p)
hoodie_pos = np.vstack(hp_); hoodie_tris = np.vstack(ht_)
save('hoodie', hoodie_pos, hoodie_tris, dict(name='Hoodie', color=list(hexlin('#5f5752')) + [1], rough=0.9,
                                             extras={'swatches': {'Taupe': '#5f5752', 'Navy': '#283047', 'Brown': '#4b3b31', 'Grey': '#8a8c90'}}))
# drawstrings + aglets
sp_all, st_all, ag_all, agt_all = [], [], [], []; o1 = o2 = 0
for sx in (-2.3, 2.3):
    yy = np.linspace(-17.6, -30.5, 40)
    zf = np.array([cs[3](-v) + cs[2](-v) * (1 - (abs(sx) / cs[1](-v)) ** cs[4](-v)) ** (1 / cs[4](-v)) for v in yy]) + 0.55
    xx = sx + 0.4 * np.sin(np.linspace(0, 2.5, 40)) * np.sign(sx)
    path = np.stack([xx, yy, zf], -1)
    P, T_, _ = tube(path[:-6], np.full(34, 0.36), 8)
    sp_all.append(P); st_all.append(T_ + o1); o1 += len(P)
    P2, T2, _ = tube(path[-7:], np.full(7, 0.40), 8)
    ag_all.append(P2); agt_all.append(T2 + o2); o2 += len(P2)
save('strings', np.vstack(sp_all), np.vstack(st_all), dict(name='Drawstrings', color=list(hexlin('#5f5752') * 0.9) + [1], rough=0.85))
save('aglets', np.vstack(ag_all), np.vstack(agt_all), dict(name='Aglets', color=list(hexlin('#c9ccd1')) + [1], rough=0.35, extras={'metal': 0.8}))

# ---------------------------------------------------------------- PLINTH
prof = np.array([[0, -34.5], [11.6, -34.5], [12.4, -34.9], [12.6, -35.5], [12.6, -39.7], [13.2, -40.1], [13.4, -40.7], [13.4, -42.1], [0, -42.1]])
NAp = 96; a2 = np.linspace(0, 2 * np.pi, NAp, endpoint=False)
pp = []; for_t = []
for r_, yy in prof: pp.append(np.stack([r_ * np.sin(a2), np.full(NAp, yy), -3.9 + r_ * np.cos(a2)], -1))
pp = np.array(pp); Kp = len(pp)
# duplicate rings at hard edges for crisp normals
dup = []
for i in range(Kp):
    dup.append(pp[i]);
    if 0 < i < Kp - 1: dup.append(pp[i])
dup = np.array(dup); Kd = len(dup)
pos = dup.reshape(-1, 3); tris = []
for i in range(0, Kd - 1, 2):
    for j in range(NAp):
        a = i * NAp + j; b = i * NAp + (j + 1) % NAp
        tris += [[a, b, a + NAp], [b, b + NAp, a + NAp]]
tris = np.array(tris)
cent = np.c_[np.zeros(len(tris)), np.full(len(tris), -38.3), np.full(len(tris), -3.9)]
tris = orient_outward(pos, tris, cent)
save('plinth', pos, tris, dict(name='Plinth', color=list(hexlin('#2a2c31')) + [1], rough=0.55))
