package com.portmarlowe.entity;

import com.portmarlowe.director.HorrorDirector;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.ai.util.DefaultRandomPos;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;

/**
 * Wears a villager's robes and a smile that is slightly too wide. It sounds like a villager, played
 * too low. While you watch it, it keeps its distance and watches back. Turn around and it runs.
 */
public class Mimic extends Monster implements HorrorMob {
	public Mimic(EntityType<? extends Mimic> type, Level level) {
		super(type, level);
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Monster.createMonsterAttributes()
				.add(Attributes.MAX_HEALTH, 24.0)
				.add(Attributes.MOVEMENT_SPEED, 0.3)
				.add(Attributes.ATTACK_DAMAGE, 6.0)
				.add(Attributes.FOLLOW_RANGE, 36.0);
	}

	@Override
	protected void registerGoals() {
		this.goalSelector.addGoal(0, new FloatGoal(this));
		this.goalSelector.addGoal(1, new StalkGoal(this));
		this.goalSelector.addGoal(2, new WaterAvoidingRandomStrollGoal(this, 0.5));
		this.targetSelector.addGoal(1, new NearestAttackableTargetGoal<>(this, Player.class, true));
	}

	@Override
	public boolean doHurtTarget(Entity target) {
		boolean hit = super.doHurtTarget(target);
		if (hit) {
			HorrorDirector.onHorrorHit(target);
		}
		return hit;
	}

	@Override
	public float getVoicePitch() {
		return 0.45F + random.nextFloat() * 0.1F;
	}

	@Override
	protected SoundEvent getAmbientSound() {
		return SoundEvents.VILLAGER_AMBIENT;
	}

	@Override
	protected SoundEvent getHurtSound(DamageSource source) {
		return SoundEvents.VILLAGER_HURT;
	}

	@Override
	protected SoundEvent getDeathSound() {
		return SoundEvents.VILLAGER_DEATH;
	}

	@Override
	public boolean isSunBurnTick() {
		return false;
	}

	private static class StalkGoal extends Goal {
		private final Mimic mimic;
		private int attackCooldown;

		StalkGoal(Mimic mimic) {
			this.mimic = mimic;
			setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
		}

		@Override
		public boolean canUse() {
			LivingEntity t = mimic.getTarget();
			return t != null && t.isAlive();
		}

		@Override
		public boolean canContinueToUse() {
			return canUse();
		}

		@Override
		public void tick() {
			LivingEntity target = mimic.getTarget();
			if (target == null) {
				return;
			}
			if (attackCooldown > 0) {
				attackCooldown--;
			}
			double dist = mimic.distanceTo(target);
			boolean seen = HorrorUtil.isSeenBy(mimic, target, 0.5);
			if (seen && dist < 14.0) {
				// Hold your gaze and it backs away, never looking elsewhere.
				mimic.getLookControl().setLookAt(target, 30.0F, 30.0F);
				Vec3 away = DefaultRandomPos.getPosAway(mimic, 8, 4, target.position());
				if (away != null) {
					mimic.getNavigation().moveTo(away.x, away.y, away.z, 0.7);
				}
			} else {
				mimic.getNavigation().moveTo(target, 1.35);
				if (attackCooldown <= 0 && mimic.distanceToSqr(target) < 4.5) {
					mimic.swing(InteractionHand.MAIN_HAND);
					mimic.doHurtTarget(target);
					attackCooldown = 20;
				}
			}
		}
	}
}
