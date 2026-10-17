package dev.portmarlowe.compat;

import com.terraformersmc.modmenu.api.ConfigScreenFactory;
import com.terraformersmc.modmenu.api.ModMenuApi;
import dev.portmarlowe.gui.PortMarloweOptionsScreen;

/** Only loaded by Mod Menu itself; the mod does not require it. */
public final class ModMenuIntegration implements ModMenuApi {
    @Override
    public ConfigScreenFactory<?> getModConfigScreenFactory() {
        return PortMarloweOptionsScreen::new;
    }
}
