package dev.portmarlowe;

import dev.portmarlowe.config.PortMarloweConfig;
import dev.portmarlowe.platform.DeviceInfo;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.loader.api.FabricLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Path;

public final class PortMarlowe implements ClientModInitializer {
    public static final String MOD_ID = "portmarlowe";
    public static final Logger LOGGER = LoggerFactory.getLogger("Port Marlowe");

    private static final Object LOCK = new Object();
    private static volatile PortMarloweConfig config;
    private static volatile DeviceInfo device;

    @Override
    public void onInitializeClient() {
        config();
    }

    /**
     * Mixins can run before the client entrypoint (options load, render buffer allocation), so the
     * config is loaded on first use from wherever that happens to be.
     */
    public static PortMarloweConfig config() {
        PortMarloweConfig current = config;
        if (current == null) {
            synchronized (LOCK) {
                current = config;
                if (current == null) {
                    current = initialize();
                }
            }
        }
        return current;
    }

    public static DeviceInfo device() {
        config();
        return device;
    }

    public static void saveConfig() {
        try {
            config().save(configPath());
        } catch (IOException e) {
            LOGGER.warn("Could not save {}", configPath(), e);
        }
    }

    public static boolean isSodiumLoaded() {
        return FabricLoader.getInstance().isModLoaded("sodium");
    }

    /** Worker cap for chunk meshing, or 0 to keep vanilla's choice. */
    public static int chunkBuilderCap() {
        int configured = config().chunkBuilderThreads;
        if (configured > 0) {
            return configured;
        }
        if (!device().platform().isMobile()) {
            return 0;
        }
        // Sodium meshes chunks with its own buffers, so vanilla's pool is dead weight there.
        return isSodiumLoaded() ? 1 : 3;
    }

    private static Path configPath() {
        return FabricLoader.getInstance().getConfigDir().resolve(MOD_ID + ".json");
    }

    private static PortMarloweConfig initialize() {
        PortMarloweConfig.LoadResult result = PortMarloweConfig.load(configPath());
        if (result.error() != null) {
            LOGGER.warn("{} was unreadable and has been reset (old copy kept as .broken)", configPath(), result.error());
        }
        PortMarloweConfig loaded = result.config();
        device = DeviceInfo.detectCurrent(loaded.platformOverrideOrNull());
        config = loaded;
        if (result.created()) {
            try {
                loaded.save(configPath());
            } catch (IOException e) {
                LOGGER.warn("Could not write {}", configPath(), e);
            }
        }
        LOGGER.info("Running on {}{}", device.describe(), device.platform().isMobile() ? " - mobile optimizations enabled" : "");
        return loaded;
    }
}
