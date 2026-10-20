"""Deterministic 3D gradient noise used to paint seamless textures across cube faces."""
import numpy as np

_GRADS = np.array(
    [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
     [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
     [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
     [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1]], dtype=np.float64)


class Noise3:
    def __init__(self, seed: int = 0):
        rng = np.random.default_rng(seed)
        p = rng.permutation(256)
        self.perm = np.concatenate([p, p]).astype(np.int64)

    def _hash(self, xi, yi, zi):
        perm = self.perm
        return perm[perm[perm[xi & 255] + (yi & 255)] + (zi & 255)] & 15

    @staticmethod
    def _fade(t):
        return t * t * t * (t * (t * 6 - 15) + 10)

    def perlin(self, pts):
        """pts: (N,3) array. Returns values roughly in [-1, 1]."""
        pts = np.asarray(pts, dtype=np.float64)
        x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
        xi, yi, zi = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), np.floor(z).astype(np.int64)
        xf, yf, zf = x - xi, y - yi, z - zi
        u, v, w = self._fade(xf), self._fade(yf), self._fade(zf)
        out = np.zeros(len(pts))
        corners = {}
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    g = _GRADS[self._hash(xi + dx, yi + dy, zi + dz)]
                    corners[(dx, dy, dz)] = g[:, 0] * (xf - dx) + g[:, 1] * (yf - dy) + g[:, 2] * (zf - dz)
        x00 = corners[(0, 0, 0)] + u * (corners[(1, 0, 0)] - corners[(0, 0, 0)])
        x10 = corners[(0, 1, 0)] + u * (corners[(1, 1, 0)] - corners[(0, 1, 0)])
        x01 = corners[(0, 0, 1)] + u * (corners[(1, 0, 1)] - corners[(0, 0, 1)])
        x11 = corners[(0, 1, 1)] + u * (corners[(1, 1, 1)] - corners[(0, 1, 1)])
        y0 = x00 + v * (x10 - x00)
        y1 = x01 + v * (x11 - x01)
        out = y0 + w * (y1 - y0)
        return out

    def fbm(self, pts, octaves=4, lacunarity=2.0, gain=0.5, scale=1.0):
        pts = np.asarray(pts, dtype=np.float64) * scale
        total = np.zeros(len(pts))
        amp, norm = 1.0, 0.0
        for o in range(octaves):
            total += amp * self.perlin(pts + o * 17.31)
            norm += amp
            amp *= gain
            pts = pts * lacunarity
        return total / norm

    def ridged(self, pts, octaves=3, scale=1.0):
        return 1.0 - np.abs(self.fbm(pts, octaves=octaves, scale=scale))


def hash01(pts, seed=0):
    """Per-texel white noise that is stable for a given integer position."""
    p = np.floor(np.asarray(pts)).astype(np.int64)
    h = (p[:, 0] * 73856093) ^ (p[:, 1] * 19349663) ^ (p[:, 2] * 83492791) ^ (seed * 2654435761)
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h & 0xFFFF) / 65535.0
