#!/usr/bin/env python3
"""Convert the MakeHuman base mesh (CC0) into the simulator's character asset.

Inputs (from github.com/makehumancommunity/makehuman, makehuman/data/...):
  3dobjs/base.obj, rigs/default.mhskel, rigs/default_weights.mhw
Output: src/human.js  (mesh in the simulator's rest pose, 17-segment skin weights, fitted hit volumes)

The MakeHuman mesh stands in an A-pose with its own proportions. Each of its 163 bones is mapped to one
of the simulator's 17 segments; every vertex is then moved by linear-blend skinning from the MakeHuman
joint frame of each segment to the simulator's (arms rotated down, segment lengths matched).
Usage: python3 tools/build_human.py <dir with the three input files>
"""
import sys, json, math, base64, struct, collections

src = sys.argv[1]
src2 = sys.argv[2] if len(sys.argv) > 2 else None  # hair / eyebrow proxies and textures
SEG = {  # simulator rest pose: segment -> (proximal joint, distal point)
    'pelvis': ((0, .95, 0), (0, 1.05, -.03)), 'abdomen': ((0, 1.05, -.03), (0, 1.2, -.04)), 'thorax': ((0, 1.2, -.04), (0, 1.48, -.03)),
    'neck': ((0, 1.48, -.03), (0, 1.585, -.01)), 'head': ((0, 1.585, -.01), (0, 1.79, -.006)),
}
for S, s in (('L', 1), ('R', -1)):
    SEG['uarm' + S] = ((.2 * s, 1.43, -.01), (.2 * s, 1.13, -.01)); SEG['farm' + S] = ((.2 * s, 1.13, -.01), (.2 * s, .87, -.01))
    SEG['hand' + S] = ((.2 * s, .87, -.01), (.2 * s, .685, 0)); SEG['thigh' + S] = ((.09 * s, .93, 0), (.09 * s, .5, 0))
    SEG['shin' + S] = ((.09 * s, .5, 0), (.09 * s, .08, -.01)); SEG['foot' + S] = ((.09 * s, .08, -.01), (.092 * s, .012, .19))
ORDER = list(SEG)

def seg_of(bone):
    side = bone[-1] if bone.endswith(('.L', '.R')) else ''
    b = bone.split('.')[0]
    if b.startswith('upperarm'): return 'uarm' + side
    if b.startswith('lowerarm'): return 'farm' + side
    if b.startswith(('wrist', 'metacarpal', 'finger')): return 'hand' + side
    if b.startswith('upperleg'): return 'thigh' + side
    if b.startswith('lowerleg'): return 'shin' + side
    if b.startswith(('foot', 'toe')): return 'foot' + side
    if b in ('root', 'pelvis', 'spine05'): return 'pelvis'
    if b in ('spine04', 'spine03'): return 'abdomen'
    if b in ('spine02', 'spine01', 'clavicle', 'shoulder01', 'breast'): return 'thorax'
    if b in ('neck01', 'neck02'): return 'neck'
    return 'head'  # neck03, head, jaw, eyes, tongue and all facial bones

# ---- read mesh
V, F, cur = [], [], None
VT = []
groups = collections.defaultdict(list); guv = collections.defaultdict(list)
for l in open(src + '/base.obj'):
    if l.startswith('v '): V.append([float(x) * 0.1 for x in l.split()[1:4]])  # decimetres -> metres
    elif l.startswith('g '): cur = l.split()[1]
    elif l.startswith('vt '): VT.append([float(x) for x in l.split()[1:3]])
    elif l.startswith('f '):
        groups[cur].append([int(t.split('/')[0]) - 1 for t in l.split()[1:]])
        guv[cur].append([int(t.split('/')[1]) - 1 if '/' in t and t.split('/')[1] else -1 for t in l.split()[1:]])
# MakeHuman morph targets (vertex offsets in decimetres): add muscle so the build matches an adult male
import os
for name, amt in (('caucasian-male-young', 1.0), ('universal-male-young-maxmuscle-averageweight', 0.3), ('universal-male-young-averagemuscle-maxweight', 0.1)):
    f = src + '/' + name + '.target'
    if not os.path.exists(f): continue
    for l in open(f):
        if l.startswith('#') or not l.strip(): continue
        t = l.split(); i = int(t[0])
        for a in range(3): V[i][a] += float(t[1 + a]) * 0.1 * amt
