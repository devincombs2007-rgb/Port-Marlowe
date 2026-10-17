#!/usr/bin/env python3
"""Render the synthesised Lurker set -> WAV (assets-src) -> Ogg Vorbis (resource pack) + sound_definitions + records."""
import csv, json, subprocess, sys, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
import numpy as np
from dsp import SR, finish, write_wav
import lurker

import ambient
import gaunt

SETS = [
    # key, module sounds, event prefix, ogg dir, wav dir, wav prefix, category
    ("lurker", lurker.SOUNDS, "dread.lurker", "sounds/entity/dread/lurker", "assets-src/audio/batch_a", "lurker", "hostile"),
    ("gaunt", gaunt.SOUNDS, "dread.gaunt", "sounds/entity/dread/gaunt", "assets-src/audio/batch_c", "gaunt", "hostile"),
    ("ambient", ambient.SOUNDS, "dread.ambient", "sounds/entity/dread/ambient", "assets-src/audio/batch_b", "amb", "neutral"),
]

defs, report = {}, []
for key, sounds, prefix, ogg_rel, wav_rel, wav_prefix, category in SETS:
    wav_dir, ogg_dir = ROOT / wav_rel, ROOT / "packs/DREAD_RP" / ogg_rel
    wav_dir.mkdir(parents=True, exist_ok=True)
    ogg_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for name, (fn, count, params) in sounds.items():
        entries = []
        for i in range(1, count + 1):
            seed = zlib.crc32(f"{key}/{name}/{i}".encode())
            x = finish(fn(np.random.default_rng(seed)), peak_db=-3.0)
            base = f"{name}_{i:02d}"
            wav = wav_dir / f"{wav_prefix}_{base}.wav"
            write_wav(wav, x)
            ogg = ogg_dir / f"{base}.ogg"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-ar", "44100",
                            "-c:a", "libvorbis", "-q:a", "4", "-map_metadata", "-1",
                            "-fflags", "+bitexact", "-flags:a", "+bitexact", "-serial_offset", "1", str(ogg)], check=True)
            entries.append({"name": f"{ogg_rel}/{base}", "volume": params["volume"], "pitch": [0.94, 1.06], "weight": 1})
            rms = float(np.sqrt(np.mean(x ** 2)))
            report.append((f"{wav_prefix}_{base}", len(x) / SR, 20 * np.log10(np.max(np.abs(x))), 20 * np.log10(rms + 1e-12), ogg.stat().st_size))
            rows.append([f"{wav_prefix}_{base}.wav", "DREAD procedural synth (tools/synth)", f"{fn.__name__}() seed={seed}",
                         "Original synthesis by this project; no third-party audio. Licensed with the project.", "intermediate-synthetic"])
        defs[f"{prefix}.{name}"] = {"category": category, "max_distance": params["max_distance"],
                                    "min_distance": params["min_distance"], "sounds": entries}
    with open(wav_dir / "SOURCES.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["file", "tool", "prompt_or_generator", "licence", "status"])
        w.writerows(rows)

(ROOT / "packs/DREAD_RP/sounds/sound_definitions.json").write_text(
    json.dumps({"format_version": "1.14.0", "sound_definitions": defs}, indent=2) + "\n")
print(f"{'file':32s} {'sec':>5s} {'peak':>6s} {'rms':>6s} {'ogg KB':>7s}")
for n, d, p, rm, sz in report:
    print(f"{n:32s} {d:5.2f} {p:6.1f} {rm:6.1f} {sz/1024:7.1f}")
total = sum(x[4] for x in report)
print(f"{len(report)} files, {total/1024:.0f} KB total Ogg")
