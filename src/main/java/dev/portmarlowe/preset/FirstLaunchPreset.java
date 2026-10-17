package dev.portmarlowe.preset;

import dev.portmarlowe.PortMarlowe;
import dev.portmarlowe.config.PortMarloweConfig;
import dev.portmarlowe.platform.DeviceInfo;
import net.minecraft.SharedConstants;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;

/** Applies the configured preset to {@code options.txt} right before vanilla reads it for the first time. */
public final class FirstLaunchPreset {
    private FirstLaunchPreset() {
    }

    public static void applyIfNeeded(Path optionsFile) {
        PortMarloweConfig config = PortMarlowe.config();
        DeviceInfo device = PortMarlowe.device();
        if (config.presetApplied || !config.autoApplyPreset || !device.platform().isMobile()) {
            return;
        }

        Preset preset = config.presetOrDefault();
        PresetPlan plan = PresetPlan.create(preset, device);
        try {
            boolean exists = Files.isRegularFile(optionsFile);
            List<String> lines = exists ? Files.readAllLines(optionsFile, StandardCharsets.UTF_8) : List.of();
            int dataVersion = SharedConstants.getCurrentVersion().getDataVersion().getVersion();
            List<String> patched = OptionsFilePatcher.patch(lines, plan, dataVersion);

            Path tmp = optionsFile.resolveSibling(optionsFile.getFileName() + ".portmarlowe.tmp");
            Files.write(tmp, patched, StandardCharsets.UTF_8);
            Files.move(tmp, optionsFile, StandardCopyOption.REPLACE_EXISTING);

            config.presetApplied = true;
            PortMarlowe.saveConfig();
            PortMarlowe.LOGGER.info("Applied the {} preset for {}: {}", preset, device.platform().displayName(), plan);
        } catch (IOException | RuntimeException e) {
            PortMarlowe.LOGGER.warn("Could not apply the first-launch preset to {}", optionsFile, e);
        }
    }
}