body = groups['body']
NV = max(max(f) for f in body) + 1
sk = json.load(open(src + '/default.mhskel'))
jpos = {k: [sum(V[i][a] for i in ix) / len(ix) for a in range(3)] for k, ix in sk['joints'].items()}
head = {b: jpos[d['head']] for b, d in sk['bones'].items()}
tail = {b: jpos[d['tail']] for b, d in sk['bones'].items()}
ymin = min(V[i][1] for i in range(NV)); ymax = max(V[i][1] for i in range(NV))
K = 1.78 / (ymax - ymin)  # uniform girth scale

# MakeHuman joints for each simulator segment (proximal, distal)
def mh(seg):
    S = seg[-1] if seg[-1] in 'LR' else ''; d = '.' + S
    t = {'pelvis': (head['root'], head['spine04']), 'abdomen': (head['spine04'], head['spine02']), 'thorax': (head['spine02'], head['neck01']),
         'neck': (head['neck01'], head['head']), 'head': (head['head'], [0, ymax, head['head'][2]])}
    if seg in t: return t[seg]
    b = seg[:-1]
    if b == 'uarm': return head['upperarm01' + d], head['lowerarm01' + d]
    if b == 'farm': return head['lowerarm01' + d], head['wrist' + d]
    if b == 'hand': return head['wrist' + d], tail['finger3-3' + d]
    if b == 'thigh': return head['upperleg01' + d], head['lowerleg01' + d]
    if b == 'shin': return head['lowerleg01' + d], head['foot' + d]
    if b == 'foot': return head['foot' + d], tail['toe2-3' + d]

sub = lambda a, b: [a[i] - b[i] for i in range(3)]
dot = lambda a, b: sum(a[i] * b[i] for i in range(3))
cross = lambda a, b: [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
norm = lambda a: math.sqrt(dot(a, a))
unit = lambda a: [x / norm(a) for x in a]

def rot_between(a, b):  # minimal rotation matrix taking unit a to unit b
    v = cross(a, b); c = dot(a, b); s2 = dot(v, v)
    if s2 < 1e-12: return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    k = (1 - c) / s2
    vx = [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]]
    vx2 = [[sum(vx[i][m] * vx[m][j] for m in range(3)) for j in range(3)] for i in range(3)]
    return [[(1 if i == j else 0) + vx[i][j] + vx2[i][j] * k for j in range(3)] for i in range(3)]

TRUNK = ('pelvis', 'abdomen', 'thorax', 'neck', 'head')
hipm = [(head['upperleg01.L'][i] + head['upperleg01.R'][i]) / 2 for i in range(3)]
XF = {}
for s in ORDER:
    jm, dm = mh(s); jr, dr = SEG[s]
    if s in TRUNK:
        # the whole trunk and head keep MakeHuman's proportions: one uniform scale anchored at the hip joints
        XF[s] = (hipm, (0, 0.93, -0.04), [0, 1, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], K); continue
    am = unit(sub(dm, jm)); ar = unit(sub(dr, jr))
    XF[s] = (jm, jr, am, rot_between(am, ar), norm(sub(dr, jr)) / norm(sub(dm, jm)))
    print('%-7s length x%.3f relative to uniform scale' % (s, XF[s][4] / K))

def xform(s, p):
    jm, jr, am, R, st = XF[s]
    q = sub(p, jm); along = dot(q, am)
    q = [K * (q[i] - along * am[i]) + st * along * am[i] for i in range(3)]  # girth scales by K, length by the joint-to-joint ratio
    if s in TRUNK:
        # broaden the torso (not the head) to an adult male chest: 12 % wider, 6 % deeper, fading out through the neck
        t = min(1.0, max(0.0, (1.50 - (jr[1] + q[1])) / 0.08)); t = t * t * (3 - 2 * t)
        # full widening at the ribs, less at the waist and hips so the pelvis stays narrow
        c = min(1.0, max(0.0, (jr[1] + q[1] - 1.0) / 0.2)); c = c * c * (3 - 2 * c)
        q[0] *= 1 + (0.04 + 0.08 * c) * t; q[2] *= 1 + 0.06 * t
    return [jr[i] + sum(R[i][j] * q[j] for j in range(3)) for i in range(3)]

