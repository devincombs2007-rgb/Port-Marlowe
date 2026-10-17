package com.portmarlowe.entity;

import com.portmarlowe.director.HorrorDirector;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/**
 * Moves fast and hits hard, but only while nobody is watching. Look at it and it freezes in place,
 * mid-stride, until you look away.
 */
public class Lurker extends Monster implements HorrorMob {
	private static final double WATCH_RANGE = 48.0;

	public Lurker(EntityType<? extends Lurker> type, Level level) {
		super(type, level);
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Monster.createMonsterAttributes()
				.add(Attributes.MAX_HEALTH, 30.0)
				.add(Attributes.MOVEMENT_SPEED, 0.36)
				.add(Attributes.ATTACK_DAMAGE, 7.0)
				.add(Attributes.FOLLOW_RANGE, 40.0);
	}

	@Override
	protected void registerGoals() {
		this.goalSelector.addGoal(0, new FloatGoal(this));
		this.goalSelector.addGoal(1, new MeleeAttackGoal(this, 1.0, false));
		this.goalSelector.addGoal(2, new WaterAvoidingRandomStrollGoal(this, 0.6));
		this.goalSelector.addGoal(3, new LookAtPlayerGoal(this, Player.class, 16.0F));
		this.targetSelector.addGoal(1, new NearestAttackableTargetGoal<>(this, Player.class, true));
	}

	/** True if any player in range has this mob in their field of view with a clear line of sight. */
	public boolean isObserved() {
		for (Player player : level().players()) {
			if (player.isSpectator() || player.isCreative() || distanceToSqr(player) > WATCH_RANGE * WATCH_RANGE) {
				continue;
			}
			Vec3 look = player.getViewVector(1.0F).normalize();
			Vec3 toMe = new Vec3(getX() - player.getX(), getEyeY() - player.getEyeY(), getZ() - player.getZ());
			double dist = toMe.length();
			if (dist < 1.0E-4) {
				return true;
			}
			// ~55 degree half-angle cone
			if (look.dot(toMe.scale(1.0 / dist)) > 0.57 && player.hasLineOfSight(this)) {
				return true;
			}
		}
		return false;
	}

	@Override
	public void aiStep() {
		if (!level().isClientSide) {
			boolean observed = isObserved();
			// NoAi keeps gravity but stops pathing and attacks, so it holds its pose where it stands.
			if (observed != isNoAi()) {
				setNoAi(observed);
				if (observed) {
					getNavigation().stop();
				}
			}
		}
		super.aiStep();
	}

	@Override
	public boolean doHurtTarget(net.minecraft.world.entity.Entity target) {
		boolean hit = super.doHurtTarget(target);
		if (hit) {
			HorrorDirector.onHorrorHit(target);
		}
		return hit;
	}

	@Override
	protected SoundEvent getAmbientSound() {
		return SoundEvents.WARDEN_NEARBY_CLOSE;
	}

	@Override
	protected SoundEvent getHurtSound(net.minecraft.world.damagesource.DamageSource source) {
		return SoundEvents.WARDEN_HURT;
	}

	@Override
	protected SoundEvent getDeathSound() {
		return SoundEvents.WARDEN_DEATH;
	}

	@Override
	public boolean isSunBurnTick() {
		return false;
	}
}
