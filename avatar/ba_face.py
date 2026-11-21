"""Perspective bundle adjustment of the face shape over video frames + photos.
Unknowns: 478 landmark positions, per-image rotation/translation/focal length. Lips and eyelids are down-weighted
on photos (expressions vary); a weak symmetry prior and a weak prior to the previous shape fix the gauge."""
import sys, json, numpy as np, cv2
from scipy.optimize import least_squares
from scipy.sparse import lil_matrix
sys.path.insert(0, sys.argv[2]); from common import *
S = sys.argv[1]; photos = sys.argv[3].split(',')
V, UV, F = load_canonical(f'{S}/models/canonical_face_model.obj')
D = json.load(open(f'{S}/work/landmarks.json'))
X0 = np.load(f'{S}/work/shape.npy')                       # 478x3, canonical frame (cm)
pair = np.array(json.load(open(f'{S}/work/pairs.json'))['pair'])
keys = sorted(k for k in D if '/vidA/' in k)[::2] + [k for k in D if any(p in k for p in photos)]
N = len(X0); M = len(keys)
LIPS = sorted(set([0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269, 270,
                   291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415, 12, 15, 16, 38, 41, 42, 72, 73, 74,
                   76, 77, 62, 183, 184, 186, 96, 89, 90, 179, 180, 268, 271, 272, 302, 303, 304, 306, 307, 292, 407, 408,
                   410, 325, 319, 320, 403, 404]))
EYELID = [159, 145, 158, 153, 160, 144, 386, 374, 385, 380, 387, 373, 157, 154, 384, 381, 161, 163, 388, 390, 470, 471, 472, 469, 468, 473, 474, 475, 476, 477]
obs, wts, fsz, sizes = [], [], [], []
for k in keys:
    L = np.array(D[k]['L'])[:, :2]; obs.append(L)
    w = np.ones(N)
    if '/vidA/' not in k: w[LIPS] = 0.25; w[EYELID] = 0.4
    if '5adc68ad' in k: w[[152, 148, 176, 149, 150, 377, 400, 378, 379, 365, 175, 199, 200]] = 0.1  # hand under the chin
    wts.append(w); bx = D[k]['box']; fsz.append(max(bx[2] - bx[0], 1)); sizes.append(D[k]['size'])
obs = np.array(obs); wts = np.array(wts); fsz = np.array(fsz, float)
# camera frame: x right, y down, z forward (OpenCV). Canonical frame: x right, y up, z toward camera -> flip y,z
FLIP = np.diag([1, -1, -1.0])
cams = []
for i, k in enumerate(keys):
    w_, h_ = sizes[i]; f0 = 0.6 * max(w_, h_)
    K = np.array([[f0, 0, w_ / 2], [0, f0, h_ / 2], [0, 0, 1]])
    ok, rv, tv = cv2.solvePnP((X0 @ FLIP.T).astype(np.float64), obs[i].astype(np.float64), K, None, flags=cv2.SOLVEPNP_EPNP)
    ok, rv, tv = cv2.solvePnP((X0 @ FLIP.T).astype(np.float64), obs[i].astype(np.float64), K, None, rv, tv, True)
    cams.append(np.r_[rv.ravel(), tv.ravel(), np.log(f0)])
cams = np.array(cams); logf0 = cams[:, 6].copy()

def rodrigues(r):
    th = np.linalg.norm(r, axis=1, keepdims=True) + 1e-12; k = r / th
    Kx = np.zeros((len(r), 3, 3)); Kx[:, 0, 1] = -k[:, 2]; Kx[:, 0, 2] = k[:, 1]; Kx[:, 1, 0] = k[:, 2]; Kx[:, 1, 2] = -k[:, 0]; Kx[:, 2, 0] = -k[:, 1]; Kx[:, 2, 1] = k[:, 0]
    th = th[:, :, None]
    return np.eye(3)[None] + np.sin(th) * Kx + (1 - np.cos(th)) * Kx @ Kx

