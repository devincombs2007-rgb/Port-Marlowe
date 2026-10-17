"""Procedural sound set for THE GAUNT (Batch C). Heavy, wet, close-to-the-ground. Original synthesis."""
import numpy as np
from dsp import *  # noqa: F401,F403
from lurker import _thump, _breath


def step(r):
    out = np.zeros(int(0.6 * SR))
    place(out, _thump(r, 85, 34, 0.14, 0.45) * 1.0, 0.0)
    place(out, lowpass(white(r, 0.2), 900) * env_exp(int(0.2 * SR), 0.05, 0.001) * 0.5, 0.0)
    for k in range(3):  # claws
        place(out, click(r, 0.03, 1500 + 1500 * r.random(), 7, 0.005) * (0.35 + 0.3 * r.random()), 0.02 + k * 0.03 + 0.01 * r.random())
    return out


def breath(r):
    dur = 3.6
    b = _breath(r, dur, (0.1, 1.2), (1.4, 3.4), pitch_shift=0.62 + 0.08 * r.random(), rattle=0.55)
    n = len(b)
    growl = glottal(r, dur, [(0, 48), (dur, 44)], jitter=0.1, shimmer=0.5)
    growl = lowpass(formant_filter(growl, [(300, 1.0), (700, 0.5)], 0.15), 900)
    growl *= env_points(n, [(0, 0), (1.4, 0), (1.7, 1), (3.0, 0.6), (dur, 0)]) * 0.25
    return b + growl[:n]


def sniff(r):
    out = np.zeros(int(1.3 * SR))
    t = 0.0
    for k in range(int(r.integers(3, 6))):
        d = 0.07 + 0.04 * r.random()
        s = swept_bandpass(highpass(white(r, d), 1200), 1600, 5200, width=0.8, steps=8) * env_points(int(d * SR), [(0, 0), (d * 0.3, 1), (d, 0)])
        place(out, s * (0.7 + 0.3 * r.random()), t)
        t += d + 0.04 + 0.05 * r.random()
    ex = formant_filter(pink(r, 0.4), [(400, 1.0), (1100, 0.6)], 0.2) * env_points(int(0.4 * SR), [(0, 0), (0.05, 1), (0.4, 0)])
    place(out, ex * 0.6, t + 0.1)
    return out


def vocal(r):
    dur = 2.4
    n = int(dur * SR)
    v = glottal(r, dur, [(0, 72), (0.4, 80), (1.6, 62), (dur, 50)], jitter=0.12, shimmer=0.5)
    sub = np.sin(2 * np.pi * np.cumsum(env_points(n, [(0, 36), (dur, 25)]) / SR)) * 0.5
    v = softclip(v * 2.0 + sub, 2.5)
    v = formant_filter(v, [(380, 1.0), (850, 0.8), (1900, 0.45)], 0.12)
    rasp = formant_filter(white(r, dur), [(500, 0.6), (1400, 0.7), (2800, 0.3)], 0.25) * (0.5 + 0.5 * smooth_random(r, n, 30))
    return (0.8 * v + 0.6 * rasp) * env_points(n, [(0, 0), (0.12, 1), (1.6, 0.8), (dur, 0)])


def attack(r):
    out = np.zeros(int(0.7 * SR))
    w = swept_bandpass(white(r, 0.35), 400, 2600, width=1.0) * env_points(int(0.35 * SR), [(0, 0), (0.12, 1), (0.35, 0)])
    place(out, w * 0.8, 0.0)
    place(out, click(r, 0.05, 820, 5, 0.012) * 0.9, 0.26)  # jaws
    place(out, click(r, 0.05, 1100, 5, 0.010) * 0.7, 0.275)
    place(out, _thump(r, 120, 60, 0.05, 0.2) * 0.5, 0.26)
    return out


def hurt(r):
    dur = 0.8
    n = int(dur * SR)
    v = glottal(r, dur, [(0, 140), (0.15, 160), (dur, 70)], jitter=0.1, shimmer=0.4)
    v = formant_filter(softclip(v * 1.5, 2), [(450, 1.0), (1000, 0.7), (2100, 0.3)], 0.12)
    return (v + 0.5 * formant_filter(pink(r, dur), [(500, 1.0), (1300, 0.6)], 0.2)) * env_points(n, [(0, 0), (0.04, 1), (dur, 0)])


def death(r):
    dur = 3.0
    n = int(dur * SR)
    v = glottal(r, dur, [(0, 90), (1.0, 60), (dur, 30)], jitter=0.15, shimmer=0.6)
    v = formant_filter(v, [(350, 1.0), (800, 0.6)], 0.15)
    rattle = (np.sin(2 * np.pi * 22 * np.arange(n) / SR) > 0.3).astype(float) * env_points(n, [(0, 0), (1.2, 0), (2.0, 1), (dur, 0)])
    out = v * env_points(n, [(0, 0), (0.1, 1), (2.2, 0.5), (dur, 0)]) * (1 - 0.6 * rattle)
    place(out, _thump(r, 70, 30, 0.2, 0.6) * 0.8, 2.3)
    return out


def burrow(r):
    dur = 1.8
    n = int(dur * SR)
    out = lowpass(pink(r, dur), 700) * env_points(n, [(0, 0), (0.2, 1), (1.4, 0.8), (dur, 0)]) * 0.6
    t = 0.0
    while t < dur - 0.1:
        place(out, lowpass(white(r, 0.05), 1800) * env_exp(int(0.05 * SR), 0.015, 0.001) * (0.3 + 0.5 * r.random()), t)
        t += 0.02 + 0.08 * r.random()
    rumble = np.sin(2 * np.pi * np.cumsum(env_points(n, [(0, 50), (dur, 35)]) / SR)) * env_points(n, [(0, 0), (0.3, 0.6), (dur, 0)])
    return out + rumble * 0.5


def claw_scrape(r):
    dur = 1.6 + 0.6 * r.random()
    n = int(dur * SR)
    base = swept_bandpass(highpass(white(r, dur), 2000), 2600, 4200 + 1000 * r.random(), width=0.5)
    ph = np.cumsum((18 + 14 * smooth_random(r, n, 5)) / SR)
    slip = 0.25 + 0.75 * (np.abs(np.sin(np.pi * ph)) ** 2)
    return base * slip * env_points(n, [(0, 0), (0.2, 1), (dur * 0.8, 0.8), (dur, 0)])


SOUNDS = {
    "step": (step, 5, dict(volume=0.9, max_distance=32, min_distance=2)),
    "breath": (breath, 3, dict(volume=0.7, max_distance=20, min_distance=1)),
    "sniff": (sniff, 4, dict(volume=0.8, max_distance=24, min_distance=1)),
    "vocal": (vocal, 3, dict(volume=1.0, max_distance=56, min_distance=4)),
    "attack": (attack, 3, dict(volume=0.9, max_distance=24, min_distance=2)),
    "hurt": (hurt, 3, dict(volume=0.9, max_distance=28, min_distance=2)),
    "death": (death, 2, dict(volume=0.9, max_distance=32, min_distance=3)),
    "burrow": (burrow, 3, dict(volume=0.9, max_distance=28, min_distance=2)),
    "claw_scrape": (claw_scrape, 3, dict(volume=0.7, max_distance=28, min_distance=2)),
}
