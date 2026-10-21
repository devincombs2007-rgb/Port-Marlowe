"""Dread sounds (1.1): heartbeat, ragged breathing, whispers, a phantom's vanishing, Hearth Tea.

Synthesised from scratch with hollowkit/audio.py (CC0, no samples), then merged into
packs/resource/sounds/sound_definitions.json and the subtitle table. Run after sounds/sourced.py
(which rewrites sound_definitions.json from the recorded catalogue) and on its own:

    python3 tools/sounds/dread.py
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP  # noqa: E402
from hollowkit import audio as A  # noqa: E402
from hollowkit.audio import SR  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(RP, "sounds", "hollow", "dread")


def heartbeat(i):
    """One lub-dub, heard from inside: a deep body thump, a softer second beat, muffled skin."""
    A.seed(700 + i)
    dur = 0.62
    x = A.silence(dur)
    lub = A.heartbeat_thump(0.32, f0=62 + i * 3, f1=33)
    dub = A.heartbeat_thump(0.26, f0=78 + i * 2, f1=44) * 0.62
    A.place(x, lub, 0.0)
    A.place(x, dub, 0.19 + i * 0.012)
    # blood rush: a faint low-passed swell between beats
    rush = A.lowpass(A.pink(dur), 140) * A.env_adsr(dur, 0.05, 0.2, 0.25, 0.3) * 0.08
    x = x + rush
    # gentle saturation adds harmonics so the beat still reads on TV and phone speakers
    return A.lowpass(A.soft_clip(x * 2.2, 1.6), 1100, order=4)


def breath(i):
    """A shaky in-breath and a trembling out-breath, close to the ear."""
    A.seed(720 + i)
    inn, out = 0.9 + 0.1 * i, 1.25 + 0.15 * i
    def part(dur, lo, hi, gain, tremble):
        n = A.bandpass(A.pink(dur), lo, hi)
        n = A.formants(n, [(700 + 80 * i, 1.0), (1200, 0.7), (2600, 0.35)], q=4.0) * 0.6 + n * 0.4
        env = A.env_adsr(dur, dur * 0.35, dur * 0.2, 0.7, dur * 0.35)
        shake = 1 + tremble * A.smooth_noise_curve(dur, 16, -1, 1)
        return n * env * shake * gain
    x = A.concat(part(inn, 500, 3800, 0.8, 0.45), A.silence(0.12), part(out, 300, 2600, 1.0, 0.7))
    return A.reverb(x, wet=0.08, rt60=0.4, damp=6000)


def whisper(i):
    """Unvoiced, syllable-like whispering: formant-shaped breath with sibilants, right at the ear.
    Deliberately unintelligible; the mind fills in the words."""
    A.seed(740 + i)
    syll = [(0.16, 0.24), (0.22, 0.3), (0.12, 0.2), (0.25, 0.35), (0.14, 0.22), (0.3, 0.42)]
    pieces = []
    vowels = [(320, 900, 2400), (620, 1180, 2600), (420, 1800, 2700), (700, 1100, 2500), (300, 2200, 3000)]
    for k in range(4 + i % 3):
        lo, hi = syll[(k + i) % len(syll)]
        d = float(A.RNG.uniform(lo, hi))
        f1, f2, f3 = vowels[int(A.RNG.integers(0, len(vowels)))]
        src = A.pink(d)
        v = A.formants(src, [(f1, 1.0), (f2, 0.8), (f3, 0.4)], q=7.0)
        v *= A.env_adsr(d, d * 0.25, d * 0.25, 0.6, d * 0.4)
        if A.RNG.random() < 0.55:  # a hissing "s" / "sh" onset
            sd = float(A.RNG.uniform(0.06, 0.12))
            s = A.bandpass(A.white(sd), 4200 if A.RNG.random() < 0.5 else 2600, 9000) * A.env_ad(sd, 0.02, 3) * 0.5
            v = A.concat(s, v)
        pieces.append(v)
        pieces.append(A.silence(float(A.RNG.uniform(0.03, 0.12))))
    x = A.concat(*pieces)
    x = x * (1 + 0.3 * A.smooth_noise_curve(len(x) / SR, 6, -1, 1))
    return A.reverb(A.highpass(x, 250), wet=0.18, rt60=0.9, damp=5000)


def vanish(i):
    """A reversed breath swell that is cut off: the shape was never there."""
    A.seed(760 + i)
    dur = 1.1
    swell = A.bandpass(A.pink(dur), 180, 3200) * np.linspace(0, 1, int(dur * SR)) ** 3
    tone = A.osc(np.geomspace(70, 52, int(dur * SR)), dur) * np.linspace(0, 1, int(dur * SR)) ** 4 * 0.35
    x = A.concat(swell + tone, A.silence(0.02))
    x = A.reverb(x, wet=0.35, rt60=1.8, damp=3000)
    return x


def calm(i):
    """Hearth Tea: a warm, low chord bloom under a soft swallow."""
    A.seed(780 + i)
    dur = 1.6
    t = A.t_axis(dur)
    chord = sum(np.sin(2 * np.pi * f * t) * g for f, g in ((110, 0.5), (164.8, 0.35), (220, 0.25), (277.2, 0.12)))
    chord *= A.env_adsr(dur, 0.35, 0.3, 0.6, 0.8) * 0.5
    gulp = A.bubble(f0=180, dur=0.14, rise=0.9, decay=24) * 0.5
    x = A.place(chord.copy(), A.lowpass(gulp, 900), 0.05)
    return A.reverb(A.lowpass(x, 2400), wet=0.25, rt60=1.4, damp=3000)


EVENTS = {
    # event: (fn, variants, category, volume, subtitle, min/max distance or None for 2D)
    "dread.heartbeat": (heartbeat, 3, "player", 0.9, "Your heart pounds", None, -16),
    "dread.breath": (breath, 2, "player", 0.6, "Ragged breathing", None, -22),
    "dread.whisper": (whisper, 3, "ambient", 0.55, "A whisper, very close", (1.0, 8.0), -24),
    "dread.vanish": (vanish, 2, "ambient", 0.6, "Nothing there", (2.0, 48.0), -22),
    "dread.calm": (calm, 1, "player", 0.7, "You steady yourself", None, -20),
}


def main():
    defs_path = os.path.join(RP, "sounds", "sound_definitions.json")
    with open(defs_path) as f:
        doc = json.load(f)
    defs = doc["sound_definitions"]
    subs_path = os.path.join(HERE, "subtitles_generated.json")
    subs = json.load(open(subs_path)) if os.path.isfile(subs_path) else {}
    for event, (fn, variants, category, volume, subtitle, dist, rms) in EVENTS.items():
        names = []
        for i in range(variants):
            rel = f"sounds/hollow/dread/{event.split('.')[1]}_{i + 1}"
            A.write_ogg(fn(i), os.path.join(RP, rel + ".ogg"), quality=4, peak_db=-1.0, rms_db=rms)
            names.append({"name": rel, "volume": volume})
        d = {"category": category, "sounds": names, "subtitle": f"subtitles.hollow.{event}"}
        if dist:
            d["min_distance"], d["max_distance"] = dist
        defs[f"hollow.{event}"] = d
        subs[f"subtitles.hollow.{event}"] = subtitle
    with open(defs_path, "w") as f:
        json.dump(doc, f, indent=2)
    with open(subs_path, "w") as f:
        json.dump(dict(sorted(subs.items())), f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"dread sounds: {len(EVENTS)} events")


if __name__ == "__main__":
    main()
