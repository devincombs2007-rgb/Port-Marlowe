package com.portmarlowe.client;

import com.mojang.blaze3d.platform.InputConstants;
import com.portmarlowe.entity.ModEntities;
import com.portmarlowe.net.JumpscarePayload;
import com.portmarlowe.net.SanityPayload;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;
import net.minecraft.client.KeyMapping;
import org.lwjgl.glfw.GLFW;

public class PortMarloweClient implements ClientModInitializer {
	private static final KeyMapping TOGGLE_DREAD = KeyBindingHelper.registerKeyBinding(new KeyMapping(
			"key.portmarlowe.toggle_dread", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_J, "key.categories.misc"));

	@Override
	public void onInitializeClient() {
		EntityRendererRegistry.register(ModEntities.LURKER, ctx -> new HorrorHumanoidRenderer<>(ctx, "lurker", 0.95F, 1.0F));
		EntityRendererRegistry.register(ModEntities.GAUNT, ctx -> new HorrorHumanoidRenderer<>(ctx, "gaunt", 0.8F, 1.5F));
		EntityRendererRegistry.register(ModEntities.TOLLWRAITH, ctx -> new HorrorHumanoidRenderer<>(ctx, "tollwraith", 1.1F, 1.05F));

		EntityRendererRegistry.register(ModEntities.MIMIC, ctx -> new HorrorHumanoidRenderer<>(ctx, "mimic", 0.95F, 1.0F));
		EntityRendererRegistry.register(ModEntities.WATCHER, ctx -> new HorrorHumanoidRenderer<>(ctx, "watcher", 0.85F, 1.4F));

		ClientPlayNetworking.registerGlobalReceiver(SanityPayload.TYPE, (payload, ctx) -> {
			SanityHud.sanity = payload.sanity();
			SanityHud.tolling = payload.tolling();
		});
		ClientPlayNetworking.registerGlobalReceiver(JumpscarePayload.TYPE, (payload, ctx) -> SanityHud.scare = SanityHud.SCARE_TICKS);
		HudRenderCallback.EVENT.register(SanityHud::render);

		ClientTickEvents.END_CLIENT_TICK.register(mc -> {
			while (TOGGLE_DREAD.consumeClick()) {
				DreadShader.toggle();
			}
			DreadShader.tick(mc);
			SanityHud.tick();
		});
	}
}
