import { Player, system, world } from "@minecraft/server";
import { ADDON_VERSION, BUILD_STAGE } from "./constants";
import { DEFAULTS, readConfig, resetConfig, setConfigValue } from "./config";
import { tell } from "./log";

/**
 * Text interface over `/scriptevent dread:<command>`. Works on every platform that can run commands
 * (requires cheats on the world). A touch-friendly settings UI is planned for a later phase.
 */
const HELP = [
  "§7/scriptevent dread:status",
  "§7/scriptevent dread:set <setting> <value>",
  "§7/scriptevent dread:reset",
  "§7Settings: " + Object.keys(DEFAULTS).join(", "),
];

export function registerCommands(): void {
  system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (!event.id.startsWith("dread:")) return;
    const command = event.id.slice("dread:".length);
    const player = event.sourceEntity instanceof Player ? event.sourceEntity : undefined;
    const reply = (m: string) => tell(m, player);

    switch (command) {
      case "status": {
        const c = readConfig();
        reply(`v${ADDON_VERSION} (${BUILD_STAGE}) — players online: ${world.getAllPlayers().length}`);
        reply(
          `enabled=${c.enabled} sound=${c.soundIntensity} jumpscare=${c.jumpscareIntensity} effects=${c.effects} debug=${c.debug}`,
        );
        break;
      }
      case "set": {
        const [name, value] = event.message.trim().split(/\s+/);
        if (!name || value === undefined) {
          reply("Usage: dread:set <setting> <value>");
          break;
        }
        const result = setConfigValue(name, value);
        reply(result.ok ? `${name} = ${result.value}` : `§c${result.error}`);
        break;
      }
      case "reset":
        resetConfig();
        reply("Settings reset to defaults.");
        break;
      case "help":
        HELP.forEach(reply);
        break;
      default:
        reply(`§cUnknown command "${command}".`);
        HELP.forEach(reply);
    }
  });
}
