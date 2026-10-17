package dev.portmarlowe.preset;

import dev.portmarlowe.platform.DeviceInfo;

/**
 * The concrete vanilla video settings a {@link Preset} resolves to on a given device.
 *
 * <p>Every field is a limit, never a target: applying a plan only ever makes a setting cheaper. A
 * player who already runs a render distance of 4 keeps 4, even if the plan allows 8.
 *
 * @param renderDistanceCap     maximum render distance in chunks
 * @param simulationDistanceCap maximum simulation distance in chunks (vanilla minimum is 5)
 * @param disableSmoothLighting whether ambient occlusion is switched off (chunk meshing gets ~2x cheaper)
 * @param biomeBlendCap         maximum biome blend radius (0 = 1 colour sample per block instead of 25)
 * @param mipmapCap             maximum mipmap levels
 * @param minParticleLevel      0 = all, 1 = decreased, 2 = minimal
 * @param entityDistanceCap     maximum entity render distance scale
 * @param maxFpsCap             frame-rate ceiling; a sustained 60 beats a 120 that thermal-throttles
 * @param cloudCap              most expensive cloud mode allowed
 * @param menuBlurCap           maximum menu background blur (a full screen multi-pass shader)
 * @param disableRealmsNotifications whether the title screen stops polling Realms over the network
 */
public record PresetPlan(
        int renderDistanceCap,
        int simulationDistanceCap,
        boolean disableSmoothLighting,
        int biomeBlendCap,
        int mipmapCap,
        int minParticleLevel,
        double entityDistanceCap,
        int maxFpsCap,
        CloudMode cloudCap,
        int menuBlurCap,
        boolean disableRealmsNotifications) {

    public static final int VANILLA_MIN_SIMULATION_DISTANCE = 5;
    private static final int DEFAULT_FPS_CAP = 60;

    public static PresetPlan create(Preset preset, DeviceInfo device) {
        DeviceInfo.MemoryTier tier = device.memoryTier();
        int fpsCap = device.displayRefreshRate() > 0 ? Math.min(DEFAULT_FPS_CAP, device.displayRefreshRate()) : DEFAULT_FPS_CAP;

        return switch (preset) {
            case MAX_PERFORMANCE -> new PresetPlan(
                    switch (tier) {
                        case LOW -> 4;
                        case MEDIUM -> 6;
                        case HIGH -> 8;
                    },
                    VANILLA_MIN_SIMULATION_DISTANCE,
                    true,
                    0,
                    0,
                    2,
                    0.5,
                    fpsCap,
                    CloudMode.OFF,
                    0,
                    true);
            case BALANCED -> new PresetPlan(
                    switch (tier) {
                        case LOW -> 6;
                        case MEDIUM -> 8;
                        case HIGH -> 10;
                    },
                    6,
                    false,
                    1,
                    2,
                    1,
                    0.75,
                    fpsCap,
                    CloudMode.FAST,
                    0,
                    false);
        };
    }
}
