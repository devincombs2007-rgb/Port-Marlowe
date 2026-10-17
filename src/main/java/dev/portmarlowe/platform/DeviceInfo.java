package dev.portmarlowe.platform;

import java.util.function.UnaryOperator;

/**
 * A snapshot of the hardware facts the optimizations are tuned against.
 *
 * @param displayRefreshRate the panel's maximum refresh rate in Hz, or 0 when unknown
 * @param maxHeapBytes       the JVM heap limit ({@code -Xmx}); mobile launchers derive it from device RAM
 */
public record DeviceInfo(Platform platform, Renderer renderer, int displayRefreshRate, long maxHeapBytes, int cpuCores) {
    private static final long MIB = 1024L * 1024L;

    public enum MemoryTier {
        /** Under 1.25 GiB of heap: older iPhones or the launcher's default 25% RAM allocation. */
        LOW,
        /** Under 2.5 GiB of heap. */
        MEDIUM,
        HIGH
    }

    public static DeviceInfo detect(UnaryOperator<String> systemProperties, UnaryOperator<String> environment,
                                    Platform platformOverride, long maxHeapBytes, int cpuCores) {
        Platform platform = platformOverride != null ? platformOverride : Platform.detect(systemProperties, environment);
        Renderer renderer = Renderer.detect(systemProperties, environment, platform);
        int refreshRate = parsePositiveInt(systemProperties.apply("UIScreen.maximumFramesPerSecond"));
        return new DeviceInfo(platform, renderer, refreshRate, maxHeapBytes, cpuCores);
    }

    public static DeviceInfo detectCurrent(Platform platformOverride) {
        Runtime runtime = Runtime.getRuntime();
        return detect(System::getProperty, System::getenv, platformOverride, runtime.maxMemory(), runtime.availableProcessors());
    }

    public MemoryTier memoryTier() {
        if (maxHeapBytes <= 0 || maxHeapBytes == Long.MAX_VALUE) {
            return MemoryTier.MEDIUM;
        }
        if (maxHeapBytes < 1280 * MIB) {
            return MemoryTier.LOW;
        }
        return maxHeapBytes < 2560 * MIB ? MemoryTier.MEDIUM : MemoryTier.HIGH;
    }

    public long maxHeapMiB() {
        return maxHeapBytes == Long.MAX_VALUE ? -1 : maxHeapBytes / MIB;
    }

    public String describe() {
        StringBuilder sb = new StringBuilder(platform.displayName()).append(", ").append(renderer.displayName());
        if (displayRefreshRate > 0) {
            sb.append(", ").append(displayRefreshRate).append(" Hz");
        }
        long heap = maxHeapMiB();
        if (heap > 0) {
            sb.append(", ").append(heap).append(" MiB heap");
        }
        return sb.append(", ").append(cpuCores).append(" cores").toString();
    }

    private static int parsePositiveInt(String value) {
        if (value == null) {
            return 0;
        }
        try {
            return Math.max(0, Integer.parseInt(value.trim()));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
