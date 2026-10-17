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

const AMBIENT_EVENTS = [
  "branch_snap", "leaves_rustle", "door_creak", "structure_groan", "drag", "murmur", "distant_cry", "heartbeat", "pressure_drop", "footsteps_far",
];

const MIMIC_EVENTS = ["moo", "step", "door", "chest", "voice", "reveal", "skitter", "attack", "hurt", "death"];
const GAUNT_EVENTS = ["step", "breath", "sniff", "vocal", "attack", "hurt", "death", "burrow", "claw_scrape"];

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
  const ids =
    arg === "all" || arg === "" ? LURKER_EVENTS.map((n) => `dread.lurker.${n}`) :
    arg === "ambient" ? AMBIENT_EVENTS.map((n) => `dread.ambient.${n}`) :
    arg === "gaunt" ? GAUNT_EVENTS.map((n) => `dread.gaunt.${n}`) :
    arg === "mimic" ? MIMIC_EVENTS.map((n) => `dread.mimic.${n}`) :
    arg.split(/\s+/).flatMap((n) => (LURKER_EVENTS.includes(n) ? [`dread.lurker.${n}`] : AMBIENT_EVENTS.includes(n) ? [`dread.ambient.${n}`] : []));
  if (ids.length === 0) {
    tell(`Usage: dread:sound all | ambient | gaunt | mimic | <${[...LURKER_EVENTS, ...AMBIENT_EVENTS].join("|")}>`, player);
    return;
  }
  tell(`Playing ${ids.length} sound(s), 3 s apart, circling you from behind.`, player);
  ids.forEach((id, i) => {
    system.runTimeout(() => {
      if (!player.isValid) return;
      const location = ringPosition(player, i);
      player.playSound(id, { location, volume: 1, pitch: 1 });
      tell(`§7${id.replace("dread.", "")}`, player);
    }, i * 60);
  });
}
