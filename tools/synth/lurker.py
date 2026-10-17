"""Procedural sound set for THE LURKER (Batch A). Original synthesis; see docs/AUDIO_LICENSES.md.

Each generator takes a numpy Generator `r` (seeded per variation) and returns a mono float array.
Design intent: breathy, dry, wood-and-bone undertones, human-adjacent but wrong. Not a growl.
"""
import numpy as np
from dsp import *  # noqa: F401,F403


def _breath(r, dur, inhale, exhale, pitch_shift=1.0, rattle=0.25, hold=0.15):
    n = int(dur * SR)
    out = np.zeros(n)
    src = pink(r, dur + 0.5)[:n]
    # inhale: rising, airy, through a narrow throat
    ti = inhale[1] - inhale[0]
    seg = slice(int(inhale[0] * SR), int(inhale[1] * SR))
    x = src[seg]
    x = swept_bandpass(x, 700 * pitch_shift, 2400 * pitch_shift, width=0.9)
    x = resonator(x, 950 * pitch_shift, 7) * 0.8 + x
    x *= env_points(len(x), [(0, 0), (ti * 0.55, 1), (ti * 0.85, 0.7), (ti, hold)])
    out[seg] += x * 0.9
    # exhale: darker, longer, with a dry rattle in the tail
    te = exhale[1] - exhale[0]
    seg = slice(int(exhale[0] * SR), int(exhale[1] * SR))
    y = src[::-1][seg] if False else pink(r, te + 0.1)[: seg.stop - seg.start]
    y = formant_filter(y, [(480 * pitch_shift, 1.0), (1350 * pitch_shift, 0.8), (2300, 0.35)], 0.14)
    e = env_points(len(y), [(0, 0), (te * 0.12, 1), (te * 0.6, 0.6), (te, 0)])
    tail = env_points(len(y), [(0, 0), (te * 0.55, 0), (te * 0.8, 1), (te, 0)])
    gate = (np.sin(2 * np.pi * (30 + 14 * smooth_random(r, len(y), 6)) * np.arange(len(y)) / SR + r.random() * 6) > 0.1).astype(float)
    y = y * e * (1 - rattle * tail + rattle * tail * gate)
    whistle = np.sin(2 * np.pi * np.cumsum((1800 + 250 * smooth_random(r, len(y), 3)) / SR)) * 0.02 * tail * e
    out[seg] += y + whistle
    return out


def breath_idle(r):
    return _breath(r, 4.6, (0.15, 1.5), (1.9, 4.2), pitch_shift=0.9 + 0.2 * r.random(), rattle=0.35)


def breath_alert(r):
    d = 2.6
    a = _breath(r, d, (0.05, 0.6), (0.75, 1.4), pitch_shift=1.15, rattle=0.15, hold=0.5)
    b = _breath(r, d, (0.05, 0.5), (0.6, 1.1), pitch_shift=1.2, rattle=0.1, hold=0.5)
    out = np.zeros(int(d * SR))
    place(out, a[: int(1.5 * SR)], 0.0)
    place(out, b[: int(1.2 * SR)], 1.25)
    return out


def _thump(r, f0, f1, decay, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / (decay * 0.5))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, decay, 0.002)


def step(r):
    out = np.zeros(int(0.7 * SR))
    heavy = 0.8 + 0.4 * r.random()
    place(out, _thump(r, 120, 42, 0.11, 0.4) * heavy, 0.02)
    for k in range(r.integers(6, 12)):  # dirt/leaf grains
        g = lowpass(white(r, 0.03), 1800 + 1500 * r.random()) * env_exp(int(0.03 * SR), 0.01, 0.0005)
        place(out, g * (0.15 + 0.25 * r.random()), 0.02 + r.random() * 0.22)
    place(out, click(r, 0.03, 2200 + 800 * r.random(), 8, 0.006) * 0.25, 0.10 + r.random() * 0.1)  # bone tick
    return out


def step_stalk(r):
    out = np.zeros(int(0.55 * SR))
    place(out, _thump(r, 90, 55, 0.07, 0.3) * 0.12, 0.02)
    for k in range(r.integers(4, 8)):
        g = lowpass(white(r, 0.02), 2500) * env_exp(int(0.02 * SR), 0.006, 0.0005)
        place(out, g * (0.08 + 0.1 * r.random()), 0.02 + r.random() * 0.2)
    if r.random() < 0.7:  # a single twig
        place(out, click(r, 0.04, 3500 + 1500 * r.random(), 10, 0.008) * 0.55, 0.12 + r.random() * 0.2)
        place(out, click(r, 0.03, 4800, 10, 0.005) * 0.3, 0.145 + r.random() * 0.2)
    return out


