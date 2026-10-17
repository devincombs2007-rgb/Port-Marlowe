package dev.portmarlowe.gui;

import dev.portmarlowe.preset.Preset;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;

class BundledTranslationsTest {
    private final Map<String, String> english = BundledTranslations.english();

    @Test
    void presetsHaveNamesAndTooltips() {
        for (Preset preset : Preset.values()) {
            assertTrue(english.containsKey(preset.translationKey()), preset.translationKey());
            assertTrue(english.containsKey(preset.translationKey() + ".tooltip"), preset.translationKey() + ".tooltip");
        }
    }

    @Test
    void everyKeyUsedBySettingsScreensExists() throws IOException {
        Path gui = Path.of("src/main/java/dev/portmarlowe/gui/PortMarloweOptionsScreen.java");
        Path mixin = Path.of("src/main/java/dev/portmarlowe/mixin/VideoSettingsScreenMixin.java");
        String source = Files.readString(gui) + Files.readString(mixin);

        // Options are declared as toggle("name", ...) / slider("name", ...) and get a caption plus a tooltip.
        Matcher option = Pattern.compile("(?:toggle|slider)\\(\"([a-z_]+)\"").matcher(source);
        int options = 0;
        while (option.find()) {
            options++;
            String key = "portmarlowe.options." + option.group(1);
            assertTrue(english.containsKey(key), key);
            assertTrue(english.containsKey(key + ".tooltip"), key + ".tooltip");
        }
        assertTrue(options >= 10, "found only " + options + " options");

        Matcher direct = Pattern.compile("translatable\\((?:KEY \\+ )?\"([a-z_.]+)\"").matcher(source);
        while (direct.find()) {
            String key = direct.group(1).startsWith("portmarlowe.") ? direct.group(1) : "portmarlowe.options." + direct.group(1);
            assertTrue(english.containsKey(key), key);
        }
    }
}
