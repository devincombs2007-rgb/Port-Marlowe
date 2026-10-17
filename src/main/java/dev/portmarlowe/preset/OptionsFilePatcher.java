package dev.portmarlowe.preset;

import java.util.ArrayList;
import java.util.List;

/**
 * Rewrites vanilla's {@code options.txt} so a {@link PresetPlan} is in effect the first time the game
 * reads it. Patching the file (instead of calling the option setters later) means nothing has to be
 * reloaded: no second resource reload for the mipmap change, no chunk rebuild for the render distance.
 *
 * <p>Value formats and defaults are those of Minecraft 1.21.1.
 */
public final class OptionsFilePatcher {
    private OptionsFilePatcher() {
    }

    /**
     * @param lines                 current file contents, empty if the file does not exist yet
     * @param dataVersionForNewFile written as {@code version:} when creating a new file so vanilla does not
     *                              run its options data fixers over it; ignored for existing files
     */
    public static List<String> patch(List<String> lines, PresetPlan plan, int dataVersionForNewFile) {
        Entries options = new Entries(lines);

        options.capInt("renderDistance", plan.renderDistanceCap(), 12);
        options.capInt("simulationDistance", Math.max(PresetPlan.VANILLA_MIN_SIMULATION_DISTANCE, plan.simulationDistanceCap()), 12);
        options.capInt("graphicsMode", 0, 1);
        if (plan.disableSmoothLighting()) {
            options.set("ao", "false");
        }
        options.capInt("biomeBlendRadius", plan.biomeBlendCap(), 2);
        options.capInt("mipmapLevels", plan.mipmapCap(), 4);
        options.set("entityShadows", "false");
        options.floorInt("particles", plan.minParticleLevel(), 0, 2);
        options.capDouble("entityDistanceScaling", plan.entityDistanceCap(), 1.0);
        options.capInt("maxFps", plan.maxFpsCap(), 120);

        CloudMode clouds = CloudMode.fromOptionsValue(options.get("renderClouds"), CloudMode.FANCY);
        if (clouds.ordinal() > plan.cloudCap().ordinal()) {
            options.set("renderClouds", '"' + plan.cloudCap().optionsValue() + '"');
        }

        // Threaded chunk updates: never block the render thread to rebuild nearby sections.
        options.set("prioritizeChunkUpdates", "0");
        options.capInt("menuBackgroundBlurriness", plan.menuBlurCap(), 5);
        if (plan.disableRealmsNotifications()) {
            options.set("realmsNotifications", "false");
        }

        List<String> result = options.lines();
        if (lines.isEmpty() && dataVersionForNewFile > 0) {
            result.add(0, "version:" + dataVersionForNewFile);
        }
        return result;
    }

    /** Ordered {@code key:value} lines; unknown lines are preserved untouched. */
    private static final class Entries {
        private final List<String[]> entries = new ArrayList<>();

        Entries(List<String> lines) {
            for (String line : lines) {
                int colon = line.indexOf(':');
                entries.add(colon < 0 ? new String[]{line, null} : new String[]{line.substring(0, colon), line.substring(colon + 1)});
            }
        }

        String get(String key) {
            String value = null;
            for (String[] entry : entries) {
                if (entry[1] != null && entry[0].equals(key)) {
                    value = entry[1]; // vanilla keeps the last occurrence
                }
            }
            return value;
        }

        void set(String key, String value) {
            boolean found = false;
            for (String[] entry : entries) {
                if (entry[1] != null && entry[0].equals(key)) {
                    entry[1] = value;
                    found = true;
                }
            }
            if (!found) {
                entries.add(new String[]{key, value});
            }
        }

        void capInt(String key, int cap, int vanillaDefault) {
            int current = parseInt(get(key), vanillaDefault);
            if (current > cap || get(key) == null) {
                set(key, Integer.toString(Math.min(current, cap)));
            }
        }

        void floorInt(String key, int floor, int vanillaDefault, int max) {
            int current = Math.min(parseInt(get(key), vanillaDefault), max);
            if (current < floor || get(key) == null) {
                set(key, Integer.toString(Math.max(current, floor)));
            }
        }

        void capDouble(String key, double cap, double vanillaDefault) {
            double current = parseDouble(get(key), vanillaDefault);
            if (current > cap || get(key) == null) {
                set(key, Double.toString(Math.min(current, cap)));
            }
        }

        List<String> lines() {
            List<String> lines = new ArrayList<>(entries.size() + 1);
            for (String[] entry : entries) {
                lines.add(entry[1] == null ? entry[0] : entry[0] + ':' + entry[1]);
            }
            return lines;
        }

        private static int parseInt(String value, int fallback) {
            if (value == null) {
                return fallback;
            }
            try {
                return Integer.parseInt(value.trim());
            } catch (NumberFormatException e) {
                return fallback;
            }
        }

        private static double parseDouble(String value, double fallback) {
            if (value == null) {
                return fallback;
            }
            try {
                double parsed = Double.parseDouble(value.trim());
                return Double.isFinite(parsed) ? parsed : fallback;
            } catch (NumberFormatException e) {
                return fallback;
            }
        }
    }
}