# ---- weights: MakeHuman bones -> simulator segments
W = [collections.defaultdict(float) for _ in range(NV)]
for bone, lst in json.load(open(src + '/default_weights.mhw'))['weights'].items():
    s = seg_of(bone)
    for vi, w in lst:
        if vi < NV: W[vi][s] += w
P, SI, SW = [], [], []
for i in range(NV):
    w = sorted(W[i].items(), key=lambda t: -t[1])[:4] or [('pelvis', 1.0)]
    tot = sum(x[1] for x in w); w = [(s, x / tot) for s, x in w]
    p = [0, 0, 0]
    for s, x in w:
        t = xform(s, V[i]); p = [p[a] + x * t[a] for a in range(3)]
    P.append(p)
    q = [int(round(x * 255)) for _, x in w]; q[0] += 255 - sum(q)
    SI.append([ORDER.index(s) for s, _ in w] + [0] * (4 - len(w))); SW.append(q + [0] * (4 - len(w)))
# feet on the floor
low = min(p[1] for p in P); P = [[p[0], p[1] - low, p[2]] for p in P]
print('height %.3f m, lowest shifted by %.4f, %d verts' % (max(p[1] for p in P), low, NV))
tris = []
for f in body:
    tris.append((f[0], f[1], f[2]))
    if len(f) == 4: tris.append((f[0], f[2], f[3]))

# ---- textured mesh: split vertices along UV seams so each (vertex, uv) pair is one render vertex
key, R_src, R_uv, Rtri = {}, [], [], []
for f, fu in zip(body, guv['body']):
    ids = []
    for v, t in zip(f, fu):
        k = (v, t)
        if k not in key: key[k] = len(R_src); R_src.append(v); R_uv.append(VT[t] if t >= 0 else [0, 0])
        ids.append(key[k])
    Rtri.append((ids[0], ids[1], ids[2]))
    if len(ids) == 4: Rtri.append((ids[0], ids[2], ids[3]))
print('render verts', len(R_src), 'from', NV)

# ---- proxies (hair, eyebrows): MakeHuman .mhclo fitting. Each proxy vertex is a weighted sum of three base
# vertices plus an offset scaled by reference distances on the (morphed) body. Skin weights blend the same way.
def proxy(name):
    lines = open(src2 + '/' + name + '.mhclo').read().split('\n'); sc = {}; refs = []; mode = None
    for l in lines:
        t = l.split()
        if not t or t[0].startswith('#'): continue
        if t[0] in ('x_scale', 'y_scale', 'z_scale'): sc[t[0][0]] = (int(t[1]), int(t[2]), float(t[3])); continue
        if t[0] == 'verts': mode = 'v'; continue
        if t[0] in ('delete_verts',): mode = None; continue
        if mode == 'v' and len(t) == 9:
            try: refs.append(([int(t[0]), int(t[1]), int(t[2])], [float(x) for x in t[3:6]], [float(x) for x in t[6:9]]))
            except ValueError: mode = None
    fac = [abs(V[sc[a][0]][i] - V[sc[a][1]][i]) / sc[a][2] if a in sc else 0.1 for i, a in enumerate('xyz')]
    pv, pt, puv, pf, pfu = [], [], [], [], []
    for l in open(src2 + '/' + name + '.obj'):
        if l.startswith('vt '): puv.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('f '):
            tt = l.split()[1:]; pf.append([int(x.split('/')[0]) - 1 for x in tt]); pfu.append([int(x.split('/')[1]) - 1 for x in tt])
    out_p, out_si, out_sw, out_uv, out_t, kk = [], [], [], [], [], {}
    fitted = []
    for (ix, w, off) in refs:
        p = [sum(w[k] * V[ix[k]][a] for k in range(3)) + off[a] * fac[a] for a in range(3)]
        ww = collections.defaultdict(float)
        for k in range(3):
            for sname, x in W[ix[k]].items(): ww[sname] += w[k] * x
        ws = sorted([(sname, x) for sname, x in ww.items() if x > 0], key=lambda q: -q[1])[:4] or [('head', 1.0)]
        tot = sum(x for _, x in ws); ws = [(sname, x / tot) for sname, x in ws]
        q = [0, 0, 0]
        for sname, x in ws:
            tq = xform(sname, p); q = [q[a] + x * tq[a] for a in range(3)]
        fitted.append((q, ws))
    for f, fu in zip(pf, pfu):
        ids = []
        for v, t in zip(f, fu):
            k = (v, t)
            if k not in kk:
                kk[k] = len(out_p); q, ws = fitted[v]; out_p.append([q[0], q[1] - low, q[2]]); out_uv.append(puv[t])
                qq = [int(round(x * 255)) for _, x in ws]; qq[0] += 255 - sum(qq)
                out_si.append([ORDER.index(sname) for sname, _ in ws] + [0] * (4 - len(ws))); out_sw.append(qq + [0] * (4 - len(ws)))
            ids.append(kk[k])
        out_t.append((ids[0], ids[1], ids[2]))
        if len(ids) == 4: out_t.append((ids[0], ids[2], ids[3]))
    print('proxy', name, len(out_p), 'verts', len(out_t), 'tris')
    return out_p, out_uv, out_si, out_sw, out_t

