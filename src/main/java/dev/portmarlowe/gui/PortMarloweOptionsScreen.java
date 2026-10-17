package dev.portmarlowe.gui;

import dev.portmarlowe.PortMarlowe;
import dev.portmarlowe.config.PortMarloweConfig;
import dev.portmarlowe.platform.DeviceInfo;
import dev.portmarlowe.preset.LivePresetApplier;
import dev.portmarlowe.preset.Preset;
import dev.portmarlowe.preset.PresetPlan;
import net.minecraft.client.Minecraft;
import net.minecraft.client.OptionInstance;
import net.minecraft.client.Options;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.options.OptionsSubScreen;
import net.minecraft.network.chat.CommonComponents;
import net.minecraft.network.chat.Component;

import java.util.function.Consumer;
import java.util.function.IntFunction;

/** Settings screen, reachable from Video Settings and from Mod Menu. Built only from vanilla widgets. */
public class PortMarloweOptionsScreen extends OptionsSubScreen {
    private static final String KEY = "portmarlowe.options.";

    public PortMarloweOptionsScreen(Screen lastScreen) {
        super(lastScreen, Minecraft.getInstance().options, Component.translatable(KEY + "title"));
    }

    @Override
    protected void addOptions() {
        PortMarloweConfig config = PortMarlowe.config();
        DeviceInfo device = PortMarlowe.device();

        Button deviceInfo = Button.builder(Component.literal(device.platform().displayName()
                + (device.displayRefreshRate() > 0 ? " · " + device.displayRefreshRate() + " Hz" : "")), button -> {
        }).build();
        deviceInfo.active = false;
        Button rendererInfo = Button.builder(Component.literal(device.renderer().displayName()), button -> {
        }).build();
        rendererInfo.active = false;
        this.list.addSmall(deviceInfo, rendererInfo);

        this.list.addSmall(presetButton(Preset.MAX_PERFORMANCE), presetButton(Preset.BALANCED));

        this.list.addSmall(
                toggle("dynamic_fps", config.dynamicFps, value -> config.dynamicFps = value),
                slider("menu_fps", 0, 12, config.menuFps / 5, step -> config.menuFps = step * 5, step -> fpsLabel(step * 5)),
                slider("idle_fps", 0, 12, config.idleFps / 5, step -> config.idleFps = step * 5, step -> fpsLabel(step * 5)),
                slider("idle_timeout", 0, 20, config.idleTimeoutSeconds / 30, step -> config.idleTimeoutSeconds = step * 30,
                        step -> step == 0 ? CommonComponents.OPTION_OFF : Component.translatable(KEY + "seconds", step * 30)),
                slider("unfocused_fps", 0, 30, config.unfocusedFps, value -> config.unfocusedFps = value, PortMarloweOptionsScreen::fpsLabel),
                toggle("particle_culling", config.particleCulling, value -> config.particleCulling = value),
                slider("particle_limit", 0, 40, config.particleLimit / 250, step -> config.particleLimit = step * 250,
                        step -> step == 0 ? Component.translatable(KEY + "vanilla") : Component.literal(Integer.toString(step * 250))),
                slider("block_entity_distance", 0, 8, config.blockEntityDistance / 8, step -> config.blockEntityDistance = step * 8,
                        step -> step == 0 ? Component.translatable(KEY + "vanilla") : Component.translatable(KEY + "blocks", step * 8)),
                slider("ambient_effects", 0, 10, config.ambientEffectsPercent / 10, step -> config.ambientEffectsPercent = step * 10,
                        step -> Component.literal(step * 10 + "%")),
                toggle("texture_animations", config.textureAnimations, value -> config.textureAnimations = value),
                slider("chunk_builder_threads", 0, 8, config.chunkBuilderThreads, value -> config.chunkBuilderThreads = value,
                        value -> value == 0 ? Component.translatable(KEY + "auto") : Component.literal(Integer.toString(value))),
                toggle("auto_preset", config.autoApplyPreset, value -> config.autoApplyPreset = value));
    }

    @Override
    public void removed() {
        super.removed();
        PortMarlowe.saveConfig();
    }

    private Button presetButton(Preset preset) {
        Component name = Component.translatable(preset.translationKey());
        return Button.builder(Component.translatable(KEY + "apply_preset", name), button -> {
                    Options options = this.minecraft.options;
                    LivePresetApplier.apply(options, PresetPlan.create(preset, PortMarlowe.device()));
                    PortMarlowe.config().preset = preset.name();
                    PortMarlowe.config().presetApplied = true;
                    PortMarlowe.saveConfig();
                    button.setMessage(Component.translatable(KEY + "preset_applied", name));
                })
                .tooltip(Tooltip.create(Component.translatable(preset.translationKey() + ".tooltip")))
                .build();
    }

    private static OptionInstance<Boolean> toggle(String name, boolean value, Consumer<Boolean> setter) {
        return OptionInstance.createBoolean(KEY + name, OptionInstance.cachedConstantTooltip(tooltip(name)), value, setter);
    }

    private static OptionInstance<Integer> slider(String name, int min, int max, int value, Consumer<Integer> setter,
                                                  IntFunction<Component> label) {
        return new OptionInstance<>(KEY + name, OptionInstance.cachedConstantTooltip(tooltip(name)),
                (caption, current) -> Options.genericValueLabel(caption, label.apply(current)),
                new OptionInstance.IntRange(min, max), Math.max(min, Math.min(max, value)), setter);
    }

    private static Component tooltip(String name) {
        return Component.translatable(KEY + name + ".tooltip");
    }

    private static Component fpsLabel(int fps) {
        return fps == 0 ? CommonComponents.OPTION_OFF : Component.translatable(KEY + "fps", fps);
    }
}
