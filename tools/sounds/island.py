"""Varrow Island sounds (2.0): the service pistol, the Geiger counter, the wake-up after the crash.

Synthesised from scratch with hollowkit/audio.py (CC0, no samples) and merged into
packs/resource/sounds/sound_definitions.json like sounds/dread.py. Run: python3 tools/sounds/island.py
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


def _crack(dur=0.012, lo=1800, hi=12000):
    return A.bandpass(A.white(dur), lo, hi) * A.env_ad(dur, 0.0003, 9)


def pistol(i):
    """A 9 mm shot outdoors: supersonic crack, chamber blast, a low body thump, then the slap of
    the treeline coming back and a long rolling tail."""
    A.seed(900 + i)
    dur = 1.9
    x = A.silence(dur)
    A.place(x, _crack(0.014), 0.0, 1.0)
    blast = A.lowpass(A.white(0.11), 3200 + 300 * i) * A.env_ad(0.11, 0.0008, 7)
    A.place(x, blast, 0.001, 1.2)
    t = A.t_axis(0.22)
    thump = np.sin(2 * np.pi * np.cumsum(np.geomspace(150 + 10 * i, 45, len(t))) / SR) * np.exp(-t * 22)
    A.place(x, thump, 0.0, 1.3)
    mech = A.highpass(A.white(0.02), 2500) * A.env_ad(0.02, 0.001, 8) * 0.25     # slide cycling
    A.place(x, mech, 0.045, 1.0)
    x = A.soft_clip(x * 1.8, 2.2)
    # outdoor reflections: two slap-backs from trees and a long low roll
    slap = A.lowpass(x[: int(0.25 * SR)], 2400) * 0.28
    A.place(x, slap, 0.11 + 0.02 * i)
    A.place(x, A.lowpass(slap, 1500) * 0.6, 0.27 + 0.03 * i)
    roll = A.lowpass(A.brown(1.6), 260) * A.env_adsr(1.6, 0.05, 0.4, 0.35, 1.1) * 0.22
    A.place(x, roll, 0.08)
    return A.reverb(x, wet=0.16, rt60=1.6, damp=3500, size=2.0)


def distant_shot(i):
    """A rifle shot a long way off across the island: no crack, just the low report and echo."""
    A.seed(920 + i)
    x = A.mix(pistol(i) * 0.9, A.lowpass(A.brown(2.2), 180) * A.env_adsr(2.2, 0.03, 0.5, 0.3, 1.5) * 0.4)
    return A.reverb(A.distance(x, 280 + 60 * i), wet=0.4, rt60=2.4, damp=1800, size=3.0)


def dry_fire(i):
    """Hammer falls on an empty chamber."""
    A.seed(940 + i)
    click = A.modal(0.09, [(2300, 0.012, 1.0), (4100, 0.008, 0.6), (6900, 0.005, 0.4)])
    x = click + A.highpass(A.white(0.09), 3000) * A.env_ad(0.09, 0.0005, 30) * 0.4
    return A.reverb(x, wet=0.05, rt60=0.2, damp=8000)


def reload(i):
    """Magazine out, a fresh one seated with a clack, the slide racked forward."""
    A.seed(960 + i)
    x = A.silence(1.3)
    def metal(dur, f, dec, amp=1.0):
        return A.modal(dur, [(f, dec, 1.0), (f * 2.7, dec * 0.6, 0.5), (f * 4.1, dec * 0.4, 0.3)]) * amp
    A.place(x, metal(0.12, 1400, 0.02) + A.highpass(A.white(0.12), 2000) * A.env_ad(0.12, 0.002, 20) * 0.3, 0.0, 0.7)
    slide = A.bandpass(A.white(0.18), 1500, 7000) * A.env_adsr(0.18, 0.01, 0.05, 0.5, 0.08) * 0.35
    A.place(x, slide, 0.38, 1.0)
    A.place(x, metal(0.15, 900, 0.03, 1.2) + A.lowpass(A.white(0.15), 1200) * A.env_ad(0.15, 0.001, 30) * 0.6, 0.55)
    A.place(x, A.bandpass(A.white(0.1), 2000, 8000) * A.env_ad(0.1, 0.002, 18) * 0.5, 0.92)
    A.place(x, metal(0.2, 1250, 0.04, 1.3), 1.02)
    return A.reverb(x, wet=0.06, rt60=0.3, damp=7000)


def _tick():
    """One Geiger-Müller discharge through a small speaker."""
    n = int(0.004 * SR)
    t = np.arange(n) / SR
    s = (A.RNG.standard_normal(n) * 0.6 + np.sin(2 * np.pi * 3200 * t)) * np.exp(-t * 1400)
    return A.highpass(s, 900)


def geiger(level):
    """One second of a counter at a given count rate (Poisson clicks): levels 1..5."""
    def make(i):
        A.seed(1000 + level * 10 + i)
        rate = [0, 1.5, 6, 18, 55, 160][level]
        dur = 1.0
        x = A.silence(dur)
        t = 0.0
        while True:
            t += float(A.RNG.exponential(1 / rate))
            if t > dur - 0.01:
                break
            A.place(x, _tick(), t, float(A.RNG.uniform(0.7, 1.0)))
        # the counter's own faint hiss so the sound never cuts to dead silence
        return x + A.highpass(A.white(dur), 4000) * 0.004
    return make


def ringing(i):
    """Tinnitus after the impact: a high pure tone and a muffled world fading back in."""
    A.seed(1100 + i)
    dur = 7.5
    t = A.t_axis(dur)
    tone = np.sin(2 * np.pi * (5200 + 120 * np.sin(t * 0.7)) * t) * np.exp(-t * 0.35) * 0.35
    tone += np.sin(2 * np.pi * 7900 * t) * np.exp(-t * 0.6) * 0.08
    world = A.lowpass(A.pink(dur), 300) * np.clip(t / dur, 0, 1) ** 1.5 * 0.4      # muffled fire and surf
    beat = A.silence(dur)
    for k in range(9):
        A.place(beat, A.heartbeat_thump(0.32, 60, 34), 0.4 + k * 0.82, 0.5)
    return A.mix(tone, world, A.lowpass(beat, 400))


def title_hit(i):
    """Title card: a deep impact and a drone that hangs in the dark."""
    A.seed(1120 + i)
    dur = 6.0
    t = A.t_axis(dur)
    drone = sum(np.sin(2 * np.pi * f * t + p) * g for f, g, p in ((41.2, 0.6, 0), (61.7, 0.4, 1), (82.4, 0.25, 2), (123.5, 0.08, 3)))
    drone *= A.env_adsr(dur, 0.02, 1.0, 0.55, 3.5)
    hit = A.lowpass(A.white(0.6), 400) * A.env_ad(0.6, 0.002, 8) * 1.2
    air = A.bandpass(A.pink(dur), 800, 3000) * A.env_adsr(dur, 1.0, 1.0, 0.4, 3.0) * 0.08
    return A.reverb(A.mix(drone * 0.7, hit, air), wet=0.35, rt60=3.5, damp=2000, size=3.0)


def gasp(i):
    """Coming to: one sharp in-breath and a cough."""
    A.seed(1140 + i)
    inn = A.formants(A.bandpass(A.pink(0.45), 600, 4500), [(800, 1.0), (1300, 0.6), (2700, 0.3)], q=5) \
        * A.env_adsr(0.45, 0.05, 0.1, 0.8, 0.2)
    cough = A.formants(A.bandpass(A.white(0.22), 200, 3500), [(500, 1.0), (1500, 0.5)], q=3) * A.env_ad(0.22, 0.005, 9)
    x = A.concat(inn, A.silence(0.25), cough, A.silence(0.12), cough * 0.6)
    return A.reverb(x, wet=0.06, rt60=0.4, damp=6000)


def bullet_hit(i):
    """Round striking a body or wood: a dull, close thwack."""
    A.seed(1160 + i)
    x = A.mix(A.lowpass(A.white(0.08), 1800) * A.env_ad(0.08, 0.0005, 18), A.wood_knock(0.12, 1.6, 0.4) * 0.4)
    return x


EVENTS = {
    # event: (fn, variants, category, volume, subtitle, (min, max) distance or None for 2D, rms dB)
    "gun.pistol": (pistol, 3, "player", 1.0, "Gunshot", (6.0, 96.0), -13),
    "gun.distant": (distant_shot, 3, "ambient", 0.8, "Distant gunshot", None, -22),
    "gun.dry": (dry_fire, 2, "player", 0.8, "Empty click", (1.0, 12.0), -20),
    "gun.reload": (reload, 1, "player", 0.8, "Reloading", (1.0, 16.0), -20),
    "gun.hit": (bullet_hit, 3, "hostile", 0.8, "Bullet hits", (2.0, 24.0), -18),
    "geiger.1": (geiger(1), 3, "player", 0.6, "Geiger counter ticks", None, -30),
    "geiger.2": (geiger(2), 3, "player", 0.6, "Geiger counter clicks", None, -27),
    "geiger.3": (geiger(3), 3, "player", 0.6, "Geiger counter clicking", None, -24),
    "geiger.4": (geiger(4), 3, "player", 0.6, "Geiger counter racing", None, -22),
    "geiger.5": (geiger(5), 3, "player", 0.6, "Geiger counter screaming", None, -20),
    "story.ringing": (ringing, 1, "player", 0.8, "Ears ringing", None, -22),
    "story.title": (title_hit, 1, "music", 0.9, "", None, -18),
    "story.gasp": (gasp, 2, "player", 0.8, "Gasping for air", None, -20),
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
        group, kind = event.split(".")
        for i in range(variants):
            rel = f"sounds/hollow/island/{group}_{kind}_{i + 1}"
            A.write_ogg(fn(i), os.path.join(RP, rel + ".ogg"), quality=4, peak_db=-1.0, rms_db=rms)
            names.append({"name": rel, "volume": volume})
        d = {"category": category, "sounds": names}
        if subtitle:
            d["subtitle"] = f"subtitles.hollow.{event}"
            subs[f"subtitles.hollow.{event}"] = subtitle
        if dist:
            d["min_distance"], d["max_distance"] = dist
        defs[f"hollow.{event}"] = d
    # Trevor's body sounds reuse the game's own files (a person being hit, footsteps on grit)
    for event, files, category, sub, vol in (
            ("trevor.hurt", ["sounds/damage/hit1", "sounds/damage/hit2", "sounds/damage/hit3"], "neutral", "Trevor grunts", 1.0),
            ("trevor.death", ["sounds/damage/hit1", "sounds/damage/hit3"], "neutral", "Trevor falls", 1.0),
            ("trevor.step", ["sounds/step/gravel1", "sounds/step/gravel2", "sounds/step/gravel3", "sounds/step/gravel4"], "neutral", "", 0.3)):
        d = {"category": category, "sounds": [{"name": n, "volume": vol} for n in files]}
        if sub:
            d["subtitle"] = f"subtitles.hollow.{event}"
            subs[f"subtitles.hollow.{event}"] = sub
        defs[f"hollow.{event}"] = d
    with open(defs_path, "w") as f:
        json.dump(doc, f, indent=2)
    with open(subs_path, "w") as f:
        json.dump(dict(sorted(subs.items())), f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"island sounds: {len(EVENTS)} events")


if __name__ == "__main__":
    main()
