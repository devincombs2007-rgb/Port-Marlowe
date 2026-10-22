"""THE HOLLOW sound catalogue built from downloaded CC0 recordings (replaces the synthesised set).

Every event is a small recipe: one or more CC0 source recordings (layers) placed in time, varispeed
pitched, filtered, reverberated and faded, then loudness-normalised to the per-event target that the
original catalogue (design.py) calibrated. Sources are fetched by tools/sounds/fetch_sources.sh and
credited in CREDITS.md. Music tracks are CC0 recordings used unedited apart from fades/level/encoding.

The disguised Borrowed deliberately uses Minecraft's own sheep sounds (referenced, not shipped), so it
is indistinguishable by ear until its "wrong" bleat - which is the vanilla bleat pitched down.

Run:  tools/sounds/fetch_sources.sh && python3 tools/sounds/sourced.py
Writes packs/resource/sounds/hollow/**, packs/resource/sounds/sound_definitions.json,
tools/sounds/subtitles_generated.json and build/previews/sounds_*.png (spectrograms for review).
"""
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))
from hollowkit import RP, ROOT, BUILD, ensure  # noqa: E402
from hollowkit import audio as A  # noqa: E402
from hollowkit.audio import SR  # noqa: E402
import design  # noqa: E402  (per-event category / volume / distance / loudness calibration)

SRC = os.path.join(ROOT, "build", "sound_sources")
SFX = os.path.join(SRC, "cc0-sounds")
MUS = os.path.join(SRC, "cc0-music")

# source folder aliases (all CC0; see CREDITS.md)
F = {
    "imp": "kenney_impactsounds/Audio", "rpg": "kenney_rpgaudio/Audio",
    "cr1": "80-CC0-creature-SFX", "cr2": "80-CC0-creature-sfx-2", "orpg": "80-CC0-RPG-SFX",
    "s1": "100-CC0-SFX", "s2": "100-cc0-sfx-2", "wm": "100-CC0-wood-metal-SFX", "loop": "30-cc0-sfx-loops",
    "weird": "30-cc0-weird-sfx", "mud": "25-CC0-mud-sfx", "wat": "40-cc0-water-splash-slime-sfx",
    "brk": "75-cc0-breaking-falling-hit-sfx", "book": "bb - Books, Paper, Writing (Jan 2021)",
    "plop": "bb - Bottle Plops (Apr 2021)", "fan": "bb - Fans and Drones (Jul 2021)",
    "woosh": "Micro Pack - Organic Wooshes", "pad": "BB_2HTC Samples Vol 4/Pads", "bbw": "BB_2HTC Samples Vol 4/Weird",
    "bbl": "BB_2HTC Samples Vol 4/Loops", "add": "BB_2HTC Samples Vol 4 Addendum/Pads",
}

_cache = {}
USED = set()


def load(ref):
    """ref = 'alias:filename' -> mono float32 at SR."""
    alias, name = ref.split(":", 1)
    path = os.path.join(SFX, F[alias], name)
    if path not in _cache:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"missing source {path} - run tools/sounds/fetch_sources.sh")
        r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                           capture_output=True, check=True)
        _cache[path] = np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)
    USED.add(os.path.relpath(path, SFX))
    return _cache[path]


def varispeed(x, rate):
    """rate < 1: slower and lower (tape-style), rate > 1: faster and higher."""
    if abs(rate - 1.0) < 1e-6:
        return x
    n = int(len(x) / rate)
    return np.interp(np.arange(n) * rate, np.arange(len(x)), x)


def L(ref, at=0.0, pitch=1.0, db=0.0, start=0.0, dur=None, rev=False, lp=None, hp=None, fin=0.0, fout=0.0):
    return dict(ref=ref, at=at, pitch=pitch, db=db, start=start, dur=dur, rev=rev, lp=lp, hp=hp, fin=fin, fout=fout)


def V(*layers, lp=None, hp=None, bp=None, verb=None, trem=None, dur=None, fin=0.005, fout=0.06, dist=None):
    return dict(layers=layers, lp=lp, hp=hp, bp=bp, verb=verb, trem=trem, dur=dur, fin=fin, fout=fout, dist=dist)


