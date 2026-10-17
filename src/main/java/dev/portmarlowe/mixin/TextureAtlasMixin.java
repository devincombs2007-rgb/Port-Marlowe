package dev.portmarlowe.mixin;

import dev.portmarlowe.PortMarlowe;
import net.minecraft.client.renderer.texture.TextureAtlas;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Each animated sprite frame is a texture upload, which GL translation layers handle poorly. */
@Mixin(TextureAtlas.class)
public abstract class TextureAtlasMixin {
    @Inject(method = "cycleAnimationFrames", at = @At("HEAD"), cancellable = true)
    private void portmarlowe$skipAnimations(CallbackInfo ci) {
        if (!PortMarlowe.config().textureAnimations) {
            ci.cancel();
        }
    }
}
