"""Evaluate Bedrock animations (keyframes + Molang) into poses and render GIF previews.

Used to review generated animations offline and to syntax-check every Molang expression the
packs ship. Poses feed hollowkit.render, so what you see is the real generated geometry and
texture moving with the real animation data. Engine blending, IK and physics are not modelled.
"""
import math

from PIL import Image

from .molang import run
from .render import render


def _kf_value(v, which):
    if isinstance(v, dict):
        if which in v:
            return v[which]
        return v.get("post", v.get("pre"))
    return v


def _vec(v, env, uniform=False):
    if isinstance(v, (list, tuple)):
        return [float(run(x, env)) if not isinstance(x, (int, float)) else float(x) for x in v]
    x = float(run(v, env)) if not isinstance(v, (int, float)) else float(v)
    return [x, x, x]


def _catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def channel(ch, t, env):
    if not isinstance(ch, dict):
        return _vec(ch, env)
    keys = sorted((float(k), v) for k, v in ch.items())
    if t <= keys[0][0]:
        return _vec(_kf_value(keys[0][1], "pre"), env)
    if t >= keys[-1][0]:
        return _vec(_kf_value(keys[-1][1], "post"), env)
    for i in range(len(keys) - 1):
        t0, v0 = keys[i]
        t1, v1 = keys[i + 1]
        if t0 <= t <= t1:
            a = _vec(_kf_value(v0, "post"), env)
            b = _vec(_kf_value(v1, "pre"), env)
            f = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            smooth = isinstance(v0, dict) and v0.get("lerp_mode") == "catmullrom"
            if smooth:
                pm = _vec(_kf_value(keys[max(0, i - 1)][1], "post"), env)
                pn = _vec(_kf_value(keys[min(len(keys) - 1, i + 2)][1], "pre"), env)
                return [_catmull(pm[j], a[j], b[j], pn[j], f) for j in range(3)]
            return [a[j] + (b[j] - a[j]) * f for j in range(3)]
    return [0.0, 0.0, 0.0]


def anim_length(a):
    if "animation_length" in a:
        return float(a["animation_length"])
    L = 0.0
    for bone in a.get("bones", {}).values():
        for ch in bone.values():
            if isinstance(ch, dict):
                L = max([L] + [float(k) for k in ch.keys()])
    return L


def evaluate(anim, t, env, weight=1.0, pose=None):
    """Add one animation's contribution at local time t into pose (bone -> rot/pos/scale)."""
    pose = pose if pose is not None else {}
    L = anim_length(anim)
    loop = anim.get("loop", False)
    if L > 0:
        if loop is True:
            t = math.fmod(t, L)
        else:
            t = min(t, L)
    env = dict(env)
    env["query.anim_time"] = t
    for bone, chans in anim.get("bones", {}).items():
        p = pose.setdefault(bone, {})
        if "rotation" in chans:
            r = channel(chans["rotation"], t, env)
            old = p.get("rot", (0, 0, 0))
            p["rot"] = tuple(o + weight * v for o, v in zip(old, r))
        if "position" in chans:
            r = channel(chans["position"], t, env)
            old = p.get("pos", (0, 0, 0))
            p["pos"] = tuple(o + weight * v for o, v in zip(old, r))
        if "scale" in chans:
            r = channel(chans["scale"], t, env)
            old = p.get("scale", (1, 1, 1))
            old = (old, old, old) if not isinstance(old, tuple) else old
            p["scale"] = tuple(o * (1 + weight * (v - 1)) for o, v in zip(old, r))
    return pose


def check_all_molang(animations):
    """Parse every expression (raises SyntaxError with context)."""
    env = {}
    for name, a in animations.items():
        for t in (0.0, 0.37, 1.1):
            try:
                evaluate(a, t, env)
            except Exception as e:  # noqa: BLE001
                raise SyntaxError(f"{name}: {e}") from e


def gif(model, atlas, clips, path, size=300, fps=12, yaw=30, pitch=10, focus=None):
    """clips: list of (label, seconds, fn(t) -> pose). Writes an animated GIF."""
    frames = []
    for label, seconds, fn in clips:
        n = max(1, int(seconds * fps))
        for i in range(n):
            t = i / fps
            img = render(model, atlas, pose=fn(t), yaw=yaw, pitch=pitch, size=size, focus=focus)
            from PIL import ImageDraw
            ImageDraw.Draw(img).text((6, 6), label, fill=(220, 220, 220))
            frames.append(img.convert("P", palette=Image.ADAPTIVE, colors=128))
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=int(1000 / fps), loop=0, optimize=True)
    return frames


def strip(model, atlas, fn, times, path, size=240, yaw=30, pitch=10, focus=None, label=None):
    tiles = [render(model, atlas, pose=fn(t), yaw=yaw, pitch=pitch, size=size, focus=focus) for t in times]
    out = Image.new("RGB", (size * len(tiles), size + (18 if label else 0)), (10, 10, 12))
    from PIL import ImageDraw
    d = ImageDraw.Draw(out)
    for i, (t, img) in enumerate(zip(times, tiles)):
        out.paste(img, (i * size, 18 if label else 0))
        d.text((i * size + 4, (18 if label else 0) + 4), f"{t:.2f}s", fill=(200, 200, 200))
    if label:
        d.text((4, 3), label, fill=(230, 230, 230))
    out.save(path)
    return out