def render(v):
    parts = []
    for l in v["layers"]:
        x = load(l["ref"])
        s = int(l["start"] * SR)
        x = x[s:s + int(l["dur"] * SR)] if l["dur"] else x[s:]
        if l["rev"]:
            x = x[::-1]
        x = varispeed(x, l["pitch"])
        if l["hp"]:
            x = A.highpass(x, l["hp"])
        if l["lp"]:
            x = A.lowpass(x, l["lp"])
        if l["fin"] or l["fout"]:
            x = A.fade(x, l["fin"] or 0.002, l["fout"] or 0.01)
        parts.append((int(l["at"] * SR), x * 10 ** (l["db"] / 20)))
    n = max(o + len(x) for o, x in parts)
    out = np.zeros(n)
    for o, x in parts:
        out[o:o + len(x)] += x
    if v["dur"]:
        out = out[:int(v["dur"] * SR)]
    if v["hp"]:
        out = A.highpass(out, v["hp"])
    if v["lp"]:
        out = A.lowpass(out, v["lp"])
    if v["bp"]:
        out = A.bandpass(out, *v["bp"])
    if v["trem"]:
        rate, depth = v["trem"]
        t = np.arange(len(out)) / SR
        rng = np.random.default_rng(len(out))
        lfo = np.interp(t, np.linspace(0, t[-1] + 1e-9, max(4, int(t[-1] * rate) + 2)),
                        rng.uniform(1 - depth, 1, max(4, int(t[-1] * rate) + 2)))
        out = out * lfo
    if v["dist"]:
        out = A.distance(out, v["dist"])
    if v["verb"]:
        wet, rt = v["verb"]
        tail = np.zeros(int(rt * SR * 0.8))
        out = A.reverb(np.concatenate([out, tail]), wet=wet, rt60=rt)
    # trim the inaudible end of reverb tails (< -48 dB below peak) so loudness targets apply to
    # what is actually heard, and files stay small
    env = np.abs(out)
    above = np.nonzero(env > env.max() * 10 ** (-48 / 20))[0]
    if len(above):
        out = out[:min(len(out), above[-1] + int(0.04 * SR))]
    return A.fade(out, v["fin"], max(v["fout"], 0.04))


def seq(ref_list, times, **kw):
    return [L(r, at=t, **kw) for r, t in zip(ref_list, times)]


# ============================================================================ recipes
# Each event: list of variants. Names in quotes are the CC0 source files.
I = lambda kind, i: f"imp:{kind}_{i:03d}.ogg"  # noqa: E731  Kenney impact sounds

