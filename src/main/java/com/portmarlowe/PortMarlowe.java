package com.portmarlowe;

import com.portmarlowe.entity.ModEntities;
import net.fabricmc.api.ModInitializer;
import net.minecraft.resources.ResourceLocation;

public class PortMarlowe implements ModInitializer {
	public static final String MOD_ID = "portmarlowe";

	public static ResourceLocation id(String path) {
		return ResourceLocation.fromNamespaceAndPath(MOD_ID, path);
	}

	@Override
	public void onInitialize() {
		ModEntities.register();
	}
}
