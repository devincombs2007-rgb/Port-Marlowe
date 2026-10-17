"""Procedural sound set for THE MIMIC (Batch D). Its imitations are *near* misses of familiar farm and household
sounds, made from scratch (nothing sampled from Minecraft): close enough to make you go and check."""
import numpy as np
from dsp import *  # noqa: F401,F403
from lurker import _thump
from ambient import door_creak


def moo(r):
    """A cow, almost: held too long, sliding down in pitch, ending in a human-sounding exhale."""
    dur = 2.6
    n = int(dur * SR)
    f0 = env_points(n, [(0, 118), (0.25, 132), (1.4, 112), (2.0, 84), (dur, 70)])
    ph = np.cumsum(f0 / SR)
    src = (2 * (ph % 1) - 1) * 0.7 + 0.3 * white(r, dur) * 0.2
    v = formant_filter(src, [(520, 1.0), (850, 0.7), (2400, 0.18)], 0.1)
    v = lowpass(v, 3000) * env_points(n, [(0, 0), (0.12, 1), (1.6, 0.85), (2.0, 0.4), (2.2, 0), (dur, 0)])
    ex = formant_filter(pink(r, 0.7), [(600, 1.0), (1500, 0.7)], 0.2) * env_points(int(0.7 * SR), [(0, 0), (0.1, 1), (0.7, 0)])
    out = v.copy()
    place(out, ex * 0.35, 1.95)
    return out


def step(r):
    """A person walking on grass, except the rhythm limps: step, step-step, pause."""
    out = np.zeros(int(1.6 * SR))
    for t in (0.0, 0.45, 0.58, 1.25):
        s = np.zeros(int(0.3 * SR))
        place(s, _thump(r, 120, 60, 0.04, 0.2) * 0.7, 0)
        place(s, bandpass(white(r, 0.12), 1500, 6000) * env_exp(int(0.12 * SR), 0.03, 0.001) * 0.5, 0)
        place(out, s * (0.8 + 0.3 * r.random()), t + 0.02 * r.random())
    return out


def door(r):
    """A door that opens... and then is held, creaking, too long before it shuts."""
    a = door_creak(r)
    out = np.zeros(int((len(a) / SR + 1.4) * SR))
    place(out, a, 0)
    place(out, creak(r, 1.0, base=260, pulse_hz=(4, 9), q=30) * 0.5, len(a) / SR - 0.2)
    place(out, _thump(r, 140, 70, 0.06, 0.3) * 0.8, len(a) / SR + 1.0)
    return out


def chest(r):
    """Wooden lid creak and thump; the lid is lifted too slowly."""
    out = np.zeros(int(1.6 * SR))
    place(out, click(r, 0.04, 1100, 6, 0.008) * 0.6, 0.0)
    place(out, creak(r, 1.0, base=420 + 120 * r.random(), pulse_hz=(10, 26), q=24) * 0.7, 0.05)
    place(out, _thump(r, 180, 90, 0.05, 0.2) * 0.9, 1.15)
    return out


def voice(r):
    """Vowel-shaped throat sounds trying, and failing, to be a word. No language, no real voice."""
    dur = 2.2
    n = int(dur * SR)
    v = glottal(r, dur, [(0, 150 + 30 * r.random()), (0.7, 175), (1.4, 130), (dur, 110)], jitter=0.05, shimmer=0.3)
    t = 0.0
    out = np.zeros(n)
    while t < dur - 0.3:
        d = 0.18 + 0.25 * r.random()
        f1, f2 = 300 + 500 * r.random(), 900 + 1500 * r.random()
        seg = v[int(t * SR):int((t + d) * SR)]
        seg = formant_filter(seg, [(f1, 1.0), (f2, 0.7), (2600, 0.2)], 0.09)
        seg *= env_points(len(seg), [(0, 0), (d * 0.25, 1), (d * 0.7, 0.8), (d, 0)])
        place(out, seg, t)
        t += d + 0.05 + 0.2 * r.random()
    return lowpass(out, 3800) + 0.1 * formant_filter(pink(r, dur), [(700, 1.0)], 0.3)


