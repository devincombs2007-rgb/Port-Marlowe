import { Player } from "@minecraft/server";
import { addPlayTime, huntable, isNewcomer } from "../core/players";
import { everyPlayer } from "../core/scheduler";

// ENCOUNTER DIRECTOR
// Each online player is evaluated once every 5 seconds (staggered). Creatures are offered the
// player in priority order; each module applies its own context rules, chance, cooldowns and
// global caps. A player has at most one *major* encounter at a time; cave spawns are separate.

export interface Starter {
  key: string;
  /** Returns true if it started something (stops lower-priority starters this round). */
  tryStart: (p: Player) => boolean;
  /** Independent starters run every round regardless of major encounters (e.g. cave spawns). */
  independent?: boolean;
}

const starters: Starter[] = [];

export function addStarter(s: Starter): void {
  starters.push(s);
}

const PERIOD = 100;

function evaluate(p: Player): void {
  addPlayTime(p, PERIOD);
  if (!huntable(p) || isNewcomer(p)) return;
  let major = false;
  for (const s of starters) {
    if (s.independent) {
      s.tryStart(p);
      continue;
    }
    if (major) continue;
    if (s.tryStart(p)) major = true;
  }
}

export function startDirector(): void {
  everyPlayer("director", PERIOD, evaluate);
}
