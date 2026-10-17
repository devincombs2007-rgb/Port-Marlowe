package dev.portmarlowe.mixin;

import dev.portmarlowe.gui.BundledTranslations;
import net.minecraft.client.resources.language.ClientLanguage;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyArg;

import java.util.Map;

/** Fills in the mod's English strings for any key no resource pack (or Fabric API) provided. */
@Mixin(ClientLanguage.class)
public abstract class ClientLanguageMixin {
    @ModifyArg(method = "loadFrom", at = @At(value = "INVOKE",
            target = "Lcom/google/common/collect/ImmutableMap;copyOf(Ljava/util/Map;)Lcom/google/common/collect/ImmutableMap;"))
    private static Map<String, String> portmarlowe$addBundledEnglish(Map<String, String> translations) {
        BundledTranslations.english().forEach(translations::putIfAbsent);
        return translations;
    }
}
