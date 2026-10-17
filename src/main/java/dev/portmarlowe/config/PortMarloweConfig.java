package dev.portmarlowe.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import dev.portmarlowe.platform.Platform;
import dev.portmarlowe.preset.Preset;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * {@code config/portmarlowe.json}. Every limit uses 0 to mean "leave vanilla alone".
 */
public final class PortMarloweConfig {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();

    /** auto, ios, android or desktop. */
    public String platformOverride = "auto";

    /** Apply {@link #preset} to the vanilla video settings the first time the game starts on a phone. */
    public boolean autoApplyPreset = true;
    public String preset = Preset.MAX_PERFORMANCE.name();
    public boolean presetApplied = false;

    /** Lower the frame-rate cap while it cannot be noticed, so the phone stays cool and does not throttle. */
    public boolean dynamicFps = true;
    /** Cap while a menu or inventory is open (chat is exempt). */
    public int menuFps = 30;
    /** Cap while the app is in the background / the window is unfocused. */
    public int unfocusedFps = 5;
    /** Cap after {@link #idleTimeoutSeconds} without any touch, key or mouse input. */
    public int idleFps = 15;
    public int idleTimeoutSeconds = 180;

    /** Upper bound on live particles (vanilla: 16384 per render type). */
    public int particleLimit = 1500;
    /** Skip building geometry for particles outside the camera frustum. */
    public boolean particleCulling = true;

    /** Render distance in blocks for chests, signs, banners, skulls, ... (vanilla: 64). */
    public int blockEntityDistance = 32;
    /** Percentage of vanilla's per-tick ambient block effects (torch smoke, dripping, fire crackle...). */
    public int ambientEffectsPercent = 50;
    /** Animated block textures (water, lava, fire, portals). Each frame is a texture upload. */
    public boolean textureAnimations = true;

    /** Parallel chunk meshing workers; each holds ~10 MB of native buffers. 0 = automatic. */
    public int chunkBuilderThreads = 0;

    public Preset presetOrDefault() {
        return Preset.parse(preset, Preset.MAX_PERFORMANCE);
    }

    /** The platform the player forced in the config, or {@code null} for automatic detection. */
    public Platform platformOverrideOrNull() {
        return Platform.parse(platformOverride);
    }

    /** Clamps every value into its supported range. */
    public PortMarloweConfig sanitize() {
        if (platformOverride == null || (Platform.parse(platformOverride) == null && !"auto".equalsIgnoreCase(platformOverride.trim()))) {
            platformOverride = "auto";
        }
        preset = presetOrDefault().name();
        menuFps = clamp(menuFps, 0, 260);
        unfocusedFps = clamp(unfocusedFps, 0, 260);
        idleFps = clamp(idleFps, 0, 260);
        idleTimeoutSeconds = clamp(idleTimeoutSeconds, 0, 3600);
        particleLimit = clamp(particleLimit, 0, 16384);
        blockEntityDistance = clamp(blockEntityDistance, 0, 256);
        ambientEffectsPercent = clamp(ambientEffectsPercent, 0, 100);
        chunkBuilderThreads = clamp(chunkBuilderThreads, 0, 32);
        return this;
    }

    public static LoadResult load(Path file) {
        if (!Files.isRegularFile(file)) {
            return new LoadResult(new PortMarloweConfig(), true, null);
        }
        try (Reader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            PortMarloweConfig config = GSON.fromJson(reader, PortMarloweConfig.class);
            if (config == null) {
                throw new JsonParseException("empty file");
            }
            return new LoadResult(config.sanitize(), false, null);
        } catch (IOException | JsonParseException e) {
            Path backup = file.resolveSibling(file.getFileName() + ".broken");
            try {
                Files.move(file, backup, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException ignored) {
                // Keep going with defaults; the next save overwrites the broken file.
            }
            return new LoadResult(new PortMarloweConfig(), true, e);
        }
    }

    /** Writes to a temporary file first: iOS may kill the app at any moment and a torn config must not survive. */
    public void save(Path file) throws IOException {
        Files.createDirectories(file.toAbsolutePath().getParent());
        Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
        Files.writeString(tmp, GSON.toJson(this) + System.lineSeparator(), StandardCharsets.UTF_8);
        try {
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * @param created true when no usable file existed and defaults were used
     * @param error   why an existing file could not be read, if it could not
     */
    public record LoadResult(PortMarloweConfig config, boolean created, Exception error) {
    }
}
