package dev.portmarlowe.mixin;

import com.llamalad7.mixinextras.injector.ModifyReturnValue;
import dev.portmarlowe.PortMarlowe;
import dev.portmarlowe.fps.FrameRateGovernor;
import dev.portmarlowe.render.RenderStats;
import net.minecraft.client.gui.components.DebugScreenOverlay;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

import java.util.ArrayList;
import java.util.List;

@Mixin(DebugScreenOverlay.class)
public abstract class DebugScreenOverlayMixin {
    @ModifyReturnValue(method = "getGameInformation", at = @At("RETURN"))
    private List<String> portmarlowe$addStats(List<String> lines) {
        FrameRateGovernor.Decision fps = RenderStats.fpsDecision;
        String cap = fps.limit() >= 260 ? "unlimited" : Integer.toString(fps.limit());
        if (fps.reason() != FrameRateGovernor.Reason.NONE) {
            cap += " (" + fps.reason().label() + ")";
        }
        List<String> result = new ArrayList<>(lines);
        result.add("");
        result.add("[Port Marlowe] " + PortMarlowe.device().platform().displayName() + " / "
                + PortMarlowe.device().renderer().displayName() + " | FPS cap " + cap);
        result.add("[Port Marlowe] Culled particles " + RenderStats.lastFrameParticlesCulled
                + " | Skipped block entities " + RenderStats.lastFrameBlockEntitiesSkipped
                + " | Mesh workers " + RenderStats.chunkBuilderPacks);
        return result;
    }
}