RECIPES = {
    # ------------------------------------------------------------------ WATCHER: wood, bark, stillness
    "watcher.step": [V(L(I("footstep_grass", i), pitch=0.82), L(I("impactWood_light", i), pitch=0.6, db=-14), lp=3800) for i in range(4)],
    "watcher.creak": [V(L(f"rpg:creak{i}.ogg", pitch=p), lp=3000, verb=(0.35, 1.6)) for i, p in ((1, 0.7), (2, 0.62), (3, 0.75))],
    "watcher.seen": [V(L("wm:wood_cracking_01.ogg", pitch=0.75), L("rpg:creak2.ogg", pitch=0.55, db=-6, at=0.05), verb=(0.3, 1.8), lp=4000),
                     V(L("wm:wood_cracking_03.ogg", pitch=0.7), L("rpg:creak1.ogg", pitch=0.5, db=-6, at=0.08), verb=(0.3, 1.8), lp=4000)],
    "watcher.retreat": [V(*seq([I("footstep_grass", 0), I("footstep_grass", 2), I("footstep_grass", 4)], [0, 0.32, 0.7], pitch=0.85),
                          L("rpg:creak3.ogg", pitch=0.6, at=0.1, db=-8), lp=3200, verb=(0.4, 2.0)),
                        V(*seq([I("footstep_grass", 1), I("footstep_grass", 3), I("footstep_grass", 0)], [0, 0.36, 0.78], pitch=0.8),
                          L("wm:wood_cracking_02.ogg", pitch=0.6, at=0.5, db=-10), lp=3000, verb=(0.4, 2.0))],
    "watcher.lunge": [V(L("cr2:roar_06.ogg", pitch=0.72), L("wm:wood_breaking_01.ogg", pitch=0.85, db=-4), L("woosh:Swish 2.wav", pitch=0.7, db=-6), verb=(0.2, 1.2)),
                      V(L("cr2:roar_05.ogg", pitch=0.7), L("wm:wood_breaking_02.ogg", pitch=0.8, db=-4), L("woosh:Swish 4.wav", pitch=0.7, db=-6), verb=(0.2, 1.2))],
    "watcher.hurt": [V(L(f"wm:wood_hit_0{i}.ogg", pitch=0.8), L("orpg:creature_hurt_01.ogg", pitch=p, db=-4), verb=(0.15, 0.9))
                     for i, p in ((2, 0.62), (5, 0.58), (8, 0.66))],
    "watcher.death": [V(L("wm:wood_breaking_01.ogg", pitch=0.7), L("orpg:creature_die_01.ogg", pitch=0.6, db=-3, at=0.1),
                        L("wm:wood_falling_03.ogg", pitch=0.8, at=0.6, db=-4), verb=(0.35, 2.4))],

    # ------------------------------------------------------------------ FOREST AMBIENCE
    "amb.forest.far_call": [V(L("cr1:howl.ogg", pitch=p), lp=1600, hp=120, verb=(0.6, 3.2), dist=60)
                            for p in (0.62, 0.52)] + [V(L("cr1:ooh.ogg", pitch=0.66), lp=1400, verb=(0.6, 3.2), dist=60)],
    "amb.forest.branch_snap": [V(L(f"wm:wood_cracking_0{i}.ogg", pitch=p), verb=(0.45, 2.2), dist=30) for i, p in ((1, 1.0), (2, 0.9), (4, 0.95))],
    "amb.forest.footsteps": [V(*seq([I("footstep_grass", k % 5) for k in range(4)], [0, 0.55, 1.12, 1.66], pitch=0.9), lp=2200, verb=(0.45, 2.0), dist=40),
                             V(*seq([I("footstep_snow", k % 5) for k in range(3)], [0, 0.6, 1.25], pitch=0.85), lp=2000, verb=(0.45, 2.0), dist=40)],
    "amb.forest.wind": [V(L("fan:Large Fan.wav", start=s, dur=7.0), bp=(180, 1400), trem=(0.6, 0.75), fin=1.2, fout=1.8)
                        for s in (0.0, 8.0)] + [V(L("fan:Outside.wav", start=0.0, dur=7.0), hp=90, trem=(0.5, 0.6), fin=1.2, fout=1.8)],
    "amb.forest.hush": [V(L("bbw:2022-10-26 Fire in the Mist - Breath Riser.wav", rev=True), lp=2500, verb=(0.5, 2.5), fin=0.4, fout=0.8),
                        V(L("bbw:2022-12-22 Snow Day - Windy.wav"), lp=1800, verb=(0.5, 2.5), fin=0.4, fout=0.8)],

    # ------------------------------------------------------------------ CAVE / SWAMP AMBIENCE
    "amb.cave.drip": [V(L(f"plop:Plop - Airy {i}.wav", pitch=p), hp=300, verb=(0.55, 2.6)) for i, p in ((1, 1.6), (2, 1.8), (3, 1.5), (4, 1.7))],
    "amb.cave.shift": [V(L(f"orpg:stones_0{i}.ogg", pitch=0.6), L(f"brk:bfh1_rock_falling_0{i + 2}.ogg", pitch=0.7, db=-6), lp=2500, verb=(0.5, 3.0), dist=25)
                       for i in (1, 2, 3)],
    "amb.cave.breath": [V(L("bbw:2022-04-16 Triple-C THICCC - Heavy Breathing.wav", pitch=0.55), lp=1500, verb=(0.55, 3.0), dist=20),
                        V(L("cr2:breath_02.ogg", pitch=0.5), L("cr1:breath.ogg", pitch=0.55, at=0.9, db=-3), lp=1500, verb=(0.55, 3.0), dist=20)],
    "amb.swamp.gurgle": [V(L(f"mud:mud_{i:02d}.ogg", pitch=0.65), L("wat:bubble_02.ogg", pitch=0.7, at=0.15, db=-6), lp=2200, verb=(0.25, 1.4))
                         for i in (3, 14, 19)],
    "amb.swamp.creak": [V(L("rpg:creak1.ogg", pitch=0.5), lp=2000, verb=(0.45, 2.4), dist=25),
                        V(L("pad:2022-10-29 Revered Waters - Creaky.wav", dur=4.0), lp=2200, verb=(0.4, 2.4), fin=0.3, fout=0.8)],

    # ------------------------------------------------------------------ HOLLOWED: clicks and wet breath
    "hollowed.click": [V(*seq([I("impactGeneric_light", (i + k) % 5) for k in range(n)], [k * gap for k in range(n)], pitch=1.9, hp=900),
                         verb=(0.4, 1.6)) for i, n, gap in ((0, 6, 0.07), (1, 8, 0.055), (2, 5, 0.09), (3, 7, 0.06))],
    "hollowed.alert": [V(L("cr2:monster_10.ogg", pitch=0.85), *seq([I("impactGeneric_light", k) for k in range(5)], [0.5 + k * 0.04 for k in range(5)], pitch=2.0, hp=900, db=-4), verb=(0.3, 1.5)),
                       V(L("cr2:monster_11.ogg", pitch=0.8), *seq([I("impactGeneric_light", k) for k in range(5)], [0.45 + k * 0.045 for k in range(5)], pitch=2.1, hp=900, db=-4), verb=(0.3, 1.5))],
    "hollowed.sniff": [V(L("cr1:nose.ogg", pitch=0.9), L("cr2:breath_02.ogg", pitch=1.1, at=0.3, db=-6), verb=(0.3, 1.3)),
                       V(L("cr1:nose.ogg", pitch=0.8), L("cr1:nose.ogg", pitch=0.85, at=0.32), verb=(0.3, 1.3))],
    "hollowed.step": [V(L(I("footstep_concrete", i), pitch=1.15), lp=3000, verb=(0.25, 1.4)) for i in range(4)],
    "hollowed.attack": [V(L("cr2:attack_02.ogg", pitch=0.85), L("cr1:eat_01.ogg", pitch=0.8, db=-4), verb=(0.2, 1.2)),
                        V(L("cr2:attack_03.ogg", pitch=0.8), L("cr1:eat_04.ogg", pitch=0.8, db=-4), verb=(0.2, 1.2))],
    "hollowed.hurt": [V(L(f"cr1:hurt_0{i}.ogg", pitch=0.8), verb=(0.2, 1.2)) for i in (1, 2)] + [V(L("cr2:monster_16.ogg", pitch=0.85), verb=(0.2, 1.2))],
    "hollowed.death": [V(L("cr2:die_02.ogg", pitch=0.75), L("cr2:die_04.ogg", pitch=0.7, at=0.3, db=-6), verb=(0.35, 2.0))],

    # ------------------------------------------------------------------ BORROWED (non-vanilla parts)
    "borrowed.reveal": [V(L("cr2:slime_02.ogg", pitch=0.7), L("cr2:roar_04.ogg", pitch=0.9, at=0.2, db=-3), L("rpg:cloth3.ogg", pitch=0.6, db=-6), verb=(0.25, 1.5)),
                        V(L("cr2:slime_08.ogg", pitch=0.7), L("cr2:roar_06.ogg", pitch=0.95, at=0.2, db=-3), L("rpg:cloth1.ogg", pitch=0.6, db=-6), verb=(0.25, 1.5))],
    "borrowed.attack": [V(L("cr1:eat_02.ogg", pitch=0.75), L("cr1:grunt_04.ogg", pitch=0.8, db=-4)),
                        V(L("cr1:eat_01.ogg", pitch=0.75), L("cr1:grunt_05.ogg", pitch=0.75, db=-4))],
    "borrowed.hurt": [V(L(f"cr1:hurt_0{i}.ogg", pitch=0.75), verb=(0.15, 1.0)) for i in (3, 4, 5)],
    "borrowed.death": [V(L("cr2:die_03.ogg", pitch=0.7), L("cr2:slime_04.ogg", pitch=0.7, at=0.25, db=-4), verb=(0.3, 1.8))],

    # ------------------------------------------------------------------ KNOCKER
    "knocker.knock": [V(*seq([I("impactWood_heavy", (i + k) % 5) for k in range(3)], [0, gap, 2 * gap], pitch=p), verb=(0.2, 0.9))
                      for i, gap, p in ((0, 0.52, 0.9), (1, 0.6, 0.85), (2, 0.48, 0.92), (3, 0.7, 0.82))],
    "knocker.scratch": [V(L(f"rpg:drawKnife{i}.ogg", pitch=p), L(f"rpg:drawKnife{(i % 3) + 1}.ogg", pitch=p * 0.9, at=0.45, db=-3), lp=3200, verb=(0.15, 0.8))
                        for i, p in ((1, 0.55), (2, 0.5), (3, 0.6))],
    "knocker.breath": [V(L("bbw:2022-04-16 Triple-C THICCC - Heavy Breathing.wav", pitch=0.7), lp=2400, verb=(0.15, 0.8)),
                       V(L("cr1:breath.ogg", pitch=0.6), L("cr2:breath_02.ogg", pitch=0.6, at=0.9), lp=2400, verb=(0.15, 0.8))],
    "knocker.step": [V(L(f"rpg:footstep0{i}.ogg", pitch=0.75), L(I("footstep_wood", i % 5), pitch=0.7, db=-6), lp=3500) for i in (1, 4, 7)],
    "knocker.lunge": [V(L("cr2:roar_04.ogg", pitch=0.85), L("s1:slam_02.ogg", pitch=0.9, db=-4), verb=(0.2, 1.2))],
    "knocker.hurt": [V(L(f"cr2:grunt_0{i}.ogg", pitch=0.8), verb=(0.15, 1.0)) for i in (7, 8, 9)],
    "knocker.death": [V(L("orpg:creature_die_01.ogg", pitch=0.75), L("cr2:roar_05.ogg", pitch=0.6, at=0.3, db=-5), verb=(0.35, 2.0))],
    "knocker.leave": [V(*seq([I("footstep_grass", k % 5) for k in range(5)], [0, 0.6, 1.25, 1.95, 2.7], pitch=0.8), lp=2400, verb=(0.3, 1.8), fout=1.2)],
    "amb.bedtime_knock": [V(*seq([I("impactWood_heavy", k) for k in range(3)], [0, 0.6, 1.2], pitch=0.85), lp=900, verb=(0.4, 1.4)),
                          V(*seq([I("impactWood_heavy", k + 2) for k in range(3)], [0, 0.7, 1.45], pitch=0.8), lp=800, verb=(0.4, 1.4))],

    # ------------------------------------------------------------------ MIREBOUND
    "mirebound.bubble": [V(L(f"wat:bubble_0{i}.ogg", pitch=p), lp=3000) for i, p in ((1, 0.8), (2, 0.75), (3, 0.85))] +
                        [V(L("wat:loop_bubbles_1.ogg", dur=1.4), lp=2600, fin=0.1, fout=0.3)],
    "mirebound.gurgle": [V(L(f"cr1:burble_0{i}.ogg", pitch=0.6), L(f"mud:mud_{m:02d}.ogg", pitch=0.7, db=-4), lp=2200, verb=(0.2, 1.2)) for i, m in ((1, 4), (2, 17))] +
                        [V(L("cr2:slime_08.ogg", pitch=0.55), L("plop:Plop - Viscous 2.wav", pitch=0.7, db=-3), lp=2200, verb=(0.2, 1.2))],
    "mirebound.erupt": [V(L("wat:splash_09.ogg", pitch=0.8), L("cr2:roar_05.ogg", pitch=0.7, at=0.1, db=-3), verb=(0.2, 1.3)),
                        V(L("wat:splash_12.ogg", pitch=0.8), L("cr2:roar_06.ogg", pitch=0.72, at=0.1, db=-3), verb=(0.2, 1.3))],
    "mirebound.grab": [V(L("wat:splash_04.ogg", pitch=0.7), L("cr2:slime_02.ogg", pitch=0.6, at=0.1), verb=(0.15, 1.0)),
                       V(L("wat:splash_06.ogg", pitch=0.7), L("mud:mud_18.ogg", pitch=0.6, at=0.1), verb=(0.15, 1.0))],
    "mirebound.release": [V(L("wat:splash_02.ogg", pitch=0.9), L("mud:mud_08.ogg", pitch=0.8, db=-4))],
    "mirebound.hurt": [V(L(f"cr2:monster_{i:02d}.ogg", pitch=0.75), lp=3000, verb=(0.15, 1.0)) for i in (9, 12, 15)],
    "mirebound.death": [V(L("cr2:roar_06.ogg", pitch=0.55), L("wat:loop_bubbles_02.ogg", dur=2.0, at=0.4, db=-4), lp=2600, verb=(0.3, 1.8))],

    # ------------------------------------------------------------------ THE HEART BELOW
    "heart.beat": [V(L(I("impactSoft_heavy", a), pitch=0.45), L(I("impactSoft_heavy", b), pitch=0.42, at=0.26, db=-3), lp=320, verb=(0.3, 1.8))
                   for a, b in ((0, 1), (2, 3))],
    "heart.beat_fast": [V(L(I("impactSoft_heavy", 4), pitch=0.5), L(I("impactSoft_heavy", 1), pitch=0.48, at=0.18, db=-2), lp=360, verb=(0.25, 1.4))],
    "heart.awaken": [V(L("pad:2022-05-11 4am Doom Scrolling - Deep Pad.wav", dur=7.0, db=-2), L("orpg:creature_roar_03.ogg", pitch=0.45, at=2.0),
                       L("brk:bfh1_rock_breaking_01.ogg", pitch=0.6, at=2.2, db=-3), lp=4000, verb=(0.45, 3.5), fin=0.6, fout=1.2)],
    "heart.drone": [V(L("pad:2023-08-02 What Will Remain - Deep Pads.wav", dur=9.0), lp=900, fin=1.0, fout=2.0)],
    "heart.root_warn": [V(L(f"orpg:stones_0{i}.ogg", pitch=0.5), L(f"mud:mud_{m:02d}.ogg", pitch=0.5, db=-3), lp=1200, verb=(0.3, 1.6)) for i, m in ((3, 2), (2, 9))],
    "heart.root_strike": [V(L(f"wm:wood_breaking_0{i}.ogg", pitch=0.7), L(I("impactMining", i), pitch=0.6, db=-3), verb=(0.25, 1.6)) for i in (1, 2)] +
                         [V(L("brk:bfh1_wood_breaking_02.ogg", pitch=0.7), L(I("impactMining", 3), pitch=0.6, db=-3), verb=(0.25, 1.6))],
    "heart.pulse": [V(L(I("impactSoft_heavy", i), pitch=0.35), L("woosh:Classic Swish 1.wav", pitch=0.5, at=0.05, db=-4), lp=1200, verb=(0.4, 2.6)) for i in (0, 3)],
    "heart.phase": [V(L("orpg:creature_roar_02.ogg", pitch=0.55), L("pad:2022-10-29 Revered Waters - Infinite Void.wav", dur=5.0, db=-4), lp=3500, verb=(0.45, 3.2), fout=1.2)],
    "heart.hurt": [V(L(f"cr2:monster_{i:02d}.ogg", pitch=0.55), L(I("impactSoft_medium", i % 5), pitch=0.5, db=-4), lp=2200, verb=(0.3, 1.8)) for i in (9, 12, 20)],
    "heart.death": [V(L("cr2:roar_05.ogg", pitch=0.48), L("brk:bfh1_wood_breaking_03.ogg", pitch=0.6, at=0.5),
                      L("pad:2023-04-12 The Drowned Forest - Murky Waters.wav", dur=6.0, at=0.8, db=-5), lp=3000, verb=(0.5, 4.0), fout=2.0)],
    "heart.vein_break": [V(L("cr2:slime_07.ogg", pitch=0.7), L("wm:wood_cracking_02.ogg", pitch=0.8, at=0.05), verb=(0.25, 1.5)),
                         V(L("cr2:slime_03.ogg", pitch=0.7), L("wm:wood_cracking_04.ogg", pitch=0.8, at=0.05), verb=(0.25, 1.5))],
    "heart.spawn": [V(L("mud:mud_04.ogg", pitch=0.7), L("cr2:slime_04.ogg", pitch=0.65, at=0.2), verb=(0.3, 1.6))],

    # ------------------------------------------------------------------ BLOCKS, ITEMS, UI
    "chime.ring": [V(L(I("impactBell_heavy", i), pitch=p), L(I("impactBell_heavy", (i + 2) % 5), pitch=p * 1.5, at=0.18, db=-7), hp=500, verb=(0.45, 2.6))
                   for i, p in ((0, 1.35), (1, 1.5), (3, 1.25))],
    "ward.repel": [V(L("orpg:spell_fire_03.ogg"), L("woosh:Gentle Swish.wav", pitch=0.7, db=-6), verb=(0.3, 1.6)),
                   V(L("orpg:spell_fire_04.ogg"), L("woosh:Swish 6.wav", pitch=0.7, db=-6), verb=(0.3, 1.6))],
    "ward.place": [V(L("orpg:item_wood_01.ogg", pitch=0.9), L("orpg:spell_fire_07.ogg", at=0.1))],
    "ward.spent": [V(L("orpg:spell_fire_06.ogg", pitch=0.8), L("orpg:item_stone_02.ogg", pitch=0.8, at=0.4), fout=0.4)],
    "lens.use": [V(L(I("impactGlass_light", 1), pitch=1.1), L("orpg:item_gem_01.ogg", pitch=0.9, at=0.05, db=-3), verb=(0.2, 1.0))],
    "journal.open": [V(L("rpg:bookOpen.ogg")), V(L("rpg:bookFlip2.ogg"))],
    "journal.entry": [V(L("book:Pen Writing 3.wav", start=0.4, dur=1.1), L("rpg:bookFlip1.ogg", at=1.0, db=-3), fout=0.2)],
    "heartseeker.pulse": [V(L(I("impactSoft_medium", 2), pitch=0.6), L(I("impactSoft_medium", 3), pitch=0.58, at=0.22, db=-3), lp=600, verb=(0.25, 1.2))],
    "altar.insert": [V(L("orpg:item_stone_01.ogg", pitch=0.7), L("orpg:stones_01.ogg", pitch=0.6, at=0.2, db=-4), verb=(0.4, 2.4))],
    "stinger.low": [V(L("pad:2022-05-11 4am Doom Scrolling - Deep Pad.wav", start=1.0, dur=4.5), lp=1500, fin=0.05, fout=1.5),
                    V(L("add:2023-12-13 A Call From the Other Side - Tension Pad.wav", dur=4.5), lp=2500, fin=0.05, fout=1.5)],
    "stinger.distant": [V(L("pad:2022-10-29 Revered Waters - Infinite Void.wav", start=2.0, dur=5.0), lp=2000, verb=(0.4, 3.0), fin=0.4, fout=1.8),
                        V(L("add:2023-10-11 Labradorescence - Ancient Signal.wav", dur=5.0), lp=2200, verb=(0.4, 3.0), fin=0.4, fout=1.8)],
}

