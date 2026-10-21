import { dreadChance, frighten } from "../core/fear";
import { Entity, Player, world } from "@minecraft/server";
import { accent, worldSound } from "../core/audio";
import { chanceScale, cooldownScale, dayReached, settings } from "../core/config";
import { hint } from "../core/fx";
import { DP, ENT, SND } from "../core/ids";
import { add, angleTo, chance, dist, pick, rand } from "../core/math";
import { cooldownReady, ctx, huntable, onlinePlayers, setCooldown } from "../core/players";
import { every } from "../core/scheduler";
import { hollowDay, isDarkHours, isDay, now, seconds } from "../core/time";
import { clearLine, groundNear, holdingLight, inLitArea } from "../core/world";
import { lanternNear, useWard, wardNear } from "../items/blocks";
import { unlock } from "../systems/journal";
import { TrackKind, trail } from "../systems/tracks";

// THE BORROWED
// Rules:
//  * Only joins existing sheep flocks (no flock, no Borrowed). Spawns away from the player's view.
//  * Disguised it is harmless. Tells: never grazes, never follows wheat, pacing gait, slow head
//    tilt while staring, a bleat that ends in a click, and eyeshine at night.
//  * Revealed by shears, by being hurt, by a Rowan Ward (it flees), or at night when a player
//    stands within 4 blocks of it in the dark for 2 seconds without a light in hand.
//  * Revealed at night it hunts; by day it only flees. Below 40% health it flees.
//  * The Seer's Glass shows its true shape to the user only (property override), safely.

type State = "disguised" | "revealing" | "revealed" | "fleeing";

interface Enc {
  id: string;
  target: string;
  born: number;
  state: State;
  stateAt: number;
  close: number;
  noticed: Set<string>;
  nextWrong: number;
  pauseUntil: number;
  nextPause: number;
}

const encs = new Map<string, Enc>();

export const borrowedCount = (): number => encs.size;
export const isBorrowedTracked = (id: string): boolean => encs.has(id);

function setState(e: Entity, enc: Enc, s: State): void {
  if (enc.state === s) return;
  enc.state = s;
  enc.stateAt = now();
  try {
    e.triggerEvent(s === "revealing" ? "hollow:begin_reveal" : s === "revealed" ? "hollow:reveal" : s === "fleeing" ? "hollow:flee" : "minecraft:entity_spawned");
  } catch {
    /* unloaded */
  }
}

function playersNear(e: Entity, r: number): Player[] {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r });
  } catch {
    return [];
  }
}

function teach(e: Entity, deep: boolean): void {
  for (const p of playersNear(e, 24)) {
    unlock(p, "borrowed1");
    if (deep) unlock(p, "borrowed2");
  }
}

function reveal(e: Entity, enc: Enc, why: string, by?: Player): void {
  if (enc.state !== "disguised") return;
  // Give the 1.4-second visual reveal a real non-attacking window before activating chase AI.
  setState(e, enc, "revealing");
  enc.pauseUntil = 0;
  teach(e, true);
  for (const p of playersNear(e, 32)) {
    accent(p, SND.stingerLow, 2);
    frighten(p, dist(p.location, e.location) < 12 ? 22 : 10);
  }
  if (by) hint(by, why === "shears" ? "§7The wool doesn't shear. It peels away in one wet sheet." : "§7That was never a sheep.");
}

// --------------------------------------------------------------------------------- spawning

export function tryStartBorrowed(p: Player): boolean {
  const s = settings();
  if (!s.borrowed || hollowDay() < s.graceDays || !dayReached(hollowDay(), 1)) return false;
  const c = ctx(p);
  if (!c.overworld || c.underground || c.inWater) return false;
  if (!huntable(p) || !cooldownReady(p, "borrowed")) return false;
  if (encs.size >= Math.min(2, Math.max(1, onlinePlayers().length))) return false;
  for (const enc of encs.values()) if (enc.target === p.id) return false;
  const base = isDarkHours() ? 0.12 : 0.04;
  if (!chance(base * chanceScale() * dreadChance(p))) return false;
  if (lanternNear(p.dimension, p.location)) return false;

  const dim = p.dimension;
  let flock: Entity[];
  try {
    flock = dim.getEntities({ type: "minecraft:sheep", location: p.location, maxDistance: 56, minDistance: 16 });
  } catch {
    return false;
  }
  if (flock.length < 2) return false; // it needs a flock to hide in
  const head = p.getHeadLocation();
  const hidden = flock.filter((sh) => angleTo(p.getViewDirection(), head, sh.location) > 75 || !clearLine(dim, head, add(sh.location, { x: 0, y: 0.8, z: 0 })));
  if (hidden.length === 0) return false;
  const sheep = pick(hidden);
  const g = groundNear(dim, sheep.location.x + rand(-2, 2), sheep.location.y, sheep.location.z + rand(-2, 2), 4, 2);
  if (!g || dist(g, p.location) < 14 || lanternNear(dim, g)) return false;
  let e: Entity;
  try {
    e = dim.spawnEntity(ENT.borrowed, g, { initialRotation: rand(0, 360) });
  } catch {
    return false;
  }
  e.setDynamicProperty(DP.owner, p.id);
  encs.set(e.id, { id: e.id, target: p.id, born: now(), state: "disguised", stateAt: now(), close: 0, noticed: new Set(), nextWrong: now() + seconds(30), pauseUntil: 0, nextPause: now() + seconds(rand(8, 16)) });
  setCooldown(p, "borrowed", seconds(rand(600, 900) * cooldownScale() / dreadChance(p)));
  return true;
}

