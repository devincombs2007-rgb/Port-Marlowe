import { system, world } from "@minecraft/server";
import { registerCommands } from "./core/commands";
import { readConfig } from "./core/config";
import { ADDON_VERSION, BUILD_STAGE } from "./core/constants";
import { logConsole } from "./core/log";

/**
 * DREAD entry point. Phase 1: prove the pack loads, settings persist, and the command channel works.
 * Gameplay systems (director, creatures, sanity) arrive in later phases.
 */
logConsole(`script loaded v${ADDON_VERSION} (${BUILD_STAGE})`);

registerCommands();

// Confirm once per player join that the add-on is alive (debug builds only). Delayed so the
// message is not lost while the client is still loading the world.
world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  const config = readConfig();
  if (!config.enabled || !config.debug) return;
  system.runTimeout(() => {
    event.player.onScreenDisplay.setActionBar(`§8DREAD §7v${ADDON_VERSION} loaded — /scriptevent dread:status`);
  }, 100);
});
