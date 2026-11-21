"""Multi-photo face texture: frontal base photo + side photos (colour-matched, mirrored to the unseen side)."""
import sys, json, numpy as np, cv2
sys.path.insert(0, sys.argv[2]); from common import *
S = sys.argv[1]; base = sys.argv[3]; sides = sys.argv[4].split(',') if len(sys.argv) > 4 and sys.argv[4] else []
V, UV, F = load_canonical(f'{S}/models/canonical_face_model.obj')
X = np.load(f'{S}/work/shape.npy')[:468]
pair = np.array(json.load(open(f'{S}/work/pairs.json'))['pair'])[:468]
D = json.load(open(f'{S}/work/landmarks.json'))
n = np.cross(X[F[:, 1]] - X[F[:, 0]], X[F[:, 2]] - X[F[:, 0]])
ci = [i for i, f in enumerate(F) if 1 in f][0]
if n[ci, 2] < 0: F = F[:, [0, 2, 1]]; n = -n
n /= np.linalg.norm(n, axis=1, keepdims=True)
T = 1024
uvp = np.c_[UV[:, 0] * T, (1 - UV[:, 1]) * T]

def warp_tris(src_img, src_pts, dst_pts, weights, T):
    acc = np.zeros((T, T, 3)); wacc = np.zeros((T, T))
    for fi, f in enumerate(F):
        if weights[fi] <= 0.01: continue
        src = src_pts[f].astype(np.float32); dst = dst_pts[f].astype(np.float32)
        x0, y0 = np.floor(dst.min(0)).astype(int) - 1; x1, y1 = np.ceil(dst.max(0)).astype(int) + 2
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, T), min(y1, T)
        if x1 <= x0 or y1 <= y0: continue
        M = cv2.getAffineTransform(src, (dst - [x0, y0]).astype(np.float32))
        patch = cv2.warpAffine(src_img, M, (x1 - x0, y1 - y0), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        m = np.zeros((y1 - y0, x1 - x0), np.float32)
        cv2.fillConvexPoly(m, np.round((dst - [x0, y0]) * 16).astype(np.int32), 1.0, lineType=cv2.LINE_AA, shift=4)
        sel = m > 0
        acc[y0:y1, x0:x1][sel] += patch[sel] * (weights[fi] * m[sel])[:, None]
        wacc[y0:y1, x0:x1][sel] += weights[fi] * m[sel]
    return acc / np.maximum(wacc, 1e-6)[..., None], wacc

def bake(ph):
    k = [k for k in D if ph in k][0]; img8 = cv2.imread(k)
    hsv = cv2.cvtColor(img8, cv2.COLOR_BGR2HSV)
    green = ((hsv[..., 0] > 32) & (hsv[..., 0] < 88) & (hsv[..., 1] > 70) & (hsv[..., 2] > 40)).astype(np.uint8)
    Lk = np.array(D[k]['L'])[:, :2]
    for eye in ([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246], [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]):
        cv2.fillConvexPoly(green, cv2.convexHull(Lk[eye].astype(np.int32)), 0)   # never touch the irises
    face_m = np.zeros_like(green); cv2.fillConvexPoly(face_m, cv2.convexHull(Lk[:468].astype(np.int32)), 1); green &= face_m
    n_, lab, st, _ = cv2.connectedComponentsWithStats(green)
    blob = np.isin(lab, [i for i in range(1, n_) if st[i, 4] > 60]).astype(np.uint8)
    if blob.sum() > 0:   # e.g. a sticker on the cheek (plus its dark rim)
        img8 = cv2.inpaint(img8, cv2.dilate(blob, np.ones((25, 25), np.uint8)), 15, cv2.INPAINT_TELEA); print('  inpainted', int(blob.sum()), 'green px')
    img = img8.astype(np.float32)
    L = np.array(D[k]['L']); P = np.c_[L[:, 0], -L[:, 1]][:468]
    sol = np.linalg.lstsq(np.c_[X, np.ones(468)], P, rcond=None)[0]; A = sol[:3].T
    Uu, Sg, Vt = np.linalg.svd(A, full_matrices=False); R2 = Uu @ Vt; view = np.cross(R2[0], R2[1])
    if view[2] < 0: view = -view
    nv = np.clip(n @ view, 0, 1)
    tex, cov = warp_tris(img, L[:, :2], uvp, np.maximum(nv, 0.011), T)
    # smooth per-pixel n.v map (from per-triangle values)
    nvimg = np.zeros((T, T), np.float32); cnt = np.zeros((T, T), np.float32)
    for fi, f in enumerate(F):
        cv2.fillConvexPoly(nvimg, np.round(uvp[f] * 16).astype(np.int32), float(nv[fi]), shift=4)
    nvimg = cv2.GaussianBlur(nvimg, (0, 0), 5)
    print(ph, 'view', view.round(2))
    return tex, nvimg * (cov > 0), L

def mirror_uv(img):
    """re-map a UV-space image onto the mirrored triangles (left<->right)"""
    out, w = warp_tris(img, uvp[pair], uvp, np.ones(len(F)), T)
    return out

region = np.zeros((T, T), np.uint8)
for f in F: cv2.fillConvexPoly(region, np.round(uvp[f] * 16).astype(np.int32), 1, shift=4)
btex, bnv, _ = bake(base)
layers = [(btex, 2.2 * bnv ** 2, bnv)]
for ph in sides:
    stex, snv, _ = bake(ph)
    # colour-match to the base photo on well-seen overlap (per-channel affine, robust)
    ov = (bnv > 0.55) & (snv > 0.55) & (region > 0)
    if ov.sum() < 2000: ov = (bnv > 0.4) & (snv > 0.4) & (region > 0)
    for c in range(3):
        a, b = stex[..., c][ov], btex[..., c][ov]
        A_ = np.c_[a, np.ones_like(a)]; g, o = np.linalg.lstsq(A_, b, rcond=None)[0]
        stex[..., c] = stex[..., c] * g + o
    print('  colour match on', int(ov.sum()), 'px')
    layers.append((stex, snv ** 4, snv))
    mt = mirror_uv(stex); mnv = cv2.GaussianBlur(mirror_uv(np.dstack([snv] * 3))[..., 0].astype(np.float32), (0, 0), 2)
    layers.append((mt, 0.8 * mnv ** 4, mnv))
num = sum(t * w[..., None] for t, w, _ in layers); den = sum(w for _, w, _ in layers)
tex = num / np.maximum(den, 1e-6)[..., None]
cover = np.max([v for _, _, v in layers], 0)
tag = sys.argv[5] if len(sys.argv) > 5 else ''
cv2.imwrite(f'{S}/work/face_tex_raw{tag}.png', np.clip(tex, 0, 255).astype(np.uint8))
np.save(f'{S}/work/face_w{tag}.npy', (cover ** 2 * (region > 0)).astype(np.float32))
cv2.imwrite(f'{S}/work/face_tex_raw_small{tag}.jpg', cv2.resize(np.clip(tex, 0, 255).astype(np.uint8), (600, 600)))
