"""Animations for THE LURKER (Bedrock animation format 1.8.0). Values are offsets from the geometry rest pose.

Locomotion cycles use symmetric keyframes; speed is scaled from movement speed so legs do not skate.
Sound events are placed on foot-plants and body moments (names resolve through the client entity's sound_effects).
"""
import json


def kf(frames, wrap=False):
    """frames: [(time, [x, y, z]), ...] -> keyframe dict. If wrap, ensure last == first for clean loops."""
    d = {}
    for t, v in frames:
        d[f"{t:.2f}"] = v
    return d


def bones(**kw):
    return kw


def build():
    A = {}

    # ---- idle: slow wrong breathing, a head that is never quite level -------------------------
    A["animation.dread.lurker.idle"] = {
        "loop": True, "animation_length": 5.0,
        "bones": {
            "torso": {"rotation": kf([(0, [0, 0, 0]), (1.6, [-2.2, 0, 0.6]), (3.4, [1.0, 0, -0.4]), (5.0, [0, 0, 0])])},
            "neck": {"rotation": kf([(0, [0, 0, 0]), (2.2, [3, 4, 2]), (3.4, [3, 4, 2]), (5.0, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (2.2, [-2, -6, 7]), (3.0, [-2, -6, 7]), (4.2, [1, 5, -4]), (5.0, [0, 0, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (1.5, [7, 0, 0]), (2.2, [3, 0, 0]), (5.0, [0, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (2.5, [2, 0, 2]), (5.0, [0, 0, 0])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (2.5, [3, 0, -2]), (5.0, [0, 0, 0])])},
            "hand_r": {"rotation": kf([(0, [0, 0, 0]), (0.9, [0, 0, 0]), (1.0, [14, 0, 0]), (1.15, [-4, 0, 0]), (1.4, [0, 0, 0]), (5.0, [0, 0, 0])])},
            "hand_l": {"rotation": kf([(0, [0, 0, 0]), (3.3, [0, 0, 0]), (3.4, [-12, 0, 0]), (3.6, [6, 0, 0]), (3.9, [0, 0, 0]), (5.0, [0, 0, 0])])},
        },
        "sound_effects": {"0.15": {"effect": "breath_idle"}},
    }

    # ---- walk: long deliberate strides, arms trailing, head hunting ---------------------------
    L = 1.6

    def leg(phase):
        # thigh swing / shin fold / foot flatten across one cycle, offset by phase (0 or 0.5)
        keys = [0, 0.25, 0.5, 0.75, 1.0]
        th = [-28, -4, 26, 6, -28]
        sh = [-14, 22, 6, -20, -14]
        ft = [6, -14, -8, 10, 6]
        n = len(keys) - 1
        sh_i = int(phase * n)
        def sh_pick(arr):
            return [arr[(i + sh_i) % n] for i in range(n)] + [arr[sh_i % n]]
        return keys, sh_pick(th), sh_pick(sh), sh_pick(ft)

    def cyc(keys, arr, axis=0, scale=L):
        out = []
        for t, v in zip(keys, arr):
            vec = [0, 0, 0]
            vec[axis] = v
            out.append((t * scale, vec))
        return kf(out)

    keys, th_r, sh_r, ft_r = leg(0.0)
    _, th_l, sh_l, ft_l = leg(0.5)
    A["animation.dread.lurker.walk"] = {
        "loop": True, "animation_length": L,
        "anim_time_update": "query.anim_time + (query.delta_time * Math.clamp(query.modified_move_speed * 5.0, 0.35, 2.4))",
        "bones": {
            "leg_r": {"rotation": cyc(keys, th_r)}, "shin_r": {"rotation": cyc(keys, sh_r)}, "foot_r": {"rotation": cyc(keys, ft_r)},
            "leg_l": {"rotation": cyc(keys, th_l)}, "shin_l": {"rotation": cyc(keys, sh_l)}, "foot_l": {"rotation": cyc(keys, ft_l)},
            "arm_r": {"rotation": cyc(keys, [14, 2, -12, 2, 14])}, "arm_l": {"rotation": cyc(keys, [-12, 2, 14, 2, -12])},
            "forearm_r": {"rotation": cyc(keys, [6, 14, 4, 14, 6])}, "forearm_l": {"rotation": cyc(keys, [4, 14, 6, 14, 4])},
            "torso": {"rotation": kf([(0, [0, 4, 0]), (0.4, [1.5, 0, 0]), (0.8, [0, -4, 0]), (1.2, [1.5, 0, 0]), (1.6, [0, 4, 0])])},
            "head": {"rotation": kf([(0, [0, -5, 3]), (0.8, [0, 5, -3]), (1.6, [0, -5, 3])])},
        },
        "sound_effects": {"0.10": {"effect": "step"}, "0.90": {"effect": "step"}},
    }

    # ---- stalk posture + stalk-walk: low, careful, reaching ----------------------------------
    A["animation.dread.lurker.stalk_pose"] = {
        "loop": True, "animation_length": 6.0,
        "bones": {
            "torso": {"rotation": kf([(0, [16, 0, 0]), (3.0, [19, 0, 1]), (6.0, [16, 0, 0])])},
            "neck": {"rotation": [14, 0, 0]},
            "head": {"rotation": kf([(0, [-6, 0, 0]), (3.0, [-8, 0, 0]), (6.0, [-6, 0, 0])])},
            "jaw": {"rotation": kf([(0, [10, 0, 0]), (3.0, [16, 0, 0]), (6.0, [10, 0, 0])])},
            "arm_r": {"rotation": [-34, 0, 4]}, "arm_l": {"rotation": [-30, 0, -4]},
            "forearm_r": {"rotation": [-18, 0, 0]}, "forearm_l": {"rotation": [-22, 0, 0]},
            "hand_r": {"rotation": kf([(0, [-6, 0, 0]), (1.5, [6, 0, 0]), (3.0, [-6, 0, 0]), (6.0, [-6, 0, 0])])},
            "hand_l": {"rotation": kf([(0, [4, 0, 0]), (2.0, [-8, 0, 0]), (4.0, [4, 0, 0]), (6.0, [4, 0, 0])])},
            "leg_r": {"rotation": [-10, 0, 0]}, "leg_l": {"rotation": [-10, 0, 0]},
        },
        "sound_effects": {"0.4": {"effect": "breath_alert"}},
    }
    S = 2.6
    sk_th_r = [-24, -10, 18, 4, -24]
    sk_th_l = [18, 4, -24, -10, 18]
    A["animation.dread.lurker.stalk_walk"] = {
        "loop": True, "animation_length": S,
        "anim_time_update": "query.anim_time + (query.delta_time * Math.clamp(query.modified_move_speed * 7.0, 0.3, 2.0))",
        "bones": {
            "leg_r": {"rotation": cyc(keys, sk_th_r, scale=S)}, "leg_l": {"rotation": cyc(keys, sk_th_l, scale=S)},
            "shin_r": {"rotation": cyc(keys, [-6, 30, 8, -26, -6], scale=S)}, "shin_l": {"rotation": cyc(keys, [8, -26, -6, 30, 8], scale=S)},
            "foot_r": {"rotation": cyc(keys, [4, -20, -6, 14, 4], scale=S)}, "foot_l": {"rotation": cyc(keys, [-6, 14, 4, -20, -6], scale=S)},
            "torso": {"rotation": kf([(0, [0, 3, 0]), (1.3, [0, -3, 0]), (2.6, [0, 3, 0])])},
        },
        "sound_effects": {"0.2": {"effect": "step_stalk"}, "1.5": {"effect": "step_stalk"}},
    }

    # ---- run: the sprint of something that should not be able to sprint -----------------------
    R = 0.72
    rk = [0, 0.25, 0.5, 0.75, 1.0]
    A["animation.dread.lurker.run"] = {
        "loop": True, "animation_length": R,
        "anim_time_update": "query.anim_time + (query.delta_time * Math.clamp(query.modified_move_speed * 2.6, 0.6, 1.8))",
        "bones": {
            "torso": {"rotation": kf([(0, [20, 5, 0]), (0.18, [26, 0, 0]), (0.36, [20, -5, 0]), (0.54, [26, 0, 0]), (0.72, [20, 5, 0])])},
            "neck": {"rotation": [16, 0, 0]},
            "head": {"rotation": kf([(0, [-14, 0, 0]), (0.36, [-18, 0, 0]), (0.72, [-14, 0, 0])])},
            "jaw": {"rotation": kf([(0, [28, 0, 0]), (0.36, [38, 0, 0]), (0.72, [28, 0, 0])])},
            "leg_r": {"rotation": cyc(rk, [-52, -8, 42, 10, -52], scale=R)}, "leg_l": {"rotation": cyc(rk, [42, 10, -52, -8, 42], scale=R)},
            "shin_r": {"rotation": cyc(rk, [-30, 44, 6, -34, -30], scale=R)}, "shin_l": {"rotation": cyc(rk, [6, -34, -30, 44, 6], scale=R)},
            "foot_r": {"rotation": cyc(rk, [8, -26, -10, 14, 8], scale=R)}, "foot_l": {"rotation": cyc(rk, [-10, 14, 8, -26, -10], scale=R)},
            "arm_r": {"rotation": cyc(rk, [48, 22, -40, 10, 48], scale=R)}, "arm_l": {"rotation": cyc(rk, [-40, 10, 48, 22, -40], scale=R)},
            "forearm_r": {"rotation": [-30, 0, 0]}, "forearm_l": {"rotation": [-30, 0, 0]},
        },
        "sound_effects": {"0.05": {"effect": "step"}, "0.41": {"effect": "step"}},
    }

    # ---- one-shots -----------------------------------------------------------------------------
    A["animation.dread.lurker.attack"] = {
        "loop": False, "animation_length": 0.8,
        "bones": {
            "torso": {"rotation": kf([(0, [0, 0, 0]), (0.25, [-14, -12, 0]), (0.42, [28, 14, 0]), (0.8, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (0.25, [10, 0, 0]), (0.42, [-22, 0, 0]), (0.8, [0, 0, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (0.3, [38, 0, 0]), (0.5, [6, 0, 0]), (0.8, [0, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (0.25, [150, 0, -20]), (0.42, [-110, 0, 10]), (0.8, [0, 0, 0])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (0.3, [130, 0, 20]), (0.48, [-100, 0, -10]), (0.8, [0, 0, 0])])},
            "hand_r": {"rotation": kf([(0, [0, 0, 0]), (0.25, [-30, 0, 0]), (0.42, [50, 0, 0]), (0.8, [0, 0, 0])])},
        },
        "sound_effects": {"0.18": {"effect": "attack_swipe"}},
    }
    A["animation.dread.lurker.notice"] = {
        "loop": False, "animation_length": 1.6,
        "bones": {
            "torso": {"rotation": kf([(0, [0, 0, 0]), (0.12, [-26, 0, 0]), (1.4, [-22, 0, 0]), (1.6, [0, 0, 0])])},
            "neck": {"rotation": kf([(0, [0, 0, 0]), (0.1, [-14, 0, 0]), (1.4, [-12, 0, 0]), (1.6, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (0.08, [-6, 22, 12]), (0.16, [-6, -14, 0]), (0.3, [-6, 0, 0]), (1.4, [-6, 0, 0]), (1.6, [0, 0, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (0.2, [10, 0, 0]), (0.9, [40, 0, 0]), (1.6, [0, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (0.3, [-8, 0, 24]), (1.4, [-8, 0, 24]), (1.6, [0, 0, 0])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (0.3, [-8, 0, -24]), (1.4, [-8, 0, -24]), (1.6, [0, 0, 0])])},
            "hand_r": {"rotation": kf([(0, [0, 0, 0]), (0.4, [-34, 0, 0]), (1.4, [-34, 0, 0]), (1.6, [0, 0, 0])])},
            "hand_l": {"rotation": kf([(0, [0, 0, 0]), (0.4, [-34, 0, 0]), (1.4, [-34, 0, 0]), (1.6, [0, 0, 0])])},
        },
        "sound_effects": {"0.0": {"effect": "notice"}, "0.12": {"effect": "head_turn"}},
    }
    A["animation.dread.lurker.hurt"] = {
        "loop": False, "animation_length": 0.5,
        "bones": {
            "torso": {"rotation": kf([(0, [0, 0, 0]), (0.1, [-16, 0, 6]), (0.5, [0, 0, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (0.1, [-24, 0, -10]), (0.5, [0, 0, 0])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (0.1, [30, 0, 0]), (0.5, [0, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (0.1, [-10, 0, 22]), (0.5, [0, 0, 0])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (0.1, [-10, 0, -22]), (0.5, [0, 0, 0])])},
        },
        "sound_effects": {"0.0": {"effect": "hurt"}},
    }
    A["animation.dread.lurker.death"] = {
        "loop": "hold_on_last_frame", "animation_length": 1.6,
        "bones": {
            "root": {"rotation": kf([(0, [0, 0, 0]), (0.9, [0, 0, 0]), (1.6, [-88, 0, 0])]),
                     "position": kf([(0, [0, 0, 0]), (1.6, [0, 6, 0])])},
            "head": {"rotation": kf([(0, [0, 0, 0]), (0.6, [-30, 12, 20]), (1.6, [-20, 14, 24])])},
            "jaw": {"rotation": kf([(0, [0, 0, 0]), (0.5, [44, 0, 0]), (1.6, [40, 0, 0])])},
            "arm_r": {"rotation": kf([(0, [0, 0, 0]), (0.8, [-20, 0, 40]), (1.6, [-10, 0, 60])])},
            "arm_l": {"rotation": kf([(0, [0, 0, 0]), (0.8, [-20, 0, -40]), (1.6, [-10, 0, -60])])},
        },
        "sound_effects": {"0.0": {"effect": "death"}},
    }

    # ---- head look-at: additive pitch/yaw so the skull always tracks, with limits ------------
    A["animation.dread.lurker.look"] = {
        "loop": True,
        "bones": {"head": {"rotation": ["Math.clamp(query.target_x_rotation, -35, 35)", "Math.clamp(query.target_y_rotation, -70, 70)", 0]}},
    }
    return {"format_version": "1.8.0", "animations": A}


if __name__ == "__main__":
    print(json.dumps(build(), indent=1)[:400])
