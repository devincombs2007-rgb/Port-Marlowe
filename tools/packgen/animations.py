"""Animations + animation controllers for every creature except the Heart Below's set pieces.

1.1 rewrite. Design rules:
  * Continuous procedural motion uses query.life_time (always increasing); looping keyframed
    clips declare animation_length, so query.anim_time is always well defined.
  * Gaits are driven by query.modified_distance_moved, so feet track the ground at any speed,
    and are weighted by speed in the locomotion controllers.
  * Horror lives in the details: long holds, then sudden twitches (TW below), heads that keep
    still while bodies move, breathing in rib cages, delayed secondary motion in tails, fingers,
    feelers and crowns.
  * Every expression is parsed by tools/hollowkit/molang.py during the build, and
    tools/packgen/anim_previews.py renders GIFs of each clip on the real geometry.
Molang trig functions take degrees.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP  # noqa: E402

Q = "query"
LT = "query.life_time"
DIST = "query.modified_distance_moved"
MOVE_WEIGHT = "math.clamp(query.modified_move_speed * 5.0, 0.0, 1.0)"


def TW(rate, sharp=24, phase=0):
    """A rare, sharp twitch: ~0 most of the time, a brief spike once per 360/rate seconds."""
    return f"math.pow(math.max(0, math.sin({LT} * {rate} + {phase})), {sharp})"


def S(rate, amp, phase=0, t=LT):
    return f"math.sin({t} * {rate} + {phase}) * {amp}"


def anim(bones, loop=True, length=None, sounds=None, override=False):
    a = {"loop": loop, "bones": bones}
    if length:
        a["animation_length"] = length
    if sounds:
        a["sound_effects"] = sounds
    if override:
        a["override_previous_animation"] = True
    return a


def kf(*pairs, smooth=True):
    """Keyframes from (time, [x, y, z]) pairs; catmull-rom by default for organic motion."""
    out = {}
    for t, v in pairs:
        key = f"{t:.2f}" if isinstance(t, float) else str(t)
        out[key] = {"post": v, "lerp_mode": "catmullrom"} if smooth else v
    return out


def ctrl(initial, states):
    return {"initial_state": initial, "states": states}


ANIMS = {}
CTRLS = {}


def write(name, animations, controllers):
    ANIMS.update(animations)
    CTRLS.update(controllers)
    with open(os.path.join(RP, "animations", f"{name}.animation.json"), "w") as f:
        json.dump({"format_version": "1.8.0", "animations": animations}, f, indent=2)
    with open(os.path.join(RP, "animation_controllers", f"{name}.animation_controllers.json"), "w") as f:
        json.dump({"format_version": "1.10.0", "animation_controllers": controllers}, f, indent=2)


def locomotion(idle_when=None, walk_anim="walk", go=0.06, stop=0.03):
    idle = [{"idle": idle_when}] if idle_when else ["idle"]
    return ctrl("idle", {
        "idle": {"animations": idle, "transitions": [{"walking": f"{Q}.modified_move_speed > {go}"}], "blend_transition": 0.3},
        "walking": {"animations": [{walk_anim: MOVE_WEIGHT}], "transitions": [{"idle": f"{Q}.modified_move_speed < {stop}"}],
                    "blend_transition": 0.3},
    })


def strike():
    return ctrl("default", {
        "default": {"transitions": [{"attacking": "variable.attack_time > 0.0"}]},
        "attacking": {"animations": ["attack"], "transitions": [{"default": "query.all_animations_finished"}]},
    })


# ------------------------------------------------------------------------------ WATCHER
def watcher():
    st = f"{DIST} * 22"
    A = {
        # Almost a statue: the crown creaks, fingers flex one at a time, and every so often the
        # whole head gives a small, wrong jerk.
        "animation.hollow.watcher.idle": anim({
            "body": {"rotation": [0, 0, S(31, 0.8)]},
            "chest": {"rotation": [S(22, 1.2), 0, 0], "scale": [f"1 + {S(22, 0.012, 90)}", 1, f"1 + {S(22, 0.02, 90)}"]},
            "head": {"rotation": [f"{TW(29, 30)} * -7", f"{TW(29, 30)} * 9", f"{TW(29, 30)} * 11 + {S(17, 1.5)}"]},
            "crown": {"rotation": [S(13, 1.2), 0, S(19, 2.4, 40)]},
            "jaw": {"rotation": [f"1.5 + {S(9, 1.0)}", 0, 0]},
            "right_arm": {"rotation": [S(26, 1.4), 0, S(18, 1.0)]},
            "left_arm": {"rotation": [S(26, 1.4, 120), 0, S(18, -1.0, 60)]},
            "right_hand": {"rotation": [f"{S(41, 4)} - {TW(53, 18)} * 18", 0, S(23, 3)]},
            "left_hand": {"rotation": [f"{S(37, 4, 70)} - {TW(47, 18, 100)} * 16", 0, S(29, -3)]},
        }),
        # Long, creaking strides; arms hang and swing late; the head stays level and fixed on you.
        "animation.hollow.watcher.walk": anim({
            "right_leg": {"rotation": [f"math.cos({st}) * 24", 0, 0]},
            "left_leg": {"rotation": [f"-math.cos({st}) * 24", 0, 0]},
            "right_shin": {"rotation": [f"math.max(0, math.sin({st})) * 34", 0, 0]},
            "left_shin": {"rotation": [f"math.max(0, -math.sin({st})) * 34", 0, 0]},
            "body": {"position": [0, f"-math.abs(math.cos({st})) * 0.35", 0], "rotation": [0, f"math.cos({st}) * 4", 0]},
            "chest": {"rotation": [4, f"-math.cos({st}) * 6", f"math.sin({st}) * 2"]},
            "neck": {"rotation": [0, f"math.cos({st}) * 3", 0]},
            "right_arm": {"rotation": [f"-math.cos({st} - 50) * 12", 0, 0]},
            "left_arm": {"rotation": [f"math.cos({st} - 50) * 12", 0, 0]},
            "right_forearm": {"rotation": [f"-6 - math.max(0, math.cos({st} - 90)) * 10", 0, 0]},
            "left_forearm": {"rotation": [f"-6 - math.max(0, -math.cos({st} - 90)) * 10", 0, 0]},
            "crown": {"rotation": [f"math.sin({st} * 2) * 1.5", 0, f"math.sin({st}) * 2.5"]},
        }),
        # Patient pursuit: bent low, head pushed forward, long careful steps, fingers spread.
        "animation.hollow.watcher.creep": anim({
            "root": {"position": [0, -2.4, 0]},
            "body": {"rotation": [12, 0, 0]},
            "chest": {"rotation": [14, 0, 0]},
            "neck": {"rotation": [-10, 0, 0]},
            "head": {"rotation": [-12, 0, 0]},
            "right_leg": {"rotation": [f"-25 + math.cos({st} * 0.8) * 18", 0, 0]},
            "left_leg": {"rotation": [f"-25 - math.cos({st} * 0.8) * 18", 0, 0]},
            "right_shin": {"rotation": [f"48 + math.max(0, math.sin({st} * 0.8)) * 24", 0, 0]},
            "left_shin": {"rotation": [f"48 + math.max(0, -math.sin({st} * 0.8)) * 24", 0, 0]},
            "right_arm": {"rotation": [f"-28 - math.cos({st} * 0.8) * 8", 0, 6]},
            "left_arm": {"rotation": [f"-28 + math.cos({st} * 0.8) * 8", 0, -6]},
            "right_hand": {"rotation": [-20, 0, 10]},
            "left_hand": {"rotation": [-20, 0, -10]},
        }),
        "animation.hollow.watcher.look_at_target": anim({
            "head": {"rotation": ["math.clamp(query.target_x_rotation * 0.7, -25, 25)", "math.clamp(query.target_y_rotation * 0.85, -65, 65)", 0]},
        }),
        # Lurking at the treeline: the head slowly lists sideways... holds... and snaps upright.
        "animation.hollow.watcher.stare": anim({
            "head": {"rotation": {"0.0": [0, 0, 0], "2.2": {"post": [0, 0, 18], "lerp_mode": "catmullrom"},
                                  "4.6": [2, 0, 24], "4.68": [-4, 0, -5], "4.9": [0, 0, -2], "7.0": [0, 0, 0]}},
            "jaw": {"rotation": {"0.0": [2, 0, 0], "3.0": [9, 0, 0], "4.68": [1, 0, 0], "7.0": [2, 0, 0]}},
            "right_arm": {"rotation": [-4, 0, 2]},
            "left_arm": {"rotation": [-2, 0, -2]},
            "right_hand": {"rotation": {"0.0": [0, 0, 0], "5.6": [0, 0, 0], "5.7": [-26, 0, 8], "6.4": [-6, 0, 2], "7.0": [0, 0, 0]}},
        }, length=7.0),
        # Caught: a violent full-body flinch, then it stiffens and backs off.
        "animation.hollow.watcher.seen": anim({
            "head": {"rotation": {"0.0": [0, 0, 0], "0.05": [-28, 14, 12], "0.16": [-6, -8, -6], "0.3": [-12, 4, 4], "0.8": [-4, 0, 0]}},
            "jaw": {"rotation": {"0.0": [0, 0, 0], "0.05": [26, 0, 0], "0.4": [6, 0, 0], "0.8": [2, 0, 0]}},
            "chest": {"rotation": {"0.0": [0, 0, 0], "0.06": [-14, 0, 4], "0.25": [-4, 0, -2], "0.8": [-2, 0, 0]}},
            "right_arm": {"rotation": {"0.0": [0, 0, 0], "0.06": [-34, 0, 22], "0.8": [-6, 0, 4]}},
            "left_arm": {"rotation": {"0.0": [0, 0, 0], "0.06": [-34, 0, -22], "0.8": [-6, 0, -4]}},
            "right_hand": {"rotation": {"0.0": [0, 0, 0], "0.06": [-30, 0, 20], "0.8": [0, 0, 0]}},
            "left_hand": {"rotation": {"0.0": [0, 0, 0], "0.06": [-30, 0, -20], "0.8": [0, 0, 0]}},
        }, loop="hold_on_last_frame", length=0.8),
        # The strike: arms swing up and wide, the jaw drops, the whole body pitches in.
        "animation.hollow.watcher.lunge": anim({
            "body": {"rotation": {"0.0": [0, 0, 0], "0.2": [10, 0, 0], "0.35": [16, 0, 0]}},
            "chest": {"rotation": {"0.0": [0, 0, 0], "0.12": [-8, 0, 0], "0.35": [22, 0, 0]}},
            "head": {"rotation": {"0.0": [0, 0, 0], "0.12": [-14, 0, 0], "0.35": [6, 0, 0]}},
            "jaw": {"rotation": {"0.0": [0, 0, 0], "0.15": [38, 0, 0], "0.35": [34, 0, 0]}},
            "right_arm": {"rotation": {"0.0": [0, 0, 0], "0.15": [-150, 0, 30], "0.35": [-100, 0, 10]}},
            "left_arm": {"rotation": {"0.0": [0, 0, 0], "0.15": [-150, 0, -30], "0.35": [-100, 0, -10]}},
            "right_forearm": {"rotation": {"0.0": [0, 0, 0], "0.15": [-20, 0, 0], "0.35": [-8, 0, 0]}},
            "left_forearm": {"rotation": {"0.0": [0, 0, 0], "0.15": [-20, 0, 0], "0.35": [-8, 0, 0]}},
            "right_hand": {"rotation": {"0.0": [0, 0, 0], "0.35": [-25, 0, 20]}},
            "left_hand": {"rotation": {"0.0": [0, 0, 0], "0.35": [-25, 0, -20]}},
        }, loop="hold_on_last_frame", length=0.35),
    }
    C = {
        "controller.animation.hollow.watcher.locomotion": ctrl("idle", {
            "idle": {"animations": ["idle"], "transitions": [{"walking": f"{Q}.modified_move_speed > 0.08 && !variable.patient"},
                                                           {"creeping": f"{Q}.modified_move_speed > 0.05 && variable.patient"}],
                     "blend_transition": 0.3},
            "walking": {"animations": [{"walk": MOVE_WEIGHT}], "transitions": [{"idle": f"{Q}.modified_move_speed < 0.04"},
                                                                              {"creeping": "variable.patient"}],
                        "blend_transition": 0.3},
            "creeping": {"animations": [{"creep": "math.clamp(query.modified_move_speed * 7.0, 0.0, 1.0)"}],
                         "transitions": [{"idle": f"{Q}.modified_move_speed < 0.03"}, {"walking": "!variable.patient"}],
                         "blend_transition": 0.45},
        }),
        "controller.animation.hollow.watcher.mood": ctrl("neutral", {
            "neutral": {"transitions": [{"lurk": "variable.state == 'lurk'"}, {"seen": "variable.state == 'withdraw'"},
                                        {"lunge": "variable.state == 'lunge'"}]},
            "lurk": {"animations": ["stare"], "transitions": [{"neutral": "variable.state != 'lurk'"}], "blend_transition": 0.4},
            "seen": {"animations": ["seen"], "transitions": [{"neutral": "variable.state != 'withdraw'"}], "blend_transition": 0.05},
            "lunge": {"animations": ["lunge"], "transitions": [{"neutral": "variable.state != 'lunge'"}], "blend_transition": 0.1},
        }),
    }
    write("watcher", A, C)


# ------------------------------------------------------------------------------ BORROWED
def borrowed():
    open_l, open_r = [0, -42, -6], [0, 42, 6]
    HIDDEN = {"inner": {"scale": 0}, "spines": {"scale": 0}, "ribs_l": {"scale": 0}, "ribs_r": {"scale": 0}}
    ribs_open_l, ribs_open_r = [0, 0, -8], [0, 0, 8]
    ribs_fold_l, ribs_fold_r = [0, 0, 70], [0, 0, -70]
    leg_long = [1, 1.38, 1]
    lift = [0, 4.8, 0]
    A = {
        "animation.hollow.borrowed.disguise": anim(HIDDEN),
        # Tells: it never grazes; its head rolls slowly sideways while it watches you, further
        # than a sheep's would, and its ears flick at nothing.
        "animation.hollow.borrowed.idle": anim({
            "body": {"position": [0, S(80, 0.12), 0]},
            "neck": {"rotation": [S(21, 2), 0, 0]},
            "head": {"rotation": [0, f"variable.watchful ? 0 : {S(12, 14)}",
                                  f"{S(11, 1)} * (variable.watchful ? 26 : 3) + {TW(33, 40)} * 6"]},
            "head_l": {"rotation": [0, f"{TW(41, 30)} * -6", 0]},
            "head_r": {"rotation": [0, f"{TW(41, 30, 60)} * 6", 0]},
        }),
        # Tell: a pacing gait (both legs on one side move together). Sheep trot diagonally.
        "animation.hollow.borrowed.walk": anim({
            "leg_fl": {"rotation": [f"math.cos({DIST} * 38) * 28", 0, 0]},
            "leg_bl": {"rotation": [f"math.cos({DIST} * 38) * 28", 0, 0]},
            "leg_fr": {"rotation": [f"-math.cos({DIST} * 38) * 28", 0, 0]},
            "leg_br": {"rotation": [f"-math.cos({DIST} * 38) * 28", 0, 0]},
            "body": {"rotation": [0, 0, f"math.sin({DIST} * 38) * 3"], "position": [0, f"math.abs(math.sin({DIST} * 38)) * 0.3", 0]},
            "neck": {"rotation": [f"math.sin({DIST} * 76) * 2", 0, 0]},
        }),
        "animation.hollow.borrowed.look_at_target": anim({
            "head": {"rotation": ["math.clamp(query.target_x_rotation, -25, 25)", "math.clamp(query.target_y_rotation, -60, 60)", 0]},
        }),
        # Once exposed: a low, fast, diagonal scramble on too-long legs.
        "animation.hollow.borrowed.run": anim({
            "leg_fl": {"rotation": [f"math.cos({DIST} * 46) * 42", 0, -4]},
            "leg_br": {"rotation": [f"math.cos({DIST} * 46) * 42", 0, 4]},
            "leg_fr": {"rotation": [f"-math.cos({DIST} * 46) * 42", 0, 4]},
            "leg_bl": {"rotation": [f"-math.cos({DIST} * 46) * 42", 0, -4]},
            "body": {"position": [0, f"-math.abs(math.sin({DIST} * 46)) * 0.6", 0],
                     "rotation": [6, f"math.sin({DIST} * 46) * 4", f"math.sin({DIST} * 46) * 3"]},
            "ribs_l": {"rotation": [0, 0, f"math.sin({DIST} * 92) * 8"]},
            "ribs_r": {"rotation": [0, 0, f"-math.sin({DIST} * 92) * 8"]},
        }),
        # The reveal (1.6 s, never attacks): a shudder, the ribs crack outward, the head splits,
        # the legs unfold longer and the whole thing rises, then the inner jaw gapes.
        "animation.hollow.borrowed.reveal": anim({
            "root": {"position": {"0.0": [0, 0, 0], "0.7": [0, 0, 0], "1.15": {"post": lift, "lerp_mode": "catmullrom"}, "1.6": lift}},
            "leg_fl": {"scale": {"0.0": [1, 1, 1], "0.7": [1, 1, 1], "1.15": leg_long, "1.6": leg_long}},
            "leg_fr": {"scale": {"0.0": [1, 1, 1], "0.7": [1, 1, 1], "1.15": leg_long, "1.6": leg_long}},
            "leg_bl": {"scale": {"0.0": [1, 1, 1], "0.75": [1, 1, 1], "1.2": leg_long, "1.6": leg_long}},
            "leg_br": {"scale": {"0.0": [1, 1, 1], "0.75": [1, 1, 1], "1.2": leg_long, "1.6": leg_long}},
            "inner": {"scale": {"0.0": 0, "0.45": 0, "0.75": 1.12, "0.95": 1.0}},
            "inner_jaw": {"rotation": {"0.0": [0, 0, 0], "1.1": [0, 0, 0], "1.3": [34, 0, 0], "1.6": [22, 0, 0]}},
            "spines": {"scale": {"0.0": 0, "0.55": 0, "0.9": 1.0},
                       "rotation": {"0.55": [0, 0, 0], "0.85": [-16, 0, 0], "1.5": [0, 0, 0]}},
            "ribs_l": {"scale": {"0.0": 0, "0.3": 0, "0.32": 1}, "rotation": {"0.0": ribs_fold_l, "0.3": ribs_fold_l, "0.42": [0, 0, -18], "0.6": ribs_open_l}},
            "ribs_r": {"scale": {"0.0": 0, "0.3": 0, "0.32": 1}, "rotation": {"0.0": ribs_fold_r, "0.3": ribs_fold_r, "0.42": [0, 0, 18], "0.6": ribs_open_r}},
            "head_l": {"rotation": {"0.0": [0, 0, 0], "0.35": [0, -8, 0], "0.5": [0, -3, 0], "0.75": [0, -48, -8], "1.6": open_l}},
            "head_r": {"rotation": {"0.0": [0, 0, 0], "0.35": [0, 8, 0], "0.5": [0, 3, 0], "0.75": [0, 48, 8], "1.6": open_r}},
            "neck": {"position": {"0.6": [0, 0, 0], "1.1": [0, 3, -3]}, "rotation": {"0.6": [0, 0, 0], "1.1": [-18, 0, 0]}},
            "body": {"rotation": {"0.0": [0, 0, 0], "0.08": [0, 0, 5], "0.16": [0, 0, -5], "0.24": [0, 0, 4],
                                  "0.32": [0, 0, -3], "0.45": [0, 0, 0], "1.6": [-4, 0, 0]}},
        }, length=1.6, sounds={"0.0": {"effect": "reveal"}}),
        "animation.hollow.borrowed.revealed": anim({
            "root": {"position": lift},
            "leg_fl": {"scale": leg_long}, "leg_fr": {"scale": leg_long},
            "leg_bl": {"scale": leg_long}, "leg_br": {"scale": leg_long},
            "inner": {"scale": 1},
            "inner_jaw": {"rotation": [f"18 + {S(160, 6)} + {TW(70, 12)} * 14", 0, 0]},
            "spines": {"scale": 1, "rotation": [S(300, 4), 0, 0]},
            "ribs_l": {"rotation": [0, 0, f"-8 + {S(140, 6)}"]},
            "ribs_r": {"rotation": [0, 0, f"8 - {S(140, 6, 40)}"]},
            "head_l": {"rotation": [0, f"-42 + {S(520, 3)}", -6]},
            "head_r": {"rotation": [0, f"42 - {S(520, 3)}", 6]},
            "neck": {"position": [0, 3, -3], "rotation": [-18, 0, 0]},
            "body": {"position": [0, 1, 0], "rotation": [-4, 0, 0]},
        }),
        # Snap (offsets layered on the revealed pose): the head halves clamp, the inner jaw
        # bites, the flank ribs hook inward.
        "animation.hollow.borrowed.attack": anim({
            "neck": {"position": {"0.0": [0, 0, 0], "0.12": [0, -1, -5], "0.4": [0, 0, 0]}},
            "inner_jaw": {"rotation": {"0.0": [0, 0, 0], "0.06": [16, 0, 0], "0.14": [-22, 0, 0], "0.4": [0, 0, 0]}},
            "head_l": {"rotation": {"0.0": [0, 0, 0], "0.12": [0, 36, 0], "0.4": [0, 0, 0]}},
            "head_r": {"rotation": {"0.0": [0, 0, 0], "0.12": [0, -36, 0], "0.4": [0, 0, 0]}},
            "ribs_l": {"rotation": {"0.0": [0, 0, 0], "0.12": [0, 0, 30], "0.4": [0, 0, 0]}},
            "ribs_r": {"rotation": {"0.0": [0, 0, 0], "0.12": [0, 0, -30], "0.4": [0, 0, 0]}},
        }, loop=False, length=0.4),
    }
    C = {
        "controller.animation.hollow.borrowed.form": ctrl("disguised", {
            "disguised": {"animations": ["disguise"], "transitions": [{"revealing": "variable.revealed"}], "blend_transition": 0.15},
            "revealing": {"animations": ["reveal"], "transitions": [{"revealed": "query.all_animations_finished"}, {"disguised": "!variable.revealed"}]},
            "revealed": {"animations": ["revealed"], "transitions": [{"disguised": "!variable.revealed"}], "blend_transition": 0.2},
        }),
        "controller.animation.hollow.borrowed.locomotion": ctrl("idle", {
            "idle": {"animations": [{"idle": "variable.state != 'revealing'"}], "transitions": [
                {"running": f"{Q}.modified_move_speed > 0.06 && variable.revealed && variable.state != 'revealing'"},
                {"walking": f"{Q}.modified_move_speed > 0.06 && !variable.revealed"}], "blend_transition": 0.2},
            "walking": {"animations": [{"walk": MOVE_WEIGHT}], "transitions": [
                {"idle": f"{Q}.modified_move_speed < 0.03 || variable.state == 'revealing'"},
                {"running": "variable.revealed"}], "blend_transition": 0.2},
            "running": {"animations": [{"run": MOVE_WEIGHT}], "transitions": [
                {"idle": f"{Q}.modified_move_speed < 0.03 || variable.state == 'revealing'"},
                {"walking": "!variable.revealed"}], "blend_transition": 0.2},
        }),
        "controller.animation.hollow.borrowed.strike": strike(),
    }
    write("borrowed", A, C)


# ------------------------------------------------------------------------------ HOLLOWED
def hollowed():
    step = f"{DIST} * 36"
    A = {
        # Calm: breathing ribs, a slow listening sweep of the long neck, quivering feelers,
        # a lazy tail; every few seconds the head cocks sharply toward nothing.
        "animation.hollow.hollowed.idle": anim({
            "body": {"position": [0, S(60, 0.18), 0], "scale": [f"1 + {S(60, 0.025, 90)}", 1, 1]},
            "neck": {"rotation": [S(19, 3), S(23, 18), 0]},
            "head": {"rotation": [f"{TW(37, 40)} * -10", f"{S(23, -8)} + {TW(37, 40)} * 22", f"{S(14, 5)} + {TW(37, 40)} * 16"]},
            "feeler_l": {"rotation": [S(140, 7), S(90, 4), 0]},
            "feeler_r": {"rotation": [S(140, 7, 70), S(90, -4, 30), 0]},
            "tail": {"rotation": [0, S(30, 8), 0]},
            "tail2": {"rotation": [0, S(30, 10, -40), 0]},
            "tail3": {"rotation": [0, S(30, 14, -80), 0]},
        }),
        # Walk: a high-stepping, spidery gait. Diagonal pairs lift and swing; the body glides,
        # the tail counters and the head stays pointed at the sound.
        "animation.hollow.hollowed.walk": anim({
            "leg_fl": {"rotation": [0, f"math.cos({step}) * 20", f"-math.max(0, math.sin({step})) * 18"]},
            "leg_br": {"rotation": [0, f"math.cos({step}) * 20", f"math.max(0, math.sin({step})) * 18"]},
            "leg_fr": {"rotation": [0, f"-math.cos({step}) * 20", f"math.max(0, -math.sin({step})) * 18"]},
            "leg_bl": {"rotation": [0, f"-math.cos({step}) * 20", f"-math.max(0, -math.sin({step})) * 18"]},
            "leg_fl_lower": {"rotation": [f"math.max(0, math.sin({step})) * -14", 0, 0]},
            "leg_br_lower": {"rotation": [f"math.max(0, math.sin({step})) * 14", 0, 0]},
            "leg_fr_lower": {"rotation": [f"math.max(0, -math.sin({step})) * -14", 0, 0]},
            "leg_bl_lower": {"rotation": [f"math.max(0, -math.sin({step})) * 14", 0, 0]},
            "body": {"rotation": [0, f"math.sin({step}) * 4", f"math.cos({step}) * 2"],
                     "position": [0, f"math.abs(math.sin({step})) * 0.35", 0]},
            "neck": {"rotation": [0, f"-math.sin({step}) * 5", 0]},
            "head": {"rotation": [0, f"-math.sin({step}) * 3", 0]},
            "tail": {"rotation": [0, f"-math.sin({step}) * 10", 0]},
            "tail2": {"rotation": [0, f"-math.sin({step} - 40) * 12", 0]},
            "tail3": {"rotation": [0, f"-math.sin({step} - 80) * 16", 0]},
        }),
        # Echolocation: the jaw chatters and the throat sacs swell in a burst every 3 s.
        "animation.hollow.hollowed.click": anim({
            "jaw": {"rotation": ["math.mod(query.anim_time, 3.0) < 0.6 ? (7 + math.sin(query.anim_time * 1800) * 7) : 2", 0, 0]},
            "throat": {"scale": "math.mod(query.anim_time, 3.0) < 0.6 ? 1.0 + math.abs(math.sin(query.anim_time * 900)) * 0.3 : 1.0"},
            "head": {"rotation": ["math.mod(query.anim_time, 3.0) < 0.6 ? -4 : 0", 0, 0]},
        }, length=3.0),
        # Investigating: low and fast, sharp head jerks between bearings, feelers thrown forward.
        "animation.hollow.hollowed.investigate": anim({
            "body": {"position": [0, -1.2, 0], "rotation": [4, 0, 0]},
            "neck": {"rotation": [10, "math.floor(math.sin(query.life_time * 70) * 3) * 12", 0]},
            "head": {"rotation": [6, S(140, 6), S(110, 6)]},
            "feeler_l": {"rotation": [-34, S(300, 6), 0]},
            "feeler_r": {"rotation": [-34, S(300, -6, 50), 0]},
            "tail": {"rotation": [-10, S(60, 6), 0]},
        }),
        # Listening at the last sound: frozen, head tilted, only the feelers and throat move.
        "animation.hollow.hollowed.listen": anim({
            "body": {"position": [0, -0.8, 0]},
            "neck": {"rotation": [6, S(11, 10), 0]},
            "head": {"rotation": [4, S(11, 6), f"18 + {S(7, 6)}"]},
            "feeler_l": {"rotation": [-22, 0, S(260, 3)]},
            "feeler_r": {"rotation": [-22, 0, S(260, -3)]},
            "throat": {"scale": f"1.05 + {S(200, 0.04)}"},
            "tail": {"rotation": [0, 0, 0]},
        }),
        # Bite: rears back, then the neck snaps forward with the jaw wide.
        "animation.hollow.hollowed.attack": anim({
            "jaw": {"rotation": {"0.0": [0, 0, 0], "0.08": [48, 0, 0], "0.22": [2, 0, 0]}},
            "neck": {"rotation": {"0.0": [0, 0, 0], "0.06": [-22, 0, 0], "0.16": [16, 0, 0], "0.35": [0, 0, 0]}},
            "head": {"rotation": {"0.0": [0, 0, 0], "0.06": [-12, 0, 0], "0.16": [6, 0, 0], "0.35": [0, 0, 0]}},
            "body": {"position": {"0.0": [0, 0, 0], "0.06": [0, 1.0, 1.5], "0.16": [0, 0.2, -2.5], "0.35": [0, 0, 0]}},
            "leg_fl": {"rotation": {"0.0": [0, 0, 0], "0.06": [-20, 0, -10], "0.35": [0, 0, 0]}},
            "leg_fr": {"rotation": {"0.0": [0, 0, 0], "0.06": [-20, 0, 10], "0.35": [0, 0, 0]}},
        }, loop=False, length=0.35),
    }
    C = {
        "controller.animation.hollow.hollowed.locomotion": locomotion(idle_when="variable.state == 'calm'"),
        "controller.animation.hollow.hollowed.mood": ctrl("calm", {
            "calm": {"animations": ["click"], "transitions": [{"alert": "variable.state == 'investigate'"}, {"listening": "variable.state == 'listening'"}], "blend_transition": 0.25},
            "alert": {"animations": ["click", "investigate"], "transitions": [{"listening": "variable.state == 'listening'"}, {"calm": "variable.state == 'calm'"}], "blend_transition": 0.3},
            "listening": {"animations": ["click", "listen"], "transitions": [{"alert": "variable.state == 'investigate'"}, {"calm": "variable.state == 'calm'"}], "blend_transition": 0.3},
        }),
        "controller.animation.hollow.hollowed.strike": strike(),
    }
    write("hollowed", A, C)


# ------------------------------------------------------------------------------ KNOCKER
def knocker():
    m = "math.mod(query.anim_time, 8.0)"
    g = f"{DIST} * 24"
    A = {
        # Hunched, heavy breathing; the cracked head lolls on its neck; the big hand's fingers
        # drum slowly against its thigh.
        "animation.hollow.knocker.idle": anim({
            "torso": {"rotation": [S(26, 2.2), 0, S(17, 2)], "scale": [f"1 + {S(26, 0.02, 90)}", 1, f"1 + {S(26, 0.03, 90)}"]},
            "neck": {"rotation": [S(13, 4), 0, S(9, 6)]},
            "head": {"rotation": [f"{TW(31, 30)} * 12", 0, f"{S(9, 5, 40)} - {TW(31, 30)} * 14"]},
            "right_arm": {"rotation": [S(26, 2), 0, 0]},
            "right_hand": {"rotation": [f"{S(160, 6)} * math.max(0, math.sin(query.life_time * 20))", 0, 0]},
            "left_hand": {"rotation": [S(70, 4, 40), 0, 0]},
        }),
        # A dragging, uneven gait: the right leg steps, the left leg drags behind.
        "animation.hollow.knocker.walk": anim({
            "right_leg": {"rotation": [f"math.cos({g}) * 26", 0, 0]},
            "left_leg": {"rotation": [f"-math.cos({g}) * 14 + 6", 0, 3]},
            "right_leg_shin": {"rotation": [f"math.max(0, math.sin({g})) * 30", 0, 0]},
            "left_leg_shin": {"rotation": [f"math.max(0, -math.sin({g})) * 10", 0, 0]},
            "body": {"position": [0, f"-math.abs(math.cos({g})) * 0.6", 0], "rotation": [0, 0, f"math.sin({g}) * 5"]},
            "torso": {"rotation": [f"math.abs(math.sin({g})) * 4", 0, f"math.sin({g}) * 4"]},
            "neck": {"rotation": [0, 0, f"-math.sin({g} - 40) * 6"]},
            "right_arm": {"rotation": [f"-math.cos({g} - 60) * 10", 0, 0]},
            "left_arm": {"rotation": [f"math.cos({g} - 60) * 6", 0, 0]},
        }),
        "animation.hollow.knocker.look_at_target": anim({
            "head": {"rotation": ["math.clamp(query.target_x_rotation * 0.6, -25, 25)", "math.clamp(query.target_y_rotation * 0.6, -55, 55)", 0]},
        }),
        # At the door: three raps, a pause with its head pressed to the wood, listening, then the
        # thin hand scratches.
        "animation.hollow.knocker.knock": anim({
            "right_arm": {"rotation": [-74, 0, -6]},
            "right_forearm": {"rotation": [f"-35 + ({m} < 1.0 ? math.max(0, math.sin({m} * 540)) * 22 : 0)", 0, 0]},
            "right_hand": {"rotation": [f"{m} < 1.0 ? math.max(0, math.sin({m} * 540)) * 10 : 0", 0, 0]},
            "torso": {"rotation": [f"8 + ({m} > 1.5 && {m} < 7.0 ? 6 : 0)", 0, 0]},
            "head": {"rotation": [f"{m} > 1.5 && {m} < 7.0 ? 12 : 0", 0, f"{m} > 1.5 && {m} < 7.0 ? 28 : 0"]},
            "left_arm": {"rotation": [f"{m} > 3.0 && {m} < 5.5 ? -60 : -6", 0, 0]},
            "left_hand": {"rotation": [f"{m} > 3.0 && {m} < 5.5 ? math.sin(query.anim_time * 320) * 12 : 0", 0, 0]},
        }, length=8.0),
        # Hunting: both arms raised, the big hand open, head held unnaturally still.
        "animation.hollow.knocker.hunt": anim({
            "right_arm": {"rotation": [f"-82 + {S(90, 4)}", 0, -6]},
            "left_arm": {"rotation": [f"-70 + {S(90, 4, 60)}", 0, 6]},
            "right_hand": {"rotation": [-10, 0, 0]},
            "torso": {"rotation": [12, 0, 0]},
            "neck": {"rotation": [-14, 0, 0]},
        }),
        # Overhead slam with the knocking hand (offsets layered on top of the hunting pose).
        "animation.hollow.knocker.attack": anim({
            "right_arm": {"rotation": {"0.0": [0, 0, 0], "0.18": [-68, 0, -4], "0.3": [64, 0, 6], "0.55": [0, 0, 0]}},
            "right_forearm": {"rotation": {"0.0": [0, 0, 0], "0.18": [-40, 0, 0], "0.3": [0, 0, 0]}},
            "torso": {"rotation": {"0.0": [0, 0, 0], "0.18": [-16, 0, 0], "0.3": [14, 0, 0], "0.55": [0, 0, 0]}},
        }, loop=False, length=0.55),
    }
    C = {
        "controller.animation.hollow.knocker.locomotion": locomotion(),
        "controller.animation.hollow.knocker.mood": ctrl("neutral", {
            "neutral": {"transitions": [{"knocking": "variable.state == 'knock'"}, {"hunting": "variable.state == 'hunt'"}]},
            "knocking": {"animations": ["knock"], "transitions": [{"neutral": "variable.state != 'knock'"}], "blend_transition": 0.4},
            "hunting": {"animations": ["hunt"], "transitions": [{"neutral": "variable.state != 'hunt'"}], "blend_transition": 0.3},
        }),
        "controller.animation.hollow.knocker.strike": strike(),
    }
    write("knocker", A, C)


# ------------------------------------------------------------------------------ MIREBOUND
def mirebound():
    A = {
        # A log in the shallows: a slow bob, reeds swaying, weed strands drifting, the jaw
        # loose under the water, and a rare twitch of one hand.
        "animation.hollow.mirebound.lurk": anim({
            "body": {"position": [0, S(36, 0.3), 0], "rotation": [S(24, 0.8), 0, S(19, 1.2)]},
            "hump": {"rotation": [0, 0, S(25, 1.5)]},
            "jaw": {"rotation": [f"2 + {S(30, 2)}", 0, 0]},
            "tail": {"rotation": [0, S(30, 6), 0]},
            "tail2": {"rotation": [0, S(30, 8, -50), 0]},
            "arm_l_lower": {"rotation": [0, f"{TW(43, 30)} * 18", 0]},
        }),
        # Rearing up: a 0.6 s windup (the escape window) with water streaming off it.
        "animation.hollow.mirebound.erupt": anim({
            "body": {"rotation": kf((0.0, [0, 0, 0]), (0.18, [6, 0, 0]), (0.45, [-24, 0, 0])),
                     "position": kf((0.0, [0, 0, 0]), (0.18, [0, -1, 0]), (0.45, [0, 5, 0]))},
            "head": {"rotation": kf((0.0, [0, 0, 0]), (0.45, [-38, 0, 0]))},
            "jaw": {"rotation": kf((0.0, [0, 0, 0]), (0.3, [10, 0, 0]), (0.45, [52, 0, 0]))},
            "arm_l": {"rotation": kf((0.0, [0, 0, 0]), (0.45, [-70, 0, -26]))},
            "arm_r": {"rotation": kf((0.0, [0, 0, 0]), (0.45, [-70, 0, 26]))},
            "arm_l_lower": {"rotation": kf((0.0, [0, 0, 0]), (0.45, [-30, 0, 0]))},
            "arm_r_lower": {"rotation": kf((0.0, [0, 0, 0]), (0.45, [-30, 0, 0]))},
            "tail": {"rotation": kf((0.0, [0, 0, 0]), (0.45, [16, 0, 0]))},
        }, loop="hold_on_last_frame", length=0.5),
        # Holding a victim under: thrashing, arms locked around them, jaw working.
        "animation.hollow.mirebound.grab": anim({
            "body": {"rotation": [-10, S(500, 3), S(900, 2)], "position": [0, 2, 0]},
            "head": {"rotation": [-15, S(400, 4), 0]},
            "jaw": {"rotation": [f"12 + {S(220, 6)}", 0, 0]},
            "arm_l": {"rotation": [-38, 0, 38]},
            "arm_r": {"rotation": [-38, 0, -38]},
            "arm_l_lower": {"rotation": [-40, 0, 0]},
            "arm_r_lower": {"rotation": [-40, 0, 0]},
            "tail": {"rotation": [0, S(400, 18), 0]},
            "tail2": {"rotation": [0, S(400, 24, -60), 0]},
        }),
        "animation.hollow.mirebound.swim": anim({
            "body": {"rotation": [0, S(160, 4), 0]},
            "tail": {"rotation": [0, S(160, 20), 0]},
            "tail2": {"rotation": [0, S(160, 28, -60), 0]},
            "arm_l": {"rotation": [30, S(160, 10), 0]},
            "arm_r": {"rotation": [30, S(160, 10), 0]},
            "leg_l": {"rotation": [0, S(160, 15), 0]},
            "leg_r": {"rotation": [0, S(160, -15), 0]},
            "head": {"rotation": [0, S(160, -4), 0]},
        }),
    }
    C = {
        "controller.animation.hollow.mirebound.mood": ctrl("lurking", {
            "lurking": {"animations": ["lurk"], "transitions": [{"erupting": "variable.state == 'erupt'"}, {"grabbing": "variable.state == 'grab'"}, {"swimming": "variable.state == 'retreat'"}], "blend_transition": 0.3},
            "erupting": {"animations": ["erupt"], "transitions": [{"grabbing": "variable.state == 'grab'"}, {"swimming": "variable.state == 'retreat'"}, {"lurking": "variable.state == 'lurk'"}], "blend_transition": 0.1},
            "grabbing": {"animations": ["grab"], "transitions": [{"swimming": "variable.state == 'retreat'"}, {"lurking": "variable.state == 'lurk'"}], "blend_transition": 0.15},
            "swimming": {"animations": ["swim"], "transitions": [{"lurking": "variable.state == 'lurk'"}, {"erupting": "variable.state == 'erupt'"}], "blend_transition": 0.3},
        }),
    }
    write("mirebound", A, C)


def main():
    watcher()
    borrowed()
    hollowed()
    knocker()
    mirebound()
    # syntax-check every Molang expression we just wrote
    from hollowkit.animpreview import check_all_molang
    check_all_molang(ANIMS)


if __name__ == "__main__":
    main()
