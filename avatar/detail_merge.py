"""Combine two registered face textures: low-frequency colour/lighting from the tone photo, fine detail from the sharp photo."""
import sys, numpy as np, cv2
S = sys.argv[1]; tone, detail, sig = sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 7
A = cv2.cvtColor(cv2.imread(f'{S}/work/face_tex_raw{tone}.png'), cv2.COLOR_BGR2LAB).astype(np.float32)
B = cv2.cvtColor(cv2.imread(f'{S}/work/face_tex_raw{detail}.png'), cv2.COLOR_BGR2LAB).astype(np.float32)
wa = np.load(f'{S}/work/face_w{tone}.npy'); wb = np.load(f'{S}/work/face_w{detail}.npy')
lp = lambda x: cv2.GaussianBlur(x, (0, 0), sig)
out = lp(A) + (B - lp(B)) * np.array([1.0, 0.6, 0.6])   # full luminance detail, damped chroma detail
cv2.imwrite(f'{S}/work/face_tex_raw.png', cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR))
np.save(f'{S}/work/face_w.npy', np.maximum(wa, wb))
