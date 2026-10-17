package dev.portmarlowe.selftest.mixin;

import dev.portmarlowe.selftest.SelfTest;
import net.minecraft.client.Minecraft;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(Minecraft.class)
public abstract class MinecraftSelfTestMixin {
    @Inject(method = "tick", at = @At("TAIL"))
    private void portmarloweSelftest$tick(CallbackInfo ci) {
        SelfTest.tick((Minecraft) (Object) this);
    }
}
