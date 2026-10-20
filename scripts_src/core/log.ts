import { world } from "@minecraft/server";

// Debug output is off by default. Operators can toggle it with: /scriptevent hollow:debug
let enabled: boolean | undefined;

export function debugEnabled(): boolean {
  if (enabled === undefined) enabled = world.getDynamicProperty("hollow:debug") === true;
  return enabled;
}

export function setDebug(on: boolean): void {
  enabled = on;
  world.setDynamicProperty("hollow:debug", on);
}

export function debug(msg: string): void {
  if (!debugEnabled()) return;
  console.warn(`[hollow] ${msg}`);
  for (const p of world.getAllPlayers()) {
    if (p.hasTag("hollow_debug")) p.sendMessage(`§8[hollow] ${msg}`);
  }
}
