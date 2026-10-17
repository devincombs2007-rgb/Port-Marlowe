package dev.portmarlowe.platform;

import java.util.Locale;
import java.util.function.UnaryOperator;

/**
 * The kind of device the game is running on.
 *
 * <p>Detection relies on what the mobile launchers actually set up before starting the JVM. Amethyst
 * (formerly PojavLauncher iOS) passes {@code -DUIScreen.maximumFramesPerSecond=<hz>}, exports
 * {@code AME_HOME} and installs {@code net.kdt.pojavlaunch.PojavClassLoader} as the system class
 * loader. Android launchers in the Pojav family export {@code POJAV_NATIVEDIR}/{@code POJAV_RENDERER}.
 */
public enum Platform {
    IOS("iOS"),
    ANDROID("Android"),
    DESKTOP("Desktop");

    public static final String OVERRIDE_PROPERTY = "portmarlowe.platform";

    private final String displayName;

    Platform(String displayName) {
        this.displayName = displayName;
    }

    public String displayName() {
        return displayName;
    }

    public boolean isMobile() {
        return this != DESKTOP;
    }

    public static Platform detect(UnaryOperator<String> systemProperties, UnaryOperator<String> environment) {
        Platform forced = parse(systemProperties.apply(OVERRIDE_PROPERTY));
        if (forced != null) {
            return forced;
        }

        if (systemProperties.apply("UIScreen.maximumFramesPerSecond") != null || environment.apply("AME_HOME") != null) {
            return IOS;
        }
        if (environment.apply("POJAV_NATIVEDIR") != null || environment.apply("POJAV_RENDERER") != null
                || environment.apply("FCL_NATIVEDIR") != null) {
            return ANDROID;
        }

        String classLoader = systemProperties.apply("java.system.class.loader");
        if (classLoader != null && classLoader.startsWith("net.kdt.pojavlaunch.")) {
            return IOS;
        }

        String os = lower(systemProperties.apply("os.name"));
        if (os.contains("ios")) {
            return IOS;
        }
        if (os.contains("android")) {
            return ANDROID;
        }
        if (environment.apply("POJAV_HOME") != null && (os.contains("darwin") || os.contains("mac"))) {
            return IOS;
        }

        String home = lower(systemProperties.apply("user.home"));
        if (home.startsWith("/data/") || home.startsWith("/storage/emulated")) {
            return ANDROID;
        }
        return DESKTOP;
    }

    /** Parses a user supplied platform name; returns {@code null} for "auto", blank or unknown values. */
    public static Platform parse(String value) {
        return switch (lower(value).trim()) {
            case "ios", "iphone", "ipad", "ipados" -> IOS;
            case "android" -> ANDROID;
            case "desktop", "pc", "windows", "linux", "macos", "mac" -> DESKTOP;
            default -> null;
        };
    }

    static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