def joint_creak(r):
    return creak(r, 0.5 + 0.6 * r.random(), base=300 + 400 * r.random(), pulse_hz=(14 + 8 * r.random(), 50 + 30 * r.random()))


def head_turn(r):
    dur = 1.0
    out = np.zeros(int(dur * SR))
    k = int(r.integers(6, 10))
    times = np.cumsum(0.05 + np.linspace(0.02, 0.14, k) * (0.7 + 0.6 * r.random(k))) - 0.03
    for ti in times:
        place(out, click(r, 0.03, 1400 + 2200 * r.random(), 7, 0.006) * (0.4 + 0.6 * r.random()), float(ti))
    place(out, creak(r, 0.8, base=260 + 120 * r.random(), pulse_hz=(10, 28)) * 0.35, 0.0)
    return out


def notice(r):
    dur = 1.0
    n = int(dur * SR)
    hiss = highpass(white(r, dur), 2500)
    hiss = swept_bandpass(hiss, 3000, 8500, width=0.7)
    hiss *= env_points(n, [(0, 0), (0.06, 1), (0.42, 0.85), (0.47, 0)])
    throat = resonator(pink(r, dur), 320, 6) * env_points(n, [(0, 0), (0.1, 0.6), (0.4, 0.3), (0.47, 0)]) * 0.5
    return hiss + throat


def vanish(r):
    dur = 1.6
    n = int(dur * SR)
    air = lowpass(pink(r, dur), 500 + 250 * r.random()) * env_points(n, [(0, 0), (0.04, 1), (0.5, 0.35), (1.3, 0)])
    sub = _thump(r, 95, 38, 0.35, dur) * 0.7
    out = air + sub
    c = np.zeros(n)
    place(c, click(r, 0.05, 2300, 5, 0.012) * 1.0, 0.22)
    place(c, lowpass(white(r, 0.06), 3500) * env_exp(int(0.06 * SR), 0.015, 0.0005) * 0.35, 0.22)
    return out + c * 0.9


def scrape(r):
    dur = 2.2 + 0.8 * r.random()
    n = int(dur * SR)
    base = highpass(white(r, dur), 1400)
    base = swept_bandpass(base, 1800, 3200 + 600 * r.random(), width=0.8)
    rate = 24 + 18 * smooth_random(r, n, 3)
    ph = np.cumsum(rate / SR)
    slip = 0.35 + 0.65 * (np.abs(np.sin(np.pi * ph)) ** 1.5) * (0.6 + 0.4 * smooth_random(r, n, 25))
    bark = lowpass(white(r, dur), 700) * 0.25
    env = env_points(n, [(0, 0), (dur * 0.2, 1), (dur * 0.75, 0.9), (dur, 0)]) * (0.5 + 0.5 * smooth_random(r, n, 2.5))
    return (base * slip + bark * slip) * env


def hurt(r):
    dur = 1.1
    n = int(dur * SR)
    v = glottal(r, dur, [(0, 150 + 30 * r.random()), (0.25, 120), (dur, 62)], jitter=0.06, shimmer=0.3)
    v = formant_filter(v, [(520, 1.0), (1500, 0.7), (2500, 0.4)], 0.1)
    breath = formant_filter(pink(r, dur), [(600, 1.0), (1700, 0.9), (3000, 0.4)], 0.2)
    mix = 0.45 * v + 0.9 * breath
    mix = resonator(mix, 1250, 9) * 0.6 + mix  # strangled pinch
    return mix * env_points(n, [(0, 0), (0.05, 1), (0.35, 0.7), (dur, 0)])