# The disguised Borrowed uses Minecraft's own sheep sounds (vanilla files, referenced not shipped).
VANILLA = {
    "borrowed.baa": {"sounds": [{"name": f"sounds/mob/sheep/say{i}"} for i in (1, 2, 3)]},
    # the tell: the same bleat, a little too low and a little too slow
    "borrowed.baa_wrong": {"sounds": [{"name": f"sounds/mob/sheep/say{i}", "pitch": 0.74} for i in (1, 2, 3)]},
    "borrowed.step": {"sounds": [{"name": f"sounds/mob/sheep/step{i}"} for i in (1, 2, 3, 4, 5)]},
}

SUBTITLES = {
    "watcher.step": "Something steps in the leaves", "watcher.creak": "Wood creaks", "watcher.seen": "Bark cracks",
    "watcher.retreat": "Something withdraws into the trees", "watcher.lunge": "Something lunges", "watcher.hurt": "Watcher hurts",
    "watcher.death": "Watcher splinters", "amb.forest.far_call": "A distant call", "amb.forest.branch_snap": "A branch snaps",
    "amb.forest.footsteps": "Distant footsteps", "amb.forest.wind": "Wind in the trees", "amb.forest.hush": "The forest goes quiet",
    "amb.cave.drip": "Water drips", "amb.cave.shift": "Stone shifts", "amb.cave.breath": "Breathing in the dark",
    "amb.swamp.gurgle": "Water gurgles", "amb.swamp.creak": "Wood groans", "hollowed.click": "Clicking",
    "hollowed.alert": "Hollowed shrieks", "hollowed.sniff": "Sniffing", "hollowed.step": "Claws on stone",
    "hollowed.attack": "Hollowed bites", "hollowed.hurt": "Hollowed hurts", "hollowed.death": "Hollowed dies",
    "borrowed.baa": "Sheep baahs", "borrowed.baa_wrong": "A sheep bleats, too low", "borrowed.reveal": "Something tears free",
    "borrowed.attack": "Borrowed bites", "borrowed.hurt": "Borrowed hurts", "borrowed.death": "Borrowed dies",
    "borrowed.step": "Footsteps", "knocker.knock": "Knocking at the door", "knocker.scratch": "Scratching at the door",
    "knocker.breath": "Breathing at the door", "knocker.step": "Heavy footsteps", "knocker.lunge": "Knocker lunges",
    "knocker.hurt": "Knocker hurts", "knocker.death": "Knocker dies", "knocker.leave": "Footsteps drag away",
    "amb.bedtime_knock": "Distant knocking", "mirebound.bubble": "Bubbles rise", "mirebound.gurgle": "Something gurgles underwater",
    "mirebound.erupt": "Something bursts from the water", "mirebound.grab": "Mirebound grabs", "mirebound.release": "Mirebound lets go",
    "mirebound.hurt": "Mirebound hurts", "mirebound.death": "Mirebound dies", "heart.beat": "A heart beats",
    "heart.beat_fast": "A heart races", "heart.awaken": "The Heart wakes", "heart.drone": "A low drone",
    "heart.root_warn": "The ground rumbles", "heart.root_strike": "Roots burst", "heart.pulse": "A pulse rolls out",
    "heart.phase": "The Heart roars", "heart.hurt": "Heart hurts", "heart.death": "The Heart stills",
    "heart.vein_break": "A vein bursts", "heart.spawn": "Something crawls from the roots", "chime.ring": "Chime rings",
    "ward.repel": "Ward flares", "ward.place": "Ward smoulders", "ward.spent": "Ward burns out", "lens.use": "Seer's Glass clouds",
    "journal.open": "Pages turn", "journal.entry": "Journal updated", "heartseeker.pulse": "Heartseeker beats",
    "altar.insert": "Offering placed", "stinger.low": "Dread", "stinger.distant": "Unease",
}

