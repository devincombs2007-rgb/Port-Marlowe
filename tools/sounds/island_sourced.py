"""Varrow Island sounds from CC0 recordings (replaces most of the synthesised island/cinematic set).

Same recipe language as sourced.py (layers of CC0 recordings, pitched, filtered, reverberated).
Sources: lavenderdotpet/CC0-Public-Domain-Sounds (Kenney, Ben Burnes, Warfork CC0 and others; see
CREDITS.md), fetched by tools/sounds/fetch_sources.sh plus the extra folders listed in EXTRA below.

Cutscene sounds use the "player" category so the Ambient slider can't silence the story, and are
mastered louder than the in-world ambience. Run after island.py and cinematic.py:
    python3 tools/sounds/island_sourced.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import sourced as S  # noqa: E402
from sourced import L, V, render  # noqa: E402
from hollowkit import RP  # noqa: E402
from hollowkit import audio as A  # noqa: E402

HERE = os.path.dirname(__file__)
EXTRA = ["25-CC0-bang-sfx", "100-CC0-SFX", "100-cc0-sfx-2", "warfork-cc0/sounds/weapons", "warfork-cc0/sounds/announcer/countdown",
         "warfork-cc0/sounds/players/male", "Micro Pack - Record Fuzzies", "Micro Pack - Chairmat", "BB_2HTC Samples Vol 4/Drums",
         "bb - Fans and Drones (Jul 2021)", "80-CC0-RPG-SFX", "50-cc0-sci-fi-sfx", "30-cc0-sfx-loops"]
S.F.update({
    "bang": "25-CC0-bang-sfx", "s1": "100-CC0-SFX", "s2": "100-cc0-sfx-2", "wf": "warfork-cc0/sounds/weapons",
    "cd": "warfork-cc0/sounds/announcer/countdown", "pl": "warfork-cc0/sounds/players/male", "rec": "Micro Pack - Record Fuzzies",
    "chair": "Micro Pack - Chairmat", "drum": "BB_2HTC Samples Vol 4/Drums", "pad": "BB_2HTC Samples Vol 4/Pads",
    "fan": "bb - Fans and Drones (Jul 2021)", "orpg": "80-CC0-RPG-SFX", "scifi": "50-cc0-sci-fi-sfx", "loop": "30-cc0-sfx-loops",
    "imp": "kenney_impactsounds/Audio",
})
I = lambda kind, i: f"imp:{kind}_{i:03d}.ogg"  # noqa: E731
RUMBLE = "pad:2022-06-15 I Like Trees - Rumble Pad.wav"
THUNDER1 = "chair:Fake Thunder 1.wav"
THUNDER2 = "chair:Fake Thunder 2.wav"
STATIC = "rec:Good Clean Noise.wav"
CRACKLE = "rec:Big Crackle.wav"

# event -> (folder, [variants], category, volume, subtitle, (min,max) or None, rms dB)
EVENTS = {
    # ------------------------------------------------------------------ guns
    "gun.pistol": ("island", [
        V(L("bang:shot_01.ogg", pitch=1.05), L("s1:shot_02.ogg", pitch=0.9, db=-6), L("drum:2022-08-17 Approaching the Crash Site - Boom.wav", pitch=1.6, db=-10),
          verb=(0.18, 0.9)),
        V(L("bang:shot_02.ogg", pitch=1.0), L("s1:shot_01.ogg", pitch=1.1, db=-8), verb=(0.18, 0.9)),
        V(L("bang:shot_03.ogg", pitch=0.95), L("bang:shot_01.ogg", pitch=1.2, db=-9), verb=(0.18, 0.9)),
    ], "player", 1.0, "Pistol shot", (6.0, 112.0), -12),
    "gun.rifle": ("island", [
        V(L("bang:cannon_03.ogg", pitch=1.45), L("bang:shot_01.ogg", pitch=0.8, db=-3), L("s2:sfx100v2_thunder_01.ogg", pitch=1.4, db=-16, dur=1.4, fout=0.6),
          verb=(0.22, 1.6)),
        V(L("bang:cannon_04.ogg", pitch=1.4), L("bang:shot_02.ogg", pitch=0.75, db=-3), L("s2:sfx100v2_thunder_01.ogg", pitch=1.3, db=-16, dur=1.4, fout=0.6),
          verb=(0.22, 1.6)),
    ], "player", 1.0, "Rifle shot", (8.0, 160.0), -11),
    "gun.shotgun": ("island", [
        V(L("wf:riotgun_fire_strong.ogg", pitch=0.92), L("bang:cannon_05.ogg", pitch=1.6, db=-6), verb=(0.2, 1.1)),
        V(L("wf:riotgun_fire_strong.ogg", pitch=0.86), L("bang:cannon_03.ogg", pitch=1.7, db=-6), verb=(0.2, 1.1)),
    ], "player", 1.0, "Shotgun blast", (6.0, 120.0), -11),
    "gun.distant": ("island", [
        V(L("bang:cannon_0%d.ogg" % i, pitch=1.2), lp=900, verb=(0.5, 2.4)) for i in (1, 3, 4)
    ], "ambient", 0.9, "Distant gunshot", None, -20),
    "gun.dry": ("island", [
        V(L("wf:weapon_noammo.ogg", pitch=1.0)), V(L("wf:weapon_noammo.ogg", pitch=1.12)),
    ], "player", 0.9, "Empty click", (1.0, 12.0), -20),
    "gun.reload": ("island", [
        V(L(I("impactMetal_light", 0), pitch=1.5, db=-2), L("wf:weapon_switch.ogg", at=0.35, pitch=0.8),
          L(I("impactMetal_medium", 1), at=0.7, pitch=1.6, db=-3), L("wf:weapon_switch.ogg", at=1.05, pitch=0.7),
          L(I("impactPlate_light", 2), at=1.25, pitch=1.4, db=-4)),
    ], "player", 0.9, "Reloading", (1.0, 16.0), -19),
    "gun.hit": ("island", [
        V(L(I("impactPunch_heavy", i), pitch=0.85), L(I("impactSoft_heavy", i), pitch=0.9, db=-6)) for i in range(3)
    ], "hostile", 0.9, "Bullet hits", (2.0, 32.0), -16),
    "story.gasp": ("island", [
        V(L("pl:gasp.ogg", pitch=1.0), verb=(0.12, 0.5)), V(L("pl:pain25.ogg", pitch=0.95), L("pl:gasp.ogg", at=0.5), verb=(0.12, 0.5)),
    ], "player", 0.9, "Gasping for air", None, -18),
    # ------------------------------------------------------------------ cutscenes
    "cine.boom": ("cinematic", [
        V(L("wf:rocket_strong_explosion.ogg", pitch=0.32), L("wf:gren_strong_explosion1.ogg", pitch=0.28, db=-2),
          L("s1:explosion.ogg", pitch=0.25, db=-3), L(THUNDER1, pitch=0.6, db=-1, at=0.3), L(THUNDER2, pitch=0.55, db=-4, at=2.0),
          L("s2:sfx100v2_thunder_01.ogg", pitch=0.5, db=-2, at=0.8), L(RUMBLE, pitch=0.5, db=-6, at=0.5),
          lp=2600, verb=(0.35, 4.0), fout=3.0, dur=18.0),
    ], "player", 1.0, "A tremendous blast", None, -10),
    "cine.flash": ("cinematic", [
        V(L("bang:bang_01.ogg", pitch=0.45), L("bang:cannon_02.ogg", pitch=0.35, db=-2), L("scifi:explosion_01.ogg", pitch=0.55, db=-4),
          L(RUMBLE, pitch=0.7, db=-6), verb=(0.4, 3.0), fout=1.5),
    ], "player", 1.0, "A blinding flash", None, -10),
    "cine.bomber": ("cinematic", [
        V(L("fan:Large Fan.wav", pitch=0.42, start=5.0, dur=26.0), L("fan:Outdoor AC Unit.wav", pitch=0.55, start=8.0, dur=20.0, db=-5),
          L("fan:Large Fan.wav", pitch=0.47, start=20.0, dur=26.0, db=-6), lp=900, trem=(9, 0.35), fin=2.5, fout=3.0, dur=14.0),
    ], "player", 1.0, "Bomber engines", None, -15),
    "cine.fire": ("cinematic", [
        V(L(CRACKLE, pitch=0.8), L("orpg:spell_fire_01.ogg", pitch=0.6, at=0.5, db=-3), L("orpg:spell_fire_04.ogg", pitch=0.55, at=2.5, db=-3),
          L("fan:Large Fan.wav", pitch=0.35, start=3.0, dur=7.0, db=-6), lp=6000, fin=1.0, fout=2.0, dur=7.0),
    ], "player", 0.9, "Fire roaring", None, -15),
    "cine.radio": ("cinematic", [
        V(L(STATIC, start=2.0, dur=2.2), L(STATIC, start=7.0, dur=0.2, db=4, at=0.0), bp=(350, 3200), fout=0.2),
        V(L(STATIC, start=11.0, dur=1.8), L(STATIC, start=4.0, dur=0.15, db=4, at=1.6), bp=(350, 3200), fout=0.2),
    ], "player", 0.8, "Radio chatter", None, -18),
    "cine.countdown": ("cinematic", [
        V(L(STATIC, start=1.0, dur=4.4, db=-12), L("cd:3_01.ogg", at=0.6), L("cd:2_01.ogg", at=1.75), L("cd:1_01.ogg", at=2.9),
          bp=(380, 3400), fout=0.4),
    ], "player", 1.0, "Radio countdown", None, -15),
    "cine.impact": ("cinematic", [
        V(L("bang:cannon_01.ogg", pitch=0.6), L(I("impactPlate_heavy", 0), pitch=0.5, at=0.05), L(I("impactMetal_heavy", 1), pitch=0.6, at=0.2),
          L(I("impactGlass_heavy", 2), pitch=0.9, at=0.3, db=-3), L(I("impactMetal_heavy", 3), pitch=0.5, at=0.7, db=-4),
          L(I("impactWood_heavy", 2), pitch=0.6, at=1.0, db=-5), verb=(0.25, 1.8)),
    ], "player", 1.0, "Crash", None, -11),
    "cine.alarm": ("cinematic", [
        V(L("loop:alarm_01.ogg", pitch=0.8), lp=3500, verb=(0.3, 1.5), fout=0.4),
    ], "player", 0.8, "Sirens", None, -18),
}

PLAYER_CATEGORY = ["cine.wind", "cine.whistle", "cine.rotor", "story.ringing", "story.title"]


def main():
    defs_path = os.path.join(RP, "sounds", "sound_definitions.json")
    with open(defs_path) as f:
        doc = json.load(f)
    doc["format_version"] = "1.20.20"
    defs = doc["sound_definitions"]
    subs_path = os.path.join(HERE, "subtitles_generated.json")
    subs = json.load(open(subs_path)) if os.path.isfile(subs_path) else {}
    for event, (folder, variants, category, volume, subtitle, dist, rms) in EVENTS.items():
        names = []
        kind = event.replace(".", "_") if folder == "island" else event.split(".")[1]
        for i, v in enumerate(variants):
            rel = f"sounds/hollow/{folder}/{kind}_{i + 1}"
            A.write_ogg(render(v), os.path.join(RP, rel + ".ogg"), quality=5, peak_db=-0.5, rms_db=rms)
            names.append({"name": rel, "volume": volume})
        d = {"category": category, "sounds": names, "subtitle": f"subtitles.hollow.{event}"}
        if dist:
            d["min_distance"], d["max_distance"] = dist
        defs[f"hollow.{event}"] = d
        subs[f"subtitles.hollow.{event}"] = subtitle
    # the rest of the story audio also stays audible with the Ambient slider down
    for event in PLAYER_CATEGORY:
        if f"hollow.{event}" in defs:
            defs[f"hollow.{event}"]["category"] = "player"
    with open(defs_path, "w") as f:
        json.dump(doc, f, indent=2)
    with open(subs_path, "w") as f:
        json.dump(dict(sorted(subs.items())), f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"island sourced sounds: {len(EVENTS)} events from CC0 recordings")


if __name__ == "__main__":
    main()
