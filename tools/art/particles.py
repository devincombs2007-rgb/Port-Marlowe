"""Particle sprites + particle effect definitions for THE HOLLOW.

Restrained by design: short lifetimes, small counts, no screen-filling effects.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP, ensure  # noqa: E402

TEX = "textures/particle/hollow/"


def sprite_mote(n=8):
    y, x = np.mgrid[0:n, 0:n] + 0.5
    r = np.hypot(x - n / 2, y - n / 2) / (n / 2)
    a = np.clip(1 - r, 0, 1) ** 1.6
    img = np.zeros((n, n, 4), np.uint8)
    img[..., :3] = 255
    img[..., 3] = (a * 255).astype(np.uint8)
    return img


def sprite_flake():
    rows = [
        "........",
        "..##....",
        ".####...",
        ".#####..",
        "..#####.",
        "...###..",
        "....#...",
        "........",
    ]
    img = np.zeros((8, 8, 4), np.uint8)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == "#":
                img[y, x] = (255, 255, 255, 255)
    return img


def sprite_ring(n=16, w=1.6):
    y, x = np.mgrid[0:n, 0:n] + 0.5
    r = np.hypot(x - n / 2, y - n / 2)
    a = np.clip(1 - np.abs(r - (n / 2 - 2)) / w, 0, 1)
    img = np.zeros((n, n, 4), np.uint8)
    img[..., :3] = 255
    img[..., 3] = (a * 255).astype(np.uint8)
    return img


def sprite_bubble():
    rows = [
        "........",
        "..####..",
        ".#hh..#.",
        ".#h...#.",
        ".#....#.",
        ".#....#.",
        "..####..",
        "........",
    ]
    img = np.zeros((8, 8, 4), np.uint8)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == "#":
                img[y, x] = (210, 230, 220, 220)
            elif c == "h":
                img[y, x] = (255, 255, 255, 255)
    return img


def sprite_glint():
    rows = [
        "...#....",
        "...#....",
        "..###...",
        "#######.",
        "..###...",
        "...#....",
        "...#....",
        "........",
    ]
    img = np.zeros((8, 8, 4), np.uint8)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == "#":
                img[y, x] = (255, 255, 255, 255)
    img[3, 3] = (255, 255, 255, 255)
    return img


def sprite_dust():
    rng = np.random.default_rng(3)
    img = np.zeros((8, 8, 4), np.uint8)
    base = sprite_mote(8)[..., 3] / 255.0
    noise = rng.random((8, 8))
    a = np.clip(base * 1.4 - noise * 0.5, 0, 1)
    img[..., :3] = 255
    img[..., 3] = (a > 0.25) * 255
    return img


def sprite_print():
    rows = [
        "........",
        "..#..#..",
        "........",
        "...##...",
        "..####..",
        "..####..",
        "...##...",
        "........",
    ]
    img = np.zeros((8, 8, 4), np.uint8)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == "#":
                img[y, x] = (255, 255, 255, 255)
    return img


def sprite_puff(n=32, seed=5):
    """A soft, lumpy cloud puff for the mushroom cloud (white; tinted per particle)."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:n, 0:n] + 0.5
    a = np.zeros((n, n))
    for _ in range(9):                       # a few overlapping blobs make a cauliflower edge
        cx, cy = rng.uniform(n * 0.3, n * 0.7, 2)
        r = rng.uniform(n * 0.18, n * 0.32)
        a = np.maximum(a, np.clip(1 - np.hypot(x - cx, y - cy) / r, 0, 1) ** 0.8)
    shade = 0.72 + 0.28 * np.clip(1 - (y / n), 0, 1)                    # lit from above
    noise = rng.uniform(0.85, 1.0, (n, n))
    img = np.zeros((n, n, 4), np.uint8)
    img[..., :3] = (np.clip(shade * noise, 0, 1)[..., None] * 255).astype(np.uint8)
    img[..., 3] = (np.clip(a * 1.25, 0, 1) * 255).astype(np.uint8)
    return img


SPRITES = {
    "puff": sprite_puff(),
    "mote": sprite_mote(), "flake": sprite_flake(), "ring": sprite_ring(), "bubble": sprite_bubble(),
    "glint": sprite_glint(), "dust": sprite_dust(), "print": sprite_print(),
}


def billboard(size, tex_w, tex_h, mode="rotate_xyz"):
    return {
        "size": size,
        "facing_camera_mode": mode,
        "uv": {"texture_width": tex_w, "texture_height": tex_h, "uv": [0, 0], "uv_size": [tex_w, tex_h]},
    }


def effect(ident, tex, material, comps):
    return {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {"identifier": ident, "basic_render_parameters": {"material": material, "texture": TEX + tex}},
            "components": comps,
        },
    }


def color(r, g, b, a=1.0):
    return [round(r / 255, 3), round(g / 255, 3), round(b / 255, 3), a]


