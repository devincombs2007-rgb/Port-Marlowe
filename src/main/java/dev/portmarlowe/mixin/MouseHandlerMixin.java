package dev.portmarlowe.mixin;

import dev.portmarlowe.fps.ActivityTracker;
import net.minecraft.client.MouseHandler;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Amethyst delivers touches and the on-screen controls as GLFW cursor and button events. */
@Mixin(MouseHandler.class)
public abstract class MouseHandlerMixin {
    @Inject(method = {"onPress", "onMove", "onScroll"}, at = @At("HEAD"))
    private void portmarlowe$markActive(CallbackInfo ci) {
        ActivityTracker.markActive();
    }
}
