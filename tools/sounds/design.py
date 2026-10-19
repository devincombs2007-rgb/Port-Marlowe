"""THE HOLLOW sound catalogue. Every event is synthesised from scratch (see hollowkit/audio.py).

Run:  python3 tools/sounds/design.py
Writes OGG files to packs/resource/sounds/hollow/** and packs/resource/sounds/sound_definitions.json,
plus build/previews/sounds_*.png spectrogram sheets used for level/spectrum review.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP, BUILD, ensure  # noqa: E402
from hollowkit import audio as A  # noqa: E402
from hollowkit.audio import SR  # noqa: E402

REGISTRY = []


def sound(event, variants=1, category="hostile", volume=1.0, pitch=1.0, min_d=None, max_d=None,
          rms_db=-20.0, peak_db=-1.0, is3d=True, quality=4):
    def deco(fn):
        REGISTRY.append(dict(event=event, fn=fn, variants=variants, category=category, volume=volume,
                             pitch=pitch, min_d=min_d, max_d=max_d, rms_db=rms_db, peak_db=peak_db,
                             is3d=is3d, quality=quality))
        return fn
    return deco


R = lambda lo, hi: float(A.RNG.uniform(lo, hi))  # noqa: E731


# =============================================================================== WATCHER
def leaf_step(level=1.0, dur=0.16):
    x = A.crackle(dur, density=int(R(220, 380)), lo=1100, hi=6500, decay=0.003)
    x *= A.env_ad(dur, 0.004, 5)
    thud = A.lowpass(A.white(dur), 260) * A.env_ad(dur, 0.002, 14) * 0.9
    return (x * 0.7 + thud) * level


@sound("watcher.step", variants=4, volume=0.55, min_d=2, max_d=20, rms_db=-24)
def watcher_step(i):
    x = leaf_step(1.0, 0.18)
    snap = A.wood_knock(0.12, size=0.45, hardness=1.6) * 0.35
    x = A.place(x, snap, 0.01)
    return A.reverb(x, wet=0.15, rt60=0.6, damp=5000)


@sound("watcher.creak", variants=3, volume=0.8, min_d=4, max_d=40, rms_db=-24)
def watcher_creak(i):
    dur = R(1.4, 2.3)
    x = A.creak(dur, rate=(6, 22), body=(R(120, 160), R(290, 340), R(600, 680)), q=18, roughness=0.5)
    x *= A.env_adsr(dur, 0.25, 0.3, 0.7, 0.6)
    return A.reverb(x, wet=0.32, rt60=1.6, damp=3500)


@sound("watcher.seen", variants=2, volume=0.7, min_d=4, max_d=48, rms_db=-24)
def watcher_seen(i):
    dur = 1.3
    inhale = A.bandpass(A.pink(dur), 500, 3200) * A.env_adsr(dur, 0.7, 0.1, 0.8, 0.12)
    inhale = A.formants(inhale, [(720, 1.0), (1240, 0.6), (2600, 0.3)], q=5)
    tail = A.creak(0.8, rate=(10, 26), body=(180, 380, 760), q=16) * A.env_ad(0.8, 0.05, 3) * 0.6
    x = A.place(A.silence(2.2), inhale, 0.0)
    x = A.place(x, tail, 1.05)
    return A.reverb(x, wet=0.35, rt60=2.0, damp=3000)


@sound("watcher.retreat", variants=2, volume=0.8, min_d=4, max_d=48, rms_db=-24)
def watcher_retreat(i):
    x = A.silence(2.4)
    t = 0.0
    for k in range(8):
        lvl = 1.0 - k * 0.1
        s = A.distance(leaf_step(lvl, 0.15), metres=4 + k * 5)
        x = A.place(x, s, t)
        t += R(0.16, 0.22)
    swish = A.bandpass(A.white(0.5), 1500, 6000) * A.env_ad(0.5, 0.15, 4) * 0.25
    x = A.place(x, swish, 0.1)
    return A.reverb(x, wet=0.3, rt60=1.8)


@sound("watcher.lunge", variants=2, volume=1.0, min_d=2, max_d=32, rms_db=-17)
def watcher_lunge(i):
    crack = A.crackle(0.18, density=2200, lo=900, hi=7000, decay=0.002) * A.env_ad(0.18, 0.001, 6)
    hiss = A.bandpass(A.white(0.6), 2200, 7000) * A.env_adsr(0.6, 0.03, 0.2, 0.4, 0.3) * 0.35
    thump = A.heartbeat_thump(0.3, 90, 40) * 0.8
    x = A.place(A.silence(0.9), crack, 0)
    x = A.place(x, hiss, 0.05)
    x = A.place(x, thump, 0.0)
    return A.reverb(x, wet=0.2, rt60=0.9)


@sound("watcher.hurt", variants=3, volume=0.9, min_d=2, max_d=24, rms_db=-18)
def watcher_hurt(i):
    sp = A.crackle(0.28, density=900, lo=700, hi=6000, decay=0.003) * A.env_ad(0.28, 0.002, 4)
    k = A.wood_knock(0.25, size=0.7) * 0.6
    cr = A.creak(0.35, rate=(30, 60), body=(260, 520, 1040), q=12) * A.env_ad(0.35, 0.02, 3) * 0.5
    x = A.place(A.silence(0.7), sp, 0)
    x = A.place(x, k, 0)
    x = A.place(x, cr, 0.12)
    return A.reverb(x, wet=0.18, rt60=0.8)


@sound("watcher.death", variants=1, volume=1.0, min_d=2, max_d=40, rms_db=-19)
def watcher_death(i):
    x = A.silence(3.2)
    sp = A.crackle(1.5, density=700, lo=600, hi=6000, decay=0.003) * np.linspace(1, 0.1, int(1.5 * SR))
    fall = A.creak(1.2, rate=(40, 8), body=(150, 320, 640), q=16) * A.env_adsr(1.2, 0.1, 0.4, 0.6, 0.4)
    boom = A.mix(A.wood_knock(0.9, size=2.4, hardness=0.6) * 1.2, A.heartbeat_thump(0.6, 70, 30))
    settle = A.crackle(1.0, density=60, lo=2000, hi=7000) * 0.4
    x = A.place(x, sp, 0)
    x = A.place(x, fall, 0.2)
    x = A.place(x, boom, 1.35)
    x = A.place(x, settle, 1.6)
    return A.reverb(x, wet=0.3, rt60=2.2)


# =============================================================================== FOREST AMBIENCE
@sound("amb.forest.far_call", variants=3, category="ambient", volume=0.55, min_d=8, max_d=96, rms_db=-24)
def far_call(i):
    """A distant two-note call that no animal quite makes."""
    notes = [(R(230, 260), 0.55), (R(190, 215), 0.85)] if i != 2 else [(R(250, 270), 0.4), (R(250, 270), 0.4), (R(180, 200), 0.9)]
    x = A.silence(4.5)
    t = 0.2
    for f0, d in notes:
        n = int(d * SR)
        f = np.linspace(f0 * 1.04, f0 * 0.97, n) * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * np.arange(n) / SR))
        src = A.glottal(f, jitter=0.004, shimmer=0.03)
        v = A.formants(src, [(320, 1.0), (760, 0.45), (2400, 0.08)], q=9) * A.env_adsr(d, 0.08, 0.1, 0.85, 0.2)
        x = A.place(x, v, t)
        t += d + R(0.12, 0.2)
    x = A.distance(x, metres=60)
    return A.reverb(x, wet=0.62, rt60=3.6, damp=2500, size=3.0)


@sound("amb.forest.branch_snap", variants=3, category="ambient", volume=0.7, min_d=8, max_d=96, rms_db=-24)
def branch_snap(i):
    crack = A.crackle(0.06, density=2500, lo=700, hi=6000, decay=0.0025) * A.env_ad(0.06, 0.0008, 5)
    knock = A.wood_knock(0.2, size=R(0.5, 0.9), hardness=1.5) * 0.5
    x = A.place(A.silence(2.6), crack, 0.05)
    x = A.place(x, knock, 0.05)
    if i == 1:
        x = A.place(x, crack * 0.4, 0.31)
    x = A.distance(x, metres=R(25, 45))
    return A.reverb(x, wet=0.5, rt60=2.4, damp=3000, size=2.5)


@sound("amb.forest.footsteps", variants=2, category="ambient", volume=0.6, min_d=8, max_d=80, rms_db=-25)
def far_steps(i):
    x = A.silence(5.0)
    t = 0.2
    steps = 6 if i == 0 else 4
    for k in range(steps):
        x = A.place(x, leaf_step(R(0.7, 1.0), 0.17), t)
        t += R(0.48, 0.62) if k < steps - 2 else R(0.7, 0.9)
    x = A.distance(x, metres=30)
    return A.reverb(x, wet=0.45, rt60=2.2, damp=3200, size=2.0)


@sound("amb.forest.wind", variants=3, category="ambient", volume=0.45, min_d=None, max_d=None, rms_db=-26, is3d=False)
def forest_wind(i):
    dur = 9.0
    gust = A.smooth_noise_curve(dur, 0.6, 0.15, 1.0) ** 1.6
    base = A.pink(dur)
    band = A.bandpass(base, 180, 1400) * gust
    whistle = A.resonator(A.pink(dur), R(420, 640), 22) * gust ** 2 * 0.25
    leaves = A.crackle(dur, density=220, lo=2500, hi=8000) * gust ** 2 * 0.5
    x = band + whistle + leaves
    return A.fade(x, 1.5, 2.0)


@sound("amb.forest.hush", variants=2, category="ambient", volume=0.5, rms_db=-30, is3d=False)
def hush(i):
    """'The forest holds its breath' - a near-subliminal pressure swell, not a stinger."""
    dur = 5.0
    t = A.t_axis(dur)
    tone = (np.sin(2 * np.pi * 55 * t) * 0.6 + np.sin(2 * np.pi * 82.6 * t) * 0.25)
    air = A.lowpass(A.pink(dur), 320) * 0.5
    x = (tone + air) * A.env_adsr(dur, 2.2, 0.5, 0.7, 1.8)
    return x


# =============================================================================== CAVE AMBIENCE
@sound("amb.cave.drip", variants=4, category="ambient", volume=0.5, min_d=4, max_d=40, rms_db=-26)
def cave_drip(i):
    t = A.t_axis(0.05)
    f = np.linspace(R(900, 1400), R(2200, 3200), len(t))
    plink = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 90)
    x = A.place(A.silence(2.6), plink, 0.02)
    return A.reverb(x, wet=0.55, rt60=2.6, damp=5000, size=2.0)


@sound("amb.cave.shift", variants=3, category="ambient", volume=0.65, min_d=6, max_d=64, rms_db=-24)
def cave_shift(i):
    dur = 3.0
    grind = A.lowpass(A.brown(dur), 380) * A.env_adsr(dur, 0.6, 0.6, 0.6, 1.2)
    gravel = A.crackle(dur, density=90, lo=300, hi=2200, decay=0.006) * A.env_adsr(dur, 1.0, 0.5, 0.5, 1.0) * 0.6
    x = A.distance(grind + gravel, metres=30)
    return A.reverb(x, wet=0.5, rt60=3.0, damp=2000, size=3.0)


@sound("amb.cave.breath", variants=2, category="ambient", volume=0.55, min_d=6, max_d=48, rms_db=-26)
def cave_breath(i):
    x = A.silence(5.0)
    t = 0.1
    for k in range(2):
        for d, lvl in ((1.1, 0.8), (1.3, 1.0)):
            b = A.bandpass(A.pink(d), 140, 900) * A.env_adsr(d, d * 0.45, 0.1, 0.8, d * 0.4) * lvl
            b = A.formants(b, [(260, 1.0), (620, 0.5)], q=4)
            x = A.place(x, b, t)
            t += d + 0.05
    x = A.distance(x, metres=25)
    return A.reverb(x, wet=0.5, rt60=2.4, damp=2500)


# =============================================================================== SWAMP
@sound("amb.swamp.gurgle", variants=3, category="ambient", volume=0.55, min_d=4, max_d=40, rms_db=-25)
def swamp_gurgle(i):
    x = A.silence(2.0)
    for k in range(int(R(4, 9))):
        x = A.place(x, A.bubble(R(160, 480), R(0.08, 0.16), rise=R(1, 3), decay=R(18, 30)), R(0.0, 1.2), R(0.3, 1.0))
    blub = A.lowpass(A.white(0.4), 300) * A.env_ad(0.4, 0.02, 6) * 0.5
    x = A.place(x, blub, 0.1)
    return A.reverb(x, wet=0.2, rt60=1.0)


@sound("amb.swamp.creak", variants=2, category="ambient", volume=0.5, min_d=6, max_d=48, rms_db=-26)
def swamp_creak(i):
    dur = R(1.0, 1.6)
    x = A.creak(dur, rate=(10, 30), body=(R(280, 340), R(650, 760), R(1250, 1400)), q=12) * A.env_adsr(dur, 0.2, 0.2, 0.6, 0.4)
    x = A.distance(x, metres=20)
    return A.reverb(x, wet=0.4, rt60=1.8)


# =============================================================================== HOLLOWED (echolocation)
def click(level=1.0):
    imp = np.zeros(int(0.03 * SR))
    imp[0] = 1.0
    imp[1] = -0.6
    c = A.resonator(imp, R(2000, 2500), 6) + A.resonator(imp, R(3600, 4200), 5) * 0.6
    tok = A.wood_knock(0.03, size=0.3, hardness=2.0) * 0.25
    return (c * 6 + tok) * level


@sound("hollowed.click", variants=4, volume=0.9, min_d=3, max_d=40, rms_db=-21)
def hollowed_click(i):
    x = A.silence(1.4)
    t = 0.02
    for k in range(int(R(3, 8))):
        x = A.place(x, click(R(0.6, 1.0)), t)
        t += R(0.045, 0.095)
    return A.reverb(x, wet=0.45, rt60=2.0, damp=6000, size=1.5)


@sound("hollowed.alert", variants=2, volume=1.0, min_d=3, max_d=48, rms_db=-19)
def hollowed_alert(i):
    x = A.silence(1.8)
    t, gap = 0.0, 0.09
    while t < 1.1:
        x = A.place(x, click(R(0.7, 1.0)), t)
        t += gap
        gap = max(0.022, gap * 0.9)
    n = int(1.0 * SR)
    f = np.linspace(55, 95, n) * (1 + 0.04 * A.RNG.standard_normal(n).cumsum() / 400)
    rattle = A.formants(A.glottal(f, jitter=0.05, shimmer=0.4), [(420, 1.0), (980, 0.6), (2300, 0.2)], q=6)
    rattle *= A.env_adsr(1.0, 0.3, 0.2, 0.8, 0.3) * 0.5
    x = A.place(x, rattle, 0.5)
    return A.reverb(x, wet=0.4, rt60=2.0)


@sound("hollowed.sniff", variants=2, volume=0.7, min_d=2, max_d=20, rms_db=-24)
def hollowed_sniff(i):
    x = A.silence(1.0)
    for k in range(3):
        s = A.bandpass(A.white(0.09), 900, 4200) * A.env_adsr(0.09, 0.02, 0.02, 0.7, 0.04)
        x = A.place(x, s, 0.05 + k * R(0.13, 0.17))
    return A.reverb(x, wet=0.3, rt60=1.5)


@sound("hollowed.step", variants=4, volume=0.45, min_d=1, max_d=16, rms_db=-26)
def hollowed_step(i):
    scr = A.bandpass(A.white(0.07), 1800, 5200) * A.env_ad(0.07, 0.003, 7)
    tick = click(0.25)
    x = A.place(A.silence(0.4), scr, 0)
    x = A.place(x, tick, 0.01)
    return A.reverb(x, wet=0.3, rt60=1.4)


@sound("hollowed.attack", variants=2, volume=1.0, min_d=2, max_d=24, rms_db=-17)
def hollowed_attack(i):
    snap = A.wood_knock(0.15, size=0.38, hardness=2.5)
    hiss = A.bandpass(A.white(0.35), 2500, 8000) * A.env_ad(0.35, 0.01, 5) * 0.4
    x = A.place(A.silence(0.6), hiss, 0)
    x = A.place(x, snap, 0.06)
    return A.reverb(x, wet=0.2, rt60=1.0)


@sound("hollowed.hurt", variants=3, volume=0.9, min_d=2, max_d=24, rms_db=-18)
def hollowed_hurt(i):
    n = int(0.3 * SR)
    f = np.linspace(R(380, 460), R(650, 760), n)
    sq = A.formants(A.glottal(f, jitter=0.03, shimmer=0.3), [(900, 1.0), (2100, 0.5)], q=7) * A.env_ad(0.3, 0.01, 3)
    x = A.place(A.silence(0.6), sq, 0)
    for k in range(4):
        x = A.place(x, click(0.6), 0.02 + k * 0.03)
    return A.reverb(x, wet=0.3, rt60=1.5)


@sound("hollowed.death", variants=1, volume=1.0, min_d=2, max_d=32, rms_db=-19)
def hollowed_death(i):
    x = A.silence(2.6)
    t, gap = 0.0, 0.03
    while t < 1.4:
        x = A.place(x, click(max(0.1, 1 - t / 1.4)), t)
        t += gap
        gap *= 1.12
    n = int(1.5 * SR)
    f = np.linspace(110, 45, n)
    groan = A.formants(A.glottal(f, jitter=0.06, shimmer=0.5), [(380, 1.0), (800, 0.4)], q=6) * A.env_adsr(1.5, 0.1, 0.4, 0.6, 0.8)
    x = A.place(x, groan * 0.6, 0.2)
    return A.reverb(x, wet=0.45, rt60=2.2)


# =============================================================================== BORROWED
def bleat(f0, dur, wrong=0.0, trem=24.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    contour = f0 * (1 + 0.06 * np.sin(np.pi * t / dur))
    if wrong:
        drop = np.clip((t - dur * 0.45) / (dur * 0.55), 0, 1)
        contour = contour * (1 - wrong * 0.55 * drop ** 1.5)
    src = A.glottal(contour, jitter=0.012, shimmer=0.12)
    if wrong:
        src = src + 0.5 * wrong * A.glottal(contour / 2, jitter=0.02)
    fa = [(720, 1.0), (1650, 0.55), (2650, 0.2)]
    if wrong:
        fa = [(720 - 320 * wrong, 1.0), (1650 - 700 * wrong, 0.5), (2650, 0.15)]
    v = A.formants(src, fa, q=7)
    am = 1 - 0.45 * (0.5 + 0.5 * np.sin(2 * np.pi * trem * t))
    return v * am * A.env_adsr(dur, 0.05, 0.1, 0.85, 0.15)


@sound("borrowed.baa", variants=4, category="neutral", volume=0.9, min_d=2, max_d=24, rms_db=-20)
def borrowed_baa(i):
    """Almost a sheep: a little too low, tremolo a little too regular, and a soft click at the end."""
    x = A.place(A.silence(1.2), bleat(R(255, 300), R(0.55, 0.75), trem=R(22, 25)), 0.02)
    x = A.place(x, click(0.15), R(0.75, 0.85))
    return A.reverb(x, wet=0.12, rt60=0.7)


@sound("borrowed.baa_wrong", variants=3, category="hostile", volume=0.9, min_d=2, max_d=28, rms_db=-20)
def borrowed_baa_wrong(i):
    x = A.place(A.silence(2.0), bleat(R(260, 300), R(1.1, 1.5), wrong=R(0.7, 1.0), trem=R(20, 23)), 0.02)
    return A.reverb(x, wet=0.2, rt60=1.0)


@sound("borrowed.reveal", variants=2, volume=1.0, min_d=2, max_d=32, rms_db=-18)
def borrowed_reveal(i):
    x = A.silence(2.0)
    tear = A.crackle(0.7, density=900, lo=400, hi=3500, decay=0.006) * A.env_adsr(0.7, 0.05, 0.2, 0.7, 0.3)
    x = A.place(x, tear, 0.0)
    for k in range(5):
        x = A.place(x, A.wood_knock(0.12, size=R(0.35, 0.6), hardness=2.0) * 0.6, 0.15 + k * R(0.08, 0.14))
    n = int(1.1 * SR)
    f = np.linspace(80, 150, n)
    groan = A.formants(A.glottal(f, jitter=0.04, shimmer=0.4), [(500, 1.0), (1100, 0.5), (2500, 0.2)], q=6)
    x = A.place(x, groan * A.env_adsr(1.1, 0.4, 0.2, 0.8, 0.3) * 0.7, 0.55)
    return A.reverb(x, wet=0.25, rt60=1.2)


@sound("borrowed.attack", variants=2, volume=1.0, min_d=2, max_d=24, rms_db=-17)
def borrowed_attack(i):
    snap = A.wood_knock(0.15, size=0.5, hardness=2.0)
    n = int(0.4 * SR)
    growl = A.formants(A.glottal(np.linspace(120, 90, n), jitter=0.05, shimmer=0.5), [(600, 1), (1300, 0.4)], q=5)
    x = A.place(A.silence(0.6), growl * A.env_ad(0.4, 0.02, 3) * 0.6, 0)
    x = A.place(x, snap, 0.05)
    return A.reverb(x, wet=0.15, rt60=0.8)


@sound("borrowed.hurt", variants=3, volume=0.9, min_d=2, max_d=24, rms_db=-19)
def borrowed_hurt(i):
    x = A.place(A.silence(0.8), bleat(R(300, 340), 0.35, wrong=0.8, trem=30), 0)
    return A.reverb(x, wet=0.15, rt60=0.8)


@sound("borrowed.death", variants=1, volume=1.0, min_d=2, max_d=32, rms_db=-19)
def borrowed_death(i):
    x = A.place(A.silence(2.8), bleat(280, 2.0, wrong=1.0, trem=18), 0)
    rat = A.crackle(0.8, density=200, lo=300, hi=2000, decay=0.008) * 0.4
    x = A.place(x, rat, 1.6)
    return A.reverb(x, wet=0.25, rt60=1.4)


@sound("borrowed.step", variants=3, category="neutral", volume=0.35, min_d=1, max_d=12, rms_db=-27)
def borrowed_step(i):
    thud = A.lowpass(A.white(0.1), 400) * A.env_ad(0.1, 0.002, 9)
    grass = A.bandpass(A.white(0.12), 2500, 7000) * A.env_ad(0.12, 0.01, 6) * 0.2
    return A.place(A.place(A.silence(0.25), thud, 0), grass, 0.005)


# =============================================================================== KNOCKER
def knock_seq(times, size=1.1, muffled=False):
    end = times[-1] + 0.6
    x = A.silence(end)
    for t in times:
        k = A.wood_knock(0.4, size=size * R(0.97, 1.03), hardness=R(0.9, 1.3))
        rattle = A.modal(0.12, [(R(1800, 2200), 0.02, 0.2), (R(2900, 3300), 0.015, 0.1)])
        x = A.place(x, k, t)
        x = A.place(x, rattle, t + 0.002)
    if muffled:
        x = A.lowpass(x, 900)
    return x


@sound("knocker.knock", variants=4, volume=1.0, min_d=3, max_d=40, rms_db=-17)
def knocker_knock(i):
    patterns = [[0, 0.34, 0.68], [0, 0.3, 1.05], [0, 0.55, 1.1], [0, 0.22, 0.44, 0.66]]
    x = knock_seq(patterns[i % 4])
    return A.reverb(x, wet=0.18, rt60=0.9, damp=4000)


@sound("knocker.scratch", variants=3, volume=0.9, min_d=2, max_d=24, rms_db=-21)
def knocker_scratch(i):
    dur = R(1.0, 1.5)
    n = int(dur * SR)
    out = np.zeros(n)
    count = int(dur * 180)
    for _ in range(count):
        p = int(A.RNG.integers(0, n - 800))
        g = A.RNG.standard_normal(600) * np.exp(-np.arange(600) / 120.0)
        out[p:p + 600] += g * R(0.3, 1.0)
    body = sum(A.resonator(out, f, 10) / (1 + j) for j, f in enumerate((R(380, 420), R(900, 1000), R(2200, 2600))))
    body *= A.env_adsr(dur, 0.1, 0.2, 0.8, 0.25)
    return A.reverb(body, wet=0.15, rt60=0.8)


@sound("knocker.breath", variants=2, volume=0.8, min_d=2, max_d=16, rms_db=-24)
def knocker_breath(i):
    x = A.silence(4.4)
    t = 0.0
    for k in range(2):
        for d, lvl in ((1.0, 0.7), (1.1, 1.0)):
            b = A.bandpass(A.pink(d), 160, 1400) * A.env_adsr(d, d * 0.5, 0.1, 0.8, d * 0.35) * lvl
            x = A.place(x, A.formants(b, [(300, 1.0), (850, 0.5)], q=4), t)
            t += d
    return A.lowpass(x, 1300)


@sound("knocker.step", variants=3, volume=0.6, min_d=2, max_d=20, rms_db=-24)
def knocker_step(i):
    thump = A.heartbeat_thump(0.25, R(80, 95), 45) * 0.9
    grit = A.crackle(0.15, density=200, lo=800, hi=4000) * 0.3
    return A.place(A.place(A.silence(0.4), thump, 0), grit, 0.01)


@sound("knocker.lunge", variants=1, volume=1.0, min_d=2, max_d=32, rms_db=-16)
def knocker_lunge(i):
    slam = A.wood_knock(0.6, size=1.6, hardness=2.0) * 1.2
    n = int(0.9 * SR)
    snarl = A.formants(A.glottal(np.linspace(85, 65, n), jitter=0.08, shimmer=0.6), [(520, 1.0), (1150, 0.6), (2500, 0.3)], q=5)
    snarl = A.soft_clip(snarl * A.env_adsr(0.9, 0.05, 0.3, 0.6, 0.3) * 2.0, 2.0) * 0.6
    noise = A.bandpass(A.white(0.9), 300, 4000) * A.env_adsr(0.9, 0.05, 0.3, 0.4, 0.3) * 0.25
    x = A.place(A.silence(1.2), slam, 0)
    x = A.place(x, snarl + noise, 0.08)
    return A.reverb(x, wet=0.18, rt60=0.9)


@sound("knocker.hurt", variants=3, volume=0.9, min_d=2, max_d=24, rms_db=-18)
def knocker_hurt(i):
    n = int(0.4 * SR)
    v = A.formants(A.glottal(np.linspace(R(110, 130), 80, n), jitter=0.06, shimmer=0.5), [(560, 1.0), (1200, 0.5)], q=5)
    return A.reverb(A.place(A.silence(0.7), v * A.env_ad(0.4, 0.01, 3), 0), wet=0.15, rt60=0.8)


@sound("knocker.death", variants=1, volume=1.0, min_d=2, max_d=32, rms_db=-19)
def knocker_death(i):
    n = int(2.0 * SR)
    v = A.formants(A.glottal(np.linspace(110, 40, n), jitter=0.07, shimmer=0.5), [(500, 1.0), (1000, 0.4)], q=5)
    x = A.place(A.silence(3.0), v * A.env_adsr(2.0, 0.05, 0.6, 0.6, 1.0), 0)
    x = A.place(x, knock_seq([1.9], size=1.3, muffled=True) * 0.6, 0)
    return A.reverb(x, wet=0.3, rt60=1.6)


@sound("knocker.leave", variants=1, volume=0.7, min_d=4, max_d=40, rms_db=-24)
def knocker_leave(i):
    x = A.silence(4.5)
    t = 0.0
    for k in range(7):
        s = A.distance(knocker_step(0), metres=3 + k * 6)
        drag = A.distance(A.bandpass(A.white(0.35), 300, 2500) * A.env_ad(0.35, 0.05, 3) * 0.25, metres=3 + k * 6)
        x = A.place(x, s * (1 - k * 0.1), t)
        x = A.place(x, drag * (1 - k * 0.1), t + 0.1)
        t += R(0.55, 0.65)
    return A.reverb(x, wet=0.35, rt60=1.8)


@sound("amb.bedtime_knock", variants=2, category="ambient", volume=0.45, min_d=None, max_d=None, rms_db=-28, is3d=False)
def bedtime_knock(i):
    x = knock_seq([0.2, 0.62, 1.04] if i == 0 else [0.2, 0.5, 1.3], size=1.2, muffled=True)
    return A.reverb(x, wet=0.35, rt60=1.4)


# =============================================================================== MIREBOUND
@sound("mirebound.bubble", variants=4, volume=0.6, min_d=2, max_d=24, rms_db=-24)
def mire_bubble(i):
    x = A.silence(1.6)
    for k in range(int(R(3, 7))):
        x = A.place(x, A.bubble(R(140, 420), R(0.08, 0.2), rise=R(1.5, 3.5), decay=R(14, 24)), R(0, 1.0), R(0.4, 1.0))
    plop = A.lowpass(A.white(0.08), 600) * A.env_ad(0.08, 0.003, 8) * 0.4
    x = A.place(x, plop, R(0.8, 1.1))
    return A.reverb(x, wet=0.15, rt60=0.8)


@sound("mirebound.gurgle", variants=3, volume=0.8, min_d=2, max_d=28, rms_db=-21)
def mire_gurgle(i):
    dur = R(1.2, 1.8)
    n = int(dur * SR)
    t = np.arange(n) / SR
    v = A.formants(A.glottal(np.full(n, R(48, 60)), jitter=0.05, shimmer=0.6), [(300, 1.0), (620, 0.6), (1400, 0.15)], q=5)
    v *= (0.55 + 0.45 * np.sin(2 * np.pi * R(6, 9) * t)) * A.env_adsr(dur, 0.2, 0.2, 0.8, 0.4)
    x = A.place(A.silence(dur + 0.4), v, 0)
    for k in range(4):
        x = A.place(x, A.bubble(R(120, 260), 0.15), R(0, dur), 0.4)
    return A.reverb(x, wet=0.2, rt60=1.0)


def splash(dur=0.7, level=1.0):
    burst = A.highpass(A.white(dur), 350) * A.env_ad(dur, 0.004, 7)
    drops = A.silence(dur)
    for k in range(25):
        drops = A.place(drops, A.bubble(R(900, 2600), 0.03, rise=0.5, decay=90) * 0.2, R(0.05, dur * 0.8))
    return (A.lowpass(burst, 5000) + drops) * level


@sound("mirebound.erupt", variants=2, volume=1.0, min_d=2, max_d=32, rms_db=-16)
def mire_erupt(i):
    n = int(1.0 * SR)
    groan = A.formants(A.glottal(np.linspace(75, 60, n), jitter=0.06, shimmer=0.6), [(340, 1.0), (760, 0.5), (1800, 0.15)], q=5)
    x = A.place(A.silence(1.5), splash(0.8, 1.0), 0)
    x = A.place(x, groan * A.env_adsr(1.0, 0.05, 0.3, 0.6, 0.4) * 0.7, 0.05)
    return A.reverb(x, wet=0.15, rt60=0.9)


@sound("mirebound.grab", variants=2, volume=1.0, min_d=2, max_d=24, rms_db=-18)
def mire_grab(i):
    sq = A.formants(A.lowpass(A.white(0.35), 1500), [(300, 1.0), (900, 0.6)], q=5) * A.env_ad(0.35, 0.01, 4)
    tight = A.creak(0.5, rate=(30, 60), body=(200, 480), q=10) * A.env_ad(0.5, 0.05, 3) * 0.35
    x = A.place(A.silence(0.8), sq, 0)
    x = A.place(x, tight, 0.1)
    return A.reverb(x, wet=0.12, rt60=0.8)


@sound("mirebound.release", variants=1, volume=0.9, min_d=2, max_d=24, rms_db=-19)
def mire_release(i):
    return A.reverb(A.place(A.silence(0.9), splash(0.5, 0.8), 0), wet=0.12, rt60=0.8)


@sound("mirebound.hurt", variants=3, volume=0.9, min_d=2, max_d=24, rms_db=-19)
def mire_hurt(i):
    n = int(0.45 * SR)
    v = A.formants(A.glottal(np.linspace(R(90, 110), 70, n), jitter=0.06, shimmer=0.5), [(340, 1.0), (760, 0.5)], q=5)
    x = A.place(A.silence(0.8), v * A.env_ad(0.45, 0.01, 3), 0)
    x = A.place(x, A.bubble(220, 0.15), 0.1, 0.5)
    return A.reverb(x, wet=0.15, rt60=0.8)


@sound("mirebound.death", variants=1, volume=1.0, min_d=2, max_d=32, rms_db=-19)
def mire_death(i):
    n = int(2.2 * SR)
    v = A.formants(A.glottal(np.linspace(80, 35, n), jitter=0.07, shimmer=0.6), [(320, 1.0), (700, 0.4)], q=5)
    x = A.place(A.silence(3.0), v * A.env_adsr(2.2, 0.05, 0.6, 0.6, 1.0), 0)
    for k in range(12):
        x = A.place(x, A.bubble(R(100, 300), 0.2), R(0.8, 2.6), 0.5)
    return A.reverb(x, wet=0.2, rt60=1.2)


# =============================================================================== HEART BELOW
def lubdub(tempo=1.0, level=1.0):
    x = A.silence(1.2 / tempo)
    x = A.place(x, A.heartbeat_thump(0.4, 58, 32), 0.0, level)
    x = A.place(x, A.heartbeat_thump(0.35, 66, 38), 0.27 / tempo, level * 0.7)
    return x


@sound("heart.beat", variants=2, volume=1.0, min_d=6, max_d=64, rms_db=-17)
def heart_beat(i):
    return A.reverb(lubdub(1.0), wet=0.35, rt60=2.8, damp=1500, size=3)


@sound("heart.beat_fast", variants=1, volume=1.0, min_d=6, max_d=64, rms_db=-17)
def heart_beat_fast(i):
    return A.reverb(lubdub(1.6), wet=0.35, rt60=2.4, damp=1500, size=3)


@sound("heart.awaken", variants=1, volume=1.0, min_d=8, max_d=96, rms_db=-17)
def heart_awaken(i):
    dur = 7.0
    x = A.silence(dur + 2)
    rumble = A.sweep_lowpass(A.brown(dur), 50, 500) * np.linspace(0.2, 1.0, int(dur * SR)) ** 1.5
    x = A.place(x, rumble, 0)
    roots = A.creak(dur, rate=(4, 20), body=(85, 170, 340), q=20) * np.linspace(0.1, 0.8, int(dur * SR))
    x = A.place(x, roots * 0.6, 0)
    t, gap = 0.6, 1.3
    while t < dur - 0.4:
        x = A.place(x, lubdub(1.0 + (1.3 - gap)), t, 0.4 + t / dur)
        t += gap
        gap = max(0.45, gap * 0.85)
    boom = A.heartbeat_thump(1.5, 70, 22) * 1.6
    x = A.place(x, boom, dur - 0.2)
    return A.reverb(x, wet=0.4, rt60=3.5, damp=1500, size=3)


@sound("heart.drone", variants=1, volume=0.6, min_d=8, max_d=48, rms_db=-24)
def heart_drone(i):
    dur = 10.0
    t = A.t_axis(dur)
    voices = [(55.0, 1.0), (77.8, 0.6), (82.4, 0.5), (116.5, 0.35)]
    x = np.zeros(len(t))
    for f, a in voices:
        for d in (-0.15, 0.17):
            x += a * A.osc(f + d, dur, "saw")
    x = A.lowpass(x, 520, order=4) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.31 * t))
    return A.fade(x, 1.0, 1.0)


@sound("heart.root_warn", variants=2, volume=1.0, min_d=2, max_d=32, rms_db=-20)
def heart_root_warn(i):
    dur = 1.1
    rum = A.lowpass(A.brown(dur), 240) * A.env_adsr(dur, 0.6, 0.1, 0.9, 0.2)
    grav = A.crackle(dur, density=150, lo=400, hi=2500) * A.env_adsr(dur, 0.5, 0.1, 0.9, 0.2) * 0.5
    return A.reverb(rum + grav, wet=0.3, rt60=1.5)


@sound("heart.root_strike", variants=3, volume=1.0, min_d=2, max_d=32, rms_db=-16)
def heart_root_strike(i):
    burst = A.bandpass(A.white(0.45), 100, 2200) * A.env_ad(0.45, 0.003, 6)
    crack = A.crackle(0.2, density=2000, lo=700, hi=6000, decay=0.002) * 0.6
    thump = A.heartbeat_thump(0.4, 90, 40)
    x = A.place(A.silence(1.0), burst + 0, 0)
    x = A.place(x, crack, 0.0)
    x = A.place(x, thump, 0.0)
    return A.reverb(x, wet=0.25, rt60=1.6)


@sound("heart.pulse", variants=2, volume=1.0, min_d=4, max_d=48, rms_db=-17)
def heart_pulse(i):
    dur = 1.0
    t = A.t_axis(dur)
    f = np.geomspace(140, 38, len(t))
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5)
    whoosh = A.sweep_lowpass(A.white(dur), 4000, 300) * A.env_adsr(dur, 0.05, 0.3, 0.4, 0.5) * 0.3
    return A.reverb(boom + whoosh, wet=0.35, rt60=2.4)


@sound("heart.phase", variants=1, volume=1.0, min_d=8, max_d=96, rms_db=-17)
def heart_phase(i):
    dur = 3.4
    n = int(dur * SR)
    v = A.formants(A.glottal(np.linspace(46, 38, n), jitter=0.05, shimmer=0.5), [(250, 1.0), (520, 0.6), (1100, 0.2)], q=5)
    v *= A.env_adsr(dur, 0.6, 0.6, 0.7, 1.2)
    roots = A.creak(dur, rate=(6, 30), body=(100, 220, 440), q=16) * 0.5
    return A.reverb(v + roots, wet=0.4, rt60=3.2, damp=1500, size=3)


@sound("heart.hurt", variants=3, volume=0.9, min_d=4, max_d=40, rms_db=-19)
def heart_hurt(i):
    x = A.place(A.silence(0.8), A.heartbeat_thump(0.35, 80, 40), 0)
    x = A.place(x, A.crackle(0.25, density=600, lo=500, hi=3500) * 0.5, 0.0)
    return A.reverb(x, wet=0.3, rt60=2.0)


@sound("heart.death", variants=1, volume=1.0, min_d=8, max_d=128, rms_db=-18)
def heart_death(i):
    dur = 8.0
    x = A.silence(dur + 2)
    n = int(4.5 * SR)
    groan = A.formants(A.glottal(np.linspace(55, 24, n), jitter=0.05, shimmer=0.5), [(240, 1.0), (500, 0.5)], q=5)
    x = A.place(x, groan * A.env_adsr(4.5, 0.3, 1.0, 0.6, 2.5), 0)
    t, gap = 0.4, 0.55
    while t < 6.8:
        x = A.place(x, lubdub(1.0), t, max(0.15, 1.0 - t / 7.5))
        t += gap
        gap *= 1.22
    crumble = A.crackle(3.0, density=180, lo=300, hi=3000) * np.linspace(1, 0, int(3.0 * SR)) * 0.5
    x = A.place(x, crumble, 2.0)
    return A.reverb(x, wet=0.45, rt60=4.0, damp=1500, size=3)


@sound("heart.vein_break", variants=2, volume=1.0, min_d=4, max_d=40, rms_db=-18)
def heart_vein_break(i):
    glass = A.bell(R(1500, 1900), 1.2, decay=0.6, detune=4) * 0.5
    crunch = A.crackle(0.3, density=1500, lo=1500, hi=8000, decay=0.002)
    wet = A.lowpass(A.white(0.3), 900) * A.env_ad(0.3, 0.005, 5) * 0.5
    x = A.place(A.silence(1.4), glass, 0)
    x = A.place(x, crunch + wet, 0)
    return A.reverb(x, wet=0.3, rt60=2.0)


@sound("heart.spawn", variants=1, volume=0.9, min_d=4, max_d=32, rms_db=-20)
def heart_spawn(i):
    tear = A.crackle(0.8, density=700, lo=300, hi=2500, decay=0.007) * A.env_adsr(0.8, 0.1, 0.2, 0.6, 0.3)
    return A.reverb(A.place(A.silence(1.2), tear, 0), wet=0.3, rt60=1.6)


# =============================================================================== ITEMS / BLOCKS / UI
@sound("chime.ring", variants=3, category="block", volume=0.8, min_d=4, max_d=32, rms_db=-22)
def chime_ring(i):
    base = [1046.5, 1174.7, 987.8][i]
    x = A.silence(3.2)
    for k, (mult, t) in enumerate(((1.0, 0.0), (1.335, R(0.18, 0.26)), (0.75, R(0.45, 0.6)))):
        x = A.place(x, A.bell(base * mult, 2.6, decay=1.6, detune=0.8), t, 1.0 - k * 0.2)
    return A.reverb(x, wet=0.25, rt60=1.5, damp=7000)


@sound("ward.repel", variants=2, category="block", volume=0.9, min_d=4, max_d=32, rms_db=-21)
def ward_repel(i):
    dur = 1.8
    t = A.t_axis(dur)
    hum = (np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 221.3 * t) + 0.3 * np.sin(2 * np.pi * 330.9 * t))
    hum *= A.env_adsr(dur, 0.3, 0.3, 0.7, 0.9)
    sparkle = A.crackle(dur, density=90, lo=3000, hi=9000) * A.env_adsr(dur, 0.2, 0.3, 0.5, 0.8) * 0.5
    return A.reverb(hum * 0.6 + sparkle, wet=0.3, rt60=1.6)


@sound("ward.place", variants=1, category="block", volume=0.8, min_d=2, max_d=16, rms_db=-22)
def ward_place(i):
    x = A.place(A.silence(0.8), A.wood_knock(0.2, size=0.6), 0)
    x = A.place(x, A.bell(660, 0.6, decay=0.5, detune=1.5) * 0.25, 0.03)
    return x


@sound("ward.spent", variants=1, category="block", volume=0.8, min_d=2, max_d=16, rms_db=-23)
def ward_spent(i):
    dur = 1.4
    t = A.t_axis(dur)
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(220, 70, len(t))) / SR) * np.exp(-t * 2)
    fizz = A.crackle(dur, density=200, lo=2000, hi=8000) * np.linspace(1, 0, len(t)) * 0.6
    return tone * 0.6 + fizz


@sound("lens.use", variants=1, category="player", volume=0.7, min_d=1, max_d=8, rms_db=-24)
def lens_use(i):
    x = A.place(A.silence(1.0), A.modal(0.05, [(3200, 0.01, 1.0), (5100, 0.008, 0.5)]), 0)
    x = A.place(x, A.bell(2093, 0.9, decay=0.35, detune=3) * 0.4, 0.04)
    return x


@sound("journal.open", variants=2, category="ui", volume=0.8, min_d=None, max_d=None, rms_db=-24, is3d=False)
def journal_open(i):
    dur = 0.45
    swish = A.bandpass(A.white(dur), 1800, 8000) * A.env_adsr(dur, 0.08, 0.1, 0.5, 0.2)
    flick = A.crackle(dur, density=120, lo=2500, hi=9000) * A.env_ad(dur, 0.05, 4) * 0.5
    return A.place(A.silence(0.6), swish + flick, 0)


@sound("journal.entry", variants=1, category="ui", volume=0.8, min_d=None, max_d=None, rms_db=-24, is3d=False)
def journal_entry(i):
    dur = 0.9
    pencil = A.crackle(dur, density=900, lo=2500, hi=8000, decay=0.001) * A.env_adsr(dur, 0.05, 0.1, 0.7, 0.2) * 0.6
    x = A.place(A.silence(1.8), pencil, 0)
    x = A.place(x, A.bell(784, 0.8, decay=0.6, detune=1.0) * 0.35, 0.95)
    return x


@sound("heartseeker.pulse", variants=1, category="player", volume=0.8, min_d=1, max_d=8, rms_db=-23)
def heartseeker_pulse(i):
    x = A.place(A.silence(1.2), lubdub(1.0, 0.8), 0)
    x = A.place(x, A.bell(440, 0.7, decay=0.5, detune=1.0) * 0.25, 0.05)
    return A.lowpass(x, 3000)


@sound("altar.insert", variants=1, category="block", volume=1.0, min_d=4, max_d=48, rms_db=-19)
def altar_insert(i):
    dur = 2.4
    grind = A.lowpass(A.brown(dur), 500) * A.env_adsr(dur, 0.2, 0.4, 0.6, 0.8)
    t = A.t_axis(dur)
    tone = np.sin(2 * np.pi * 55 * t) * A.env_adsr(dur, 0.8, 0.3, 0.8, 1.0) * 0.6
    return A.reverb(grind + tone, wet=0.4, rt60=2.6)


@sound("stinger.low", variants=2, category="ambient", volume=0.8, min_d=None, max_d=None, rms_db=-22, is3d=False)
def stinger_low(i):
    """Short, restrained encounter accent: a low swell, never a scream."""
    dur = 2.2
    t = A.t_axis(dur)
    swell = A.sweep_lowpass(sum(A.osc(f, dur, "saw") for f in (65.4, 69.3, 98.0)), 120, 900) * A.env_adsr(dur, 0.35, 0.3, 0.6, 1.2)
    thump = A.heartbeat_thump(0.5, 70, 32)
    x = A.place(A.silence(dur), swell * 0.4, 0)
    x = A.place(x, thump, 0.3)
    return A.reverb(x, wet=0.3, rt60=2.0)


@sound("stinger.distant", variants=2, category="ambient", volume=0.6, min_d=None, max_d=None, rms_db=-26, is3d=False)
def stinger_distant(i):
    dur = 3.2
    t = A.t_axis(dur)
    pair = [(1318.5, 1396.9), (1174.7, 1244.5)][i]
    glass = sum(np.sin(2 * np.pi * f * t) for f in pair) * A.env_adsr(dur, 1.2, 0.4, 0.6, 1.4)
    return A.reverb(glass * 0.4, wet=0.5, rt60=2.8)


# ================================================================================== build
def spectro_sheet(items, path):
    from PIL import Image, ImageDraw
    from scipy import signal as S
    tiles = []
    for name, x in items:
        f, tt, Sxx = S.spectrogram(x, SR, nperseg=1024, noverlap=768)
        Sdb = 10 * np.log10(Sxx + 1e-12)
        Sdb = np.clip((Sdb + 110) / 90, 0, 1)
        img = (Sdb[::-1] * 255).astype(np.uint8)
        im = Image.fromarray(img).resize((260, 120))
        canvas = Image.new("RGB", (260, 136), (0, 0, 0))
        canvas.paste(im.convert("RGB"), (0, 16))
        pk = 20 * np.log10(np.max(np.abs(x)) + 1e-9)
        rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
        ImageDraw.Draw(canvas).text((2, 2), f"{name[:26]} {len(x)/SR:.1f}s pk{pk:.0f} rms{rms:.0f}", fill=(230, 230, 230))
        tiles.append(canvas)
    cols = 5
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 262, rows * 138), (20, 20, 20))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 262, (i // cols) * 138))
    sheet.save(path)


def main(only=None):
    out_dir = os.path.join(RP, "sounds", "hollow")
    defs = {}
    review = []
    total = 0
    for k, s in enumerate(REGISTRY):
        if only and not s["event"].startswith(only):
            continue
        group, name = s["event"].split(".", 1) if s["event"].count(".") >= 1 else ("misc", s["event"])
        entries = []
        for v in range(s["variants"]):
            A.seed(1000 + k * 37 + v)
            x = s["fn"](v)
            rel = f"sounds/hollow/{group}/{name.replace('.', '_')}_{v + 1}"
            path = os.path.join(RP, rel + ".ogg")
            from hollowkit.audio import normalize
            xn = normalize(x, s["peak_db"], s["rms_db"])
            A.write_ogg(x, path, quality=s["quality"], peak_db=s["peak_db"], rms_db=s["rms_db"])
            total += os.path.getsize(path)
            review.append((f"{s['event']}#{v + 1}", xn))
            e = {"name": rel, "volume": round(s["volume"], 3)}
            if not s["is3d"]:
                e["is3D"] = False
            entries.append(e)
        d = {"category": s["category"], "sounds": entries}
        if s["min_d"] is not None:
            d["min_distance"] = float(s["min_d"])
        if s["max_d"] is not None:
            d["max_distance"] = float(s["max_d"])
        defs["hollow." + s["event"]] = d
    if not only:
        with open(os.path.join(RP, "sounds", "sound_definitions.json"), "w") as f:
            json.dump({"format_version": "1.20.20", "sound_definitions": defs}, f, indent=2)
        ensure(os.path.join(BUILD, "previews"))
        for i in range(0, len(review), 40):
            spectro_sheet(review[i:i + 40], os.path.join(BUILD, "previews", f"sounds_{i // 40 + 1}.png"))
    print(f"{len(review)} sound files, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
