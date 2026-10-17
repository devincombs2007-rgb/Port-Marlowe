package dev.portmarlowe.mixin;

import dev.portmarlowe.render.ParticleCulling;
import net.minecraft.client.renderer.LevelRenderer;
import net.minecraft.world.phys.Vec3;
import org.joml.Matrix4f;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(LevelRenderer.class)
public abstract class LevelRendererMixin {
    @Inject(method = "prepareCullFrustum", at = @At("TAIL"))
    private void portmarlowe$captureFrustum(Vec3 cameraPosition, Matrix4f frustumMatrix, Matrix4f projectionMatrix,
                                            CallbackInfo ci) {
        ParticleCulling.capture(cameraPosition, frustumMatrix, projectionMatrix);
    }
}