def reveal(r):
    """The unfolding: wet cracking, then a shriek that rises far past anything a cow could make."""
    dur = 2.0
    n = int(dur * SR)
    out = np.zeros(n)
    t = 0.0
    while t < 0.7:
        place(out, click(r, 0.04, 900 + 2600 * r.random(), 6, 0.008) * (0.4 + 0.5 * r.random()), t)
        t += 0.02 + 0.06 * r.random()
    v = glottal(r, 1.3, [(0, 220), (0.5, 520), (1.3, 760)], jitter=0.06, shimmer=0.4)
    v = formant_filter(softclip(v * 2, 2), [(900, 1.0), (2200, 0.8), (3400, 0.4)], 0.12)
    hiss = highpass(white(r, 1.3), 3000) * 0.4
    place(out, (v + hiss) * env_points(int(1.3 * SR), [(0, 0), (0.2, 1), (1.0, 0.8), (1.3, 0)]), 0.6)
    return out


def skitter(r):
    """Many hard points hitting the ground very fast."""
    out = np.zeros(int(0.5 * SR))
    for k in range(int(r.integers(6, 10))):
        place(out, click(r, 0.02, 1400 + 2400 * r.random(), 8, 0.004) * (0.4 + 0.5 * r.random()), r.random() * 0.45)
    place(out, _thump(r, 110, 60, 0.03, 0.15) * 0.3, 0.0)
    return out


def attack(r):
    out = np.zeros(int(0.6 * SR))
    place(out, swept_bandpass(white(r, 0.3), 700, 4200, width=1.0) * env_points(int(0.3 * SR), [(0, 0), (0.1, 1), (0.3, 0)]) * 0.8, 0)
    place(out, click(r, 0.05, 1600, 4, 0.012) * 0.9, 0.2)
    return out


def hurt(r):
    dur = 0.6
    n = int(dur * SR)
    v = glottal(r, dur, [(0, 400), (0.2, 520), (dur, 300)], jitter=0.06, shimmer=0.3)
    return formant_filter(v, [(800, 1.0), (2000, 0.6)], 0.12) * env_points(n, [(0, 0), (0.03, 1), (dur, 0)])


def death(r):
    dur = 2.4
    n = int(dur * SR)
    a = moo(r)[: int(1.2 * SR)]  # dies sounding like the animal it pretended to be
    out = np.zeros(n)
    place(out, a * env_points(len(a), [(0, 1), (1.2, 0)]), 0)
    t = 0.8
    while t < dur - 0.1:
        place(out, click(r, 0.03, 1000 + 2000 * r.random(), 8, 0.006) * 0.4 * (1 - (t - 0.8) / 1.6), t)
        t += 0.03 + 0.08 * r.random()
    return out


SOUNDS = {
    "moo": (moo, 3, dict(volume=0.9, max_distance=48, min_distance=4)),
    "step": (step, 3, dict(volume=0.7, max_distance=24, min_distance=2)),
    "door": (door, 2, dict(volume=0.8, max_distance=32, min_distance=2)),
    "chest": (chest, 3, dict(volume=0.8, max_distance=28, min_distance=2)),
    "voice": (voice, 4, dict(volume=0.7, max_distance=28, min_distance=2)),
    "reveal": (reveal, 2, dict(volume=1.0, max_distance=48, min_distance=3)),
    "skitter": (skitter, 4, dict(volume=0.8, max_distance=28, min_distance=2)),
    "attack": (attack, 3, dict(volume=0.9, max_distance=24, min_distance=2)),
    "hurt": (hurt, 3, dict(volume=0.9, max_distance=28, min_distance=2)),
    "death": (death, 2, dict(volume=0.9, max_distance=32, min_distance=3)),
}
