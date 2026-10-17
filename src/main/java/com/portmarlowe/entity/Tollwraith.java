package com.portmarlowe.entity;

import com.portmarlowe.director.HorrorDirector;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
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

import java.util.List;

/**
 * A drowned harbour-bell keeper. It never hurries, but it tolls a bell every few seconds; everyone
 * who hears it is weighed down and the world dims. Its grip drags you under.
 */
public class Tollwraith extends Monster implements HorrorMob {
	private static final double TOLL_RANGE = 24.0;
	private static final int TOLL_INTERVAL = 220;

	private int tollTimer = TOLL_INTERVAL;

	public Tollwraith(EntityType<? extends Tollwraith> type, Level level) {
		super(type, level);
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Monster.createMonsterAttributes()
				.add(Attributes.MAX_HEALTH, 50.0)
				.add(Attributes.MOVEMENT_SPEED, 0.2)
				.add(Attributes.ATTACK_DAMAGE, 6.0)
				.add(Attributes.FOLLOW_RANGE, 32.0)
				.add(Attributes.KNOCKBACK_RESISTANCE, 0.8);
	}

	@Override
	protected void registerGoals() {
		this.goalSelector.addGoal(0, new FloatGoal(this));
		this.goalSelector.addGoal(1, new MeleeAttackGoal(this, 1.0, false));
		this.goalSelector.addGoal(2, new WaterAvoidingRandomStrollGoal(this, 0.5));
		this.goalSelector.addGoal(3, new LookAtPlayerGoal(this, Player.class, 24.0F));
		this.targetSelector.addGoal(1, new NearestAttackableTargetGoal<>(this, Player.class, true));
	}

	@Override
	public void aiStep() {
		super.aiStep();
		if (!level().isClientSide && isAlive() && --tollTimer <= 0) {
			tollTimer = TOLL_INTERVAL + random.nextInt(100);
			toll();
		}
	}

	private void toll() {
		level().playSound(null, getX(), getY(), getZ(), SoundEvents.BELL_BLOCK, SoundSource.HOSTILE, 6.0F, 0.5F);
		List<ServerPlayer> victims = level().getEntitiesOfClass(ServerPlayer.class,
				getBoundingBox().inflate(TOLL_RANGE), p -> !p.isCreative() && !p.isSpectator());
		for (ServerPlayer player : victims) {
			player.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 100, 0), this);
			player.addEffect(new MobEffectInstance(MobEffects.DARKNESS, 100, 0), this);
		}
	}

	@Override
	public boolean doHurtTarget(Entity target) {
		boolean hit = super.doHurtTarget(target);
		if (hit) {
			HorrorDirector.onHorrorHit(target);
		}
		if (hit && target instanceof LivingEntity living) {
			living.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 100, 2), this);
		}
		return hit;
	}

	@Override
	protected SoundEvent getAmbientSound() {
		return SoundEvents.DROWNED_AMBIENT_WATER;
	}

	@Override
	protected SoundEvent getHurtSound(net.minecraft.world.damagesource.DamageSource source) {
		return SoundEvents.DROWNED_HURT;
	}

	@Override
	protected SoundEvent getDeathSound() {
		return SoundEvents.DROWNED_DEATH;
	}

	@Override
	public boolean isSunBurnTick() {
		return false;
	}
}
