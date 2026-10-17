package dev.portmarlowe.selftest;

import net.fabricmc.api.ClientModInitializer;

public final class SelfTestClient implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        SelfTest.LOGGER.info("Self-test armed (enabled: {})", SelfTest.ENABLED);
    }
}
