package com.portmarlowe.entity;

import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;

/**
 * Tall, slow and silent. When its victim is not looking it blinks to a spot right behind them and
 * a heartbeat the victim can hear starts to speed up. Its touch swallows the light.
 */
public class Gaunt extends Monster {
	public Gaunt(EntityType<? extends Gaunt> type, Level level) {
		super(type, level);
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Monster.createMonsterAttributes()
				.add(Attributes.MAX_HEALTH, 40.0)
				.add(Attributes.MOVEMENT_SPEED, 0.22)
				.add(Attributes.ATTACK_DAMAGE, 5.0)
				.add(Attributes.FOLLOW_RANGE, 48.0)
				.add(Attributes.KNOCKBACK_RESISTANCE, 0.6);
	}

	@Override
	protected void registerGoals() {
		this.goalSelector.addGoal(0, new FloatGoal(this));
		this.goalSelector.addGoal(1, new BlinkBehindGoal(this));
		this.goalSelector.addGoal(2, new MeleeAttackGoal(this, 1.0, false));
		this.goalSelector.addGoal(3, new WaterAvoidingRandomStrollGoal(this, 0.5));
		this.targetSelector.addGoal(1, new NearestAttackableTargetGoal<>(this, Player.class, true));
	}

	@Override
	public boolean doHurtTarget(Entity target) {
		boolean hit = super.doHurtTarget(target);
		if (hit && target instanceof LivingEntity living) {
			living.addEffect(new MobEffectInstance(MobEffects.DARKNESS, 160, 0), this);
		}
		return hit;
	}

	@Override
	protected SoundEvent getAmbientSound() {
		return SoundEvents.SCULK_CLICKING;
	}

	@Override
	protected SoundEvent getHurtSound(net.minecraft.world.damagesource.DamageSource source) {
		return SoundEvents.ENDERMAN_SCREAM;
	}

	@Override
	protected SoundEvent getDeathSound() {
		return SoundEvents.ENDERMAN_DEATH;
	}

	@Override
	public boolean isSunBurnTick() {
		return false;
	}

	private static class BlinkBehindGoal extends Goal {
		private final Gaunt gaunt;
		private int cooldown = 100;

		BlinkBehindGoal(Gaunt gaunt) {
			this.gaunt = gaunt;
			setFlags(EnumSet.of(Flag.MOVE));
		}

		@Override
		public boolean canUse() {
			LivingEntity target = gaunt.getTarget();
			if (target == null || !target.isAlive() || --cooldown > 0) {
				return false;
			}
			double dist = gaunt.distanceTo(target);
			return dist > 7.0 && dist < 40.0 && !isLookingAt(target);
		}

		@Override
		public void start() {
			LivingEntity target = gaunt.getTarget();
			cooldown = 160 + gaunt.getRandom().nextInt(120);
			if (target == null) {
				return;
			}
			Vec3 back = target.getLookAngle().multiply(1, 0, 1).normalize().scale(-3.0);
			double x = target.getX() + back.x;
			double z = target.getZ() + back.z;
			double y = target.getY();
			if (gaunt.level().noCollision(gaunt, gaunt.getBoundingBox().move(x - gaunt.getX(), y - gaunt.getY(), z - gaunt.getZ()))) {
				gaunt.teleportTo(x, y, z);
				gaunt.getNavigation().stop();
				// Only the victim hears it.
				gaunt.level().playSound(null, target.getX(), target.getY(), target.getZ(),
						SoundEvents.WARDEN_HEARTBEAT, SoundSource.HOSTILE, 2.0F, 0.8F);
			}
		}

		private boolean isLookingAt(LivingEntity target) {
			Vec3 look = target.getViewVector(1.0F).normalize();
			Vec3 to = gaunt.getEyePosition().subtract(target.getEyePosition()).normalize();
			return look.dot(to) > 0.2 && target.hasLineOfSight(gaunt);
		}
	}
}
