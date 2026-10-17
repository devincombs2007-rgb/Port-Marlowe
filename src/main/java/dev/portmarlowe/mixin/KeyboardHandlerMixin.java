package dev.portmarlowe.mixin;

import dev.portmarlowe.fps.ActivityTracker;
import net.minecraft.client.KeyboardHandler;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(KeyboardHandler.class)
public abstract class KeyboardHandlerMixin {
    @Inject(method = {"keyPress", "charTyped"}, at = @At("HEAD"))
    private void portmarlowe$markActive(CallbackInfo ci) {
        ActivityTracker.markActive();
    }
}
