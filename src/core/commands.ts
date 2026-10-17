import { Player, system, world } from "@minecraft/server";
import { ADDON_VERSION, BUILD_STAGE } from "./constants";
import { DEFAULTS, readConfig, resetConfig, setConfigValue } from "./config";
import { tell } from "./log";
import { playSoundTest } from "./soundtest";
import { debugClear, debugForce, debugResetMemory, debugSet, debugSpawn, describe } from "../game/director";
import type { DirectorState, Tactic } from "../director/types";

/**
 * Text interface over `/scriptevent dread:<command>`. Works on every platform that can run commands
 * (requires cheats on the world). A touch-friendly settings UI is planned for a later phase.
 */
const HELP = [
  "§7/scriptevent dread:status",
  "§7/scriptevent dread:set <setting> <value>",
  "§7/scriptevent dread:reset",
  "§7/scriptevent dread:sound all  (audio test)",
  "§7/scriptevent dread:state  (director status)",
  "§7/scriptevent dread:spawn observe|stalk|hunt",
  "§7/scriptevent dread:force dormant|unease|observation|escalation|hunt|recovery",
  "§7/scriptevent dread:stress <0-100>   dread:dread <0-100>   dread:clear   dread:forget",
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
          `enabled=${c.enabled} intensity=${c.intensity} sound=${c.soundIntensity} jumpscare=${c.jumpscareIntensity} effects=${c.effects} debug=${c.debug}`,
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
      case "state":
        if (player) describe(player).forEach(reply);
        break;
      case "spawn": {
        const tactic = event.message.trim() as Tactic;
        if (!player || !["observe", "stalk", "hunt"].includes(tactic)) { reply("Usage: dread:spawn observe|stalk|hunt"); break; }
        reply(debugSpawn(player, tactic) ? `Spawned a ${tactic} Lurker.` : "§cNo valid spot found nearby.");
        break;
      }
      case "force": {
        const st = event.message.trim() as DirectorState;
        if (!player || !["dormant", "unease", "observation", "escalation", "hunt", "recovery"].includes(st)) { reply("Usage: dread:force <state>"); break; }
        debugForce(player, st);
        if (st === "hunt") debugSpawn(player, "hunt");
        if (st === "observation") debugSpawn(player, "observe");
        if (st === "escalation") debugSpawn(player, "stalk");
        reply(`Director forced to ${st}.`);
        break;
      }
      case "stress":
      case "dread": {
        const n = Number(event.message.trim());
        if (!player || !Number.isFinite(n)) { reply(`Usage: dread:${command} <0-100>`); break; }
        debugSet(player, command, n);
        reply(`${command} = ${Math.max(0, Math.min(100, n))}`);
        break;
      }
      case "clear":
        reply(`Removed ${debugClear(player)} Lurker(s).`);
        break;
      case "forget":
        if (player) debugResetMemory(player);
        reply("Director memory reset for you.");
        break;
      case "sound":
        playSoundTest(player, event.message.trim());
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
