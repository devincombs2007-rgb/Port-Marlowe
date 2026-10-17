package com.portmarlowe.item;

import com.portmarlowe.director.HorrorDirector;
import com.portmarlowe.entity.HorrorMob;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;

/** Ring it and the things in the dark are revealed, slowed and made to forget you. Steadies the nerves. */
public class MarloweBellItem extends Item {
	public MarloweBellItem(Properties properties) {
		super(properties);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (!level.isClientSide) {
			level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.BELL_RESONATE, SoundSource.PLAYERS, 3.0F, 0.7F);
			for (Mob mob : level.getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(16.0), e -> e instanceof HorrorMob)) {
				mob.setTarget(null);
				mob.addEffect(new MobEffectInstance(MobEffects.GLOWING, 160, 0));
				mob.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 160, 3));
			}
			if (player instanceof ServerPlayer sp) {
				HorrorDirector.addSanity(sp, 12);
			}
		}
		player.getCooldowns().addCooldown(player.getItemInHand(hand), 400);
		return InteractionResult.SUCCESS;
	}
}
