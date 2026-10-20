#!/usr/bin/env bash
# Fetch the CC0 source recordings THE HOLLOW's sounds and music are made from (see CREDITS.md).
# Pinned: lavenderdotpet/CC0-Public-Domain-Sounds @ f2b6264 (CC0 compilation incl. Kenney, Ben Burnes /
# Abstraction and OpenGameArt CC0 packs) and jfpx/cc0-media-library music-v1 (CC0 music, sha256-checked).
# Only needed to rebuild audio (python3 tools/sounds/sourced.py); the built OGGs are committed.
set -euo pipefail
cd "$(dirname "$0")/../.."
DEST=build/sound_sources
mkdir -p "$DEST"

SFX="$DEST/cc0-sounds"
if [ ! -d "$SFX/.git" ]; then
  git clone --filter=blob:none --no-checkout https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds "$SFX"
  git -C "$SFX" checkout -q f2b6264f9ab89fabc266914c3654685d68c5a39b -- . 2>/dev/null || true
fi
git -C "$SFX" sparse-checkout init --no-cone
git -C "$SFX" sparse-checkout set --no-cone '/LICENSE' '*README*' '*License*' \
  '/kenney_impactsounds/' '/kenney_rpgaudio/' '/80-CC0-creature-SFX/' '/80-CC0-creature-sfx-2/' '/80-CC0-RPG-SFX/' \
  '/100-CC0-SFX/' '/100-cc0-sfx-2/' '/30-cc0-sfx-loops/' '/30-cc0-weird-sfx/' '/25-CC0-mud-sfx/' \
  '/40-cc0-water-splash-slime-sfx/' '/75-cc0-breaking-falling-hit-sfx/' '/100-CC0-wood-metal-SFX/' \
  '/bb - Books, Paper, Writing (Jan 2021)/' '/bb - Bottle Plops (Apr 2021)/' '/bb - Fans and Drones (Jul 2021)/' \
  '/Micro Pack - Organic Wooshes/' '/BB_2HTC Samples Vol 4/Pads/' '/BB_2HTC Samples Vol 4/Weird/' \
  '/BB_2HTC Samples Vol 4/Loops/' '/BB_2HTC Samples Vol 4 Addendum/'
git -C "$SFX" checkout -q f2b6264f9ab89fabc266914c3654685d68c5a39b

MUSIC="$DEST/cc0-music"
if [ ! -f "$MUSIC/music/catalog.json" ]; then
  mkdir -p "$MUSIC"
  curl -sSL -o "$MUSIC/music-cc0.zip" https://github.com/jfpx/cc0-media-library/releases/download/music-v1/music-cc0.zip
  echo "f76258c87efa52cb47c7d716830088049226752f97c56fcda830ab43037172cc  $MUSIC/music-cc0.zip" | sha256sum -c -
  (cd "$MUSIC" && unzip -q -o music-cc0.zip && rm music-cc0.zip)
fi
echo "sound sources ready in $DEST"
