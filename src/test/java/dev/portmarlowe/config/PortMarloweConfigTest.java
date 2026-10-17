package dev.portmarlowe.config;

import dev.portmarlowe.platform.Platform;
import dev.portmarlowe.preset.Preset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PortMarloweConfigTest {
    @TempDir
    Path dir;

    @Test
    void missingFileGivesDefaults() {
        PortMarloweConfig.LoadResult result = PortMarloweConfig.load(dir.resolve("portmarlowe.json"));
        assertTrue(result.created());
        assertNull(result.error());
        assertEquals(1500, result.config().particleLimit);
        assertEquals(Preset.MAX_PERFORMANCE, result.config().presetOrDefault());
    }

    @Test
    void roundTripsAndKeepsDefaultsForMissingKeys() throws Exception {
        Path file = dir.resolve("portmarlowe.json");
        Files.writeString(file, "{ \"menuFps\": 20, \"presetApplied\": true, \"platformOverride\": \"ios\" }");
        PortMarloweConfig config = PortMarloweConfig.load(file).config();
        assertEquals(20, config.menuFps);
        assertTrue(config.presetApplied);
        assertEquals(Platform.IOS, config.platformOverrideOrNull());
        assertEquals(32, config.blockEntityDistance, "absent keys keep their defaults");

        config.blockEntityDistance = 16;
        config.save(file);
        PortMarloweConfig reloaded = PortMarloweConfig.load(file).config();
        assertEquals(16, reloaded.blockEntityDistance);
        assertEquals(20, reloaded.menuFps);
        assertFalse(Files.exists(dir.resolve("portmarlowe.json.tmp")));
    }

    @Test
    void outOfRangeValuesAreClamped() throws Exception {
        Path file = dir.resolve("portmarlowe.json");
        Files.writeString(file, "{ \"particleLimit\": -5, \"ambientEffectsPercent\": 400, \"preset\": \"weird\", \"platformOverride\": \"toaster\" }");
        PortMarloweConfig config = PortMarloweConfig.load(file).config();
        assertEquals(0, config.particleLimit);
        assertEquals(100, config.ambientEffectsPercent);
        assertEquals("MAX_PERFORMANCE", config.preset);
        assertEquals("auto", config.platformOverride);
    }

    @Test
    void brokenFileIsSetAsideAndDefaultsUsed() throws Exception {
        Path file = dir.resolve("portmarlowe.json");
        Files.writeString(file, "{ this is not json");
        PortMarloweConfig.LoadResult result = PortMarloweConfig.load(file);
        assertNotNull(result.error());
        assertTrue(result.created());
        assertTrue(Files.exists(dir.resolve("portmarlowe.json.broken")));
        assertEquals(30, result.config().menuFps);
    }
}
