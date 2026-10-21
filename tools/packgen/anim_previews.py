"""Render every creature's animations on the real generated geometry + texture.

  python3 tools/packgen/anim_previews.py [creature ...] [--gif]

Writes build/previews/anim/<creature>_<clip>.png contact strips (and .gif with --gif).
This is a review aid: Molang is evaluated by tools/hollowkit/molang.py, and several clips are
layered the way the animation controllers layer them. Engine blending is not modelled.
"""
import importlib
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "..", "creatures"))
from hollowkit import BUILD, RP, ensure  # noqa: E402
from hollowkit.animpreview import evaluate, gif, strip  # noqa: E402
from hollowkit.render import bounds  # noqa: E402


def load_anims(name):
    with open(os.path.join(RP, "animations", f"{name}.animation.json")) as f:
        return json.load(f)["animations"]


def atlas(tex):
    return np.array(Image.open(os.path.join(RP, "textures", "entity", "hollow", f"{tex}.png")).convert("RGBA"))


def layered(anims, prefix, clips, speed=0.0, extra=None, t0=0.0):
    """clips: list of (clip, weight). Returns pose(t)."""
    def fn(t):
        env = {"query.life_time": t0 + t, "query.modified_distance_moved": speed * t,
               "query.modified_move_speed": min(1.0, speed / 4.0), "query.target_x_rotation": 0.0,
               "query.target_y_rotation": 0.0}
        env.update(extra or {})
        pose = {}
        for clip, w in clips:
            evaluate(anims[f"animation.hollow.{prefix}.{clip}"], t, env, weight=w, pose=pose)
        return pose
    return fn


SETS = {
    "watcher": dict(tex="watcher", yaw=25, pitch=8, clips={
        "idle": ([("idle", 1)], 0, 6.0), "walk": ([("idle", 0.3), ("walk", 1)], 3.0, 1.6),
        "creep": ([("creep", 1)], 2.0, 2.0), "stare": ([("idle", 1), ("stare", 1)], 0, 7.0),
        "seen": ([("seen", 1)], 0, 0.8), "lunge": ([("lunge", 1)], 0, 0.6)}),
    "borrowed": dict(tex="borrowed", yaw=35, pitch=10, clips={
        "idle": ([("disguise", 1), ("idle", 1)], 0, 6.0, {"variable.watchful": 1.0}),
        "walk": ([("disguise", 1), ("walk", 1)], 2.5, 1.2),
        "reveal": ([("reveal", 1)], 0, 1.6, None, "borrowed_true"),
        "revealed": ([("revealed", 1)], 0, 2.0, None, "borrowed_true"),
        "run": ([("revealed", 1), ("run", 1)], 5.0, 1.0, None, "borrowed_true"),
        "attack": ([("revealed", 1), ("attack", 1)], 0, 0.4, None, "borrowed_true")}),
    "hollowed": dict(tex="hollowed", yaw=35, pitch=14, clips={
        "idle": ([("idle", 1), ("click", 1)], 0, 6.0), "walk": ([("walk", 1)], 3.0, 1.4),
        "investigate": ([("investigate", 1), ("click", 1)], 0, 3.0), "listen": ([("listen", 1)], 0, 3.0),
        "attack": ([("attack", 1)], 0, 0.35)}),
    "knocker": dict(tex="knocker", yaw=30, pitch=8, clips={
        "idle": ([("idle", 1)], 0, 6.0), "walk": ([("walk", 1)], 2.2, 2.0), "knock": ([("knock", 1)], 0, 8.0),
        "hunt": ([("hunt", 1), ("walk", 1)], 2.5, 2.0), "attack": ([("hunt", 1), ("attack", 1)], 0, 0.55)}),
    "mirebound": dict(tex="mirebound", yaw=35, pitch=18, clips={
        "lurk": ([("lurk", 1)], 0, 6.0), "erupt": ([("erupt", 1)], 0, 0.5), "grab": ([("grab", 1)], 0, 1.5),
        "swim": ([("swim", 1)], 0, 2.0)}),
}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    make_gif = "--gif" in sys.argv
    out = ensure(os.path.join(BUILD, "previews", "anim"))
    for name in (args or SETS):
        cfg = SETS[name]
        mod = importlib.import_module(name)
        model = mod.build()
        model.layout()
        anims = load_anims(name)
        c, r = bounds(model)
        focus = (c, r * 1.15)
        for clip, spec in cfg["clips"].items():
            layers, speed, seconds = spec[0], spec[1], spec[2]
            extra = spec[3] if len(spec) > 3 else None
            tex = spec[4] if len(spec) > 4 else cfg["tex"]
            fn = layered(anims, name, layers, speed, extra)
            n = 6
            times = [seconds * i / (n - 1) for i in range(n)] if seconds > 0 else [0]
            strip(model, atlas(tex), fn, times, os.path.join(out, f"{name}_{clip}.png"), size=220,
                  yaw=cfg["yaw"], pitch=cfg["pitch"], label=f"{name} {clip}", focus=focus)
            if make_gif:
                gif(model, atlas(tex), [(f"{name} {clip}", seconds, fn)], os.path.join(out, f"{name}_{clip}.gif"),
                    size=280, yaw=cfg["yaw"], pitch=cfg["pitch"], focus=focus)
        print("previewed", name)


if __name__ == "__main__":
    main()
