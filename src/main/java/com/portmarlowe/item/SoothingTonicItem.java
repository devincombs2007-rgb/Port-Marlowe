package com.portmarlowe.item;

import com.portmarlowe.director.HorrorDirector;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

/** A bitter tonic that restores sanity at the price of a groggy minute. */
public class SoothingTonicItem extends Item {
	public SoothingTonicItem(Properties properties) {
		super(properties);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		ItemStack stack = player.getItemInHand(hand);
		if (!level.isClientSide) {
			level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.WITCH_DRINK, SoundSource.PLAYERS, 1.0F, 0.8F);
			if (player instanceof ServerPlayer sp) {
				HorrorDirector.addSanity(sp, 40);
			}
			player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 400, 0));
			player.addEffect(new MobEffectInstance(MobEffects.CONFUSION, 120, 0));
		}
		if (!player.getAbilities().instabuild) {
			stack.shrink(1);
		}
		return InteractionResult.SUCCESS;
	}
}
