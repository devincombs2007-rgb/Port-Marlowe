package dev.portmarlowe.fps;

import dev.portmarlowe.config.PortMarloweConfig;

/**
 * Decides the frame-rate cap for the next frame. Phones throttle hard once they heat up, so frames that
 * nobody can see (background, menus, AFK) are the cheapest performance there is: skipping them keeps
 * the SoC cool for the frames that matter.
 */
public final class FrameRateGovernor {
    private FrameRateGovernor() {
    }

    public enum Reason {
        NONE("none"),
        UNFOCUSED("unfocused"),
        MENU("menu"),
        IDLE("idle");

        private final String label;

        Reason(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    public record Decision(int limit, Reason reason) {
    }

    /**
     * @param vanillaLimit       what vanilla would cap the frame rate to (260 or more means unlimited)
     * @param focused            whether the game window has focus
     * @param inWorld            whether a level is loaded
     * @param screenOpen         whether any screen (menu, inventory, loading screen...) is open
     * @param screenShowsGameplay true for screens where the world stays the focus, like chat
     * @param idleMillis         time since the last player input
     */
    public static Decision decide(int vanillaLimit, PortMarloweConfig config, boolean focused, boolean inWorld,
                                  boolean screenOpen, boolean screenShowsGameplay, long idleMillis) {
        if (!config.dynamicFps) {
            return new Decision(vanillaLimit, Reason.NONE);
        }

        int limit = vanillaLimit;
        Reason reason = Reason.NONE;

        if (!focused && config.unfocusedFps > 0 && config.unfocusedFps < limit) {
            limit = config.unfocusedFps;
            reason = Reason.UNFOCUSED;
        }
        if (screenOpen && !screenShowsGameplay && config.menuFps > 0 && config.menuFps < limit) {
            limit = config.menuFps;
            reason = Reason.MENU;
        }
        boolean idle = inWorld && !screenOpen && config.idleTimeoutSeconds > 0 && config.idleFps > 0
                && idleMillis >= config.idleTimeoutSeconds * 1000L;
        if (idle && config.idleFps < limit) {
            limit = config.idleFps;
            reason = Reason.IDLE;
        }
        return new Decision(Math.max(1, limit), reason);
    }
}
