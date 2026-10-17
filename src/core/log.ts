import { world } from "@minecraft/server";
import { readConfig } from "./config";

const PREFIX = "§8[§4DREAD§8]§r ";

export function logConsole(message: string): void {
  console.warn(`[DREAD] ${message}`);
}

/** Chat message to one player or everyone. */
export function tell(message: string, target?: { sendMessage(m: string): void }): void {
  const text = PREFIX + message;
  if (target) target.sendMessage(text);
  else world.sendMessage(text);
}

/** Diagnostics are only shown to players when debug is on. */
export function debug(message: string): void {
  logConsole(message);
  if (readConfig().debug) world.sendMessage(PREFIX + "§7" + message);
}
