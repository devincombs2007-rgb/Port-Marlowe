"""Animations for THE GAUNT. Movement language: deliberate, heavy, nose-first. It never just walks: it tracks, pauses,
tastes the air, then moves again. Bursts of speed are sudden and full-bodied."""
from lurker_anim import kf


def cyc(times, values, axis=0, length=1.0):
    out = []
    for t, v in zip(times, values):
        vec = [0, 0, 0]
        vec[axis] = v
        out.append((t * length, vec))
    return kf(out)


Q = [0, 0.25, 0.5, 0.75, 1.0]


def quad_gait(L, arm_amp, leg_amp, bob, phase_pairs=True):
    """Diagonal-pair gait (arm_r with thigh_l). Returns bones dict."""
    a = [arm_amp, 0, -arm_amp, 0, arm_amp]
    b = [-arm_amp, 0, arm_amp, 0, -arm_amp]
    fa = [-arm_amp * 0.8, arm_amp * 0.4, arm_amp * 0.3, arm_amp * 0.6, -arm_amp * 0.8]
    fb = [arm_amp * 0.3, arm_amp * 0.6, -arm_amp * 0.8, arm_amp * 0.4, arm_amp * 0.3]
    la = [-leg_amp, 0, leg_amp, 0, -leg_amp]
    lb = [leg_amp, 0, -leg_amp, 0, leg_amp]
    return {
        "arm_r": {"rotation": cyc(Q, a, length=L)}, "arm_l": {"rotation": cyc(Q, b, length=L)},
        "forearm_r": {"rotation": cyc(Q, fa, length=L)}, "forearm_l": {"rotation": cyc(Q, fb, length=L)},
        "thigh_l": {"rotation": cyc(Q, la if phase_pairs else lb, length=L)}, "thigh_r": {"rotation": cyc(Q, lb if phase_pairs else la, length=L)},
        "body": {"position": kf([(0, [0, 0, 0]), (L * 0.25, [0, bob, 0]), (L * 0.5, [0, 0, 0]), (L * 0.75, [0, bob, 0]), (L, [0, 0, 0])]),
                 "rotation": kf([(0, [0, 0, 3]), (L * 0.5, [0, 0, -3]), (L, [0, 0, 3])])},
    }


