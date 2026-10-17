package dev.portmarlowe.mixin;

import dev.portmarlowe.PortMarlowe;
import net.minecraft.client.multiplayer.ClientLevel;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Constant;
import org.spongepowered.asm.mixin.injection.ModifyConstant;

/**
 * Every client tick vanilla samples 2 x 667 random blocks around the player for ambient effects
 * (torch smoke, dripping water, fire crackle, spore blossoms...). Most of the resulting particles are
 * thrown away on reduced particle settings anyway, but the block lookups are paid in full.
 */
@Mixin(ClientLevel.class)
public abstract class ClientLevelMixin {
    @ModifyConstant(method = "animateTick", constant = @Constant(intValue = 667))
    private int portmarlowe$scaleAmbientEffects(int iterations) {
        int percent = PortMarlowe.config().ambientEffectsPercent;
        return percent >= 100 ? iterations : iterations * percent / 100;
    }
}
