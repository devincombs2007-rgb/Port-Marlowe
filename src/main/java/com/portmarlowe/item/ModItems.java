package com.portmarlowe.item;

import com.portmarlowe.PortMarlowe;
import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;

import java.util.function.Function;

public final class ModItems {
	public static final Item MARLOWE_BELL = item("marlowe_bell", p -> new MarloweBellItem(p.stacksTo(1)));
	public static final Item SOOTHING_TONIC = item("soothing_tonic", p -> new SoothingTonicItem(p.stacksTo(8)));

	private static Item item(String name, Function<Item.Properties, Item> factory) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, PortMarlowe.id(name));
		return Registry.register(BuiltInRegistries.ITEM, key, factory.apply(new Item.Properties().setId(key)));
	}

	public static void register() {
		ItemGroupEvents.modifyEntriesEvent(CreativeModeTabs.TOOLS_AND_UTILITIES).register(entries -> {
			entries.accept(MARLOWE_BELL);
			entries.accept(SOOTHING_TONIC);
		});
	}

	private ModItems() {}
}
