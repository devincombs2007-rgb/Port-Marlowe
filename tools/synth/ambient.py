"""Procedural ambient/one-shot sound set (Batch B). Original synthesis; see docs/AUDIO_LICENSES.md.

These are the world's anomalies: things that are *almost* ordinary. Dry mono, positional, used by the Horror Director.
"""
import numpy as np
from dsp import *  # noqa: F401,F403
from lurker import _thump


def branch_snap(r):
    out = np.zeros(int(0.6 * SR))
    place(out, click(r, 0.06, 1800 + 1200 * r.random(), 3.0, 0.006) * 1.0, 0.0)
    for k in range(int(r.integers(3, 7))):
        place(out, click(r, 0.03, 1200 + 3200 * r.random(), 6, 0.004) * (0.25 + 0.4 * r.random()), 0.004 + r.random() * 0.07)
    place(out, _thump(r, 300, 160, 0.03, 0.15) * 0.45, 0.0)
    place(out, lowpass(white(r, 0.3), 1400) * env_exp(int(0.3 * SR), 0.09, 0.001) * 0.12, 0.01)
    return out


def leaves_rustle(r):
    dur = 1.7 + 0.8 * r.random()
    n = int(dur * SR)
    x = np.zeros(n)
    t = 0.0
    while t < dur - 0.03:  # granular crinkle
        g = int(0.004 + 0.02 * r.random() * SR)
        grain = bandpass(white(r, g / SR + 0.001)[:g], 2200 + 3000 * r.random(), 7000 + 2000 * r.random()) * np.hanning(g)
        place(x, grain * (0.4 + 0.6 * r.random()), t)
        t += 0.004 + 0.03 * r.random() * (1.4 - np.sin(np.pi * t / dur))
    x += 0.2 * lowpass(pink(r, dur), 900)
    return x * env_points(n, [(0, 0), (dur * 0.25, 1), (dur * 0.6, 0.7), (dur, 0)])


def door_creak(r):
    dur = 1.9 + 0.5 * r.random()
    n = int(dur * SR)
    base = 230 + 140 * r.random()
    c = creak(r, dur, base=base, pulse_hz=(5 + 3 * r.random(), 22 + 10 * r.random()), q=32)
    glide = swept_bandpass(white(r, dur), base * 1.6, base * 2.6, width=0.25) * 0.15
    out = c + glide * env_points(n, [(0, 0), (dur * 0.2, 1), (dur * 0.85, 0.6), (dur, 0)])
    place(out, click(r, 0.04, 900, 6, 0.008) * 0.5, 0.0)       # latch
    place(out, _thump(r, 150, 70, 0.05, 0.25) * 0.3, dur - 0.1)  # frame knock at the end
    return out


def structure_groan(r):
    dur = 3.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = env_points(n, [(0, 62), (dur * 0.5, 54 + 6 * r.random()), (dur, 47)])
    ph = np.cumsum(f / SR)
    saw = 2 * (ph % 1) - 1
    body = lowpass(saw, 220, 4) * 0.8
    body += 0.5 * resonator(creak(r, dur, base=95 + 40 * r.random(), pulse_hz=(4, 12), q=18), 130, 12)
    body += 0.15 * lowpass(pink(r, dur), 300)
    return body * env_points(n, [(0, 0), (0.7, 1), (dur * 0.65, 0.8), (dur, 0)]) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.9 * t))


def drag(r):
    dur = 3.2
    n = int(dur * SR)
    stop = dur * (0.72 + 0.1 * r.random())
    stroke = 0.5 + 0.25 * r.random()  # strokes per second ~ heave and slide
    t = np.arange(n) / SR
    body = bandpass(white(r, dur), 180, 1600, 2) + 0.4 * lowpass(pink(r, dur), 400)
    mod = 0.35 + 0.65 * np.abs(np.sin(np.pi * stroke * 2 * t)) ** 1.6
    mod *= 0.7 + 0.3 * smooth_random(r, n, 14)
    out = body * mod * env_points(n, [(0, 0), (0.25, 1), (stop - 0.02, 1), (stop, 0), (dur, 0)])
    for k in range(int(r.integers(3, 8))):
        place(out, click(r, 0.02, 600 + 1400 * r.random(), 5, 0.005) * 0.3, r.random() * stop)  # pebbles
    return out


