package dev.portmarlowe.mixin;

import dev.portmarlowe.preset.FirstLaunchPreset;
import net.minecraft.client.Options;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.io.File;

@Mixin(Options.class)
public abstract class OptionsMixin {
    @Shadow
    @Final
    private File optionsFile;

    @Inject(method = "load()V", at = @At("HEAD"))
    private void portmarlowe$applyFirstLaunchPreset(CallbackInfo ci) {
        FirstLaunchPreset.applyIfNeeded(this.optionsFile.toPath());
    }
}
