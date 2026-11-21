"""Render the head (+ears) from each photo's estimated camera and compare with the photo: photo | model | overlay."""
import sys, json, numpy as np, cv2
S = sys.argv[1]; photos = sys.argv[2].split(','); out = sys.argv[3]
D = json.load(open(f'{S}/work/landmarks.json'))
X = np.load(f'{S}/work/shape.npy')
H = np.load(f'{S}/work/head.npz'); E = np.load(f'{S}/work/ears.npz')
ba = np.load(f'{S}/work/ba_cams.npz'); bkeys = list(ba['keys'])
pos = np.vstack([H['pos'], E['pos']]); tris = np.vstack([H['tris'], E['tris'] + len(H['pos'])])
nrm = np.vstack([H['nrm'], E['nrm']])
FLIP = np.diag([1, -1, -1.0])
RIGID = [i for i in range(468) if i not in set([0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415])]
tiles = []
for ph in photos:
    k = [k for k in D if ph in k][0]; img = cv2.imread(k); h, w = img.shape[:2]
    L = np.array(D[k]['L'])[:, :2]
    f = float(np.exp(ba['cams'][bkeys.index(k)][6])) if k in bkeys else 0.6 * max(w, h)
    K = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1]])
    ok, rv, tv = cv2.solvePnP((X[RIGID] @ FLIP.T), L[RIGID].astype(np.float64), K, None, flags=cv2.SOLVEPNP_EPNP)
    ok, rv, tv = cv2.solvePnP((X[RIGID] @ FLIP.T), L[RIGID].astype(np.float64), K, None, rv, tv, True)
    R = cv2.Rodrigues(rv)[0]
    Pc = (R @ (pos @ FLIP.T).T).T + tv.ravel()
    uv = (Pc[:, :2] / Pc[:, 2:3]) * f + [w / 2, h / 2]
    Nc = (R @ (nrm @ FLIP.T).T).T
    fn = Nc[tris].mean(1); fn /= np.linalg.norm(fn, axis=1, keepdims=True)
    viewd = -Pc[tris].mean(1); viewd /= np.linalg.norm(viewd, axis=1, keepdims=True)
    vis = np.einsum('ij,ij->i', fn, viewd) > -0.05
    ldir = viewd + np.array([0.3, -0.5, 0]); ldir /= np.linalg.norm(ldir, axis=1, keepdims=True)
    shade = np.clip(np.einsum('ij,ij->i', fn, ldir), 0, 1) ** 1.2 * 0.8 + 0.2
    order = np.argsort(-Pc[tris].mean(1)[:, 2])
    ren = np.zeros_like(img); mask = np.zeros((h, w), np.uint8)
    for t in order:
        if not vis[t]: continue
        c = int(200 * shade[t]); poly = np.round(uv[tris[t]] * 4).astype(np.int32)
        cv2.fillConvexPoly(ren, poly, (c, c, c), shift=2); cv2.fillConvexPoly(mask, poly, 255, shift=2)
    edge = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0
    blend = cv2.addWeighted(img, 0.55, ren, 0.45, 0); blend[edge] = (60, 230, 255)
    over = img.copy(); over[edge] = (60, 230, 255)
    x0, y0, x1, y1 = D[k]['box']; cxp, cyp = (x0 + x1) / 2, (y0 + y1) / 2; s = max(x1 - x0, y1 - y0) * 0.85
    a, b, c_, d_ = int(max(cxp - s, 0)), int(max(cyp - s * 1.05, 0)), int(min(cxp + s, w)), int(min(cyp + s * 0.95, h))
    row = [cv2.resize(x[b:d_, a:c_], (360, int(360 * (d_ - b) / (c_ - a)))) for x in (img, ren, over)]
    hh = min(r.shape[0] for r in row); row = [r[:hh] for r in row]
    tiles.append(np.hstack(row))
hh = min(t.shape[0] for t in tiles); tiles = [cv2.resize(t, (t.shape[1], hh)) for t in tiles]
cv2.imwrite(out, np.vstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 88])
print('saved', out)
