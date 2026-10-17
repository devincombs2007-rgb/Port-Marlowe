package com.portmarlowe.director;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.portmarlowe.entity.HorrorMob;
import com.portmarlowe.entity.ModEntities;
import com.portmarlowe.net.JumpscarePayload;
import com.portmarlowe.net.SanityPayload;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.entity.event.v1.ServerPlayerEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Holder;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSoundPacket;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.DoorBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The unseen hand behind the mod. Tracks every player's sanity, drains it in the dark and near the
 * creatures, and when it runs low starts staging hallucinations: sounds that aren't there, doors that
 * open on their own, whispers, and eventually the Watcher. Some nights the harbour bell tolls and the
 * whole world turns on you.
 */
public final class HorrorDirector {
	public static final int MAX_SANITY = 100;

	private static final Map<UUID, PlayerState> STATES = new ConcurrentHashMap<>();
	private static boolean tolling;
	private static long decidedDay = -1;

	private static final SoundEvent[] FAKE_SOUNDS = {
			SoundEvents.CREEPER_PRIMED, SoundEvents.ZOMBIE_STEP, SoundEvents.SKELETON_STEP,
			SoundEvents.WOODEN_DOOR_OPEN, SoundEvents.WOODEN_DOOR_CLOSE, SoundEvents.CHEST_OPEN,
			SoundEvents.ENDERMAN_STARE, SoundEvents.GHAST_AMBIENT, SoundEvents.BELL_BLOCK,
			SoundEvents.WARDEN_NEARBY_CLOSE, SoundEvents.ZOMBIE_AMBIENT
	};

	private static final String[] WHISPERS = {
			"Something is standing behind you.",
			"It has been following you for a while.",
			"Don't turn around.",
			"You were never alone in here.",
			"The bell rang for you.",
			"It knows where you sleep.",
			"Look again. It was closer.",
			"The harbour remembers everyone it drowned."
	};

	private static class PlayerState {
		int sanity = MAX_SANITY;
		int hallucinationIn = 30;
	}

	// --- registration -------------------------------------------------------------------------

