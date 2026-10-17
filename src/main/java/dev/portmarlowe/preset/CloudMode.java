package dev.portmarlowe.preset;

/** Mirrors vanilla's cloud setting, ordered from cheapest to most expensive. */
public enum CloudMode {
    OFF("false"),
    FAST("fast"),
    FANCY("true");

    /** The value as stored (JSON-quoted) in {@code options.txt}. */
    private final String optionsValue;

    CloudMode(String optionsValue) {
        this.optionsValue = optionsValue;
    }

    public String optionsValue() {
        return optionsValue;
    }

    public static CloudMode fromOptionsValue(String raw, CloudMode fallback) {
        if (raw == null) {
            return fallback;
        }
        String value = raw.trim();
        if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length() - 1);
        }
        for (CloudMode mode : values()) {
            if (mode.optionsValue.equals(value)) {
                return mode;
            }
        }
        return fallback;
    }
}
