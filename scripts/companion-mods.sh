#!/usr/bin/env bash
# Prints `companions=<comma separated Gradle coordinates>` for the newest Fabric release of each popular
# performance mod on Modrinth for the project's Minecraft version. Used by CI to run the self-test with
# Port Marlowe installed next to them.
set -euo pipefail

mc_version=$(grep '^minecraft_version=' gradle.properties | cut -d= -f2)
slugs=(fabric-api sodium lithium ferrite-core modernfix immediatelyfast entityculling)
query="game_versions=%5B%22${mc_version}%22%5D&loaders=%5B%22fabric%22%5D"

coordinates=()
for slug in "${slugs[@]}"; do
    version=$(curl -fsSL "https://api.modrinth.com/v2/project/${slug}/version?${query}" \
        | jq -r '([.[] | select(.version_type == "release")] + .)[0].version_number // empty')
    if [[ -z "$version" || ! "$version" =~ ^[A-Za-z0-9.+_-]+$ ]]; then
        echo "No usable ${slug} release for ${mc_version}" >&2
        exit 1
    fi
    echo "${slug} ${version}" >&2
    coordinates+=("maven.modrinth:${slug}:${version}")
done

(IFS=,; echo "companions=${coordinates[*]}")