// --------------------------------------------------------------------------------- update

function vanish(e: Entity | undefined, enc: Enc): void {
  encs.delete(enc.id);
  if (e?.isValid) {
    try {
      e.remove();
    } catch {
      /* gone */
    }
  }
}

function hpFraction(e: Entity): number {
  const h = e.getComponent("minecraft:health");
  return h ? h.currentValue / Math.max(1, h.effectiveMax) : 1;
}

function update(): void {
  if (encs.size === 0) return;
  const t = now();
  for (const enc of [...encs.values()]) {
    const e = world.getEntity(enc.id);
    if (!e || !e.isValid) {
      encs.delete(enc.id);
      continue;
    }
    const near = playersNear(e, 72);
    const age = t - enc.born;
    const inState = t - enc.stateAt;
    if (near.length === 0 && age > seconds(60)) {
      vanish(e, enc);
      continue;
    }
    if (enc.state === "revealing") {
      if (lanternNear(e.dimension, e.location)) { vanish(e, enc); continue; }
      const ward = wardNear(e.dimension, e.location);
      if (ward) { useWard(ward, "borrowed"); setState(e, enc, "fleeing"); continue; }
      if (inState >= 28) setState(e, enc, isDarkHours() ? "revealed" : "fleeing");
      continue;
    }
    if (enc.state === "disguised") {
      if (enc.pauseUntil && t >= enc.pauseUntil) {
        enc.pauseUntil = 0;
        e.triggerEvent("hollow:watchful_end");
      }
      if (!enc.pauseUntil && t >= enc.nextPause) {
        enc.nextPause = t + seconds(rand(10, 18));
        if (near.some((q) => dist(q.location, e.location) <= 20)) {
          enc.pauseUntil = t + seconds(rand(2, 4));
          e.triggerEvent("hollow:watchful");
        }
      }
      const ward = wardNear(e.dimension, e.location);
      if (ward) {
        useWard(ward, "borrowed");
        reveal(e, enc, "ward");
        setState(e, enc, "fleeing");
        continue;
      }
      if (lanternNear(e.dimension, e.location)) {
        vanish(e, enc);
        continue;
      }
      if (isDay() && age > seconds(180) && playersNear(e, 24).length === 0) {
        vanish(e, enc); // it wandered off into the trees
        continue;
      }
      const night = isDarkHours();
      // first noticing: a player close enough to see it misbehave
      for (const p of playersNear(e, 16)) {
        if (enc.noticed.has(p.id)) continue;
        if (clearLine(e.dimension, p.getHeadLocation(), add(e.location, { x: 0, y: 1, z: 0 }))) {
          enc.noticed.add(p.id);
          if (night) unlock(p, "borrowed1");
        }
      }
      // the wrong bleat: a clue, not a jump scare
      if (night && t >= enc.nextWrong && playersNear(e, 24).length > 0) {
        enc.nextWrong = t + seconds(rand(35, 70));
        if (chance(0.45)) worldSound(e.dimension, SND.borrowedWrong, e.location, 0.8);
      }
      if (!night) {
        enc.close = 0;
        continue;
      }
      const close = playersNear(e, 4).filter((p) => huntable(p) && !holdingLight(p) && !inLitArea(p, 4));
      enc.close = close.length > 0 ? enc.close + 10 : Math.max(0, enc.close - 10);
      if (enc.close >= 40) reveal(e, enc, "close", close[0]);
      continue;
    }
    trail(e, TrackKind.Borrowed, 1.8); // revealed or fleeing: hooves turning into claws
    if (enc.state === "revealed") {
      if (hpFraction(e) < 0.4 || isDay()) {
        setState(e, enc, "fleeing");
        continue;
      }
      if (inState > seconds(60) && playersNear(e, 24).length === 0) vanish(e, enc);
      continue;
    }
    // fleeing
    const seen = near.some((p) => dist(p.location, e.location) < 20 && clearLine(e.dimension, p.getHeadLocation(), add(e.location, { x: 0, y: 1, z: 0 })));
    // a fair chase window: it only slips away once it has broken line of sight for a while
    if ((inState > seconds(10) && !seen) || inState > seconds(30)) vanish(e, enc);
  }
}

// --------------------------------------------------------------------------------- events

export function onBorrowedSheared(e: Entity, by?: Player): void {
  const enc = encs.get(e.id);
  if (!enc) return;
  if (by) unlock(by, "borrowed2");
  reveal(e, enc, "shears", by);
}

export function onBorrowedHurt(e: Entity, by?: Entity): void {
  const enc = encs.get(e.id);
  if (!enc) return;
  if (enc.state === "disguised") reveal(e, enc, "hurt", by instanceof Player ? by : undefined);
  else if (enc.state === "revealed" && hpFraction(e) < 0.4) setState(e, enc, "fleeing");
}

export function onBorrowedDied(id: string, killer?: Entity): void {
  encs.delete(id);
  if (killer instanceof Player) {
    unlock(killer, "borrowed1");
    unlock(killer, "borrowed2");
  }
}

export function forgetBorrowedTarget(playerId: string): void {
  for (const enc of [...encs.values()]) {
    if (enc.target === playerId && (enc.state === "disguised" || enc.state === "revealing")) vanish(world.getEntity(enc.id), enc);
  }
}

export function startBorrowed(): void {
  every("borrowed.update", 10, update, 3);
}
