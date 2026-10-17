#!/usr/bin/env python3
"""Render the synthesised Lurker set -> WAV (assets-src) -> Ogg Vorbis (resource pack) + sound_definitions + records."""
import csv, json, subprocess, sys, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
import numpy as np
from dsp import SR, finish, write_wav
import lurker

WAV_DIR = ROOT / "assets-src/audio/batch_a"
OGG_REL = "sounds/entity/dread/lurker"
OGG_DIR = ROOT / "packs/DREAD_RP" / OGG_REL
WAV_DIR.mkdir(parents=True, exist_ok=True)
OGG_DIR.mkdir(parents=True, exist_ok=True)

defs, rows, report = {}, [], []
for name, (fn, count, params) in lurker.SOUNDS.items():
    entries = []
    for i in range(1, count + 1):
        seed = zlib.crc32(f"lurker/{name}/{i}".encode())
        r = np.random.default_rng(seed)
        x = finish(fn(r), peak_db=-3.0)
        base = f"{name}_{i:02d}"
        wav = WAV_DIR / f"lurker_{base}.wav"
        write_wav(wav, x)
        ogg = OGG_DIR / f"{base}.ogg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-ar", "44100",
                        "-c:a", "libvorbis", "-q:a", "4", "-map_metadata", "-1", str(ogg)], check=True)
        entries.append({"name": f"{OGG_REL}/{base}", "volume": params["volume"], "pitch": [0.94, 1.06], "weight": 1})
        rms = float(np.sqrt(np.mean(x ** 2)))
        report.append((f"lurker_{base}", len(x) / SR, 20 * np.log10(np.max(np.abs(x))), 20 * np.log10(rms + 1e-12), ogg.stat().st_size))
        rows.append([f"lurker_{base}.wav", "DREAD procedural synth (tools/synth)", f"{fn.__name__}() seed={seed}",
                     "Original synthesis by this project; no third-party audio. Licensed with the project.", "intermediate-synthetic"])
    defs[f"dread.lurker.{name}"] = {"category": "hostile", "max_distance": params["max_distance"],
                                    "min_distance": params["min_distance"], "sounds": entries}

(ROOT / "packs/DREAD_RP/sounds/sound_definitions.json").write_text(
    json.dumps({"format_version": "1.14.0", "sound_definitions": defs}, indent=2) + "\n")
with open(WAV_DIR / "SOURCES.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["file", "tool", "prompt_or_generator", "licence", "status"])
    w.writerows(rows)
print(f"{'file':32s} {'sec':>5s} {'peak':>6s} {'rms':>6s} {'ogg KB':>7s}")
for n, d, p, rm, sz in report:
    print(f"{n:32s} {d:5.2f} {p:6.1f} {rm:6.1f} {sz/1024:7.1f}")
total = sum(x[4] for x in report)
print(f"{len(report)} files, {total/1024:.0f} KB total Ogg")