# CC0 music (jfpx/cc0-media-library music-v1). id -> (catalog path, title, author, gain dB)
MUSIC = {
    "night_1": ("music/unspecified/ambient/abstraction-9e5c350d3e66baa56b4b806d.ogg", "Ludum Dare 32 05", "Abstraction (Ben Burnes)", 0),
    "night_2": ("music/unspecified/spooky/abstraction-455c33af6610997b97b690d0.ogg", "Patreon Challenge 04", "Abstraction (Ben Burnes)", 0),
    "night_3": ("music/suspense/ambient/unsolved-investigation.ogg", "Unsolved Investigation", "isaiah658", 0),
    "cave": ("music/unspecified/ambient/abstraction-9858b87007c41a4dfe66b437.ogg", "Patreon Challenge 05", "Abstraction (Ben Burnes)", 0),
    "shrine": ("music/mysterious/synth/shrine.ogg", "Shrine", "yd", 0),
    "boss": ("music/unspecified/spooky/abstraction-8c2b64234b241112c8d54382.ogg", "Ludum Dare 30 03", "Abstraction (Ben Burnes)", 0),
    "dawn": ("music/unspecified/ambient/abstraction-4818ca6a5b5c7b602fbf9eb7.ogg", "Sketchbook 2024-10-16", "Abstraction (Ben Burnes)", 0),
}


