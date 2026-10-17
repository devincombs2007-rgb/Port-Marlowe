package dev.portmarlowe.platform;

import java.util.function.UnaryOperator;

/**
 * The OpenGL implementation (usually a translation layer on mobile) the game was started with.
 * Amethyst iOS ships ANGLE-on-Metal ({@code libtinygl4angle.dylib}), GL4ES ({@code libgl4es_114.dylib}),
 * MobileGlues ({@code libmobileglues.dylib}) and Zink-on-MoltenVK ({@code libOSMesa.8.dylib}).
 */
public enum Renderer {
    ANGLE_METAL("ANGLE (Metal)"),
    GL4ES("GL4ES"),
    MOBILEGLUES("MobileGlues"),
    ZINK("Zink (Vulkan)"),
    NATIVE("Native OpenGL"),
    UNKNOWN("Unknown");

    private final String displayName;

    Renderer(String displayName) {
        this.displayName = displayName;
    }

    public String displayName() {
        return displayName;
    }

    public static Renderer detect(UnaryOperator<String> systemProperties, UnaryOperator<String> environment, Platform platform) {
        String hints = Platform.lower(systemProperties.apply("org.lwjgl.opengl.libname")) + ' '
                + Platform.lower(environment.apply("RENDERER")) + ' '
                + Platform.lower(environment.apply("POJAV_RENDERER"));

        if (hints.contains("angle")) {
            return ANGLE_METAL;
        }
        if (hints.contains("mobileglues")) {
            return MOBILEGLUES;
        }
        if (hints.contains("gl4es") || hints.contains("opengles2")) {
            return GL4ES;
        }
        if (hints.contains("osmesa") || hints.contains("zink") || hints.contains("vulkan")) {
            return ZINK;
        }
        return platform.isMobile() ? UNKNOWN : NATIVE;
    }
}
