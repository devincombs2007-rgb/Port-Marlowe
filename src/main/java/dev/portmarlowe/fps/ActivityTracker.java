package dev.portmarlowe.fps;

/**
 * Remembers when the player last touched the screen, pressed a key or moved the mouse. On Amethyst
 * touches and the on-screen controls arrive as regular GLFW cursor, button and key events.
 */
public final class ActivityTracker {
    private static volatile long lastActivityNanos = System.nanoTime();

    private ActivityTracker() {
    }

    public static void markActive() {
        lastActivityNanos = System.nanoTime();
    }

    public static long idleMillis() {
        return (System.nanoTime() - lastActivityNanos) / 1_000_000L;
    }
}
