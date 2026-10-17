package dev.portmarlowe.mixin;

import dev.portmarlowe.gui.PortMarloweOptionsScreen;
import net.minecraft.client.Options;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.options.OptionsSubScreen;
import net.minecraft.client.gui.screens.options.VideoSettingsScreen;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Adds an entry point to the mod's settings at the bottom of Options > Video Settings. */
@Mixin(VideoSettingsScreen.class)
public abstract class VideoSettingsScreenMixin extends OptionsSubScreen {
    private VideoSettingsScreenMixin(Screen lastScreen, Options options, Component title) {
        super(lastScreen, options, title);
    }

    @Inject(method = "addOptions", at = @At("TAIL"))
    private void portmarlowe$addSettingsButton(CallbackInfo ci) {
        if (this.list != null) {
            this.list.addSmall(
                    Button.builder(Component.translatable("portmarlowe.options.open"),
                            button -> this.minecraft.setScreen(new PortMarloweOptionsScreen(this))).build(),
                    null);
        }
    }
}
