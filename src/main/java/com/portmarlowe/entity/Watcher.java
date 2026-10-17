package com.portmarlowe.entity;

import com.portmarlowe.director.HorrorDirector;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

/**
 * A figure at the edge of sight that never moves or attacks. It only ever turns to face you. Stare
 * at it, or walk toward it, and it is simply gone.
 */
public class Watcher extends PathfinderMob implements HorrorMob {
	private int life = 600;
	private int stare;

	public Watcher(EntityType<? extends Watcher> type, Level level) {
		super(type, level);
		setInvulnerable(true);
		setPersistenceRequired();
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Mob.createMobAttributes().add(Attributes.MAX_HEALTH, 20.0).add(Attributes.MOVEMENT_SPEED, 0.0);
	}

	@Override
	public void tick() {
		super.tick();
		if (level().isClientSide) {
			return;
		}
		Player player = level().getNearestPlayer(this, 90.0);
		if (player == null || --life <= 0) {
			vanish(null, 99.0);
			return;
		}
		double dx = player.getX() - getX();
		double dz = player.getZ() - getZ();
		float yaw = (float) (Mth.atan2(dz, dx) * (180.0F / (float) Math.PI)) - 90.0F;
		setYRot(yaw);
		setYHeadRot(yaw);
		setYBodyRot(yaw);

		stare = HorrorUtil.isSeenBy(this, player, 0.9) ? stare + 1 : Math.max(0, stare - 1);
		double dist = distanceTo(player);
		if (stare > 30 || dist < 9.0) {
			vanish(player instanceof ServerPlayer sp ? sp : null, dist);
		}
	}

	private void vanish(ServerPlayer witness, double dist) {
		if (level() instanceof ServerLevel server) {
			server.sendParticles(ParticleTypes.LARGE_SMOKE, getX(), getY() + 1.0, getZ(), 24, 0.3, 0.9, 0.3, 0.02);
		}
		if (witness != null) {
			HorrorDirector.onWatcherCaught(witness, dist);
		}
		discard();
	}

	@Override
	public boolean isPushable() {
		return false;
	}
}
