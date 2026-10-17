package com.portmarlowe.net;

import com.portmarlowe.PortMarlowe;
import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

public record SanityPayload(int sanity, boolean tolling) implements CustomPacketPayload {
	public static final CustomPacketPayload.Type<SanityPayload> TYPE = new CustomPacketPayload.Type<>(PortMarlowe.id("sanity"));
	public static final StreamCodec<ByteBuf, SanityPayload> CODEC = StreamCodec.composite(
			ByteBufCodecs.VAR_INT, SanityPayload::sanity,
			ByteBufCodecs.BOOL, SanityPayload::tolling,
			SanityPayload::new);

	@Override
	public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
		return TYPE;
	}
}
