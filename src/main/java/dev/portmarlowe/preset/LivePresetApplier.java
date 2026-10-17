package dev.portmarlowe.preset;

import net.minecraft.client.CloudStatus;
import net.minecraft.client.GraphicsStatus;
import net.minecraft.client.Options;
import net.minecraft.client.ParticleStatus;
import net.minecraft.client.PrioritizeChunkUpdates;

/**
 * Applies a {@link PresetPlan} through the regular option setters while the game is running, so the
 * usual side effects (chunk rebuilds, texture reloads) happen exactly like when the player changes
 * them by hand. Mirrors {@link OptionsFilePatcher}.
 */
public final class LivePresetApplier {
    private LivePresetApplier() {
    }

    public static void apply(Options options, PresetPlan plan) {
        options.renderDistance().set(Math.min(options.renderDistance().get(), plan.renderDistanceCap()));
        options.simulationDistance().set(Math.min(options.simulationDistance().get(),
                Math.max(PresetPlan.VANILLA_MIN_SIMULATION_DISTANCE, plan.simulationDistanceCap())));
        options.graphicsMode().set(GraphicsStatus.FAST);
        if (plan.disableSmoothLighting()) {
            options.ambientOcclusion().set(false);
        }
        options.biomeBlendRadius().set(Math.min(options.biomeBlendRadius().get(), plan.biomeBlendCap()));
        options.mipmapLevels().set(Math.min(options.mipmapLevels().get(), plan.mipmapCap()));
        options.entityShadows().set(false);
        if (options.particles().get().getId() < plan.minParticleLevel()) {
            options.particles().set(ParticleStatus.byId(plan.minParticleLevel()));
        }
        options.entityDistanceScaling().set(Math.min(options.entityDistanceScaling().get(), plan.entityDistanceCap()));
        options.framerateLimit().set(Math.min(options.framerateLimit().get(), plan.maxFpsCap()));
        if (cloudRank(options.cloudStatus().get()) > plan.cloudCap().ordinal()) {
            options.cloudStatus().set(switch (plan.cloudCap()) {
                case OFF -> CloudStatus.OFF;
                case FAST -> CloudStatus.FAST;
                case FANCY -> CloudStatus.FANCY;
            });
        }
        options.prioritizeChunkUpdates().set(PrioritizeChunkUpdates.NONE);
        options.menuBackgroundBlurriness().set(Math.min(options.menuBackgroundBlurriness().get(), plan.menuBlurCap()));
        if (plan.disableRealmsNotifications()) {
            options.realmsNotifications().set(false);
        }
        options.save();
    }

    private static int cloudRank(CloudStatus status) {
        return switch (status) {
            case OFF -> CloudMode.OFF.ordinal();
            case FAST -> CloudMode.FAST.ordinal();
            case FANCY -> CloudMode.FANCY.ordinal();
        };
    }
}
