#!/usr/bin/env bash
# Fetch Mojang's official bedrock-samples (vanilla packs + 1.26.50 metadata/JSON schemas) used by
# tools/validate.py. Pinned to the release tag the add-on targets.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=build/bedrock-samples
TAG=v1.26.50.4
mkdir -p build
if [ ! -d "$DEST/.git" ]; then
  git clone --depth 1 --branch "$TAG" --filter=blob:none --sparse https://github.com/Mojang/bedrock-samples.git "$DEST"
fi
cd "$DEST"
# Reapply the sparse paths on existing checkouts too, so new reference requirements are fetched.
test "$(git rev-parse HEAD)" = "$(git rev-parse "$TAG^{commit}")"
git sparse-checkout set --no-cone '/version.json' '/README.md' '/metadata/*' '/documentation/*' \
  '/resource_pack/biomes/*' '/resource_pack/fogs/*' '/resource_pack/atmospherics/*' '/resource_pack/color_grading/*' \
  '/resource_pack/lighting/*' '/resource_pack/water/*' '/resource_pack/blocks.json' '/resource_pack/sounds.json' \
  '/resource_pack/sounds/sound_definitions.json' \
  '/behavior_pack/entities/*'
echo "fetched $TAG into $DEST"
