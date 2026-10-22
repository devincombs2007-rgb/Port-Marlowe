"""Sounds for the 1957 flashback and the shoot-down (2.0, phase 2). Synthesised from scratch with
hollowkit/audio.py (CC0) and merged into sound_definitions.json. Run: python3 tools/sounds/cinematic.py
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


def gull(dur=0.6, f0=1900):
    t = A.t_axis(dur)
    f = f0 * (1 + 0.25 * np.sin(t * 9) - 0.35 * t / dur)
    voice = A.osc(f, dur, "saw") * A.env_adsr(dur, 0.03, 0.2, 0.5, 0.3)
    return A.formants(voice, [(f0, 1.0), (f0 * 2.1, 0.4)], q=6) * 0.5


def wind(i):
    """Morning on the atoll: steady trade wind, surf, a few gulls."""
    A.seed(1200 + i)
    dur = 7.0
    w = A.bandpass(A.pink(dur), 150, 1800) * (0.6 + 0.4 * A.smooth_noise_curve(dur, 0.6, 0.4, 1.0))
    surf = A.lowpass(A.brown(dur), 500) * (0.5 + 0.5 * np.abs(np.sin(A.t_axis(dur) * 0.9))) * 0.5
    x = A.mix(w * 0.5, surf)
    for at, f in ((1.2, 1800), (2.0, 2100), (4.6, 1700)):
        A.place(x, gull(0.55, f), at, 0.25)
    return A.reverb(x, wet=0.15, rt60=1.2, damp=4000)


def countdown(i):
    """Radio countdown: a tone pip each second under squelched, band-limited voice bursts."""
    A.seed(1220 + i)
    dur = 11.0
    x = A.bandpass(A.white(dur), 600, 3200) * 0.05                       # carrier hiss
    for k in range(10):
        at = 0.5 + k
        pip = A.osc(1000, 0.12) * A.env_adsr(0.12, 0.005, 0.02, 0.8, 0.03) * 0.5
        A.place(x, pip, at)
        d = 0.35
        src = A.glottal(np.full(int(d * SR), 120.0 + A.RNG.uniform(-8, 8)))
        voice = A.formants(src, [(700, 1.0), (1150, 0.7), (2400, 0.3)], q=6) * A.env_adsr(d, 0.03, 0.1, 0.7, 0.1)
        A.place(x, voice * 0.6, at + 0.2)
    x = A.bandpass(x, 400, 3000)
    return A.soft_clip(x * 2.0, 1.5)


def bomber(i):
    """Four radial engines at altitude: a deep throbbing drone with beating between engines."""
    A.seed(1240 + i)
    dur = 10.0
    t = A.t_axis(dur)
    x = np.zeros(len(t))
    for e, f in enumerate((38.0, 38.6, 39.3, 37.7)):
        for h, g in ((1, 1.0), (2, 0.6), (3, 0.35), (5, 0.18), (9, 0.08)):
            x += np.sin(2 * np.pi * f * h * t + e) * g
    x *= 0.15
    x += A.lowpass(A.pink(dur), 900) * 0.25
    env = np.clip(np.minimum(t / 3.0, (dur - t) / 3.0), 0, 1) ** 1.5      # passes overhead
    return A.lowpass(x * (0.35 + 0.65 * env), 2200)


def whistle(i):
    """The bomb falling: a long descending whistle and rushing air."""
    A.seed(1260 + i)
    dur = 6.0
    t = A.t_axis(dur)
    f = np.geomspace(2600, 700, len(t))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / dur) ** 1.3 * 0.3
    rush = A.bandpass(A.white(dur), 500, 5000) * (t / dur) ** 2 * 0.4
    return A.mix(tone, rush)


def boom(i):
    """The report arriving late: a crack, then an enormous low roll that goes on and on."""
    A.seed(1280 + i)
    dur = 16.0
    t = A.t_axis(dur)
    crack = A.lowpass(A.white(0.4), 1800) * A.env_ad(0.4, 0.002, 6) * 1.2
    sub = np.sin(2 * np.pi * np.cumsum(np.geomspace(48, 22, len(t))) / SR) * np.exp(-t * 0.18)
    roll = A.lowpass(A.brown(dur), 160) * np.exp(-t * 0.12) * (0.7 + 0.3 * A.smooth_noise_curve(dur, 1.5, 0.3, 1.0))
    rumble = A.lowpass(A.pink(dur), 420) * np.exp(-t * 0.22) * 0.5
    x = A.mix(crack, sub * 1.4, roll * 1.6, rumble)
    return A.reverb(A.soft_clip(x * 1.6, 1.8), wet=0.35, rt60=4.0, damp=900, size=4.0)


def fire(i):
    """The island burning: a roar of flame with crackle and wood splitting."""
    A.seed(1300 + i)
    dur = 9.0
    roar = A.lowpass(A.brown(dur), 400) * 0.6 * (0.7 + 0.3 * A.smooth_noise_curve(dur, 2, 0, 1))
    crack = A.crackle(dur, density=90, lo=1200, hi=6000) * 0.5
    x = A.mix(roar, crack)
    for at in (2.2, 5.8):
        A.place(x, A.creak(1.2, rate=(40, 10), body=(140, 300, 620)) * 0.4, at)
        A.place(x, A.wood_knock(0.5, 2.5, 1.2) * 0.6, at + 1.1)
    return A.reverb(x, wet=0.2, rt60=1.8, damp=2500)


def rotor(i):
    """Helicopter: blade slap at ~5 Hz over a turbine whine."""
    A.seed(1320 + i)
    dur = 10.0
    t = A.t_axis(dur)
    slap = np.zeros(len(t))
    period = 1 / 5.2
    for k in range(int(dur / period)):
        thump = A.lowpass(A.white(0.08), 600) * A.env_ad(0.08, 0.002, 25)
        A.place(slap, thump, k * period, 0.9)
    whine = np.sin(2 * np.pi * (6200 + 40 * np.sin(t)) * t) * 0.03 + A.bandpass(A.pink(dur), 300, 1200) * 0.2
    return A.mix(slap, whine)


def radio(i):
    """Cockpit radio: squelch, clipped voice bursts, squelch."""
    A.seed(1340 + i)
    parts = [A.highpass(A.white(0.12), 1200) * A.env_ad(0.12, 0.002, 12) * 0.4]
    for k in range(4 + i):
        d = float(A.RNG.uniform(0.18, 0.4))
        src = A.glottal(np.full(int(d * SR), 140.0 + A.RNG.uniform(-15, 15)), jitter=0.03)
        v = A.formants(src, [(float(A.RNG.choice([600, 750, 450])), 1.0), (1300, 0.6), (2500, 0.3)], q=5)
        parts += [v * A.env_adsr(d, 0.02, 0.05, 0.8, 0.05), A.silence(float(A.RNG.uniform(0.04, 0.1)))]
    parts.append(A.highpass(A.white(0.15), 1200) * A.env_ad(0.15, 0.002, 10) * 0.4)
    x = A.concat(*parts)
    return A.soft_clip(A.bandpass(x, 350, 3200) * 2.5, 2.0)


def impact(i):
    """Hitting the ground: a deep thud, tearing metal, glass, debris."""
    A.seed(1360 + i)
    dur = 4.0
    t = A.t_axis(dur)
    thud = np.sin(2 * np.pi * np.cumsum(np.geomspace(90, 30, len(t))) / SR) * np.exp(-t * 3) * 1.4
    metal = A.modal(dur, [(310, 0.6, 1.0), (523, 0.4, 0.7), (877, 0.3, 0.5), (1430, 0.2, 0.35)]) * 0.5
    tear = A.creak(1.8, rate=(60, 20), body=(400, 900, 1700), q=8) * 0.5
    glass = A.crackle(0.8, density=400, lo=3000, hi=11000) * 0.8
    x = A.mix(thud, metal, A.lowpass(A.white(dur), 1500) * np.exp(-t * 2.5) * 0.7)
    A.place(x, tear, 0.05)
    A.place(x, glass, 0.08)
    return A.reverb(A.soft_clip(x * 1.5, 1.6), wet=0.2, rt60=1.5, damp=3000)


EVENTS = {
    "cine.wind": (wind, 1, "ambient", 0.8, "Wind and gulls", -22),
    "cine.countdown": (countdown, 1, "ambient", 0.8, "Radio countdown", -20),
    "cine.bomber": (bomber, 1, "ambient", 0.9, "Bomber engines", -18),
    "cine.whistle": (whistle, 1, "ambient", 0.8, "Something falling", -20),
    "cine.boom": (boom, 1, "ambient", 1.0, "A tremendous blast", -12),
    "cine.fire": (fire, 1, "ambient", 0.8, "Fire roaring", -18),
    "cine.rotor": (rotor, 1, "ambient", 0.8, "Helicopter rotors", -18),
    "cine.radio": (radio, 2, "ambient", 0.7, "Radio chatter", -20),
    "cine.impact": (impact, 1, "ambient", 1.0, "Crash", -12),
}


def main():
    defs_path = os.path.join(RP, "sounds", "sound_definitions.json")
    with open(defs_path) as f:
        doc = json.load(f)
    defs = doc["sound_definitions"]
    subs_path = os.path.join(HERE, "subtitles_generated.json")
    subs = json.load(open(subs_path)) if os.path.isfile(subs_path) else {}
    for event, (fn, variants, category, volume, subtitle, rms) in EVENTS.items():
        names = []
        kind = event.split(".")[1]
        for i in range(variants):
            rel = f"sounds/hollow/cinematic/{kind}_{i + 1}"
            A.write_ogg(fn(i), os.path.join(RP, rel + ".ogg"), quality=4, peak_db=-1.0, rms_db=rms)
            names.append({"name": rel, "volume": volume})
        defs[f"hollow.{event}"] = {"category": category, "sounds": names, "subtitle": f"subtitles.hollow.{event}"}
        subs[f"subtitles.hollow.{event}"] = subtitle
    with open(defs_path, "w") as f:
        json.dump(doc, f, indent=2)
    with open(subs_path, "w") as f:
        json.dump(dict(sorted(subs.items())), f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"cinematic sounds: {len(EVENTS)} events")


if __name__ == "__main__":
    main()
