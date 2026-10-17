package dev.portmarlowe.mixin;

import dev.portmarlowe.PortMarlowe;
import dev.portmarlowe.render.RenderStats;
import net.minecraft.client.renderer.SectionBufferBuilderPool;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/**
 * Vanilla allocates one set of section buffers (several MB of native memory) per CPU core for chunk
 * meshing. iPhones report 6 cores but only 2 are performance cores, and native memory counts against
 * the hard per-app limit iOS enforces, so fewer workers is both smoother and safer there.
 */
@Mixin(SectionBufferBuilderPool.class)
public abstract class SectionBufferBuilderPoolMixin {
    @ModifyVariable(method = "allocate", at = @At("HEAD"), argsOnly = true)
    private static int portmarlowe$capWorkers(int maxWorkers) {
        int cap = PortMarlowe.chunkBuilderCap();
        int workers = cap > 0 ? Math.max(1, Math.min(maxWorkers, cap)) : maxWorkers;
        RenderStats.chunkBuilderPacks = workers;
        if (workers != maxWorkers) {
            PortMarlowe.LOGGER.info("Chunk meshing workers: {} (vanilla wanted {})", workers, maxWorkers);
        }
        return workers;
    }
}
