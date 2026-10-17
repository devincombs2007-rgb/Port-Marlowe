package dev.portmarlowe.platform;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.function.UnaryOperator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class PlatformTest {
    private static UnaryOperator<String> of(Map<String, String> values) {
        return values::get;
    }

    private static final UnaryOperator<String> NONE = key -> null;

    @Test
    void amethystOnIphone() {
        // Exactly what Amethyst's JavaLauncher.m passes to the JVM.
        UnaryOperator<String> props = of(Map.of(
                "UIScreen.maximumFramesPerSecond", "120",
                "java.system.class.loader", "net.kdt.pojavlaunch.PojavClassLoader",
                "org.lwjgl.opengl.libname", "libtinygl4angle.dylib",
                "os.name", "Darwin"));
        UnaryOperator<String> env = of(Map.of("AME_HOME", "/var/mobile/Documents/amethyst", "RENDERER", "auto"));
        DeviceInfo device = DeviceInfo.detect(props, env, null, 2048L << 20, 6);
        assertEquals(Platform.IOS, device.platform());
        assertEquals(Renderer.ANGLE_METAL, device.renderer());
        assertEquals(120, device.displayRefreshRate());
        assertEquals(DeviceInfo.MemoryTier.MEDIUM, device.memoryTier());
    }

    @Test
    void iosRenderersAreRecognised() {
        UnaryOperator<String> env = of(Map.of("AME_HOME", "/x"));
        assertEquals(Renderer.GL4ES, Renderer.detect(of(Map.of("org.lwjgl.opengl.libname", "libgl4es_114.dylib")), env, Platform.IOS));
        assertEquals(Renderer.MOBILEGLUES, Renderer.detect(of(Map.of("org.lwjgl.opengl.libname", "libmobileglues.dylib")), env, Platform.IOS));
        assertEquals(Renderer.ZINK, Renderer.detect(of(Map.of("org.lwjgl.opengl.libname", "libOSMesa.8.dylib")), env, Platform.IOS));
        assertEquals(Renderer.UNKNOWN, Renderer.detect(NONE, env, Platform.IOS));
        assertEquals(Renderer.NATIVE, Renderer.detect(NONE, NONE, Platform.DESKTOP));
    }

    @Test
    void androidLaunchers() {
        assertEquals(Platform.ANDROID, Platform.detect(NONE, of(Map.of("POJAV_NATIVEDIR", "/data/app/lib"))));
        assertEquals(Platform.ANDROID, Platform.detect(of(Map.of("user.home", "/storage/emulated/0/games")), NONE));
    }

    @Test
    void desktopByDefault() {
        assertEquals(Platform.DESKTOP, Platform.detect(of(Map.of("os.name", "Mac OS X", "user.home", "/Users/steve")), NONE));
        assertEquals(Platform.DESKTOP, Platform.detect(of(Map.of("os.name", "Windows 11")), NONE));
    }

    @Test
    void overrides() {
        assertEquals(Platform.IOS, Platform.detect(of(Map.of(Platform.OVERRIDE_PROPERTY, "iphone")), NONE));
        assertEquals(Platform.DESKTOP, DeviceInfo.detect(of(Map.of("UIScreen.maximumFramesPerSecond", "60")), NONE, Platform.DESKTOP, 1L << 30, 4).platform());
        assertNull(Platform.parse("auto"));
        assertNull(Platform.parse(null));
    }
}