# ---- hit volumes: slice each segment into rings fitted to the skin (same loft format the simulator uses)
dom = [max(W[i].items(), key=lambda t: t[1])[0] if W[i] else 'pelvis' for i in range(NV)]
lofts = []
for s in ORDER:
    axis = 2 if s.startswith('foot') else 1
    u, v = (0, 1) if axis == 2 else (0, 2)
    idx = [i for i in range(NV) if W[i].get(s, 0) > 0.3]
    lo = min(P[i][axis] for i in idx); hi = max(P[i][axis] for i in idx)
    n = max(4, int(round((hi - lo) / 0.022))); rings = []
    for k in range(n + 1):
        a = lo + (hi - lo) * k / n; half = (hi - lo) / n * 0.9
        sl = [P[i] for i in idx if abs(P[i][axis] - a) <= half]
        if len(sl) < 4: continue
        u0, u1 = min(p[u] for p in sl), max(p[u] for p in sl); v0, v1 = min(p[v] for p in sl), max(p[v] for p in sl)
        rings.append([round(a, 4), round((u0 + u1) / 2, 4), round((v0 + v1) / 2, 4), round(max(0.006, (u1 - u0) / 2), 4), round(max(0.006, (v1 - v0) / 2), 4)])
    lofts.append({'seg': s, 'axis': 'z' if axis == 2 else 'y', 'n': 2.3 if s in ('pelvis', 'abdomen', 'thorax') else 2.0, 'rings': rings})

eyes = []
for g in ('helper-l-eye', 'helper-r-eye'):
    ix = sorted({i for f in groups[g] for i in f})
    c = [sum(V[i][a] for i in ix) / len(ix) for a in range(3)]; r = max(norm(sub(V[i], c)) for i in ix)
    c2 = xform('head', c); eyes.append({'c': [round(c2[0], 4), round(c2[1] - low, 4), round(c2[2], 4)], 'r': round(r * K, 4)})

b64 = lambda fmt, data: base64.b64encode(struct.pack('<%d%s' % (len(data), fmt), *data)).decode()
pos = [int(round(c * 10000)) for p in P for c in p]  # 0.1 mm units
out = {'order': ORDER, 'nv': NV, 'pos': b64('h', pos), 'idx': b64('H', [i for t in tris for i in t]), 'si': b64('B', [x for r in SI for x in r]), 'sw': b64('B', [x for r in SW for x in r]),
       'lofts': lofts, 'eyes': eyes}
import subprocess, os, tempfile
def img(path, size, fmt):
    tmp = tempfile.mktemp(suffix='.' + fmt)
    args = ['ffmpeg', '-v', 'error', '-y', '-i', path, '-vf', 'scale=%d:%d' % (size, size)] + (['-q:v', '4'] if fmt == 'jpg' else ['-pix_fmt', 'rgba']) + [tmp]
    subprocess.run(args, check=True); d = open(tmp, 'rb').read(); os.remove(tmp)
    return 'data:image/%s;base64,' % ('jpeg' if fmt == 'jpg' else 'png') + base64.b64encode(d).decode()
