package dev.portmarlowe.gui;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * The mod's English strings, read straight from its jar. Fabric Loader on its own does not load mod
 * resources (Fabric API does), so without this the settings screen would show raw translation keys.
 */
public final class BundledTranslations {
    private static final String PATH = "/assets/portmarlowe/lang/en_us.json";
    private static volatile Map<String, String> english;

    private BundledTranslations() {
    }

    public static Map<String, String> english() {
        Map<String, String> current = english;
        if (current == null) {
            current = load();
            english = current;
        }
        return current;
    }

    private static Map<String, String> load() {
        try (InputStream in = BundledTranslations.class.getResourceAsStream(PATH)) {
            if (in == null) {
                return Map.of();
            }
            try (Reader reader = new InputStreamReader(in, StandardCharsets.UTF_8)) {
                Map<String, String> map = new Gson().fromJson(reader, new TypeToken<Map<String, String>>() {
                }.getType());
                return map == null ? Map.of() : Map.copyOf(map);
            }
        } catch (IOException | RuntimeException e) {
            return Map.of();
        }
    }
}
