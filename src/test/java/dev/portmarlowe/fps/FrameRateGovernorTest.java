package dev.portmarlowe.fps;

import dev.portmarlowe.config.PortMarloweConfig;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FrameRateGovernorTest {
    private final PortMarloweConfig config = new PortMarloweConfig();

    private FrameRateGovernor.Decision decide(int vanilla, boolean focused, boolean inWorld, boolean screen, boolean chat, long idleMillis) {
        return FrameRateGovernor.decide(vanilla, config, focused, inWorld, screen, chat, idleMillis);
    }

    @Test
    void gameplayIsNeverCapped() {
        assertEquals(new FrameRateGovernor.Decision(60, FrameRateGovernor.Reason.NONE), decide(60, true, true, false, false, 0));
        assertEquals(260, decide(260, true, true, false, false, 0).limit());
    }

    @Test
    void menusAreCappedButChatIsNot() {
        assertEquals(new FrameRateGovernor.Decision(30, FrameRateGovernor.Reason.MENU), decide(60, true, true, true, false, 0));
        assertEquals(60, decide(60, true, true, true, true, 0).limit());
        assertEquals(30, decide(60, true, false, true, false, 0).limit(), "title screen");
    }

    @Test
    void neverRaisesALowerVanillaLimit() {
        assertEquals(new FrameRateGovernor.Decision(20, FrameRateGovernor.Reason.NONE), decide(20, true, true, true, false, 0));
    }

    @Test
    void unfocusedWinsOverMenu() {
        assertEquals(new FrameRateGovernor.Decision(5, FrameRateGovernor.Reason.UNFOCUSED), decide(60, false, true, true, false, 0));
    }

    @Test
    void idleOnlyAfterTimeoutAndOnlyInGameplay() {
        long timeout = config.idleTimeoutSeconds * 1000L;
        assertEquals(60, decide(60, true, true, false, false, timeout - 1).limit());
        assertEquals(new FrameRateGovernor.Decision(15, FrameRateGovernor.Reason.IDLE), decide(60, true, true, false, false, timeout));
        assertEquals(30, decide(60, true, true, true, false, timeout).limit(), "menu cap applies, not idle");
        assertEquals(30, decide(60, true, false, true, false, timeout).limit());
    }

    @Test
    void zeroDisablesEachCapAndTheSwitchDisablesAll() {
        config.menuFps = 0;
        config.idleTimeoutSeconds = 0;
        config.unfocusedFps = 0;
        assertEquals(60, decide(60, false, true, true, false, Long.MAX_VALUE).limit());

        PortMarloweConfig off = new PortMarloweConfig();
        off.dynamicFps = false;
        assertEquals(60, FrameRateGovernor.decide(60, off, false, true, true, false, Long.MAX_VALUE).limit());
    }
}
