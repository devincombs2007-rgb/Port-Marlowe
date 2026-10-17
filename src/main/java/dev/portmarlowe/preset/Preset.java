package dev.portmarlowe.preset;

import java.util.Locale;

public enum Preset {
    /** Everything that costs frames on a phone is turned down or off. */
    MAX_PERFORMANCE("portmarlowe.preset.max_performance"),
    /** Keeps smooth lighting and a little more view distance; still far cheaper than vanilla. */
    BALANCED("portmarlowe.preset.balanced");

    private final String translationKey;

    Preset(String translationKey) {
        this.translationKey = translationKey;
    }

    public String translationKey() {
        return translationKey;
    }

    public static Preset parse(String value, Preset fallback) {
        if (value == null) {
            return fallback;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT).replace(' ', '_').replace('-', '_');
        return switch (normalized) {
            case "MAX_PERFORMANCE", "MAX", "PERFORMANCE" -> MAX_PERFORMANCE;
            case "BALANCED" -> BALANCED;
            default -> fallback;
        };
    }
}
