#!/usr/bin/env bash
# Prints the members of every Minecraft class the mixins hook, straight from the Mojang-mapped jar that
# Loom produced. Run after `./gradlew build`; handy when porting to a new Minecraft version.
set -euo pipefail

jar=$(find .gradle "${GRADLE_USER_HOME:-$HOME/.gradle}" -path '*minecraftMaven*' -name 'minecraft-*.jar' \
    ! -name '*-sources.jar' 2>/dev/null | grep -E 'merged|client' | head -n 1 || true)
if [[ -z "$jar" ]]; then
    echo "Mapped Minecraft jar not found; run ./gradlew build first." >&2
    exit 1
fi
echo "Inspecting $jar"

show() {
    local class=$1 filter=${2:-.}
    echo "== $class"
    javap -p -cp "$jar" "$class" | grep -E "$filter" || echo "   (no match for /$filter/)"
}

show net.minecraft.client.Minecraft 'getFramerateLimit|isWindowActive|void tick\(|Screen screen;|ClientLevel level;|void tell|void stop\(|getOverlay|createWorldOpenFlows'
show net.minecraft.client.KeyboardHandler 'keyPress|charTyped'
show net.minecraft.client.MouseHandler 'onPress|onMove|onScroll'
show net.minecraft.client.Options 'optionsFile|void load|pauseOnLostFocus|OptionInstance<'
show net.minecraft.client.particle.ParticleEngine
show net.minecraft.client.particle.SingleQuadParticle 'getQuadSize'
show net.minecraft.client.renderer.LevelRenderer 'prepareCullFrustum|Frustum'
show net.minecraft.client.renderer.blockentity.BlockEntityRenderDispatcher
show net.minecraft.client.renderer.blockentity.BlockEntityRenderer
show net.minecraft.client.multiplayer.ClientLevel 'animateTick'
show net.minecraft.client.renderer.texture.TextureAtlas 'cycleAnimationFrames|tick'
show net.minecraft.client.renderer.SectionBufferBuilderPool
show net.minecraft.client.gui.components.DebugScreenOverlay 'getGameInformation'
show net.minecraft.client.resources.language.ClientLanguage 'loadFrom'
show net.minecraft.client.gui.screens.options.OptionsSubScreen
show net.minecraft.client.gui.screens.options.VideoSettingsScreen
show net.minecraft.client.gui.components.OptionsList 'add'
show net.minecraft.client.OptionInstance 'createBoolean|cachedConstantTooltip|OptionInstance\('
show 'net.minecraft.client.OptionInstance$IntRange' 'IntRange\('
show net.minecraft.client.gui.screens.worldselection.WorldOpenFlows 'createFreshLevel'
show net.minecraft.world.level.levelgen.presets.WorldPresets 'createNormalWorldDimensions'

echo "== ParticleEngine.render call sites"
javap -p -c -cp "$jar" net.minecraft.client.particle.ParticleEngine | grep -E 'Method .*render|invoke.*Particle\.render' || true
echo "== BlockEntityRenderDispatcher.render call sites"
javap -p -c -cp "$jar" net.minecraft.client.renderer.blockentity.BlockEntityRenderDispatcher | grep -E 'shouldRender' || true
echo "== ClientLanguage.loadFrom call sites"
javap -p -c -cp "$jar" net.minecraft.client.resources.language.ClientLanguage | grep -E 'ImmutableMap.copyOf' || true
echo "== ClientLevel.animateTick constants"
javap -p -c -cp "$jar" net.minecraft.client.multiplayer.ClientLevel | grep -E 'sipush\s+667' || true
