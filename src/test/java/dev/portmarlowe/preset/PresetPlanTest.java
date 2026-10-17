package dev.portmarlowe.preset;

import dev.portmarlowe.platform.DeviceInfo;
import dev.portmarlowe.platform.Platform;
import dev.portmarlowe.platform.Renderer;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PresetPlanTest {
    private static final long MIB = 1024L * 1024L;

    private static DeviceInfo phone(long heapMiB, int refreshRate) {
        return new DeviceInfo(Platform.IOS, Renderer.ANGLE_METAL, refreshRate, heapMiB * MIB, 6);
    }

    @Test
    void renderDistanceFollowsMemoryTier() {
        assertEquals(4, PresetPlan.create(Preset.MAX_PERFORMANCE, phone(1024, 60)).renderDistanceCap());
        assertEquals(6, PresetPlan.create(Preset.MAX_PERFORMANCE, phone(2048, 60)).renderDistanceCap());
        assertEquals(8, PresetPlan.create(Preset.MAX_PERFORMANCE, phone(3072, 60)).renderDistanceCap());
        assertEquals(6, PresetPlan.create(Preset.BALANCED, phone(1024, 60)).renderDistanceCap());
        assertEquals(10, PresetPlan.create(Preset.BALANCED, phone(3072, 60)).renderDistanceCap());
    }

    @Test
    void frameCapIsSixtyOrTheDisplayRateIfLower() {
        assertEquals(60, PresetPlan.create(Preset.MAX_PERFORMANCE, phone(2048, 120)).maxFpsCap());
        assertEquals(60, PresetPlan.create(Preset.MAX_PERFORMANCE, phone(2048, 0)).maxFpsCap());
        assertEquals(30, PresetPlan.create(Preset.MAX_PERFORMANCE, phone(2048, 30)).maxFpsCap());
    }

    @Test
    void maxPerformanceIsStricterThanBalanced() {
        PresetPlan max = PresetPlan.create(Preset.MAX_PERFORMANCE, phone(2048, 60));
        PresetPlan balanced = PresetPlan.create(Preset.BALANCED, phone(2048, 60));
        assertTrue(max.renderDistanceCap() < balanced.renderDistanceCap());
        assertTrue(max.disableSmoothLighting());
        assertFalse(balanced.disableSmoothLighting());
        assertTrue(max.minParticleLevel() > balanced.minParticleLevel());
        assertTrue(max.cloudCap().ordinal() < balanced.cloudCap().ordinal());
    }

    @Test
    void unknownHeapIsTreatedAsMediumTier() {
        DeviceInfo unlimited = new DeviceInfo(Platform.IOS, Renderer.UNKNOWN, 0, Long.MAX_VALUE, 6);
        assertEquals(DeviceInfo.MemoryTier.MEDIUM, unlimited.memoryTier());
    }

    @Test
    void presetNamesParseLeniently() {
        assertEquals(Preset.MAX_PERFORMANCE, Preset.parse("max", Preset.BALANCED));
        assertEquals(Preset.BALANCED, Preset.parse(" balanced ", Preset.MAX_PERFORMANCE));
        assertEquals(Preset.BALANCED, Preset.parse("nonsense", Preset.BALANCED));
    }
}
