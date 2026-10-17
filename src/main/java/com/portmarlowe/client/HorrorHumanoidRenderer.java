package com.portmarlowe.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.portmarlowe.PortMarlowe;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelLayers;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.HumanoidMobRenderer;
import net.minecraft.client.renderer.entity.state.HumanoidRenderState;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.Mob;

/** Vanilla biped model, custom skin, optional stretch. */
public class HorrorHumanoidRenderer<T extends Mob>
		extends HumanoidMobRenderer<T, HumanoidRenderState, HumanoidModel<HumanoidRenderState>> {
	private final ResourceLocation texture;
	private final float scaleX;
	private final float scaleY;

	public HorrorHumanoidRenderer(EntityRendererProvider.Context ctx, String name, float scaleX, float scaleY) {
		super(ctx, new HumanoidModel<>(ctx.bakeLayer(ModelLayers.ZOMBIE)), 0.5F * scaleX);
		this.texture = PortMarlowe.id("textures/entity/" + name + ".png");
		this.scaleX = scaleX;
		this.scaleY = scaleY;
	}

	@Override
	public HumanoidRenderState createRenderState() {
		return new HumanoidRenderState();
	}

	@Override
	public ResourceLocation getTextureLocation(HumanoidRenderState state) {
		return texture;
	}

	@Override
	protected void scale(HumanoidRenderState state, PoseStack pose) {
		pose.scale(scaleX, scaleY, scaleX);
	}
}
