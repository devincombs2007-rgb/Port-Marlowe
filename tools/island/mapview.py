"""Top-down render of the built island from build/island/preview.npz (python3 -m tools.island.mapview)."""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, ROOT)
from tools.island.voxview import COL  # noqa: E402


def main(argv):
    d = np.load(os.path.join(ROOT, "build", "island", "preview.npz"))
    names = [n.replace("minecraft:", "") for n in d["names"]]
    lut = np.array([COL.get(n, (200, 0, 200)) for n in names], float)
    img = lut[d["topid"]]
    j = d["topj"].astype(float)
    shade = np.clip(1 + (j - np.roll(j, 1, axis=0)) * 0.06 + (j - np.roll(j, 1, axis=1)) * 0.06, 0.55, 1.4)
    img *= shade[..., None]
    out = argv[0] if argv else os.path.join(ROOT, "build", "island", "map.png")
    crop = None
    if len(argv) >= 4:
        x0, z0, r = int(argv[1]), int(argv[2]), int(argv[3])
        ox = -img.shape[0] // 2
        crop = (x0 - r - ox, x0 + r - ox, z0 - r - ox, z0 + r - ox)
        img = img[crop[0]:crop[1], crop[2]:crop[3]]
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8).transpose(1, 0, 2))
    if crop:
        im = im.resize((im.width * 4, im.height * 4), Image.NEAREST)
    im.save(out)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1:])
