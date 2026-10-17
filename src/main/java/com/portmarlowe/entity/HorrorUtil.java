package com.portmarlowe.entity;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.Vec3;

public final class HorrorUtil {
	/** True if {@code viewer}'s look direction is within the cone ({@code minDot} = cos half-angle) around {@code subject}, with line of sight. */
	public static boolean isSeenBy(Entity subject, LivingEntity viewer, double minDot) {
		Vec3 look = viewer.getViewVector(1.0F).normalize();
		Vec3 to = new Vec3(subject.getX() - viewer.getX(), subject.getEyeY() - viewer.getEyeY(), subject.getZ() - viewer.getZ());
		double len = to.length();
		if (len < 1.0E-4) {
			return true;
		}
		return look.dot(to.scale(1.0 / len)) > minDot && viewer.hasLineOfSight(subject);
	}

	private HorrorUtil() {}
}
