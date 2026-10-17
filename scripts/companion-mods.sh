#!/usr/bin/env bash
# Downloads the newest Fabric release of each popular performance mod on Modrinth for the project's
# Minecraft version into the given mods folder. CI uses it to run the self-test with Port Marlowe
# installed next to them; Fabric Loader remaps the jars to development names at launch.
set -euo pipefail

dest=${1:?usage: companion-mods.sh <mods-dir>}
mc_version=$(grep '^minecraft_version=' gradle.properties | cut -d= -f2)
slugs=(fabric-api sodium lithium ferrite-core modernfix immediatelyfast entityculling)
query="game_versions=%5B%22${mc_version}%22%5D&loaders=%5B%22fabric%22%5D"

mkdir -p "$dest"
for slug in "${slugs[@]}"; do
    version=$(curl -fsSL "https://api.modrinth.com/v2/project/${slug}/version?${query}" \
        | jq -c '([.[] | select(.version_type == "release")] + .)[0] // empty')
    if [[ -z "$version" ]]; then
        echo "No ${slug} release for ${mc_version}" >&2
        exit 1
    fi
    number=$(jq -r '.version_number' <<<"$version")
    url=$(jq -r '([.files[] | select(.primary)] + .files)[0].url' <<<"$version")
    if [[ "$url" != https://cdn.modrinth.com/* ]]; then
        echo "Unexpected download URL for ${slug}: ${url}" >&2
        exit 1
    fi
    echo "${slug} ${number}"
    curl -fsSL -o "${dest}/${slug}.jar" "$url"
done
