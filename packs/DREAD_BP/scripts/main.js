// src/main.ts
import { system as system2, world as world4 } from "@minecraft/server";

// src/core/commands.ts
import { Player, system, world as world3 } from "@minecraft/server";

// src/core/constants.ts
var ADDON_VERSION = "0.1.0";
var BUILD_STAGE = "phase-1-foundation";

// src/core/config.ts
import { world } from "@minecraft/server";
var DEFAULTS = {
  enabled: true,
  soundIntensity: 70,
  jumpscareIntensity: 40,
  effects: "balanced",
  debug: true
  // Phase-1 test builds are verbose on purpose; flip to false for release.
};
var KEY = (name) => `dread:${name}`;
function clampPercent(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;
}
function readConfig() {
  const enabled = world.getDynamicProperty(KEY("enabled"));
  const effects = world.getDynamicProperty(KEY("effects"));
  const debug = world.getDynamicProperty(KEY("debug"));
  return {
    enabled: typeof enabled === "boolean" ? enabled : DEFAULTS.enabled,
    soundIntensity: clampPercent(world.getDynamicProperty(KEY("soundIntensity")), DEFAULTS.soundIntensity),
    jumpscareIntensity: clampPercent(world.getDynamicProperty(KEY("jumpscareIntensity")), DEFAULTS.jumpscareIntensity),
    effects: effects === "performance" || effects === "balanced" || effects === "cinematic" ? effects : DEFAULTS.effects,
    debug: typeof debug === "boolean" ? debug : DEFAULTS.debug
  };
}
function setConfigValue(name, raw) {
  switch (name) {
    case "enabled":
    case "debug": {
      if (raw !== "true" && raw !== "false") return { ok: false, error: `${name} must be true or false` };
      world.setDynamicProperty(KEY(name), raw === "true");
      return { ok: true, value: raw };
    }
    case "soundIntensity":
    case "jumpscareIntensity": {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, error: `${name} must be a number from 0 to 100` };
      world.setDynamicProperty(KEY(name), Math.round(n));
      return { ok: true, value: String(Math.round(n)) };
    }
    case "effects": {
      if (raw !== "performance" && raw !== "balanced" && raw !== "cinematic") {
        return { ok: false, error: "effects must be performance, balanced or cinematic" };
      }
      world.setDynamicProperty(KEY(name), raw);
      return { ok: true, value: raw };
    }
    default:
      return { ok: false, error: `unknown setting "${name}"` };
  }
}
function resetConfig() {
  for (const name of Object.keys(DEFAULTS)) {
    world.setDynamicProperty(KEY(name), void 0);
  }
}

// src/core/log.ts
import { world as world2 } from "@minecraft/server";
var PREFIX = "\xA78[\xA74DREAD\xA78]\xA7r ";
function logConsole(message) {
  console.warn(`[DREAD] ${message}`);
}
function tell(message, target) {
  const text = PREFIX + message;
  if (target) target.sendMessage(text);
  else world2.sendMessage(text);
}

// src/core/commands.ts
var HELP = [
  "\xA77/scriptevent dread:status",
  "\xA77/scriptevent dread:set <setting> <value>",
  "\xA77/scriptevent dread:reset",
  "\xA77Settings: " + Object.keys(DEFAULTS).join(", ")
];
function registerCommands() {
  system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (!event.id.startsWith("dread:")) return;
    const command = event.id.slice("dread:".length);
    const player = event.sourceEntity instanceof Player ? event.sourceEntity : void 0;
    const reply = (m) => tell(m, player);
    switch (command) {
      case "status": {
        const c = readConfig();
        reply(`v${ADDON_VERSION} (${BUILD_STAGE}) \u2014 players online: ${world3.getAllPlayers().length}`);
        reply(
          `enabled=${c.enabled} sound=${c.soundIntensity} jumpscare=${c.jumpscareIntensity} effects=${c.effects} debug=${c.debug}`
        );
        break;
      }
      case "set": {
        const [name, value] = event.message.trim().split(/\s+/);
        if (!name || value === void 0) {
          reply("Usage: dread:set <setting> <value>");
          break;
        }
        const result = setConfigValue(name, value);
        reply(result.ok ? `${name} = ${result.value}` : `\xA7c${result.error}`);
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
        reply(`\xA7cUnknown command "${command}".`);
        HELP.forEach(reply);
    }
  });
}

// src/main.ts
logConsole(`script loaded v${ADDON_VERSION} (${BUILD_STAGE})`);
registerCommands();
world4.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  const config = readConfig();
  if (!config.enabled || !config.debug) return;
  system2.runTimeout(() => {
    event.player.onScreenDisplay.setActionBar(`\xA78DREAD \xA77v${ADDON_VERSION} loaded \u2014 /scriptevent dread:status`);
  }, 100);
});
