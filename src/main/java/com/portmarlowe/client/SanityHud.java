package com.portmarlowe.client;

import com.portmarlowe.PortMarlowe;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.resources.ResourceLocation;

/** Creeping red-black borders as sanity falls, a thin sanity bar, and the jumpscare overlay. */
public final class SanityHud {
	public static final int SCARE_TICKS = 16;
	private static final ResourceLocation SCARE_FACE = PortMarlowe.id("textures/gui/scare.png");

	public static int sanity = 100;
	public static boolean tolling;
	public static int scare;

	public static void tick() {
		if (scare > 0) {
			scare--;
		}
	}

	public static void render(GuiGraphics g, DeltaTracker delta) {
		Minecraft mc = Minecraft.getInstance();
		if (mc.player == null || mc.options.hideGui) {
			return;
		}
		int w = g.guiWidth();
		int h = g.guiHeight();

		float dread = (100 - sanity) / 100.0F;
		if (tolling) {
			dread = Math.min(1.0F, dread + 0.2F);
		}
		int a = Math.min(120, (int) (dread * dread * 150));
		if (a > 4) {
			int dark = (a << 24) | 0x0A0000;
			g.fillGradient(0, 0, w, h / 3, dark, 0x000A0000);
			g.fillGradient(0, h * 2 / 3, w, h, 0x000A0000, dark);
		}
		if (sanity < 90) {
			g.fill(8, 8, 58, 12, 0x88000000);
			int color = sanity < 30 ? 0xFFB02020 : sanity < 60 ? 0xFFB09030 : 0xFF6090A0;
			g.fill(9, 9, 9 + (int) (48 * sanity / 100.0F), 11, color);
		}

		if (scare > 0) {
			float t = (scare - delta.getGameTimeDeltaPartialTick(false)) / SCARE_TICKS;
			t = Math.max(0.0F, Math.min(1.0F, t));
			g.fill(0, 0, w, h, ((int) (255 * Math.min(1.0F, t * 3)) << 24));
			float size = h * (1.0F + (1.0F - t) * 0.5F);
			float shake = (mc.level != null ? mc.level.random.nextFloat() - 0.5F : 0) * 18.0F * t;
			g.pose().pushPose();
			g.pose().translate((w - size) / 2.0F + shake, (h - size) / 2.0F - shake, 0);
			g.pose().scale(size / 64.0F, size / 64.0F, 1.0F);
			g.blit(RenderType::guiTextured, SCARE_FACE, 0, 0, 0, 0, 64, 64, 64, 64);
			g.pose().popPose();
			g.fill(0, 0, w, h, ((int) (110 * t) << 24) | 0x600000);
		}
	}

	private SanityHud() {}
}
