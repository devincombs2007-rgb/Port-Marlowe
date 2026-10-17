package dev.portmarlowe.preset;

import dev.portmarlowe.platform.DeviceInfo;
import dev.portmarlowe.platform.Platform;
import dev.portmarlowe.platform.Renderer;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OptionsFilePatcherTest {
    private static final long GIB = 1024L * 1024L * 1024L;
    private static final DeviceInfo IPHONE = new DeviceInfo(Platform.IOS, Renderer.ANGLE_METAL, 120, 2 * GIB, 6);
    private static final PresetPlan MAX = PresetPlan.create(Preset.MAX_PERFORMANCE, IPHONE);
    private static final PresetPlan BALANCED = PresetPlan.create(Preset.BALANCED, IPHONE);

    @Test
    void freshFileGetsVersionAndEveryCappedSetting() {
        Map<String, String> options = parse(OptionsFilePatcher.patch(List.of(), MAX, 3955));
        assertEquals("3955", options.get("version"));
        assertEquals("6", options.get("renderDistance"));
        assertEquals("5", options.get("simulationDistance"));
        assertEquals("0", options.get("graphicsMode"));
        assertEquals("false", options.get("ao"));
        assertEquals("0", options.get("biomeBlendRadius"));
        assertEquals("0", options.get("mipmapLevels"));
        assertEquals("false", options.get("entityShadows"));
        assertEquals("2", options.get("particles"));
        assertEquals("0.5", options.get("entityDistanceScaling"));
        assertEquals("60", options.get("maxFps"));
        assertEquals("\"false\"", options.get("renderClouds"));
        assertEquals("0", options.get("prioritizeChunkUpdates"));
        assertEquals("0", options.get("menuBackgroundBlurriness"));
        assertEquals("false", options.get("realmsNotifications"));
    }

    @Test
    void neverMakesExistingSettingsMoreExpensive() {
        List<String> amethystDefaults = List.of(
                "fullscreen:false", "overrideWidth:2556", "overrideHeight:1179",
                "mipmapLevels:0", "particles:1", "renderDistance:2", "simulationDistance:5", "maxFps:30");
        Map<String, String> options = parse(OptionsFilePatcher.patch(amethystDefaults, BALANCED, 3955));
        assertEquals("2", options.get("renderDistance"), "render distance must not be raised");
        assertEquals("0", options.get("mipmapLevels"), "mipmaps must not be raised");
        assertEquals("30", options.get("maxFps"), "a lower fps cap is kept");
        assertEquals("1", options.get("particles"));
        assertFalse(options.containsKey("version"), "existing files keep their own data version handling");
        assertFalse(options.containsKey("ao"), "balanced keeps smooth lighting");
    }

    @Test
    void lowersExpensiveSettingsAndPreservesEverythingElse() {
        List<String> vanilla = List.of(
                "version:3955", "renderDistance:16", "graphicsMode:2", "renderClouds:\"true\"", "particles:0",
                "entityDistanceScaling:2.5", "key_key.attack:key.mouse.left", "lang:en_us", "maxFps:260");
        List<String> patched = OptionsFilePatcher.patch(vanilla, BALANCED, 3955);
        Map<String, String> options = parse(patched);
        assertEquals("8", options.get("renderDistance"));
        assertEquals("0", options.get("graphicsMode"));
        assertEquals("\"fast\"", options.get("renderClouds"));
        assertEquals("1", options.get("particles"));
        assertEquals("0.75", options.get("entityDistanceScaling"));
        assertEquals("60", options.get("maxFps"));
        assertEquals("key.mouse.left", options.get("key_key.attack"), "values containing ':' survive");
        assertEquals("en_us", options.get("lang"));
        assertEquals("version:3955", patched.get(0), "line order is preserved");
    }

    @Test
    void cheaperCloudsAreKept() {
        Map<String, String> options = parse(OptionsFilePatcher.patch(List.of("renderClouds:\"false\""), BALANCED, 0));
        assertEquals("\"false\"", options.get("renderClouds"));
    }

    @Test
    void garbageValuesFallBackToVanillaDefaultsBeforeCapping() {
        Map<String, String> options = parse(OptionsFilePatcher.patch(List.of("renderDistance:lots", "entityDistanceScaling:NaN"), MAX, 0));
        assertEquals("6", options.get("renderDistance"));
        assertEquals("0.5", options.get("entityDistanceScaling"));
    }

    @Test
    void simulationDistanceNeverDropsBelowVanillaMinimum() {
        PresetPlan silly = new PresetPlan(2, 1, true, 0, 0, 2, 0.5, 30, CloudMode.OFF, 0, true);
        Map<String, String> options = parse(OptionsFilePatcher.patch(List.of(), silly, 0));
        assertEquals("5", options.get("simulationDistance"));
        assertTrue(options.containsKey("renderDistance"));
    }

    private static Map<String, String> parse(List<String> lines) {
        Map<String, String> map = new LinkedHashMap<>();
        for (String line : lines) {
            int colon = line.indexOf(':');
            map.put(line.substring(0, colon), line.substring(colon + 1));
        }
        return map;
    }
}