if src2:
    # textured render mesh (replaces the per-vertex body for drawing; NV-indexed data above stays for the hit test)
    out['render'] = {'src': b64('H', R_src), 'uv': b64('H', [int(round(min(1, max(0, c)) * 65535)) for u in R_uv for c in u]), 'idx': b64('H', [i for t in Rtri for i in t]),
                     'skin': img(src2 + '/young_lightskinned_male_diffuse.png', 1024, 'jpg')}
    # other people: MakeHuman's young dark-skinned and young Asian male skins, and a middle-aged light-skinned one
    out['skins'] = [{'name': 'young light', 'tex': out['render']['skin']}]
    for nm, f in (('young dark', 'young_darkskinned_male_diffuse.png'), ('young east asian', 'young_lightskinned_male_diffuse3.png'), ('middle-aged light', 'middleage_lightskinned_male_diffuse.png')):
        if os.path.exists(src2 + '/' + f): out['skins'].append({'name': nm, 'tex': img(src2 + '/' + f, 1024, 'jpg')})
    out['hairs'] = []
    for name in ('short02', 'short04', 'short01'):
        if not os.path.exists(src2 + '/' + name + '.mhclo'): continue
        pp, uu, si2, sw2, tt = proxy(name)
        out['hairs'].append({'nv': len(pp), 'pos': b64('h', [int(round(c * 10000)) for p in pp for c in p]), 'uv': b64('H', [int(round(min(1, max(0, c)) * 65535)) for u in uu for c in u]),
                     'si': b64('B', [x for r in si2 for x in r]), 'sw': b64('B', [x for r in sw2 for x in r]), 'idx': b64('H', [i for t in tt for i in t]), 'tex': img(src2 + '/' + name + '_diffuse.png', 512, 'png')})
    for name, key2, tex, sz in (('eyebrow001', 'brows', 'eyebrow001.png', 256),):
        pp, uu, si2, sw2, tt = proxy(name)
        out[key2] = {'nv': len(pp), 'pos': b64('h', [int(round(c * 10000)) for p in pp for c in p]), 'uv': b64('H', [int(round(min(1, max(0, c)) * 65535)) for u in uu for c in u]),
                     'si': b64('B', [x for r in si2 for x in r]), 'sw': b64('B', [x for r in sw2 for x in r]), 'idx': b64('H', [i for t in tt for i in t]), 'tex': img(src2 + '/' + tex, sz, 'png')}
open('src/human.js', 'w').write('// Character mesh: MakeHuman base mesh (CC0), re-posed and re-weighted for this simulator by tools/build_human.py.\n(function () {\n  const G = (window.GSW = window.GSW || {});\n  G.HUMAN = ' + json.dumps(out, separators=(',', ':')) + ';\n})();\n')
def at(y, tol=0.012): return [P[i] for i in range(NV) if abs(P[i][1] - y) < tol and dom[i] in TRUNK]
for y in (0.95, 1.1, 1.3, 1.42, 1.53, 1.69):
    sl = at(y); print('y=%.2f  x +-%.3f  z %.3f..%.3f' % (y, max(p[0] for p in sl), min(p[2] for p in sl), max(p[2] for p in sl)))
hd = [P[i] for i in range(NV) if dom[i] == 'head']
print('head top %.3f  chin(lowest front) %.3f  nose tip z %.3f at y %.3f' % (max(p[1] for p in hd), min(p[1] for p in hd if p[2] > 0.05), max(p[2] for p in hd), max(hd, key=lambda p: p[2])[1]))
for nm in ('spine04', 'spine02', 'neck01', 'head', 'upperarm01.L', 'upperleg01.L'):
    print(nm, [round(c, 3) for c in xform('pelvis', head[nm])], 'shifted y', round(xform('pelvis', head[nm])[1] - low, 3))
print('tris', len(tris), 'lofts', [(l['seg'], len(l['rings'])) for l in lofts], 'eyes', eyes)
