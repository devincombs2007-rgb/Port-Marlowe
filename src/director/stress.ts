import { clamp } from "../util/rng";
import type { Snapshot } from "./types";

/**
 * Stress is the director's model of how unsettled a player is *in context*. It is not a timer: it rises with
 * darkness, isolation, injury and recent frights, and falls with light, company, shelter and daylight.
 * Time spent online does not appear anywhere in this function.
 */
export function stressTarget(s: Snapshot): number {
  if (s.gameMode === "creative" || s.gameMode === "spectator") return 0;
  let target = 8; // everyone carries a little unease
  const night = s.timeOfDay >= 13000 && s.timeOfDay < 23000;

  if (!s.skyVisible) target += 22; // caves, mines, tight interiors
  else if (night) target += 18;
  else target -= 8; // daylight under open sky

  if (s.companions === 0) target += 12;
  else if (s.companions >= 2) target -= 10;
  else target -= 4;

  const hp = s.maxHealth > 0 ? s.health / s.maxHealth : 1;
  if (hp < 0.3) target += 18;
  else if (hp < 0.5) target += 10;
  if (s.sinceHurt < 25) target += 15 * (1 - s.sinceHurt / 25);

  if (s.lit) target *= 0.6; // a flame in the hand or beside you takes the edge off
  if (s.nearHome) target -= 25;
  if (s.sleeping) target = Math.min(target, 5);
  return clamp(target, 0, 100);
}

/** Rises slowly, falls faster when the player is actually safe. `pulse` is instantaneous fright from events. */
export function updateStress(prev: number, s: Snapshot, dt: number, pulse = 0): number {
  const target = stressTarget(s);
  const calm = s.lit || s.nearHome || s.sleeping;
  const rate = target > prev ? 0.03 : calm ? 0.12 : 0.06;
  const next = prev + (target - prev) * (1 - Math.exp(-rate * dt)) + pulse;
  return clamp(next, 0, 100);
}
