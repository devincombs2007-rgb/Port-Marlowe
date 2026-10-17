package com.portmarlowe.entity;

import com.portmarlowe.PortMarlowe;
import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.SpawnPlacementTypes;
import net.minecraft.world.entity.SpawnPlacements;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.SpawnEggItem;
import net.minecraft.world.level.biome.Biomes;
import net.minecraft.world.level.levelgen.Heightmap;

public final class ModEntities {
	public static final EntityType<Lurker> LURKER = entity("lurker", Lurker::new, 0.6f, 1.95f);
	public static final EntityType<Gaunt> GAUNT = entity("gaunt", Gaunt::new, 0.55f, 2.9f);
	public static final EntityType<Tollwraith> TOLLWRAITH = entity("tollwraith", Tollwraith::new, 0.6f, 1.95f);

	public static final Item LURKER_EGG = egg("lurker", LURKER);
	public static final Item GAUNT_EGG = egg("gaunt", GAUNT);
	public static final Item TOLLWRAITH_EGG = egg("tollwraith", TOLLWRAITH);

	private static <T extends net.minecraft.world.entity.Mob> EntityType<T> entity(
			String name, EntityType.EntityFactory<T> factory, float w, float h) {
		ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, PortMarlowe.id(name));
		return Registry.register(BuiltInRegistries.ENTITY_TYPE, key,
				EntityType.Builder.of(factory, MobCategory.MONSTER).sized(w, h).clientTrackingRange(10).build(key));
	}

	private static Item egg(String name, EntityType<? extends net.minecraft.world.entity.Mob> type) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, PortMarlowe.id(name + "_spawn_egg"));
		return Registry.register(BuiltInRegistries.ITEM, key,
				new SpawnEggItem(type, new Item.Properties().setId(key)));
	}

	public static void register() {
		FabricDefaultAttributeRegistry.register(LURKER, Lurker.createAttributes());
		FabricDefaultAttributeRegistry.register(GAUNT, Gaunt.createAttributes());
		FabricDefaultAttributeRegistry.register(TOLLWRAITH, Tollwraith.createAttributes());

		SpawnPlacements.register(LURKER, SpawnPlacementTypes.ON_GROUND,
				Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, Monster::checkMonsterSpawnRules);
		SpawnPlacements.register(GAUNT, SpawnPlacementTypes.ON_GROUND,
				Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, Monster::checkMonsterSpawnRules);
		SpawnPlacements.register(TOLLWRAITH, SpawnPlacementTypes.ON_GROUND,
				Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, Monster::checkMonsterSpawnRules);

		// Lurkers and Gaunts haunt the whole overworld; Tollwraiths cling to the water's edge.
		BiomeModifications.addSpawn(BiomeSelectors.foundInOverworld(), MobCategory.MONSTER, LURKER, 20, 1, 1);
		BiomeModifications.addSpawn(BiomeSelectors.foundInOverworld(), MobCategory.MONSTER, GAUNT, 8, 1, 1);
		BiomeModifications.addSpawn(BiomeSelectors.includeByKey(Biomes.BEACH, Biomes.RIVER, Biomes.STONY_SHORE,
				Biomes.SWAMP, Biomes.MANGROVE_SWAMP), MobCategory.MONSTER, TOLLWRAITH, 30, 1, 1);

		ItemGroupEvents.modifyEntriesEvent(CreativeModeTabs.SPAWN_EGGS).register(entries -> {
			entries.accept(LURKER_EGG);
			entries.accept(GAUNT_EGG);
			entries.accept(TOLLWRAITH_EGG);
		});
	}

	private ModEntities() {}
}
