package com.portmarlowe.net;

import com.portmarlowe.PortMarlowe;
import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

public record JumpscarePayload() implements CustomPacketPayload {
	public static final CustomPacketPayload.Type<JumpscarePayload> TYPE = new CustomPacketPayload.Type<>(PortMarlowe.id("jumpscare"));
	public static final StreamCodec<ByteBuf, JumpscarePayload> CODEC = StreamCodec.unit(new JumpscarePayload());

	@Override
	public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
		return TYPE;
	}
}