def _voice(r, dur, f_lo, f_hi, level):
    n = int(dur * SR)
    breath = pink(r, dur)
    # vowel-like drifting formants with syllable-rate amplitude, no words and no pitch
    v = np.zeros(n)
    form = [(450 + 500 * r.random(), 1.0), (1000 + 1200 * r.random(), 0.7), (2300 + 800 * r.random(), 0.3)]
    for f, g in form:
        v += g * swept_bandpass(breath, f * (0.8 + 0.2 * r.random()), f * (1.0 + 0.5 * r.random()), width=0.25, steps=10)
    syl = np.zeros(n)
    t = 0.0
    while t < dur:
        d = 0.09 + 0.16 * r.random()
        e = env_points(n, [(t, 0), (t + d * 0.3, 0.6 + 0.4 * r.random()), (t + d, 0)])
        syl = np.maximum(syl, e)
        if r.random() < 0.35:  # a sibilant
            s = highpass(white(r, d), 4500) * env_points(int(d * SR), [(0, 0), (d * 0.4, 1), (d, 0)]) * 0.35
            place(v, s, t + d)
        t += d + 0.03 + 0.2 * r.random()
    return v * syl * level


def murmur(r):
    dur = 3.6
    out = np.zeros(int(dur * SR))
    for k in range(int(r.integers(2, 4))):
        v = _voice(r, dur - 0.4, 400, 900, 0.5 + 0.5 * r.random())
        place(out, v, 0.1 + 0.4 * r.random())
    out = lowpass(out, 4200 - 1000 * r.random(), 2)  # distance
    return out * env_points(len(out), [(0, 0), (0.6, 1), (dur - 0.8, 0.8), (dur, 0)])


def distant_cry(r):
    dur = 3.2
    n = int(dur * SR)
    f0 = env_points(n, [(0, 330), (0.5, 520 + 80 * r.random()), (1.6, 460), (dur, 300)])
    vib = 1 + 0.03 * np.sin(2 * np.pi * (5.5 + r.random()) * np.arange(n) / SR)
    ph = np.cumsum(f0 * vib / SR)
    src = (2 * (ph % 1) - 1) * 0.6 + 0.4 * np.sin(2 * np.pi * ph)
    src += 0.35 * white(r, dur)
    v = formant_filter(src, [(720, 1.0), (1150, 0.8), (2800, 0.25)], 0.12)
    v = lowpass(v, 2600, 2) * env_points(n, [(0, 0), (0.25, 1), (1.8, 0.7), (dur, 0)])
    return v


def heartbeat(r):
    out = np.zeros(int(0.9 * SR))
    place(out, _thump(r, 70, 38, 0.09, 0.35) * 1.0, 0.0)
    place(out, _thump(r, 62, 34, 0.08, 0.3) * 0.65, 0.26)
    return lowpass(out, 220, 3) + 0.05 * lowpass(white(r, 0.9), 120) * env_exp(int(0.9 * SR), 0.2)


def pressure_drop(r):
    dur = 3.0
    n = int(dur * SR)
    out = _thump(r, 80, 30, 0.45, dur) * 1.0
    tone = np.sin(2 * np.pi * np.cumsum(env_points(n, [(0, 52), (dur, 58)]) / SR)) * env_points(n, [(0, 0), (0.35, 0), (0.6, 0.45), (2.2, 0.3), (dur, 0)])
    rev = lowpass(pink(r, dur), 500) * env_points(n, [(0, 0.5), (0.3, 0)])
    return out + tone + rev * 0.5


def footsteps_far(r):
    """A short run of distant, unhurried footsteps on dirt: someone, somewhere, walking."""
    out = np.zeros(int(3.0 * SR))
    t = 0.05
    gap = 0.55 + 0.15 * r.random()
    for k in range(int(r.integers(4, 7))):
        step_ = np.zeros(int(0.3 * SR))
        place(step_, _thump(r, 110, 50, 0.05, 0.2) * 0.8, 0.0)
        place(step_, lowpass(white(r, 0.12), 1500) * env_exp(int(0.12 * SR), 0.03, 0.001) * 0.5, 0.0)
        place(out, step_, t)
        t += gap * (0.9 + 0.2 * r.random())
    return lowpass(out, 1800, 2)


SOUNDS = {
    "branch_snap": (branch_snap, 5, dict(volume=0.9, max_distance=48, min_distance=2)),
    "leaves_rustle": (leaves_rustle, 4, dict(volume=0.7, max_distance=40, min_distance=2)),
    "door_creak": (door_creak, 3, dict(volume=0.8, max_distance=40, min_distance=2)),
    "structure_groan": (structure_groan, 3, dict(volume=0.8, max_distance=56, min_distance=3)),
    "drag": (drag, 3, dict(volume=0.8, max_distance=40, min_distance=2)),
    "murmur": (murmur, 4, dict(volume=0.55, max_distance=36, min_distance=2)),
    "distant_cry": (distant_cry, 3, dict(volume=0.5, max_distance=64, min_distance=6)),
    "heartbeat": (heartbeat, 3, dict(volume=0.9, max_distance=16, min_distance=1)),
    "pressure_drop": (pressure_drop, 2, dict(volume=0.85, max_distance=16, min_distance=1)),
    "footsteps_far": (footsteps_far, 4, dict(volume=0.6, max_distance=40, min_distance=3)),
}