def build():
    A = {}
    A["animation.dread.gaunt.idle"] = {
        "loop": True, "animation_length": 4.0,
        "bones": {
            "body": {"rotation": kf([(0, [0, 0, 0]), (1.6, [-3, 0, 0]), (4.0, [0, 0, 0])]),
                     "position": kf([(0, [0, 0, 0]), (1.6, [0, 0.6, 0]), (4.0, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (1.0, [0, 12, 0]), (1.1, [0, 12, 0]), (1.25, [4, -6, 8]), (2.6, [0, -14, 0]), (4.0, [0, 0, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (1.6, [8, 0, 0]), (2.2, [2, 0, 0]), (4.0, [0, 0, 0])])},
            "hand_r": {"rotation": kf([(0, [0, 0, 0]), (2.9, [0, 0, 0]), (3.0, [-16, 0, 0]), (3.3, [0, 0, 0]), (4.0, [0, 0, 0])])},
        },
        "sound_effects": {"0.2": {"effect": "breath"}},
    }
    L = 1.4
    walk = quad_gait(L, 20, 16, 0.8)
    walk["head"] = {"rotation": kf([(0, [4, -4, 0]), (L / 2, [-2, 4, 0]), (L, [4, -4, 0])])}
    A["animation.dread.gaunt.walk"] = {
        "loop": True, "animation_length": L,
        "anim_time_update": "query.anim_time + (query.delta_time * Math.clamp(query.modified_move_speed * 4.5, 0.4, 2.2))",
        "bones": walk,
        "sound_effects": {"0.05": {"effect": "step"}, "0.75": {"effect": "step"}},
    }
    T = 2.2
    track = quad_gait(T, 13, 10, 0.4)
    track["neck"] = {"rotation": [18, 0, 0]}
    track["head"] = {"rotation": kf([(0, [10, 0, 0]), (0.5, [14, 8, 0]), (0.55, [6, 10, 0]), (0.6, [14, 8, 0]), (1.4, [12, -8, 0]), (1.45, [6, -10, 0]), (1.5, [12, -8, 0]), (T, [10, 0, 0])])}
    track["body"]["rotation"] = kf([(0, [6, 0, 2]), (T / 2, [6, 0, -2]), (T, [6, 0, 2])])
    A["animation.dread.gaunt.track"] = {
        "loop": True, "animation_length": T,
        "anim_time_update": "query.anim_time + (query.delta_time * Math.clamp(query.modified_move_speed * 6.0, 0.25, 1.6))",
        "bones": track,
        "sound_effects": {"0.5": {"effect": "sniff"}, "1.4": {"effect": "step"}},
    }
    A["animation.dread.gaunt.search"] = {
        "loop": True, "animation_length": 3.2,
        "bones": {
            "body": {"rotation": kf([(0, [0, 0, 0]), (0.9, [0, 0, 0]), (1.3, [-24, 0, 0]), (2.1, [-24, 0, 0]), (2.6, [0, 0, 0]), (3.2, [0, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (1.3, [36, 0, -10]), (2.1, [36, 0, -10]), (2.6, [0, 0, 0]), (3.2, [0, 0, 0])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (1.3, [36, 0, 10]), (2.1, [36, 0, 10]), (2.6, [0, 0, 0]), (3.2, [0, 0, 0])])},
            "neck": {"rotation": kf([(0, [0, 0, 0]), (1.3, [-18, 0, 0]), (2.1, [-18, 0, 0]), (2.6, [0, 0, 0]), (3.2, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, -40, 0]), (0.5, [0, -40, 0]), (0.7, [0, 30, 6]), (1.3, [-14, 0, 0]), (1.6, [-14, 22, 0]), (1.9, [-14, -22, 0]), (2.1, [-14, 0, 0]), (2.8, [0, 40, -4]), (3.2, [0, -40, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (1.5, [16, 0, 0]), (1.7, [4, 0, 0]), (3.2, [0, 0, 0])])},
        },
        "sound_effects": {"0.6": {"effect": "sniff"}, "1.5": {"effect": "sniff"}, "2.8": {"effect": "breath"}},
    }
    R = 0.64
    run = {
        "arm_r": {"rotation": cyc(Q, [-42, -10, 40, 10, -42], length=R)}, "arm_l": {"rotation": cyc(Q, [-36, -6, 44, 12, -36], length=R)},
        "forearm_r": {"rotation": cyc(Q, [20, 34, -10, 6, 20], length=R)}, "forearm_l": {"rotation": cyc(Q, [16, 30, -14, 4, 16], length=R)},
        "thigh_r": {"rotation": cyc(Q, [30, 4, -34, -6, 30], length=R)}, "thigh_l": {"rotation": cyc(Q, [26, 0, -38, -10, 26], length=R)},
        "body": {"rotation": cyc(Q, [-8, 4, 10, -2, -8], length=R), "position": kf([(0, [0, 0, 0]), (R * 0.5, [0, 1.6, 0]), (R, [0, 0, 0])])},
        "neck": {"rotation": [-10, 0, 0]}, "head": {"rotation": kf([(0, [-6, 0, 0]), (R / 2, [4, 0, 0]), (R, [-6, 0, 0])])},
        "jaw": {"rotation": [22, 0, 0]},
    }
    A["animation.dread.gaunt.run"] = {
        "loop": True, "animation_length": R,
        "anim_time_update": "query.anim_time + (query.delta_time * Math.clamp(query.modified_move_speed * 2.8, 0.6, 1.8))",
        "bones": run, "sound_effects": {"0.08": {"effect": "step"}, "0.40": {"effect": "step"}},
    }
    A["animation.dread.gaunt.attack"] = {
        "loop": False, "animation_length": 0.9,
        "bones": {
            "body": {"rotation": kf([(0, [0, 0, 0]), (0.25, [-18, 0, 0]), (0.4, [16, 0, 0]), (0.9, [0, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (0.25, [70, 0, -20]), (0.4, [-50, 0, 10]), (0.9, [0, 0, 0])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (0.4, [70, 0, 20]), (0.55, [-50, 0, -10]), (0.9, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (0.3, [-20, 0, 0]), (0.45, [16, 0, 0]), (0.9, [0, 0, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (0.3, [46, 0, 0]), (0.5, [0, 0, 0]), (0.9, [0, 0, 0])])},
        },
        "sound_effects": {"0.2": {"effect": "attack"}},
    }
    A["animation.dread.gaunt.roar"] = {
        "loop": False, "animation_length": 1.8,
        "bones": {
            "body": {"rotation": kf([(0, [0, 0, 0]), (0.4, [-34, 0, 0]), (1.4, [-34, 0, 0]), (1.8, [0, 0, 0])])},
            "neck": {"rotation": kf([(0, [0, 0, 0]), (0.4, [-30, 0, 0]), (1.4, [-30, 0, 0]), (1.8, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (0.5, [-20, 0, 0]), (0.7, [-24, 6, 4]), (0.9, [-24, -6, -4]), (1.4, [-20, 0, 0]), (1.8, [0, 0, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (0.45, [50, 0, 0]), (1.4, [44, 0, 0]), (1.8, [0, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (0.4, [50, 0, -30]), (1.4, [50, 0, -30]), (1.8, [0, 0, 0])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (0.4, [50, 0, 30]), (1.4, [50, 0, 30]), (1.8, [0, 0, 0])])},
        },
        "sound_effects": {"0.4": {"effect": "vocal"}},
    }
    A["animation.dread.gaunt.burrow"] = {
        "loop": "hold_on_last_frame", "animation_length": 1.6,
        "bones": {
            "root": {"position": kf([(0, [0, 0, 0]), (0.3, [0, 0, 0]), (1.6, [0, -34, 0])])},
            "body": {"rotation": kf([(0, [0, 0, 0]), (0.3, [14, 0, 0]), (1.6, [26, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (0.6, [20, 0, 0]), (1.6, [30, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (0.2, [40, 0, 0]), (0.4, [-10, 0, 0]), (0.6, [40, 0, 0]), (0.8, [-10, 0, 0]), (1.6, [20, 0, 0])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (0.3, [40, 0, 0]), (0.5, [-10, 0, 0]), (0.7, [40, 0, 0]), (0.9, [-10, 0, 0]), (1.6, [20, 0, 0])])},
        },
        "sound_effects": {"0.0": {"effect": "burrow"}},
    }
    A["animation.dread.gaunt.hurt"] = {
        "loop": False, "animation_length": 0.5,
        "bones": {
            "body": {"rotation": kf([(0, [0, 0, 0]), (0.1, [-10, 0, 6]), (0.5, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (0.1, [-26, 14, 0]), (0.5, [0, 0, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (0.1, [36, 0, 0]), (0.5, [0, 0, 0])])},
        },
        "sound_effects": {"0.0": {"effect": "hurt"}},
    }
    A["animation.dread.gaunt.look"] = {
        "loop": True,
        "bones": {"head": {"rotation": ["Math.clamp(query.target_x_rotation, -25, 25)", "Math.clamp(query.target_y_rotation, -50, 50)", 0]}},
    }
    return {"format_version": "1.8.0", "animations": A}
