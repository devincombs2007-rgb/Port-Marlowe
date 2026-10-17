package dev.portmarlowe.mixin;

import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import dev.portmarlowe.PortMarlowe;
import dev.portmarlowe.render.RenderStats;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderDispatcher;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderer;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;

/**
 * Chests, signs (with their text), banners, skulls, beds, shulker boxes and decorated pots are drawn
 * as entity models every frame. Bases and villages are full of them, so a shorter draw distance than
 * vanilla's 64 blocks is one of the bigger wins on a phone.
 */
@Mixin(BlockEntityRenderDispatcher.class)
public abstract class BlockEntityRenderDispatcherMixin {
    @Unique
    private static final int VANILLA_VIEW_DISTANCE = 64;

    @WrapOperation(method = "render", at = @At(value = "INVOKE",
            target = "Lnet/minecraft/client/renderer/blockentity/BlockEntityRenderer;shouldRender(Lnet/minecraft/world/level/block/entity/BlockEntity;Lnet/minecraft/world/phys/Vec3;)Z"))
    private boolean portmarlowe$limitDistance(BlockEntityRenderer<BlockEntity> renderer, BlockEntity blockEntity,
                                              Vec3 cameraPosition, Operation<Boolean> original) {
        if (!original.call(renderer, blockEntity, cameraPosition)) {
            return false;
        }
        int limit = PortMarlowe.config().blockEntityDistance;
        // Beacons, end gateways and structure blocks ask for more than 64 blocks on purpose.
        if (limit <= 0 || renderer.getViewDistance() > VANILLA_VIEW_DISTANCE || renderer.shouldRenderOffScreen(blockEntity)) {
            return true;
        }
        if (Vec3.atCenterOf(blockEntity.getBlockPos()).closerThan(cameraPosition, limit)) {
            return true;
        }
        RenderStats.blockEntitiesSkipped++;
        return false;
    }
}
