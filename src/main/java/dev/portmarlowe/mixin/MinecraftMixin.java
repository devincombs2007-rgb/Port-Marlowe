package dev.portmarlowe.mixin;

import com.llamalad7.mixinextras.injector.ModifyReturnValue;
import dev.portmarlowe.PortMarlowe;
import dev.portmarlowe.fps.ActivityTracker;
import dev.portmarlowe.fps.FrameRateGovernor;
import dev.portmarlowe.render.RenderStats;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.multiplayer.ClientLevel;
import org.jetbrains.annotations.Nullable;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;

@Mixin(Minecraft.class)
public abstract class MinecraftMixin {
    @Shadow
    @Nullable
    public Screen screen;

    @Shadow
    @Nullable
    public ClientLevel level;

    @Shadow
    public abstract boolean isWindowActive();

    @ModifyReturnValue(method = "getFramerateLimit", at = @At("RETURN"))
    private int portmarlowe$governFrameRate(int vanillaLimit) {
        Screen current = this.screen;
        FrameRateGovernor.Decision decision = FrameRateGovernor.decide(vanillaLimit, PortMarlowe.config(),
                this.isWindowActive(), this.level != null, current != null, current instanceof ChatScreen,
                ActivityTracker.idleMillis());
        RenderStats.fpsDecision = decision;
        return decision.limit();
    }
}
