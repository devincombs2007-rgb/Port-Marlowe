"""Animations for THE MIMIC. As livestock it is almost right: it paces (both legs on one side together) instead of
walking like a cow, and it is far too still. The reveal unfolds the true form out of the back while the cow's head
goes limp."""
from lurker_anim import kf
from gaunt_anim import cyc, Q


def build():
    A = {}
    A["animation.dread.mimic.disguise_idle"] = {
        "loop": True, "animation_length": 7.0,
        "bones": {
            "d_tail": {"rotation": kf([(0, [0, 0, 0]), (0.4, [0, 0, 18]), (0.8, [0, 0, -14]), (1.2, [0, 0, 0]), (7.0, [0, 0, 0])])},
            "d_head": {"rotation": kf([(0, [0, 0, 0]), (2.0, [0, 0, 0]), (3.5, [10, 0, 0]), (5.5, [10, 0, 0]), (7.0, [0, 0, 0])])},
        },
    }
    W = 1.3
    A["animation.dread.mimic.disguise_walk"] = {
        "loop": True, "animation_length": W,
        "anim_time_update": "query.anim_time + (query.delta_time * Math.clamp(query.modified_move_speed * 5.0, 0.4, 2.0))",
        "bones": {  # pacing gait: legs on the same side move together (cows do not walk like this)
            "d_leg_fr": {"rotation": cyc(Q, [22, 0, -22, 0, 22], length=W)}, "d_leg_br": {"rotation": cyc(Q, [22, 0, -22, 0, 22], length=W)},
            "d_leg_fl": {"rotation": cyc(Q, [-22, 0, 22, 0, -22], length=W)}, "d_leg_bl": {"rotation": cyc(Q, [-22, 0, 22, 0, -22], length=W)},
            "d_body": {"rotation": kf([(0, [0, 0, 3]), (W / 2, [0, 0, -3]), (W, [0, 0, 3])])},
        },
        "sound_effects": {"0.1": {"effect": "step"}, "0.75": {"effect": "step"}},
    }
    A["animation.dread.mimic.head_turn"] = {
        "loop": "hold_on_last_frame", "animation_length": 3.0,
        "bones": {"d_head": {"rotation": kf([(0, [0, 0, 0]), (0.6, [0, 10, 0]), (2.6, [-10, 178, 24]), (3.0, [-10, 180, 24])])}},
        "sound_effects": {"0.6": {"effect": "voice"}},
    }
    A["animation.dread.mimic.reveal"] = {
        "loop": "hold_on_last_frame", "animation_length": 1.4,
        "bones": {
            "true_form": {"scale": kf([(0, [0.05, 0.05, 0.05]), (0.15, [0.3, 0.05, 0.3]), (0.9, [1.05, 1.1, 1.05]), (1.4, [1, 1, 1])]),
                          "position": kf([(0, [0, -12, 0]), (0.9, [0, 1, 0]), (1.4, [0, 0, 0])])},
            "t_arm_r": {"rotation": kf([(0, [-150, 0, 0]), (0.7, [-150, 0, 0]), (1.2, [10, 0, -10]), (1.4, [0, 0, 0])])},
            "t_arm_l": {"rotation": kf([(0, [-150, 0, 0]), (0.8, [-150, 0, 0]), (1.3, [10, 0, 10]), (1.4, [0, 0, 0])])},
            "t_lip_r": {"rotation": kf([(0, [0, 0, 0]), (1.0, [0, 0, 0]), (1.3, [0, -40, 0]), (1.4, [0, -35, 0])])},
            "t_lip_l": {"rotation": kf([(0, [0, 0, 0]), (1.0, [0, 0, 0]), (1.3, [0, 40, 0]), (1.4, [0, 35, 0])])},
            "d_head": {"rotation": kf([(0, [0, 0, 0]), (0.3, [-10, 0, 8]), (1.0, [62, 0, -18]), (1.4, [60, 0, -16])])},
            "d_body": {"position": kf([(0, [0, 0, 0]), (0.1, [0.4, 0, 0]), (0.2, [-0.4, 0, 0]), (0.3, [0.4, 0, 0]), (0.4, [-0.3, 0, 0]), (0.5, [0, 0, 0])])},
        },
        "sound_effects": {"0.0": {"effect": "reveal"}},
    }
    A["animation.dread.mimic.true_idle"] = {
        "loop": True, "animation_length": 3.0,
        "bones": {
            "d_head": {"rotation": [60, 0, -16]},
            "t_trunk": {"rotation": kf([(0, [0, 0, 4]), (1.5, [6, 0, -4]), (3.0, [0, 0, 4])])},
            "t_head": {"rotation": kf([(0, [0, 0, 0]), (0.8, [0, 0, 0]), (0.9, [0, 0, 30]), (1.6, [0, 0, 30]), (1.7, [0, 0, -6]), (3.0, [0, 0, 0])])},
            "t_lip_r": {"rotation": kf([(0, [0, -30, 0]), (1.5, [0, -45, 0]), (3.0, [0, -30, 0])])},
            "t_lip_l": {"rotation": kf([(0, [0, 30, 0]), (1.5, [0, 45, 0]), (3.0, [0, 30, 0])])},
            "t_arm3_r": {"rotation": kf([(0, [0, 0, 0]), (2.0, [0, 0, 0]), (2.1, [-30, 0, 0]), (2.3, [0, 0, 0]), (3.0, [0, 0, 0])])},
        },
    }
    S = 0.48
    A["animation.dread.mimic.skitter"] = {
        "loop": True, "animation_length": S,
        "anim_time_update": "query.anim_time + (query.delta_time * Math.clamp(query.modified_move_speed * 3.0, 0.6, 2.0))",
        "bones": {
            "d_head": {"rotation": [60, 0, -16]},
            "d_leg_fr": {"rotation": cyc(Q, [36, 0, -36, 0, 36], length=S)}, "d_leg_bl": {"rotation": cyc(Q, [36, 0, -36, 0, 36], length=S)},
            "d_leg_fl": {"rotation": cyc(Q, [-36, 0, 36, 0, -36], length=S)}, "d_leg_br": {"rotation": cyc(Q, [-36, 0, 36, 0, -36], length=S)},
            "t_trunk": {"rotation": [28, 0, 0]},
            "t_arm_r": {"rotation": cyc(Q, [-70, -40, -10, -40, -70], length=S)}, "t_arm_l": {"rotation": cyc(Q, [-10, -40, -70, -40, -10], length=S)},
            "t_arm2_r": {"rotation": [-30, 0, 0]}, "t_arm2_l": {"rotation": [-30, 0, 0]},
        },
        "sound_effects": {"0.05": {"effect": "skitter"}},
    }
    A["animation.dread.mimic.attack"] = {
        "loop": False, "animation_length": 0.8,
        "bones": {
            "t_trunk": {"rotation": kf([(0, [0, 0, 0]), (0.25, [-20, 0, 0]), (0.45, [30, 0, 0]), (0.8, [0, 0, 0])])},
            "t_arm_r": {"rotation": kf([(0, [0, 0, 0]), (0.25, [-160, 0, -20]), (0.45, [-20, 0, 10]), (0.8, [0, 0, 0])])},
            "t_arm_l": {"rotation": kf([(0, [0, 0, 0]), (0.3, [-160, 0, 20]), (0.5, [-20, 0, -10]), (0.8, [0, 0, 0])])},
            "t_lip_r": {"rotation": kf([(0, [0, -30, 0]), (0.3, [0, -70, 0]), (0.8, [0, -30, 0])])},
            "t_lip_l": {"rotation": kf([(0, [0, 30, 0]), (0.3, [0, 70, 0]), (0.8, [0, 30, 0])])},
        },
        "sound_effects": {"0.2": {"effect": "attack"}},
    }
    A["animation.dread.mimic.hurt"] = {
        "loop": False, "animation_length": 0.4,
        "bones": {"t_trunk": {"rotation": kf([(0, [0, 0, 0]), (0.1, [-14, 0, 8]), (0.4, [0, 0, 0])])},
                  "d_body": {"rotation": kf([(0, [0, 0, 0]), (0.1, [0, 0, 6]), (0.4, [0, 0, 0])])}},
        "sound_effects": {"0.0": {"effect": "hurt"}},
    }
    return {"format_version": "1.8.0", "animations": A}
