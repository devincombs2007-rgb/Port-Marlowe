import { Player, system } from "@minecraft/server";
import { tell } from "./log";

/**
 * Developer tool: plays DREAD sound events around the listener so positional audio, volume and
 * asset wiring can be judged by ear on a real device (`/scriptevent dread:sound <name|all>`).
 */
const LURKER_EVENTS = [
  "breath_idle", "breath_alert", "step", "step_stalk", "joint_creak", "head_turn", "notice",
  "vanish", "scrape", "hurt", "death", "attack_swipe", "attack_hit", "chase_vocal",
];

/** Positions on a ring around the player, starting behind them (index 0), to prove 3D placement. */
function ringPosition(player: Player, step: number): { x: number; y: number; z: number } {
  const view = player.getViewDirection();
  const base = Math.atan2(-view.z, -view.x); // directly behind
  const angle = base + step * (Math.PI / 3);
  const dist = 6;
  return { x: player.location.x + Math.cos(angle) * dist, y: player.location.y + 1, z: player.location.z + Math.sin(angle) * dist };
}

export function playSoundTest(player: Player | undefined, arg: string): void {
  if (!player) return;
  const names = arg === "all" || arg === "" ? LURKER_EVENTS : arg.split(/\s+/).filter((n) => LURKER_EVENTS.includes(n));
  if (names.length === 0) {
    tell(`Usage: dread:sound all | <${LURKER_EVENTS.join("|")}>`, player);
    return;
  }
  tell(`Playing ${names.length} sound(s), 3 s apart, circling you from behind.`, player);
  names.forEach((name, i) => {
    system.runTimeout(() => {
      if (!player.isValid) return;
      const location = ringPosition(player, i);
      player.playSound(`dread.lurker.${name}`, { location, volume: 1, pitch: 1 });
      tell(`§7${name}`, player);
    }, i * 60);
  });
}