	public static void register() {
		PayloadTypeRegistry.playS2C().register(SanityPayload.TYPE, SanityPayload.CODEC);
		PayloadTypeRegistry.playS2C().register(JumpscarePayload.TYPE, JumpscarePayload.CODEC);

		ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> {
			STATES.put(handler.getPlayer().getUUID(), new PlayerState());
			sync(handler.getPlayer());
		});
		ServerPlayConnectionEvents.DISCONNECT.register((handler, server) -> STATES.remove(handler.getPlayer().getUUID()));
		ServerPlayerEvents.AFTER_RESPAWN.register((old, player, alive) -> setSanity(player, 60));
		ServerTickEvents.END_SERVER_TICK.register(HorrorDirector::tick);
		CommandRegistrationCallback.EVENT.register((dispatcher, access, env) -> registerCommands(dispatcher));
	}

	// --- public API ---------------------------------------------------------------------------

	public static int getSanity(ServerPlayer player) {
		return state(player).sanity;
	}

	public static void setSanity(ServerPlayer player, int value) {
		state(player).sanity = Math.max(0, Math.min(MAX_SANITY, value));
		sync(player);
	}

	public static void addSanity(ServerPlayer player, int delta) {
		setSanity(player, state(player).sanity + delta);
	}

	public static boolean isTolling() {
		return tolling;
	}

	public static void setTolling(MinecraftServer server, boolean value) {
		if (value == tolling) {
			return;
		}
		tolling = value;
		for (ServerPlayer p : server.getPlayerList().getPlayers()) {
			if (p.level().dimension() == Level.OVERWORLD) {
				p.displayClientMessage(Component.literal(value ? "The harbour bell tolls." : "The bell falls silent.")
						.withStyle(ChatFormatting.DARK_RED, ChatFormatting.ITALIC), true);
				if (value) {
					playTo(p, SoundEvents.BELL_BLOCK, p.position(), 4.0F, 0.5F);
				}
			}
			sync(p);
		}
	}

	/** Called whenever a horror creature lands a hit. */
	public static void onHorrorHit(Entity target) {
		if (target instanceof ServerPlayer player) {
			addSanity(player, -8);
		}
	}

	/** Called when a Watcher vanishes in front of a player. */
	public static void onWatcherCaught(ServerPlayer player, double dist) {
		addSanity(player, -6);
		playTo(player, SoundEvents.ENDERMAN_STARE, player.position(), 1.0F, 0.6F);
		if (dist < 14.0 && getSanity(player) < 45) {
			jumpscare(player);
		}
	}

	public static void jumpscare(ServerPlayer player) {
		ServerPlayNetworking.send(player, new JumpscarePayload());
		playTo(player, SoundEvents.ENDERMAN_SCREAM, player.position(), 2.0F, 0.5F);
		playTo(player, SoundEvents.WARDEN_SONIC_BOOM, player.position(), 1.0F, 0.6F);
		addSanity(player, -5);
	}

	public static void spawnWatcher(ServerPlayer player) {
		ServerLevel level = player.serverLevel();
		if (!level.getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(80), e -> e.getType() == ModEntities.WATCHER).isEmpty()) {
			return;
		}
		Vec3 look = player.getLookAngle().multiply(1, 0, 1).normalize();
		RandomSource r = player.getRandom();
		for (int i = 0; i < 12; i++) {
			double angle = (r.nextDouble() - 0.5) * Math.toRadians(100);
			double dist = 30 + r.nextInt(10);
			double cos = Math.cos(angle), sin = Math.sin(angle);
			double dx = look.x * cos - look.z * sin, dz = look.x * sin + look.z * cos;
			int x = (int) (player.getX() + dx * dist), z = (int) (player.getZ() + dz * dist);
			BlockPos pos = new BlockPos(x, level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z), z);
			if (level.hasChunkAt(pos) && level.getFluidState(pos.below()).isEmpty()
					&& ModEntities.WATCHER.spawn(level, pos, EntitySpawnReason.EVENT) != null) {
				return;
			}
		}
	}

	public static void spawnNear(ServerPlayer player, EntityType<? extends Mob> type) {
		ServerLevel level = player.serverLevel();
		RandomSource r = player.getRandom();
		for (int i = 0; i < 12; i++) {
			double angle = r.nextDouble() * Math.PI * 2;
			double dist = 22 + r.nextInt(12);
			int x = (int) (player.getX() + Math.cos(angle) * dist), z = (int) (player.getZ() + Math.sin(angle) * dist);
			BlockPos pos = new BlockPos(x, level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z), z);
			if (level.hasChunkAt(pos) && level.getFluidState(pos.below()).isEmpty()
					&& level.getMaxLocalRawBrightness(pos) <= 7 && type.spawn(level, pos, EntitySpawnReason.EVENT) != null) {
				return;
			}
		}
	}

	public static void hallucinate(ServerPlayer player) {
		int sanity = getSanity(player);
		RandomSource r = player.getRandom();
		int roll = r.nextInt(100);
		if (sanity < 20 && roll < 25) {
			spawnWatcher(player);
		} else if (sanity < 40 && roll < 45) {
			toggleNearbyDoor(player);
		} else if (sanity < 40 && roll < 65) {
			whisper(player);
		} else if (sanity < 20 && roll < 80) {
			player.addEffect(new MobEffectInstance(MobEffects.DARKNESS, 60, 0, false, false));
			playTo(player, SoundEvents.WARDEN_HEARTBEAT, player.position(), 2.0F, 0.9F);
		} else {
			fakeSound(player);
		}
	}

	// --- internals ----------------------------------------------------------------------------

	private static PlayerState state(ServerPlayer player) {
		return STATES.computeIfAbsent(player.getUUID(), id -> new PlayerState());
	}

	private static void sync(ServerPlayer player) {
		ServerPlayNetworking.send(player, new SanityPayload(state(player).sanity, tolling));
	}

	private static void tick(MinecraftServer server) {
		ServerLevel overworld = server.overworld();
		long dayTime = overworld.getDayTime();
		long day = dayTime / 24000L;
		long tod = dayTime % 24000L;
		if (tod >= 13000 && tod < 23000) {
			if (day != decidedDay) {
				decidedDay = day;
				if (overworld.random.nextFloat() < 0.25F) {
					setTolling(server, true);
				}
			}
		} else if (tolling) {
			setTolling(server, false);
		}

		if (server.getTickCount() % 20 != 0) {
			return;
		}
		boolean evenSecond = (server.getTickCount() / 20) % 2 == 0;
		for (ServerPlayer player : new ArrayList<>(server.getPlayerList().getPlayers())) {
			if (player.isCreative() || player.isSpectator() || player.level().dimension() != Level.OVERWORLD) {
				continue;
			}
			secondTick(player, evenSecond);
		}
	}

	private static void secondTick(ServerPlayer player, boolean evenSecond) {
		PlayerState st = state(player);
		ServerLevel level = player.serverLevel();
		int light = level.getMaxLocalRawBrightness(player.blockPosition());
		int delta = 0;
		if (player.isSleeping()) {
			delta += 5;
		} else if (light <= 3) {
			delta -= evenSecond ? 1 : 0;
		} else if (light >= 9 && !tolling && evenSecond) {
			delta += 1;
		}
		if (tolling && level.canSeeSky(player.blockPosition())) {
			delta -= 1;
		}
		List<Mob> near = level.getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(20.0), e -> e instanceof HorrorMob);
		delta -= Math.min(6, near.size() * 2);
		if (delta != 0) {
			st.sanity = Math.max(0, Math.min(MAX_SANITY, st.sanity + delta));
			sync(player);
		}

		if (st.sanity < 60 && --st.hallucinationIn <= 0) {
			st.hallucinationIn = 10 + st.sanity / 4 + player.getRandom().nextInt(20);
			hallucinate(player);
		}

		// A tolling night sends extra company.
		if (tolling && player.getRandom().nextInt(25) == 0) {
			long count = level.getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(48.0), e -> e instanceof HorrorMob).size();
			if (count < 4) {
				EntityType<? extends Mob>[] pool = tollingPool();
				spawnNear(player, pool[player.getRandom().nextInt(pool.length)]);
			}
		}
	}

	@SuppressWarnings("unchecked")
	private static EntityType<? extends Mob>[] tollingPool() {
		return new EntityType[]{ModEntities.LURKER, ModEntities.LURKER, ModEntities.MIMIC, ModEntities.GAUNT};
	}

	private static void fakeSound(ServerPlayer player) {
		RandomSource r = player.getRandom();
		Vec3 look = player.getLookAngle().multiply(1, 0, 1).normalize();
		Vec3 pos = player.position().add(look.scale(-(5 + r.nextInt(5)))).add((r.nextDouble() - 0.5) * 4, 0, (r.nextDouble() - 0.5) * 4);
		SoundEvent sound = FAKE_SOUNDS[r.nextInt(FAKE_SOUNDS.length)];
		playTo(player, sound, pos, 1.2F, 0.6F + r.nextFloat() * 0.5F);
	}

	private static void whisper(ServerPlayer player) {
		player.sendSystemMessage(Component.literal(WHISPERS[player.getRandom().nextInt(WHISPERS.length)])
				.withStyle(ChatFormatting.DARK_GRAY, ChatFormatting.ITALIC));
		playTo(player, SoundEvents.WARDEN_NEARBY_CLOSE, player.position(), 1.0F, 0.7F);
	}

	private static void toggleNearbyDoor(ServerPlayer player) {
		ServerLevel level = player.serverLevel();
		BlockPos origin = player.blockPosition();
		List<BlockPos> doors = new ArrayList<>();
		for (BlockPos p : BlockPos.betweenClosed(origin.offset(-9, -3, -9), origin.offset(9, 3, 9))) {
			BlockState s = level.getBlockState(p);
			if (s.is(BlockTags.WOODEN_DOORS) && s.getBlock() instanceof DoorBlock
					&& s.getValue(DoorBlock.HALF) == net.minecraft.world.level.block.state.properties.DoubleBlockHalf.LOWER) {
				doors.add(p.immutable());
			}
		}
		if (doors.isEmpty()) {
			fakeSound(player);
			return;
		}
		BlockPos pos = doors.get(player.getRandom().nextInt(doors.size()));
		BlockState s = level.getBlockState(pos);
		((DoorBlock) s.getBlock()).setOpen(null, level, s, pos, !s.getValue(DoorBlock.OPEN));
	}

	/** Plays a sound to a single player only, at an arbitrary position. */
	public static void playTo(ServerPlayer player, SoundEvent sound, Vec3 pos, float volume, float pitch) {
		player.connection.send(new ClientboundSoundPacket(Holder.direct(sound), SoundSource.AMBIENT,
				pos.x, pos.y, pos.z, volume, pitch, player.getRandom().nextLong()));
	}

	// --- commands -----------------------------------------------------------------------------

	private static void registerCommands(CommandDispatcher<CommandSourceStack> dispatcher) {
		dispatcher.register(Commands.literal("dread").requires(src -> src.hasPermission(2))
				.then(Commands.literal("sanity")
						.executes(ctx -> {
							ServerPlayer p = ctx.getSource().getPlayerOrException();
							ctx.getSource().sendSuccess(() -> Component.literal("Sanity: " + getSanity(p)), false);
							return getSanity(p);
						})
						.then(Commands.argument("value", IntegerArgumentType.integer(0, MAX_SANITY)).executes(ctx -> {
							ServerPlayer p = ctx.getSource().getPlayerOrException();
							setSanity(p, IntegerArgumentType.getInteger(ctx, "value"));
							return 1;
						})))
				.then(Commands.literal("tolling").executes(ctx -> {
					setTolling(ctx.getSource().getServer(), !tolling);
					return 1;
				}))
				.then(Commands.literal("hallucinate").executes(ctx -> {
					hallucinate(ctx.getSource().getPlayerOrException());
					return 1;
				}))
				.then(Commands.literal("watcher").executes(ctx -> {
					spawnWatcher(ctx.getSource().getPlayerOrException());
					return 1;
				}))
				.then(Commands.literal("jumpscare").executes(ctx -> {
					jumpscare(ctx.getSource().getPlayerOrException());
					return 1;
				})));
	}

	private HorrorDirector() {}
}