def find_music(rel):
    p = os.path.join(MUS, rel)
    if os.path.isfile(p):
        return p
    # catalog paths are relative to the archive root; search by file name as a fallback
    name = os.path.basename(rel)
    for base, _, files in os.walk(MUS):
        if name in files:
            return os.path.join(base, name)
    raise FileNotFoundError(f"missing music {rel} - run tools/sounds/fetch_sources.sh")


def encode_music(src, dst, gain_db):
    """Stereo, -16 LUFS-ish integrated loudness, gentle fades, OGG q2 (~96 kbps)."""
    ensure(os.path.dirname(dst))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af",
                    f"loudnorm=I=-20:TP=-2:LRA=11,volume={gain_db}dB,afade=t=in:d=2,areverse,afade=t=in:d=3,areverse",
                    "-ar", "44100", "-ac", "2", "-c:a", "libvorbis", "-q:a", "2",
                    "-fflags", "+bitexact", "-flags:a", "+bitexact", "-map_metadata", "-1", dst], check=True)


def main():
    meta = {s["event"]: s for s in design.REGISTRY}
    missing = set(meta) - set(RECIPES) - set(VANILLA)
    assert not missing, f"no recipe for {sorted(missing)}"
    out_root = os.path.join(RP, "sounds", "hollow")
    # remove the old synthesised files so nothing stale ships
    for base, _, files in os.walk(out_root):
        for fn in files:
            if fn.endswith(".ogg"):
                os.remove(os.path.join(base, fn))
    defs, review, total = {}, [], 0
    subs = {}
    catalog = {}
    for event, s in meta.items():
        group, name = event.split(".", 1)
        catalog[event] = {"subtitle": SUBTITLES[event], "category": s["category"], "variants": []}
        if event in VANILLA:
            entries = [dict(e, volume=round(s["volume"], 3)) for e in VANILLA[event]["sounds"]]
            catalog[event]["vanilla"] = [e["name"] for e in VANILLA[event]["sounds"]]
        else:
            entries = []
            for k, v in enumerate(RECIPES[event]):
                A.seed(sum(map(ord, event)) * 31 + k)  # deterministic reverb tails
                x = render(v)
                rel = f"sounds/hollow/{group}/{name.replace('.', '_')}_{k + 1}"
                path = os.path.join(RP, rel + ".ogg")
                review.append((f"{event}#{k + 1}", A.normalize(x, s["peak_db"], s["rms_db"])))
                A.write_ogg(x, path, quality=s["quality"], peak_db=s["peak_db"], rms_db=s["rms_db"])
                total += os.path.getsize(path)
                catalog[event]["variants"].append({
                    "file": rel, "seconds": round(len(x) / SR, 2),
                    "sources": sorted({l["ref"].split(":", 1)[0] + "/" + l["ref"].split(":", 1)[1] for l in v["layers"]}),
                })
                e = {"name": rel, "volume": round(s["volume"], 3)}
                if not s["is3d"]:
                    e["is3D"] = False
                entries.append(e)
        d = {"category": s["category"], "sounds": entries, "subtitle": f"subtitles.hollow.{event}"}
        subs[f"subtitles.hollow.{event}"] = SUBTITLES[event]
        if s["min_d"] is not None:
            d["min_distance"] = float(s["min_d"])
        if s["max_d"] is not None:
            d["max_distance"] = float(s["max_d"])
        defs["hollow." + event] = d
    music_bytes = 0
    for mid, (rel, title, author, gain) in MUSIC.items():
        dst = os.path.join(RP, "sounds", "hollow", "music", f"{mid}.ogg")
        encode_music(find_music(rel), dst, gain)
        music_bytes += os.path.getsize(dst)
        defs[f"hollow.music.{mid}"] = {"category": "music", "sounds": [{"name": f"sounds/hollow/music/{mid}", "stream": True, "volume": 0.7}]}
        catalog[f"music.{mid}"] = {"subtitle": f"{title} - {author}", "category": "music",
                                   "variants": [{"file": f"sounds/hollow/music/{mid}", "seconds": None, "sources": [f"cc0-music/{rel}"]}]}
    with open(os.path.join(RP, "sounds", "sound_definitions.json"), "w") as f:
        json.dump({"format_version": "1.20.20", "sound_definitions": defs}, f, indent=2)
    with open(os.path.join(os.path.dirname(__file__), "subtitles_generated.json"), "w") as f:
        json.dump(subs, f, indent=2, sort_keys=True)
    with open(os.path.join(os.path.dirname(__file__), "catalog_generated.json"), "w") as f:
        json.dump({"aliases": F, "events": catalog}, f, indent=1)
    with open(os.path.join(os.path.dirname(__file__), "sources_used.json"), "w") as f:
        json.dump({"sfx": sorted(USED), "music": {k: {"path": v[0], "title": v[1], "author": v[2]} for k, v in MUSIC.items()}}, f, indent=2)
    ensure(os.path.join(BUILD, "previews"))
    for old in [p for p in os.listdir(os.path.join(BUILD, "previews")) if p.startswith("sounds_")]:
        os.remove(os.path.join(BUILD, "previews", old))
    for i in range(0, len(review), 40):
        design.spectro_sheet(review[i:i + 40], os.path.join(BUILD, "previews", f"sounds_{i // 40 + 1}.png"))
    print(f"{len(review)} sfx files ({total / 1e6:.2f} MB) from {len(USED)} CC0 sources; "
          f"{len(VANILLA)} vanilla-referenced events; {len(MUSIC)} music tracks ({music_bytes / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
