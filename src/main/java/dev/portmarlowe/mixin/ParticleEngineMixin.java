package dev.portmarlowe.mixin;

import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import com.mojang.blaze3d.vertex.VertexConsumer;
import dev.portmarlowe.PortMarlowe;
import dev.portmarlowe.render.ParticleCulling;
import net.minecraft.client.Camera;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.ParticleEngine;
import net.minecraft.client.particle.ParticleRenderType;
import net.minecraft.core.particles.ParticleOptions;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.Map;
import java.util.Queue;

@Mixin(ParticleEngine.class)
public abstract class ParticleEngineMixin {
    @Shadow
    @Final
    private Map<ParticleRenderType, Queue<Particle>> particles;

    @Shadow
    @Final
    private Queue<Particle> particlesToAdd;

    /** Rejecting before the particle is constructed also saves the allocation and sprite lookup. */
    @Inject(method = "createParticle", at = @At("HEAD"), cancellable = true)
    private void portmarlowe$limitCreate(ParticleOptions options, double x, double y, double z,
                                         double xSpeed, double ySpeed, double zSpeed,
                                         CallbackInfoReturnable<Particle> cir) {
        if (this.portmarlowe$atLimit()) {
            cir.setReturnValue(null);
        }
    }

    @Inject(method = "add", at = @At("HEAD"), cancellable = true)
    private void portmarlowe$limitAdd(Particle particle, CallbackInfo ci) {
        if (this.portmarlowe$atLimit()) {
            ci.cancel();
        }
    }

    @WrapOperation(method = "render", at = @At(value = "INVOKE",
            target = "Lnet/minecraft/client/particle/Particle;render(Lcom/mojang/blaze3d/vertex/VertexConsumer;Lnet/minecraft/client/Camera;F)V"))
    private void portmarlowe$cullParticle(Particle particle, VertexConsumer consumer, Camera camera, float partialTick,
                                          Operation<Void> original) {
        if (ParticleCulling.shouldRender(particle, partialTick)) {
            original.call(particle, consumer, camera, partialTick);
        }
    }

    @Unique
    private boolean portmarlowe$atLimit() {
        int limit = PortMarlowe.config().particleLimit;
        if (limit <= 0) {
            return false;
        }
        int count = this.particlesToAdd.size();
        for (Queue<Particle> queue : this.particles.values()) {
            count += queue.size();
        }
        return count >= limit;
    }
}