LAM_SYM, LAM_PRI, LAM_F = 0.6, 0.08, 2.0
def unpack(p): return p[:N * 3].reshape(N, 3), p[N * 3:].reshape(M, 7)
def residuals(p):
    X, C = unpack(p); R = rodrigues(C[:, :3]); f = np.exp(C[:, 6])
    Xc = np.einsum('mij,nj->mni', R, X @ FLIP.T) + C[:, None, 3:6]
    cx = np.array([s[0] / 2 for s in sizes]); cy = np.array([s[1] / 2 for s in sizes])
    u = f[:, None] * Xc[..., 0] / Xc[..., 2] + cx[:, None]; v = f[:, None] * Xc[..., 1] / Xc[..., 2] + cy[:, None]
    r = np.stack([u - obs[..., 0], v - obs[..., 1]], -1) * (wts / fsz[:, None] * 100)[..., None]
    sym = (X - X[pair] * np.array([-1, 1, 1])) * LAM_SYM
    pri = (X - X0) * LAM_PRI
    fr = (C[:, 6] - logf0) / 0.35 * LAM_F
    return np.concatenate([r.ravel(), sym.ravel(), pri.ravel(), fr])
# sparsity
nr = M * N * 2 + N * 3 * 2 + M; npar = N * 3 + M * 7
J = lil_matrix((nr, npar), dtype=int)
for m in range(M):
    for n in range(N):
        for c in range(2):
            row = (m * N + n) * 2 + c
            J[row, n * 3:n * 3 + 3] = 1; J[row, N * 3 + m * 7:N * 3 + m * 7 + 7] = 1
base = M * N * 2
for n in range(N):
    for c in range(3):
        J[base + n * 3 + c, n * 3 + c] = 1; J[base + n * 3 + c, pair[n] * 3 + c] = 1
        J[base + N * 3 + n * 3 + c, n * 3 + c] = 1
for m in range(M): J[base + N * 6 + m, N * 3 + m * 7 + 6] = 1
p0 = np.r_[X0.ravel(), cams.ravel()]
r0 = residuals(p0)[:M * N * 2].reshape(M, N, 2)
sol = least_squares(residuals, p0, jac_sparsity=J, x_scale='jac', method='trf', loss='soft_l1', f_scale=2.0, max_nfev=200, verbose=0)
X, C = unpack(sol.x)
r1 = residuals(sol.x)[:M * N * 2].reshape(M, N, 2)
def err(r): return np.sqrt((r ** 2).sum(-1)).mean(1)   # in % of face width (weighted)
e0, e1 = err(r0), err(r1)
for k, a, b, c in zip(keys, e0, e1, C):
    if '/vidA/' not in k or k.endswith('_001.jpg') or k.endswith('_013.jpg'):
        print(f"{k.split('/')[-1][:14]:14s} err {a:5.2f}% -> {b:5.2f}%   f={np.exp(c[6]):6.0f}px")
print('mean err', e0.mean().round(2), '->', e1.mean().round(2))
# remove gauge: similarity-align to canonical, then exact symmetrisation
s, R_, t = similarity(X[:468], V); X = (s * (R_ @ X.T)).T + t
X = (X + X[pair] * np.array([-1, 1, 1])) / 2
s, R_, t = similarity(X[:468], np.load(f'{S}/work/shape.npy')[:468]); X = (s * (R_ @ X.T)).T + t   # same scale/pose as before
np.save(f'{S}/work/shape_ba.npy', X)
np.savez(f'{S}/work/ba_cams.npz', keys=np.array(keys), cams=C, sizes=np.array(sizes))
Xo = np.load(f'{S}/work/shape.npy')
for nm, idx in [('nose tip', 1), ('nasion', 168), ('chin', 152), ('jaw angle L', 172), ('cheekbone L', 116), ('cheek L', 234)]:
    print(f'{nm:12s} old {Xo[idx].round(2)}  new {X[idx].round(2)}')
