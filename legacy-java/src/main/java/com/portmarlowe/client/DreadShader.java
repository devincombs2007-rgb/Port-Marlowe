package com.portmarlowe.client;

import com.portmarlowe.PortMarlowe;
import com.portmarlowe.mixin.GameRendererInvoker;
import net.minecraft.client.Minecraft;
import net.minecraft.resources.ResourceLocation;

/** Keeps the single Port Marlowe post-process shader applied while in a world. */
public final class DreadShader {
	public static final ResourceLocation EFFECT = PortMarlowe.id("dread");
	private static boolean enabled = true;

	public static void toggle() {
		enabled = !enabled;
		Minecraft mc = Minecraft.getInstance();
		if (!enabled && mc.gameRenderer.currentPostEffect() != null
				&& mc.gameRenderer.currentPostEffect().equals(EFFECT)) {
			mc.gameRenderer.clearPostEffect();
		}
	}

	public static boolean isEnabled() {
		return enabled;
	}

	public static void tick(Minecraft mc) {
		if (!enabled || mc.level == null || mc.player == null) {
			return;
		}
		// Vanilla clears the post effect on respawn / camera swaps, so re-apply if it is gone.
		if (!EFFECT.equals(mc.gameRenderer.currentPostEffect())) {
			((GameRendererInvoker) mc.gameRenderer).portmarlowe$setPostEffect(EFFECT);
		}
	}

	private DreadShader() {}
}
