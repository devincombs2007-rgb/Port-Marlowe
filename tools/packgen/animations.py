"""Animations + animation controllers for the Borrowed, Hollowed, Knocker and Mirebound.

(The Watcher's are hand-written JSON in packs/resource/animations/watcher.animation.json.)
Molang trig functions take degrees.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP  # noqa: E402

Q = "query"
DIST = "query.modified_distance_moved"
MOVE_WEIGHT = "math.clamp(query.modified_move_speed * 5.0, 0.0, 1.0)"


def anim(bones, loop=True, length=None, sounds=None):
    a = {"loop": loop, "bones": bones}
    if length:
        a["animation_length"] = length
    if sounds:
        a["sound_effects"] = sounds
    return a


def ctrl(initial, states):
    return {"initial_state": initial, "states": states}


def write(name, animations, controllers):
    with open(os.path.join(RP, "animations", f"{name}.animation.json"), "w") as f:
        json.dump({"format_version": "1.8.0", "animations": animations}, f, indent=2)
    with open(os.path.join(RP, "animation_controllers", f"{name}.animation_controllers.json"), "w") as f:
        json.dump({"format_version": "1.10.0", "animation_controllers": controllers}, f, indent=2)


def locomotion(prefix):
    return ctrl("idle", {
        "idle": {"animations": ["idle"], "transitions": [{"walking": f"{Q}.modified_move_speed > 0.06"}], "blend_transition": 0.25},
        "walking": {"animations": [{"walk": MOVE_WEIGHT}], "transitions": [{"idle": f"{Q}.modified_move_speed < 0.03"}], "blend_transition": 0.25},
    })


def strike():
    return ctrl("default", {
        "default": {"transitions": [{"attacking": "variable.attack_time > 0.0"}]},
        "attacking": {"animations": ["attack"], "transitions": [{"default": "query.all_animations_finished"}]},
    })


# ------------------------------------------------------------------------------ BORROWED
def borrowed():
    open_l, open_r = [0, -38, 0], [0, 38, 0]
    A = {
        "animation.hollow.borrowed.disguise": anim({"inner": {"scale": 0}, "spines": {"scale": 0}}),
        # Tell: the head tilts slowly sideways while it watches you; real sheep don't do this.
        "animation.hollow.borrowed.idle": anim({
            "body": {"position": [0, "math.sin(query.anim_time * 90) * 0.15", 0]},
            "neck": {"rotation": ["math.sin(query.anim_time * 25) * 2", 0, 0]},
            "head": {"rotation": [0, 0, "math.sin(query.anim_time * 14) * (variable.watchful ? 10 : 3)"]},
        }),
        # Tell: a pacing gait (both legs on one side move together). Sheep trot diagonally.
        "animation.hollow.borrowed.walk": anim({
            "leg_fl": {"rotation": [f"math.cos({DIST} * 38) * 28", 0, 0]},
            "leg_bl": {"rotation": [f"math.cos({DIST} * 38) * 28", 0, 0]},
            "leg_fr": {"rotation": [f"-math.cos({DIST} * 38) * 28", 0, 0]},
            "leg_br": {"rotation": [f"-math.cos({DIST} * 38) * 28", 0, 0]},
            "body": {"rotation": [0, 0, f"math.sin({DIST} * 38) * 2.5"]},
        }),
        "animation.hollow.borrowed.look_at_target": anim({
            "head": {"rotation": ["math.clamp(query.target_x_rotation, -25, 25)", "math.clamp(query.target_y_rotation, -55, 55)", 0]},
        }),
        # Once exposed, the paired sheep-like pace breaks into a low, diagonal scramble.
        "animation.hollow.borrowed.run": anim({
            "leg_fl": {"rotation": [f"math.cos({DIST} * 52) * 38", 0, -3]},
            "leg_br": {"rotation": [f"math.cos({DIST} * 52) * 38", 0, 3]},
            "leg_fr": {"rotation": [f"-math.cos({DIST} * 52) * 38", 0, 3]},
            "leg_bl": {"rotation": [f"-math.cos({DIST} * 52) * 38", 0, -3]},
            "body": {"position": [0, f"-math.abs(math.sin({DIST} * 52)) * 0.45", 0],
                     "rotation": [5, 0, f"math.sin({DIST} * 52) * 2"]},
        }),
        "animation.hollow.borrowed.reveal": anim({
            "inner": {"scale": {"0.0": 0, "0.4": 0, "0.7": 1.12, "0.9": 1.0}},
            "spines": {"scale": {"0.0": 0, "0.5": 0, "0.9": 1.0},
                       "rotation": {"0.5": [0, 0, 0], "0.8": [-12, 0, 0], "1.4": [0, 0, 0]}},
            "head_l": {"rotation": {"0.0": [0, 0, 0], "0.3": [0, -8, 0], "0.45": [0, -3, 0], "0.7": [0, -44, 0], "1.4": open_l}},
            "head_r": {"rotation": {"0.0": [0, 0, 0], "0.3": [0, 8, 0], "0.45": [0, 3, 0], "0.7": [0, 44, 0], "1.4": open_r}},
            "neck": {"position": {"0.6": [0, 0, 0], "1.0": [0, 3, -3]}, "rotation": {"0.6": [0, 0, 0], "1.0": [-15, 0, 0]}},
            "body": {"rotation": {"0.0": [0, 0, 0], "0.2": [0, 0, 4], "0.35": [0, 0, -4], "0.5": [0, 0, 0]},
                     "position": {"0.5": [0, 0, 0], "1.0": [0, 1, 0]}},
        }, loop=False, length=1.4, sounds={"0.0": {"effect": "reveal"}}),
        "animation.hollow.borrowed.revealed": anim({
            "inner": {"scale": 1},
            "spines": {"scale": 1, "rotation": ["math.sin(query.anim_time * 400) * 4", 0, 0]},
            "head_l": {"rotation": [0, "-38 + math.sin(query.anim_time * 700) * 3", 0]},
            "head_r": {"rotation": [0, "38 - math.sin(query.anim_time * 700) * 3", 0]},
            "neck": {"position": [0, 3, -3], "rotation": [-15, 0, 0]},
            "body": {"position": [0, 1, 0]},
        }),
        "animation.hollow.borrowed.attack": anim({
            "neck": {"position": {"0.0": [0, 3, -3], "0.15": [0, 2, -7], "0.4": [0, 3, -3]}},
            "head_l": {"rotation": {"0.0": open_l, "0.15": [0, -4, 0], "0.4": open_l}},
            "head_r": {"rotation": {"0.0": open_r, "0.15": [0, 4, 0], "0.4": open_r}},
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
    step = f"{DIST} * 40"
    A = {
        "animation.hollow.hollowed.idle": anim({
            "head": {"rotation": [0, "math.sin(query.anim_time * 40) * 22", "math.sin(query.anim_time * 23) * 6"]},
            "body": {"position": [0, "math.sin(query.anim_time * 70) * 0.25", 0]},
            "feeler_l": {"rotation": ["math.sin(query.anim_time * 120) * 8", 0, 0]},
            "feeler_r": {"rotation": ["math.sin(query.anim_time * 120 + 60) * 8", 0, 0]},
        }),
        "animation.hollow.hollowed.walk": anim({
            "leg_fl": {"rotation": [0, f"math.cos({step}) * 18", f"math.max(0, math.sin({step})) * -12"]},
            "leg_br": {"rotation": [0, f"math.cos({step}) * 18", f"math.max(0, math.sin({step})) * 12"]},
            "leg_fr": {"rotation": [0, f"-math.cos({step}) * 18", f"math.max(0, -math.sin({step})) * 12"]},
            "leg_bl": {"rotation": [0, f"-math.cos({step}) * 18", f"math.max(0, -math.sin({step})) * -12"]},
            "body": {"rotation": [0, f"math.sin({step}) * 3", 0]},
            "head": {"rotation": [0, f"-math.sin({step}) * 6", 0]},
        }),
        # Echolocation: the jaw flutters and the throat sacs swell for half a second every 3 s.
        "animation.hollow.hollowed.click": anim({
            "jaw": {"rotation": ["math.mod(query.anim_time, 3.0) < 0.6 ? (6 + math.sin(query.anim_time * 1800) * 6) : 2", 0, 0]},
            "throat": {"scale": "math.mod(query.anim_time, 3.0) < 0.6 ? 1.0 + math.abs(math.sin(query.anim_time * 900)) * 0.25 : 1.0"},
        }),
        "animation.hollow.hollowed.investigate": anim({
            "head": {"rotation": [12, "math.sin(query.anim_time * 90) * 30", 0]},
            "feeler_l": {"rotation": [-30, 0, 0]},
            "feeler_r": {"rotation": [-30, 0, 0]},
            "body": {"position": [0, -1, 0]},
        }),
        "animation.hollow.hollowed.listen": anim({
            "body": {"position": [0, -0.6, 0]},
            "head": {"rotation": [8, "math.sin(query.anim_time * 65) * 24", "math.sin(query.anim_time * 33) * 3"]},
            "feeler_l": {"rotation": [-18, 0, "math.sin(query.anim_time * 90) * 3"]},
            "feeler_r": {"rotation": [-18, 0, "-math.sin(query.anim_time * 90) * 3"]},
        }),
        "animation.hollow.hollowed.attack": anim({
            "jaw": {"rotation": {"0.0": [0, 0, 0], "0.1": [40, 0, 0], "0.25": [0, 0, 0]}},
            "head": {"rotation": {"0.0": [0, 0, 0], "0.1": [-15, 0, 0], "0.3": [0, 0, 0]}},
            "body": {"position": {"0.0": [0, 0, 0], "0.1": [0, 0.5, -2], "0.3": [0, 0, 0]}},
        }, loop=False, length=0.35),
    }
    C = {
        "controller.animation.hollow.hollowed.locomotion": locomotion("hollowed"),
        "controller.animation.hollow.hollowed.mood": ctrl("calm", {
            "calm": {"animations": ["click"], "transitions": [{"alert": "variable.state == 'investigate'"}, {"listening": "variable.state == 'listening'"}], "blend_transition": 0.25},
            "alert": {"animations": ["click", "investigate"], "transitions": [{"listening": "variable.state == 'listening'"}, {"calm": "variable.state == 'calm'"}], "blend_transition": 0.3},
            "listening": {"animations": ["click", "listen"], "transitions": [{"alert": "variable.state == 'investigate'"}, {"calm": "variable.state == 'calm'"}], "blend_transition": 0.3},
        }),
        "controller.animation.hollow.hollowed.strike": strike(),
    }
    C["controller.animation.hollow.hollowed.locomotion"]["states"]["idle"]["animations"] = [{"idle": "variable.state == 'calm'"}]
    write("hollowed", A, C)


# ------------------------------------------------------------------------------ KNOCKER
def knocker():
    m = "math.mod(query.anim_time, 8.0)"
    A = {
        "animation.hollow.knocker.idle": anim({
            "torso": {"rotation": ["math.sin(query.anim_time * 30) * 1.5", 0, "math.sin(query.anim_time * 21) * 2"]},
            "right_hand": {"rotation": ["math.sin(query.anim_time * 80) * 5", 0, 0]},
            "left_hand": {"rotation": ["math.sin(query.anim_time * 70 + 40) * 4", 0, 0]},
        }),
        "animation.hollow.knocker.walk": anim({
            "right_leg": {"rotation": [f"math.cos({DIST} * 26) * 22", 0, 0]},
            "left_leg": {"rotation": [f"-math.cos({DIST} * 26) * 22", 0, 0]},
            "right_leg_shin": {"rotation": [f"math.max(0, math.sin({DIST} * 26)) * 25", 0, 0]},
            "left_leg_shin": {"rotation": [f"math.max(0, -math.sin({DIST} * 26)) * 25", 0, 0]},
            "torso": {"rotation": [0, 0, f"math.sin({DIST} * 26) * 4"]},
            "right_arm": {"rotation": [f"-math.cos({DIST} * 26) * 8", 0, 0]},
            "left_arm": {"rotation": [f"math.cos({DIST} * 26) * 8", 0, 0]},
        }),
        "animation.hollow.knocker.look_at_target": anim({
            "head": {"rotation": ["math.clamp(query.target_x_rotation * 0.6, -25, 25)", "math.clamp(query.target_y_rotation * 0.6, -55, 55)", 0]},
        }),
        # At the door: three raps, then a long pause with the head pressed close, listening.
        "animation.hollow.knocker.knock": anim({
            "right_arm": {"rotation": [-72, 0, -6]},
            "right_forearm": {"rotation": [f"-35 + ({m} < 1.0 ? math.sin({m} * 530) * 14 : 0)", 0, 0]},
            "torso": {"rotation": [8, 0, 0]},
            "head": {"rotation": [f"{m} > 1.5 && {m} < 7.0 ? 10 : 0", 0, f"{m} > 1.5 && {m} < 7.0 ? 24 : 0"]},
            "left_hand": {"rotation": [f"{m} > 3.0 && {m} < 5.0 ? math.sin(query.anim_time * 300) * 10 : 0", 0, 0]},
        }, length=8.0),
        "animation.hollow.knocker.hunt": anim({
            "right_arm": {"rotation": [-78, 0, -4]},
            "left_arm": {"rotation": [-70, 0, 4]},
            "torso": {"rotation": [10, 0, 0]},
        }),
        "animation.hollow.knocker.attack": anim({
            "right_arm": {"rotation": {"0.0": [-120, 0, 0], "0.2": [-20, 0, 0], "0.5": [-78, 0, -4]}},
            "right_forearm": {"rotation": {"0.0": [-30, 0, 0], "0.2": [0, 0, 0], "0.5": [0, 0, 0]}},
        }, loop=False, length=0.5),
    }
    C = {
        "controller.animation.hollow.knocker.locomotion": locomotion("knocker"),
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
        "animation.hollow.mirebound.lurk": anim({
            "body": {"position": [0, "math.sin(query.anim_time * 40) * 0.3", 0]},
            "hump": {"rotation": [0, 0, "math.sin(query.anim_time * 25) * 1.5"]},
            "jaw": {"rotation": ["2 + math.sin(query.anim_time * 30) * 2", 0, 0]},
            "tail": {"rotation": [0, "math.sin(query.anim_time * 30) * 6", 0]},
        }),
        "animation.hollow.mirebound.erupt": anim({
            "body": {"rotation": {"0.0": [0, 0, 0], "0.3": [-20, 0, 0]}, "position": {"0.0": [0, 0, 0], "0.3": [0, 4, 0]}},
            "head": {"rotation": {"0.0": [0, 0, 0], "0.3": [-35, 0, 0]}},
            "jaw": {"rotation": {"0.0": [0, 0, 0], "0.3": [45, 0, 0]}},
            "arm_l": {"rotation": {"0.0": [0, 0, 0], "0.3": [-60, 0, -20]}},
            "arm_r": {"rotation": {"0.0": [0, 0, 0], "0.3": [-60, 0, 20]}},
        }, loop="hold_on_last_frame", length=0.5),
        "animation.hollow.mirebound.grab": anim({
            "body": {"rotation": [-10, 0, "math.sin(query.anim_time * 900) * 2"], "position": [0, 2, 0]},
            "head": {"rotation": [-15, 0, 0]},
            "jaw": {"rotation": ["10 + math.sin(query.anim_time * 200) * 4", 0, 0]},
            "arm_l": {"rotation": [-35, 0, 35]},
            "arm_r": {"rotation": [-35, 0, -35]},
        }),
        "animation.hollow.mirebound.swim": anim({
            "tail": {"rotation": [0, "math.sin(query.anim_time * 180) * 20", 0]},
            "tail2": {"rotation": [0, "math.sin(query.anim_time * 180 - 60) * 28", 0]},
            "arm_l": {"rotation": [30, 0, 0]},
            "arm_r": {"rotation": [30, 0, 0]},
            "leg_l": {"rotation": [0, "math.sin(query.anim_time * 180) * 15", 0]},
            "leg_r": {"rotation": [0, "-math.sin(query.anim_time * 180) * 15", 0]},
        }),
    }
    C = {
        "controller.animation.hollow.mirebound.mood": ctrl("lurking", {
            "lurking": {"animations": ["lurk"], "transitions": [{"erupting": "variable.state == 'erupt'"}, {"grabbing": "variable.state == 'grab'"}, {"swimming": "variable.state == 'retreat'"}]},
            "erupting": {"animations": ["erupt"], "transitions": [{"grabbing": "variable.state == 'grab'"}, {"swimming": "variable.state == 'retreat'"}, {"lurking": "variable.state == 'lurk'"}], "blend_transition": 0.1},
            "grabbing": {"animations": ["grab"], "transitions": [{"swimming": "variable.state == 'retreat'"}, {"lurking": "variable.state == 'lurk'"}], "blend_transition": 0.15},
            "swimming": {"animations": ["swim"], "transitions": [{"lurking": "variable.state == 'lurk'"}, {"erupting": "variable.state == 'erupt'"}], "blend_transition": 0.3},
        }),
    }
    write("mirebound", A, C)


def main():
    borrowed()
    hollowed()
    knocker()
    mirebound()


if __name__ == "__main__":
    main()
