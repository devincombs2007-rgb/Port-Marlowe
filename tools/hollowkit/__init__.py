"""THE HOLLOW asset toolkit: geometry, painting, previews, structures and audio."""
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BP = os.path.join(ROOT, "packs", "behavior")
RP = os.path.join(ROOT, "packs", "resource")
VP = os.path.join(ROOT, "packs", "visuals")
BUILD = os.path.join(ROOT, "build")


def ensure(path):
    os.makedirs(path, exist_ok=True)
    return path