EFFECTS = {
    # the mushroom cloud's billowing surface: one big puff per spawn; size, colour, life and drift
    # come from the script (variable.size, variable.r/g/b, variable.life, variable.rise)
    "nuke_puff": effect("hollow:nuke_puff", "puff", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "variable.life"},
        "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": "math.random(-6, 6)"},
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, "variable.rise", 0], "linear_drag_coefficient": 0.4},
        "minecraft:particle_appearance_billboard": billboard([
            "variable.size * (0.7 + 0.5 * variable.particle_age / variable.particle_lifetime)",
            "variable.size * (0.7 + 0.5 * variable.particle_age / variable.particle_lifetime)"], 32, 32),
        "minecraft:particle_appearance_tinting": {"color": [
            "variable.r", "variable.g", "variable.b",
            "math.min(1, variable.particle_age * 2) * math.clamp((variable.particle_lifetime - variable.particle_age) / 3, 0, 1)"]},
    }),
    # the fireball's glare: additive, so it burns bright against the sky
    "nuke_glow": effect("hollow:nuke_glow", "puff", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "variable.life"},
        "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": "math.random(-20, 20)"},
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, "variable.rise", 0]},
        "minecraft:particle_appearance_billboard": billboard(["variable.size", "variable.size"], 32, 32),
        "minecraft:particle_appearance_tinting": {"color": {
            "interpolant": "variable.particle_age / variable.particle_lifetime",
            "gradient": {"0.0": color(255, 250, 230), "0.25": color(255, 196, 90), "0.6": color(230, 90, 30, 0.8), "1.0": color(90, 30, 20, 0.0)}}},
    }),
    "watcher_shed": effect("hollow:watcher_shed", "flake", "particles_alpha", {
        "minecraft:emitter_rate_instant": {"num_particles": 28},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_box": {"half_dimensions": [0.35, 1.3, 0.35], "direction": "outwards"},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "math.random(1.4, 2.4)"},
        "minecraft:particle_initial_speed": "math.random(0.4, 1.2)",
        "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": "math.random(-90, 90)"},
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -1.4, 0], "linear_drag_coefficient": 1.6},
        "minecraft:particle_appearance_billboard": billboard(["0.07 + variable.particle_random_1 * 0.05", "0.07 + variable.particle_random_1 * 0.05"], 8, 8),
        "minecraft:particle_appearance_tinting": {"color": {
            "interpolant": "variable.particle_random_2",
            "gradient": {"0.0": color(46, 38, 30), "0.7": color(70, 58, 45), "1.0": color(200, 194, 180)}}},
        "minecraft:particle_appearance_lighting": {},
    }),
    "resin_glint": effect("hollow:resin_glint", "glint", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 5},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_sphere": {"radius": 0.35, "direction": [0, 1, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "math.random(1.0, 1.8)"},
        "minecraft:particle_initial_speed": "math.random(0.05, 0.2)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 0.15, 0], "linear_drag_coefficient": 1.0},
        "minecraft:particle_appearance_billboard": billboard(["0.09 * (1 - variable.particle_age / variable.particle_lifetime)", "0.09 * (1 - variable.particle_age / variable.particle_lifetime)"], 8, 8),
        "minecraft:particle_appearance_tinting": {"color": color(240, 226, 176, 0.9)},
    }),
    "ward_glow": effect("hollow:ward_glow", "mote", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 14},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_sphere": {"radius": 0.3, "direction": "outwards"},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "math.random(0.6, 1.2)"},
        "minecraft:particle_initial_speed": "math.random(0.4, 1.0)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 1.2, 0], "linear_drag_coefficient": 2.0},
        "minecraft:particle_appearance_billboard": billboard(["0.08", "0.08"], 8, 8),
        "minecraft:particle_appearance_tinting": {"color": {
            "interpolant": "variable.particle_age / variable.particle_lifetime",
            "gradient": {"0.0": color(255, 200, 120), "0.6": color(226, 116, 44), "1.0": color(120, 40, 16, 0.0)}}},
    }),
    "chime_ring": effect("hollow:chime_ring", "ring", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.9},
        "minecraft:particle_appearance_billboard": billboard(["0.2 + variable.particle_age * 1.6", "0.2 + variable.particle_age * 1.6"], 16, 16),
        "minecraft:particle_appearance_tinting": {"color": ["0.85", "0.6", "0.45", "0.6 * (1 - variable.particle_age / variable.particle_lifetime)"]},
    }),
    "mire_bubbles": effect("hollow:mire_bubbles", "bubble", "particles_alpha", {
        "minecraft:emitter_rate_steady": {"spawn_rate": 6, "max_particles": 12},
        "minecraft:emitter_lifetime_once": {"active_time": 1.6},
        "minecraft:emitter_shape_disc": {"radius": 0.8, "plane_normal": "y", "direction": [0, 1, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "math.random(0.4, 0.9)"},
        "minecraft:particle_initial_speed": "math.random(0.1, 0.3)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 0.4, 0]},
        "minecraft:particle_appearance_billboard": billboard(["0.06 + variable.particle_random_1 * 0.06", "0.06 + variable.particle_random_1 * 0.06"], 8, 8),
        "minecraft:particle_appearance_lighting": {},
    }),
    "heart_spores": effect("hollow:heart_spores", "mote", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 18},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_sphere": {"radius": 2.5, "direction": "outwards"},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "math.random(2.0, 3.5)"},
        "minecraft:particle_initial_speed": "math.random(0.05, 0.3)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 0.08, 0], "linear_drag_coefficient": 0.6},
        "minecraft:particle_appearance_billboard": billboard(["0.05 + variable.particle_random_1 * 0.04", "0.05 + variable.particle_random_1 * 0.04"], 8, 8),
        "minecraft:particle_appearance_tinting": {"color": color(150, 70, 55, 0.8)},
        "minecraft:particle_appearance_lighting": {},
    }),
    "root_warning": effect("hollow:root_warning", "dust", "particles_alpha", {
        "minecraft:emitter_rate_steady": {"spawn_rate": 30, "max_particles": 40},
        "minecraft:emitter_lifetime_once": {"active_time": 1.0},
        "minecraft:emitter_shape_disc": {"radius": 1.3, "plane_normal": "y", "direction": [0, 1, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "math.random(0.5, 0.9)"},
        "minecraft:particle_initial_speed": "math.random(0.6, 1.4)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -2.0, 0], "linear_drag_coefficient": 1.0},
        "minecraft:particle_appearance_billboard": billboard(["0.1 + variable.particle_random_1 * 0.08", "0.1 + variable.particle_random_1 * 0.08"], 8, 8),
        "minecraft:particle_appearance_tinting": {"color": color(118, 92, 66)},
        "minecraft:particle_appearance_lighting": {},
    }),
    "pulse_ring": effect("hollow:pulse_ring", "mote", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 90},
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
        "minecraft:emitter_shape_disc": {"radius": 0.5, "plane_normal": "y", "direction": "outwards", "surface_only": True},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 1.3},
        "minecraft:particle_initial_speed": 9.0,
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 0.6},
        "minecraft:particle_appearance_billboard": billboard(["0.22", "0.22"], 8, 8),
        "minecraft:particle_appearance_tinting": {"color": ["0.9", "0.32", "0.25", "1 - variable.particle_age / variable.particle_lifetime"]},
    }),
    "lens_reveal": effect("hollow:lens_reveal", "glint", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 10},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_sphere": {"radius": 0.8, "direction": "outwards"},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "math.random(0.6, 1.1)"},
        "minecraft:particle_initial_speed": "math.random(0.2, 0.5)",
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 1.5},
        "minecraft:particle_appearance_billboard": billboard(["0.08", "0.08"], 8, 8),
        "minecraft:particle_appearance_tinting": {"color": color(190, 225, 215, 0.9)},
    }),
    "pale_tracks": effect("hollow:pale_tracks", "print", "particles_alpha", {
        "minecraft:emitter_rate_instant": {"num_particles": 4},
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
        "minecraft:emitter_shape_box": {"half_dimensions": [0.6, 0, 0.6], "direction": [0, 0, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 18},
        "minecraft:particle_appearance_billboard": billboard(["0.18", "0.24"], 8, 8, "emitter_transform_xz"),
        "minecraft:particle_appearance_tinting": {"color": ["0.85", "0.83", "0.78", "math.clamp(1.2 - variable.particle_age / variable.particle_lifetime, 0, 0.8)"]},
        "minecraft:particle_appearance_lighting": {},
    }),
    "vein_mote": effect("hollow:vein_mote", "mote", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 8},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_sphere": {"radius": 0.4, "direction": "outwards"},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "math.random(0.8, 1.4)"},
        "minecraft:particle_initial_speed": "math.random(0.1, 0.4)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 0.5, 0], "linear_drag_coefficient": 1.0},
        "minecraft:particle_appearance_billboard": billboard(["0.06", "0.06"], 8, 8),
        "minecraft:particle_appearance_tinting": {"color": color(224, 87, 74, 0.9)},
    }),
}


def main():
    tex_dir = ensure(os.path.join(RP, "textures", "particle", "hollow"))
    for name, arr in SPRITES.items():
        Image.fromarray(arr, "RGBA").save(os.path.join(tex_dir, f"{name}.png"))
    out = ensure(os.path.join(RP, "particles"))
    for name, obj in EFFECTS.items():
        with open(os.path.join(out, f"{name}.particle.json"), "w") as f:
            json.dump(obj, f, indent=2)


if __name__ == "__main__":
    main()