def death(r):
    dur = 3.2
    n = int(dur * SR)
    v = glottal(r, 1.8, [(0, 95), (1.8, 48)], jitter=0.08, shimmer=0.35)
    v = formant_filter(v, [(450, 1.0), (1200, 0.7), (2200, 0.3)], 0.1)
    b = formant_filter(pink(r, 1.8), [(500, 1.0), (1400, 0.8)], 0.18)
    ex = (0.35 * v + b) * env_points(int(1.8 * SR), [(0, 0), (0.1, 1), (1.0, 0.55), (1.8, 0)])
    out = np.zeros(n)
    place(out, ex, 0.0)
    t = 0.9
    while t < dur - 0.2:  # dry sticks collapsing, decreasing density
        f = 1100 + 2600 * r.random()
        place(out, click(r, 0.04, f, 12, 0.007) * (0.8 * np.exp(-(t - 0.9) / 1.0)), t)
        t += 0.02 + (t - 0.9) * 0.09 * (0.5 + r.random())
    return out


def attack_swipe(r):
    dur = 0.5
    n = int(dur * SR)
    w = swept_bandpass(white(r, dur), 500, 4200, width=0.9) * env_points(n, [(0, 0), (0.1, 1), (0.2, 0.5), (0.4, 0)])
    out = w
    place(out, click(r, 0.03, 2800, 6, 0.006) * 0.8, 0.17)
    return out


def attack_hit(r):
    out = np.zeros(int(0.5 * SR))
    place(out, _thump(r, 110, 45, 0.09, 0.4) * 1.0, 0.0)
    place(out, lowpass(white(r, 0.12), 1200) * env_exp(int(0.12 * SR), 0.04, 0.0005) * 0.8, 0.0)
    for k in range(int(r.integers(3, 5))):
        place(out, click(r, 0.03, 1700 + 1400 * r.random(), 9, 0.007) * (0.35 + 0.35 * r.random()), 0.015 + k * 0.012 + r.random() * 0.01)
    return out


def chase_vocal(r):
    dur = 1.7
    n = int(dur * SR)
    inh = swept_bandpass(pink(r, 0.5), 800, 2800, width=1.0) * env_points(int(0.5 * SR), [(0, 0), (0.3, 1), (0.5, 0.2)])
    v = glottal(r, 1.2, [(0, 110), (0.25, 105), (1.2, 62)], jitter=0.07, shimmer=0.35)
    v = softclip(v * 1.5, 3.0)
    v = formant_filter(v, [(600, 1.0), (1150, 0.8), (2300, 0.5)], 0.1)
    rasp = formant_filter(white(r, 1.2), [(700, 0.6), (1800, 0.9), (3200, 0.5)], 0.2)
    am = 0.55 + 0.45 * np.sin(2 * np.pi * (27 + 8 * r.random()) * np.arange(int(1.2 * SR)) / SR)
    snarl = (0.7 * v + 0.9 * rasp) * am * env_points(int(1.2 * SR), [(0, 0), (0.05, 1), (0.8, 0.75), (1.2, 0)])
    out = np.zeros(n)
    place(out, inh, 0.0)
    place(out, snarl, 0.42)
    return out


# name, generator, variations, positional definition params
SOUNDS = {
    "breath_idle": (breath_idle, 4, dict(volume=0.45, max_distance=18, min_distance=1)),
    "breath_alert": (breath_alert, 3, dict(volume=0.6, max_distance=20, min_distance=1)),
    "step": (step, 6, dict(volume=0.8, max_distance=28, min_distance=2)),
    "step_stalk": (step_stalk, 6, dict(volume=0.5, max_distance=12, min_distance=1)),
    "joint_creak": (joint_creak, 4, dict(volume=0.6, max_distance=18, min_distance=1)),
    "head_turn": (head_turn, 3, dict(volume=0.7, max_distance=20, min_distance=1)),
    "notice": (notice, 3, dict(volume=0.9, max_distance=32, min_distance=3)),
    "vanish": (vanish, 3, dict(volume=0.8, max_distance=28, min_distance=2)),
    "scrape": (scrape, 3, dict(volume=0.65, max_distance=24, min_distance=2)),
    "hurt": (hurt, 3, dict(volume=0.9, max_distance=28, min_distance=2)),
    "death": (death, 2, dict(volume=0.9, max_distance=32, min_distance=3)),
    "attack_swipe": (attack_swipe, 3, dict(volume=0.8, max_distance=24, min_distance=2)),
    "attack_hit": (attack_hit, 3, dict(volume=0.9, max_distance=24, min_distance=2)),
    "chase_vocal": (chase_vocal, 3, dict(volume=1.0, max_distance=40, min_distance=3)),
}
